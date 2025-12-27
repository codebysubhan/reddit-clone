from fastapi import APIRouter, Depends
from typing import Optional
from datetime import datetime

from app.schemas import PostResponse, SubredditResponse
from app.auth import get_optional_user, TokenData
from app.db import get_mongodb

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/posts")
async def search_posts(
    q: str,
    subreddit: Optional[str] = None,
    sort: str = "relevance",
    limit: int = 20,
    current_user: Optional[TokenData] = Depends(get_optional_user)
):
    """Search posts using MongoDB text search"""
    mongodb = get_mongodb()
    if mongodb is None:
        return {"posts": [], "total": 0}
    
    # Build query
    query = {"$text": {"$search": q}}
    if subreddit:
        query["subreddit_name"] = {"$regex": f"^{subreddit}$", "$options": "i"}
    
    # Sort options
    if sort == "relevance":
        cursor = mongodb.posts.find(
            query,
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)
    elif sort == "new":
        cursor = mongodb.posts.find(query).sort("created_at", -1).limit(limit)
    elif sort == "top":
        cursor = mongodb.posts.find(query).sort([
            ("upvotes", -1), ("created_at", -1)
        ]).limit(limit)
    else:
        cursor = mongodb.posts.find(query).limit(limit)
    
    posts = await cursor.to_list(limit)
    
    return {
        "posts": [
            PostResponse(
                id=p["_id"],
                title=p["title"],
                content=p.get("content"),
                subreddit_id=p["subreddit_id"],
                subreddit_name=p.get("subreddit_name", ""),
                author_id=p["author_id"],
                author_username=p.get("author_username", ""),
                image_url=p.get("image_url"),
                vote_count=p.get("upvotes", 0) - p.get("downvotes", 0),
                comment_count=p.get("comment_count", 0),
                user_vote=None,
                created_at=p["created_at"]
            )
            for p in posts
        ],
        "total": len(posts)
    }


@router.get("/subreddits")
async def search_subreddits(
    q: str,
    limit: int = 10
):
    """Search subreddits"""
    mongodb = get_mongodb()
    if mongodb is None:
        return {"subreddits": [], "total": 0}
    
    # Use regex for partial matching
    cursor = mongodb.subreddits.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]
    }).sort("member_count", -1).limit(limit)
    
    subs = await cursor.to_list(limit)
    
    return {
        "subreddits": [
            SubredditResponse(
                id=s["_id"],
                name=s["name"],
                description=s["description"],
                member_count=s["member_count"],
                created_at=s["created_at"],
                creator_id=s["creator_id"],
                is_member=False
            )
            for s in subs
        ],
        "total": len(subs)
    }


@router.get("/users")
async def search_users(
    q: str,
    limit: int = 10
):
    """Search users"""
    mongodb = get_mongodb()
    if mongodb is None:
        return {"users": [], "total": 0}
    
    cursor = mongodb.users.find({
        "username": {"$regex": q, "$options": "i"}
    }).sort("karma", -1).limit(limit)
    
    users = await cursor.to_list(limit)
    
    return {
        "users": [
            {
                "id": u["_id"],
                "username": u["username"],
                "karma": u.get("karma", 0),
                "created_at": u["created_at"]
            }
            for u in users
        ],
        "total": len(users)
    }


@router.get("/all")
async def search_all(
    q: str,
    limit: int = 5
):
    """Search across posts, subreddits, and users"""
    mongodb = get_mongodb()
    if mongodb is None:
        return {"posts": [], "subreddits": [], "users": []}
    
    # Search posts
    try:
        posts_cursor = mongodb.posts.find(
            {"$text": {"$search": q}},
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)
        posts = await posts_cursor.to_list(limit)
    except:
        # Fallback if text index doesn't exist
        posts_cursor = mongodb.posts.find({
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"content": {"$regex": q, "$options": "i"}}
            ]
        }).limit(limit)
        posts = await posts_cursor.to_list(limit)
    
    # Search subreddits
    subs_cursor = mongodb.subreddits.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}}
        ]
    }).sort("member_count", -1).limit(limit)
    subs = await subs_cursor.to_list(limit)
    
    # Search users
    users_cursor = mongodb.users.find({
        "username": {"$regex": q, "$options": "i"}
    }).sort("karma", -1).limit(limit)
    users = await users_cursor.to_list(limit)
    
    return {
        "posts": [
            {
                "id": p["_id"],
                "title": p["title"],
                "subreddit_name": p.get("subreddit_name", ""),
                "vote_count": p.get("upvotes", 0) - p.get("downvotes", 0),
                "comment_count": p.get("comment_count", 0)
            }
            for p in posts
        ],
        "subreddits": [
            {
                "id": s["_id"],
                "name": s["name"],
                "member_count": s["member_count"]
            }
            for s in subs
        ],
        "users": [
            {
                "id": u["_id"],
                "username": u["username"],
                "karma": u.get("karma", 0)
            }
            for u in users
        ]
    }

