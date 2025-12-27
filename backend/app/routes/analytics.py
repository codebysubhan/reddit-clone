from fastapi import APIRouter, Depends
from datetime import datetime, timedelta

from app.schemas import AnalyticsOverview, SubredditAnalytics, TrendingData
from app.auth import get_current_user, TokenData
from app.db import get_mongodb, get_redis, get_neo4j

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", response_model=AnalyticsOverview)
async def get_overview():
    """Platform-wide analytics"""
    mongodb = get_mongodb()
    if mongodb is None:
        return AnalyticsOverview(
            total_users=0, total_posts=0, total_comments=0,
            total_subreddits=0, posts_today=0, active_users_today=0
        )
    
    total_users = await mongodb.users.count_documents({})
    total_posts = await mongodb.posts.count_documents({})
    total_comments = await mongodb.comments.count_documents({})
    total_subreddits = await mongodb.subreddits.count_documents({})
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    posts_today = await mongodb.posts.count_documents({"created_at": {"$gte": today}})
    
    posters = await mongodb.posts.distinct("author_id", {"created_at": {"$gte": today}})
    commenters = await mongodb.comments.distinct("author_id", {"created_at": {"$gte": today}})
    active_users = len(set(posters + commenters))
    
    return AnalyticsOverview(
        total_users=total_users,
        total_posts=total_posts,
        total_comments=total_comments,
        total_subreddits=total_subreddits,
        posts_today=posts_today,
        active_users_today=active_users
    )


@router.get("/top-subreddits", response_model=list[SubredditAnalytics])
async def get_top_subreddits(limit: int = 10):
    """Top subreddits by members"""
    mongodb = get_mongodb()
    if mongodb is None:
        return []
    
    subs = await mongodb.subreddits.find().sort("member_count", -1).limit(limit).to_list(limit)
    
    result = []
    for sub in subs:
        post_count = await mongodb.posts.count_documents({"subreddit_id": sub["_id"]})
        result.append(SubredditAnalytics(
            name=sub["name"],
            member_count=sub["member_count"],
            post_count=post_count
        ))
    
    return result


@router.get("/trending", response_model=list[TrendingData])
async def get_trending(hours: int = 24, limit: int = 10):
    """Trending subreddits"""
    mongodb = get_mongodb()
    redis_client = get_redis()
    
    if mongodb is None:
        return []
    
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": cutoff}}},
        {"$group": {"_id": "$subreddit_id", "post_count": {"$sum": 1}}},
        {"$sort": {"post_count": -1}},
        {"$limit": limit}
    ]
    
    trending = await mongodb.posts.aggregate(pipeline).to_list(limit)
    
    result = []
    for item in trending:
        sub = await mongodb.subreddits.find_one({"_id": item["_id"]})
        if sub:
            vote_activity = 0
            if redis_client is not None:
                try:
                    hot_posts = redis_client.zrevrange(f"hot:{item['_id']}", 0, 50)
                    for post_id in hot_posts:
                        counts = redis_client.hgetall(f"vote_counts:{post_id}")
                        vote_activity += int(counts.get("up", 0)) + int(counts.get("down", 0))
                except:
                    pass
            
            result.append(TrendingData(
                subreddit=sub["name"],
                post_count=item["post_count"],
                vote_activity=vote_activity
            ))
    
    return result


@router.get("/user-graph-stats")
async def get_graph_stats():
    """Neo4j graph statistics"""
    neo4j_driver = get_neo4j()
    
    if neo4j_driver is None:
        return {
            "error": "Neo4j not connected",
            "total_nodes": 0,
            "total_relationships": 0,
            "subscription_stats": {"min": 0, "max": 0, "avg": 0},
            "most_active_users": []
        }
    
    try:
        with neo4j_driver.session() as session:
            result = session.run("""
                MATCH (n)
                WITH labels(n) as labels, COUNT(*) as count
                RETURN labels, count
            """)
            node_counts = {r["labels"][0]: r["count"] for r in result if r["labels"]}
            
            result = session.run("""
                MATCH ()-[r]->()
                WITH type(r) as type, COUNT(*) as count
                RETURN type, count
            """)
            rel_counts = {r["type"]: r["count"] for r in result}
            
            result = session.run("""
                MATCH (u:User)-[:SUBSCRIBED]->(s:Subreddit)
                WITH u, COUNT(s) as subs
                RETURN MIN(subs) as min_subs, MAX(subs) as max_subs, AVG(subs) as avg_subs
            """)
            sub_stats = result.single()
            
            result = session.run("""
                MATCH (u:User)-[:SUBSCRIBED]->(s:Subreddit)
                WITH u.username as username, COUNT(s) as subscriptions
                ORDER BY subscriptions DESC
                LIMIT 5
                RETURN username, subscriptions
            """)
            top_users = [{"username": r["username"], "subscriptions": r["subscriptions"]} for r in result]
        
        return {
            "total_nodes": sum(node_counts.values()),
            "total_relationships": sum(rel_counts.values()),
            "node_counts": node_counts,
            "relationship_counts": rel_counts,
            "subscription_stats": {
                "min": sub_stats["min_subs"] if sub_stats and sub_stats["min_subs"] else 0,
                "max": sub_stats["max_subs"] if sub_stats and sub_stats["max_subs"] else 0,
                "avg": round(sub_stats["avg_subs"], 2) if sub_stats and sub_stats["avg_subs"] else 0
            },
            "most_active_users": top_users
        }
    except Exception as e:
        return {
            "error": str(e),
            "total_nodes": 0,
            "total_relationships": 0,
            "subscription_stats": {"min": 0, "max": 0, "avg": 0},
            "most_active_users": []
        }


@router.get("/my-stats")
async def get_my_stats(current_user: TokenData = Depends(get_current_user)):
    """Current user's stats"""
    mongodb = get_mongodb()
    neo4j_driver = get_neo4j()
    
    if mongodb is None:
        return {"error": "Database unavailable"}
    
    user = await mongodb.users.find_one({"_id": current_user.user_id})
    post_count = await mongodb.posts.count_documents({"author_id": current_user.user_id})
    comment_count = await mongodb.comments.count_documents({"author_id": current_user.user_id})
    
    sub_count = 0
    if neo4j_driver is not None:
        try:
            with neo4j_driver.session() as session:
                result = session.run("""
                    MATCH (u:User {id: $user_id})-[:SUBSCRIBED]->(s:Subreddit)
                    RETURN COUNT(s) as count
                """, user_id=current_user.user_id)
                record = result.single()
                sub_count = record["count"] if record else 0
        except:
            pass
    
    return {
        "username": user["username"] if user else current_user.username,
        "karma": user.get("karma", 0) if user else 0,
        "post_count": post_count,
        "comment_count": comment_count,
        "subscription_count": sub_count,
        "member_since": user["created_at"].isoformat() if user else None
    }
