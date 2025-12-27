from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime
import uuid

from app.schemas import UserCreate, UserLogin, UserResponse, UserProfile, Token
from app.auth import hash_password, verify_password, create_access_token, get_current_user, TokenData
from app.db import get_mongodb, get_neo4j

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate):
    """Register a new user"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    existing = await mongodb.users.find_one({
        "$or": [
            {"username": user_data.username.lower()},
            {"email": user_data.email.lower()}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "_id": user_id,
        "username": user_data.username.lower(),
        "display_name": user_data.username,
        "email": user_data.email.lower(),
        "password_hash": hash_password(user_data.password),
        "karma": 0,
        "created_at": datetime.utcnow()
    }
    await mongodb.users.insert_one(user_doc)
    
    await mongodb.users.create_index("username", unique=True)
    await mongodb.users.create_index("email", unique=True)
    
    neo4j_driver = get_neo4j()
    if neo4j_driver is not None:
        with neo4j_driver.session() as session:
            session.run(
                "MERGE (u:User {id: $id}) SET u.username = $username",
                id=user_id, username=user_data.username.lower()
            )
    
    token = create_access_token(user_id, user_data.username.lower())
    return Token(access_token=token)


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin):
    """Login and get access token"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user = await mongodb.users.find_one({"username": login_data.username.lower()})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )
    
    token = create_access_token(user["_id"], user["username"])
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: TokenData = Depends(get_current_user)):
    """Get current user info"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user = await mongodb.users.find_one({"_id": current_user.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["_id"],
        username=user["username"],
        email=user["email"],
        karma=user.get("karma", 0),
        created_at=user["created_at"]
    )


@router.get("/{username}", response_model=UserProfile)
async def get_user_profile(username: str):
    """Get user profile by username"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user = await mongodb.users.find_one({"username": username.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    post_count = await mongodb.posts.count_documents({"author_id": user["_id"]})
    comment_count = await mongodb.comments.count_documents({"author_id": user["_id"]})
    
    return UserProfile(
        id=user["_id"],
        username=user["username"],
        karma=user.get("karma", 0),
        post_count=post_count,
        comment_count=comment_count,
        created_at=user["created_at"]
    )


from typing import Optional
from pydantic import BaseModel

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@router.patch("/me", response_model=UserResponse)
async def update_me(
    update_data: UserUpdate,
    current_user: TokenData = Depends(get_current_user)
):
    """Update current user profile"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user = await mongodb.users.find_one({"_id": current_user.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_fields = {}
    
    if update_data.display_name:
        update_fields["display_name"] = update_data.display_name
    
    if update_data.email:
        existing = await mongodb.users.find_one({
            "email": update_data.email.lower(),
            "_id": {"$ne": current_user.user_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_fields["email"] = update_data.email.lower()
    
    if update_data.new_password:
        if not update_data.current_password:
            raise HTTPException(status_code=400, detail="Current password required")
        if not verify_password(update_data.current_password, user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        update_fields["password_hash"] = hash_password(update_data.new_password)
    
    if update_fields:
        await mongodb.users.update_one(
            {"_id": current_user.user_id},
            {"$set": update_fields}
        )
    
    updated_user = await mongodb.users.find_one({"_id": current_user.user_id})
    
    return UserResponse(
        id=updated_user["_id"],
        username=updated_user["username"],
        email=updated_user["email"],
        karma=updated_user.get("karma", 0),
        created_at=updated_user["created_at"]
    )


@router.get("/{username}/posts")
async def get_user_posts(username: str, limit: int = 20, offset: int = 0):
    """Get posts by user"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user = await mongodb.users.find_one({"username": username.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    posts = await mongodb.posts.find(
        {"author_id": user["_id"]}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    return [
        {
            "id": p["_id"],
            "title": p["title"],
            "content": p.get("content"),
            "subreddit_id": p["subreddit_id"],
            "subreddit_name": p.get("subreddit_name", ""),
            "author_id": p["author_id"],
            "author_username": p.get("author_username", ""),
            "image_url": p.get("image_url"),
            "vote_count": p.get("upvotes", 0) - p.get("downvotes", 0),
            "comment_count": p.get("comment_count", 0),
            "created_at": p["created_at"]
        }
        for p in posts
    ]


@router.get("/{username}/comments")
async def get_user_comments(username: str, limit: int = 20, offset: int = 0):
    """Get comments by user"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user = await mongodb.users.find_one({"username": username.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    comments = await mongodb.comments.find(
        {"author_id": user["_id"], "deleted": {"$ne": True}}
    ).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    # Get post titles for context
    post_ids = list(set(c["post_id"] for c in comments))
    posts = await mongodb.posts.find({"_id": {"$in": post_ids}}).to_list(None)
    post_map = {p["_id"]: p for p in posts}
    
    return [
        {
            "id": c["_id"],
            "content": c["content"],
            "post_id": c["post_id"],
            "post_title": post_map.get(c["post_id"], {}).get("title", "[deleted]"),
            "subreddit_name": post_map.get(c["post_id"], {}).get("subreddit_name", ""),
            "vote_count": c.get("upvotes", 0) - c.get("downvotes", 0),
            "created_at": c["created_at"]
        }
        for c in comments
    ]


@router.delete("/me")
async def delete_me(
    password: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Delete current user account"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    user = await mongodb.users.find_one({"_id": current_user.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    # Anonymize user's posts and comments instead of deleting
    await mongodb.posts.update_many(
        {"author_id": current_user.user_id},
        {"$set": {"author_username": "[deleted]"}}
    )
    await mongodb.comments.update_many(
        {"author_id": current_user.user_id},
        {"$set": {"author_username": "[deleted]"}}
    )
    
    # Delete user from Neo4j
    neo4j_driver = get_neo4j()
    if neo4j_driver is not None:
        with neo4j_driver.session() as session:
            session.run("MATCH (u:User {id: $id}) DETACH DELETE u", id=current_user.user_id)
    
    # Delete user
    await mongodb.users.delete_one({"_id": current_user.user_id})
    
    return {"message": "Account deleted successfully"}
