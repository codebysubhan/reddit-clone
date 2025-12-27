from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
from typing import Optional
import uuid

from app.schemas import SubredditCreate, SubredditResponse, SubredditRecommendation
from app.auth import get_current_user, get_optional_user, TokenData
from app.db import get_mongodb, get_neo4j

router = APIRouter(prefix="/subreddits", tags=["Subreddits"])


@router.post("", response_model=SubredditResponse)
async def create_subreddit(
    data: SubredditCreate,
    current_user: TokenData = Depends(get_current_user)
):
    """Create a new subreddit/community"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    existing = await mongodb.subreddits.find_one({
        "name": {"$regex": f"^{data.name}$", "$options": "i"}
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subreddit name already taken"
        )
    
    subreddit_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    doc = {
        "_id": subreddit_id,
        "name": data.name.lower(),
        "display_name": data.name,
        "description": data.description,
        "creator_id": current_user.user_id,
        "member_count": 1,
        "created_at": now
    }
    await mongodb.subreddits.insert_one(doc)
    await mongodb.subreddits.create_index("name", unique=True)
    
    neo4j_driver = get_neo4j()
    if neo4j_driver is not None:
        with neo4j_driver.session() as session:
            session.run("""
                MERGE (s:Subreddit {id: $id})
                SET s.name = $name
                WITH s
                MATCH (u:User {id: $user_id})
                MERGE (u)-[:SUBSCRIBED]->(s)
                MERGE (u)-[:MODERATES]->(s)
            """, id=subreddit_id, name=data.name.lower(), user_id=current_user.user_id)
    
    return SubredditResponse(
        id=subreddit_id,
        name=data.name.lower(),
        description=data.description,
        member_count=1,
        created_at=now,
        creator_id=current_user.user_id,
        is_member=True
    )


@router.get("", response_model=list[SubredditResponse])
async def list_subreddits(
    limit: int = 20,
    current_user: Optional[TokenData] = Depends(get_optional_user)
):
    """List subreddits sorted by member count"""
    mongodb = get_mongodb()
    if mongodb is None:
        return []
    
    subs = await mongodb.subreddits.find().sort("member_count", -1).limit(limit).to_list(limit)
    
    user_subs = set()
    neo4j_driver = get_neo4j()
    if current_user and neo4j_driver is not None:
        with neo4j_driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:SUBSCRIBED]->(s:Subreddit)
                RETURN s.id as sub_id
            """, user_id=current_user.user_id)
            user_subs = {r["sub_id"] for r in result}
    
    return [
        SubredditResponse(
            id=s["_id"],
            name=s["name"],
            description=s["description"],
            member_count=s["member_count"],
            created_at=s["created_at"],
            creator_id=s["creator_id"],
            is_member=s["_id"] in user_subs
        )
        for s in subs
    ]


@router.get("/r/{name}", response_model=SubredditResponse)
async def get_subreddit(
    name: str,
    current_user: Optional[TokenData] = Depends(get_optional_user)
):
    """Get subreddit by name"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    sub = await mongodb.subreddits.find_one({
        "name": {"$regex": f"^{name}$", "$options": "i"}
    })
    if not sub:
        raise HTTPException(status_code=404, detail="Subreddit not found")
    
    is_member = False
    neo4j_driver = get_neo4j()
    if current_user and neo4j_driver is not None:
        with neo4j_driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[:SUBSCRIBED]->(s:Subreddit {id: $sub_id})
                RETURN COUNT(*) > 0 as is_member
            """, user_id=current_user.user_id, sub_id=sub["_id"])
            record = result.single()
            is_member = record["is_member"] if record else False
    
    return SubredditResponse(
        id=sub["_id"],
        name=sub["name"],
        description=sub["description"],
        member_count=sub["member_count"],
        created_at=sub["created_at"],
        creator_id=sub["creator_id"],
        is_member=is_member
    )


@router.patch("/{subreddit_id}", response_model=SubredditResponse)
async def update_subreddit(
    subreddit_id: str,
    description: str = None,
    current_user: TokenData = Depends(get_current_user)
):
    """Update subreddit (only by creator)"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    sub = await mongodb.subreddits.find_one({"_id": subreddit_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subreddit not found")
    
    if sub["creator_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the creator can edit this community")
    
    update_fields = {}
    if description is not None:
        update_fields["description"] = description
    
    if update_fields:
        await mongodb.subreddits.update_one(
            {"_id": subreddit_id},
            {"$set": update_fields}
        )
    
    updated = await mongodb.subreddits.find_one({"_id": subreddit_id})
    
    return SubredditResponse(
        id=updated["_id"],
        name=updated["name"],
        description=updated["description"],
        member_count=updated["member_count"],
        created_at=updated["created_at"],
        creator_id=updated["creator_id"],
        is_member=True
    )


@router.delete("/{subreddit_id}")
async def delete_subreddit(
    subreddit_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Delete subreddit (only by creator)"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    sub = await mongodb.subreddits.find_one({"_id": subreddit_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subreddit not found")
    
    if sub["creator_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the creator can delete this community")
    
    # Delete all posts in subreddit
    await mongodb.posts.delete_many({"subreddit_id": subreddit_id})
    
    # Delete all comments on those posts
    await mongodb.comments.delete_many({"subreddit_id": subreddit_id})
    
    # Delete subreddit from Neo4j
    neo4j_driver = get_neo4j()
    if neo4j_driver is not None:
        with neo4j_driver.session() as session:
            session.run("MATCH (s:Subreddit {id: $id}) DETACH DELETE s", id=subreddit_id)
    
    # Delete subreddit
    await mongodb.subreddits.delete_one({"_id": subreddit_id})
    
    return {"message": "Community deleted successfully"}


@router.post("/{subreddit_id}/join")
async def join_subreddit(
    subreddit_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Join a subreddit"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    sub = await mongodb.subreddits.find_one({"_id": subreddit_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subreddit not found")
    
    neo4j_driver = get_neo4j()
    if neo4j_driver is not None:
        with neo4j_driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[r:SUBSCRIBED]->(s:Subreddit {id: $sub_id})
                RETURN COUNT(r) > 0 as already_member
            """, user_id=current_user.user_id, sub_id=subreddit_id)
            record = result.single()
            
            if record and record["already_member"]:
                raise HTTPException(status_code=400, detail="Already a member")
            
            session.run("""
                MATCH (u:User {id: $user_id}), (s:Subreddit {id: $sub_id})
                MERGE (u)-[:SUBSCRIBED]->(s)
            """, user_id=current_user.user_id, sub_id=subreddit_id)
    
    await mongodb.subreddits.update_one(
        {"_id": subreddit_id},
        {"$inc": {"member_count": 1}}
    )
    
    return {"message": "Joined successfully"}


@router.post("/{subreddit_id}/leave")
async def leave_subreddit(
    subreddit_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Leave a subreddit"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    sub = await mongodb.subreddits.find_one({"_id": subreddit_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subreddit not found")
    
    neo4j_driver = get_neo4j()
    if neo4j_driver is not None:
        with neo4j_driver.session() as session:
            result = session.run("""
                MATCH (u:User {id: $user_id})-[r:SUBSCRIBED]->(s:Subreddit {id: $sub_id})
                DELETE r
                RETURN COUNT(*) as deleted
            """, user_id=current_user.user_id, sub_id=subreddit_id)
            record = result.single()
            
            if not record or record["deleted"] == 0:
                raise HTTPException(status_code=400, detail="Not a member")
    
    await mongodb.subreddits.update_one(
        {"_id": subreddit_id},
        {"$inc": {"member_count": -1}}
    )
    
    return {"message": "Left successfully"}


@router.get("/recommendations/for-me", response_model=list[SubredditRecommendation])
async def get_recommendations(
    limit: int = 5,
    current_user: TokenData = Depends(get_current_user)
):
    """Get subreddit recommendations based on similar users"""
    mongodb = get_mongodb()
    neo4j_driver = get_neo4j()
    
    if neo4j_driver is None or mongodb is None:
        return []
    
    with neo4j_driver.session() as session:
        result = session.run("""
            MATCH (me:User {id: $user_id})-[:SUBSCRIBED]->(sub:Subreddit)
                  <-[:SUBSCRIBED]-(other:User)-[:SUBSCRIBED]->(rec:Subreddit)
            WHERE NOT (me)-[:SUBSCRIBED]->(rec)
            WITH rec, COUNT(DISTINCT other) AS overlap
            ORDER BY overlap DESC
            LIMIT $limit
            RETURN rec.id as id, rec.name as name, overlap
        """, user_id=current_user.user_id, limit=limit)
        
        recommendations = []
        for record in result:
            sub = await mongodb.subreddits.find_one({"_id": record["id"]})
            if sub:
                recommendations.append(SubredditRecommendation(
                    id=sub["_id"],
                    name=sub["name"],
                    description=sub["description"],
                    member_count=sub["member_count"],
                    overlap_score=record["overlap"]
                ))
        
        return recommendations
