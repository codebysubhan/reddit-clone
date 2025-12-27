from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from datetime import datetime
from typing import Optional
import uuid
import math
import base64
import json

from app.schemas import PostCreate, PostResponse, PostFeed, VoteCreate, CommentCreate, CommentResponse
from app.auth import get_current_user, get_optional_user, TokenData
from app.db import get_mongodb, get_cassandra, get_redis, get_s3
from app.config import settings

router = APIRouter(prefix="/posts", tags=["Posts"])

REDDIT_EPOCH = 1134028003


def hot_score(ups: int, downs: int, timestamp: float) -> float:
    """Reddit's hot ranking algorithm"""
    score = ups - downs
    order = math.log10(max(abs(score), 1))
    sign = 1 if score > 0 else -1 if score < 0 else 0
    seconds = timestamp - REDDIT_EPOCH
    return round(sign * order + seconds / 45000, 7)


def encode_cursor(ts: datetime, post_id: str) -> str:
    return base64.b64encode(json.dumps({"ts": ts.isoformat(), "id": post_id}).encode()).decode()


def decode_cursor(cursor: str):
    data = json.loads(base64.b64decode(cursor).decode())
    return datetime.fromisoformat(data["ts"]), data["id"]


@router.post("", response_model=PostResponse)
async def create_post(
    data: PostCreate,
    current_user: TokenData = Depends(get_current_user)
):
    """Create a new post"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    sub = await mongodb.subreddits.find_one({"_id": data.subreddit_id})
    if not sub:
        raise HTTPException(status_code=404, detail="Subreddit not found")
    
    post_id = str(uuid.uuid4())
    now = datetime.utcnow()
    timestamp = now.timestamp()
    
    user = await mongodb.users.find_one({"_id": current_user.user_id})
    author_name = user["display_name"] if user else current_user.username
    
    # Store in Cassandra if available
    cassandra = get_cassandra()
    if cassandra is not None:
        cassandra.execute("""
            INSERT INTO posts (subreddit_id, created_at, post_id, author_id, title, content, image_url, upvotes, downvotes, comment_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (data.subreddit_id, now, post_id, current_user.user_id, data.title, data.content, data.image_url, 1, 0, 0))
        
        cassandra.execute("""
            INSERT INTO posts_by_id (post_id, subreddit_id, author_id, title, content, image_url, created_at, upvotes, downvotes, comment_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (post_id, data.subreddit_id, current_user.user_id, data.title, data.content, data.image_url, now, 1, 0, 0))
    
    # Always store in MongoDB
    post_doc = {
        "_id": post_id,
        "subreddit_id": data.subreddit_id,
        "subreddit_name": sub["name"],
        "author_id": current_user.user_id,
        "author_username": author_name,
        "title": data.title,
        "content": data.content,
        "image_url": data.image_url,
        "upvotes": 1,
        "downvotes": 0,
        "comment_count": 0,
        "created_at": now
    }
    await mongodb.posts.insert_one(post_doc)
    
    # Redis for hot ranking
    redis_client = get_redis()
    if redis_client is not None:
        score = hot_score(1, 0, timestamp)
        redis_client.zadd(f"hot:{data.subreddit_id}", {post_id: score})
        redis_client.zadd("hot:all", {post_id: score})
        redis_client.hset(f"votes:{post_id}", current_user.user_id, 1)
        redis_client.hset(f"vote_counts:{post_id}", mapping={"up": 1, "down": 0})
    
    return PostResponse(
        id=post_id,
        title=data.title,
        content=data.content,
        subreddit_id=data.subreddit_id,
        subreddit_name=sub["name"],
        author_id=current_user.user_id,
        author_username=author_name,
        image_url=data.image_url,
        vote_count=1,
        comment_count=0,
        user_vote=1,
        created_at=now
    )


@router.get("/feed", response_model=PostFeed)
async def get_feed(
    subreddit_id: Optional[str] = None,
    sort: str = "hot",
    cursor: Optional[str] = None,
    limit: int = 20,
    current_user: Optional[TokenData] = Depends(get_optional_user)
):
    """Get posts feed with cursor pagination"""
    mongodb = get_mongodb()
    redis_client = get_redis()
    
    if mongodb is None:
        return PostFeed(posts=[], next_cursor=None, has_more=False)
    
    posts = []
    has_more = False
    next_cursor = None
    
    # Try Redis for hot sorting
    if sort == "hot" and redis_client is not None:
        key = f"hot:{subreddit_id}" if subreddit_id else "hot:all"
        
        if cursor:
            cursor_data = json.loads(base64.b64decode(cursor).decode())
            start_score = cursor_data.get("score", "+inf")
            post_ids = redis_client.zrevrangebyscore(key, f"({start_score}", "-inf", start=0, num=limit + 1)
        else:
            post_ids = redis_client.zrevrange(key, 0, limit)
        
        has_more = len(post_ids) > limit
        post_ids = list(post_ids)[:limit]
        
        for post_id in post_ids:
            post = await mongodb.posts.find_one({"_id": post_id})
            if post:
                posts.append(post)
        
        if has_more and posts:
            last_score = redis_client.zscore(key, posts[-1]["_id"])
            next_cursor = base64.b64encode(json.dumps({"score": last_score}).encode()).decode()
    
    elif sort == "new":
        # Sort by created_at (newest first)
        query = {}
        if subreddit_id:
            query["subreddit_id"] = subreddit_id
        
        if cursor:
            cursor_ts, cursor_id = decode_cursor(cursor)
            query["$or"] = [
                {"created_at": {"$lt": cursor_ts}},
                {"created_at": cursor_ts, "_id": {"$lt": cursor_id}}
            ]
        
        cursor_result = mongodb.posts.find(query).sort("created_at", -1).limit(limit + 1)
        posts = await cursor_result.to_list(limit + 1)
        
        has_more = len(posts) > limit
        posts = posts[:limit]
        
        if has_more and posts:
            last = posts[-1]
            next_cursor = encode_cursor(last["created_at"], last["_id"])
    
    elif sort == "top":
        # Sort by vote count (highest first)
        query = {}
        if subreddit_id:
            query["subreddit_id"] = subreddit_id
        
        if cursor:
            cursor_data = json.loads(base64.b64decode(cursor).decode())
            cursor_votes = cursor_data.get("votes", float("inf"))
            cursor_id = cursor_data.get("id", "")
            query["$or"] = [
                {"upvotes": {"$lt": cursor_votes}},
                {"upvotes": cursor_votes, "_id": {"$lt": cursor_id}}
            ]
        
        cursor_result = mongodb.posts.find(query).sort([("upvotes", -1), ("_id", -1)]).limit(limit + 1)
        posts = await cursor_result.to_list(limit + 1)
        
        has_more = len(posts) > limit
        posts = posts[:limit]
        
        if has_more and posts:
            last = posts[-1]
            next_cursor = base64.b64encode(json.dumps({
                "votes": last.get("upvotes", 0),
                "id": last["_id"]
            }).encode()).decode()
    
    else:
        # Default fallback to new
        query = {}
        if subreddit_id:
            query["subreddit_id"] = subreddit_id
        
        cursor_result = mongodb.posts.find(query).sort("created_at", -1).limit(limit + 1)
        posts = await cursor_result.to_list(limit + 1)
        
        has_more = len(posts) > limit
        posts = posts[:limit]
    
    # Get user votes
    user_votes = {}
    if current_user:
        if redis_client is not None:
            for p in posts:
                vote = redis_client.hget(f"votes:{p['_id']}", current_user.user_id)
                if vote:
                    user_votes[p["_id"]] = int(vote)
        else:
            for p in posts:
                vote_doc = await mongodb.votes.find_one({"post_id": p["_id"], "user_id": current_user.user_id})
                if vote_doc:
                    user_votes[p["_id"]] = vote_doc["vote"]
    
    return PostFeed(
        posts=[
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
                user_vote=user_votes.get(p["_id"]),
                created_at=p["created_at"]
            )
            for p in posts
        ],
        next_cursor=next_cursor,
        has_more=has_more
    )


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: str,
    current_user: Optional[TokenData] = Depends(get_optional_user)
):
    """Get single post"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    post = await mongodb.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    user_vote = None
    redis_client = get_redis()
    if current_user:
        if redis_client is not None:
            vote = redis_client.hget(f"votes:{post_id}", current_user.user_id)
            if vote:
                user_vote = int(vote)
        else:
            vote_doc = await mongodb.votes.find_one({"post_id": post_id, "user_id": current_user.user_id})
            if vote_doc:
                user_vote = vote_doc["vote"]
    
    return PostResponse(
        id=post_id,
        title=post["title"],
        content=post.get("content"),
        subreddit_id=post["subreddit_id"],
        subreddit_name=post.get("subreddit_name", ""),
        author_id=post["author_id"],
        author_username=post.get("author_username", ""),
        image_url=post.get("image_url"),
        vote_count=post.get("upvotes", 0) - post.get("downvotes", 0),
        comment_count=post.get("comment_count", 0),
        user_vote=user_vote,
        created_at=post["created_at"]
    )


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: str,
    title: Optional[str] = None,
    content: Optional[str] = None,
    current_user: TokenData = Depends(get_current_user)
):
    """Update a post (only by author)"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    post = await mongodb.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["author_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")
    
    update_data = {}
    if title is not None:
        update_data["title"] = title
    if content is not None:
        update_data["content"] = content
    
    if update_data:
        await mongodb.posts.update_one({"_id": post_id}, {"$set": update_data})
    
    updated_post = await mongodb.posts.find_one({"_id": post_id})
    
    return PostResponse(
        id=post_id,
        title=updated_post["title"],
        content=updated_post.get("content"),
        subreddit_id=updated_post["subreddit_id"],
        subreddit_name=updated_post.get("subreddit_name", ""),
        author_id=updated_post["author_id"],
        author_username=updated_post.get("author_username", ""),
        image_url=updated_post.get("image_url"),
        vote_count=updated_post.get("upvotes", 0) - updated_post.get("downvotes", 0),
        comment_count=updated_post.get("comment_count", 0),
        user_vote=1,
        created_at=updated_post["created_at"]
    )


@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Delete a post (only by author)"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    post = await mongodb.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["author_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    
    # Delete post
    await mongodb.posts.delete_one({"_id": post_id})
    
    # Delete associated comments
    await mongodb.comments.delete_many({"post_id": post_id})
    
    # Update subreddit post count
    await mongodb.subreddits.update_one(
        {"_id": post["subreddit_id"]},
        {"$inc": {"post_count": -1}}
    )
    
    # Clean up Redis
    redis_client = get_redis()
    if redis_client:
        redis_client.delete(f"votes:{post_id}")
        redis_client.delete(f"vote_counts:{post_id}")
        redis_client.zrem("hot:all", post_id)
        redis_client.zrem(f"hot:{post['subreddit_id']}", post_id)
    
    return {"message": "Post deleted successfully"}


@router.post("/{post_id}/vote")
async def vote_on_post(
    post_id: str,
    vote_data: VoteCreate,
    current_user: TokenData = Depends(get_current_user)
):
    """Vote on a post with deduplication"""
    mongodb = get_mongodb()
    redis_client = get_redis()
    
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    post = await mongodb.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Get existing vote
    existing = 0
    if redis_client is not None:
        existing_str = redis_client.hget(f"votes:{post_id}", current_user.user_id)
        existing = int(existing_str) if existing_str else 0
    else:
        vote_doc = await mongodb.votes.find_one({"post_id": post_id, "user_id": current_user.user_id})
        existing = vote_doc["vote"] if vote_doc else 0
    
    if existing == vote_data.vote:
        return {"message": "Vote unchanged", "vote_count": post.get("upvotes", 0) - post.get("downvotes", 0)}
    
    # Calculate deltas
    up_delta = 0
    down_delta = 0
    
    if existing == 1:
        up_delta -= 1
    elif existing == -1:
        down_delta -= 1
    
    if vote_data.vote == 1:
        up_delta += 1
    elif vote_data.vote == -1:
        down_delta += 1
    
    # Update vote tracking
    if redis_client is not None:
        if vote_data.vote == 0:
            redis_client.hdel(f"votes:{post_id}", current_user.user_id)
        else:
            redis_client.hset(f"votes:{post_id}", current_user.user_id, vote_data.vote)
        redis_client.hincrby(f"vote_counts:{post_id}", "up", up_delta)
        redis_client.hincrby(f"vote_counts:{post_id}", "down", down_delta)
    else:
        if vote_data.vote == 0:
            await mongodb.votes.delete_one({"post_id": post_id, "user_id": current_user.user_id})
        else:
            await mongodb.votes.update_one(
                {"post_id": post_id, "user_id": current_user.user_id},
                {"$set": {"vote": vote_data.vote}},
                upsert=True
            )
    
    # Update post counts
    new_ups = post.get("upvotes", 0) + up_delta
    new_downs = post.get("downvotes", 0) + down_delta
    await mongodb.posts.update_one(
        {"_id": post_id},
        {"$set": {"upvotes": new_ups, "downvotes": new_downs}}
    )
    
    # Update Cassandra if available
    cassandra = get_cassandra()
    if cassandra is not None:
        cassandra.execute("""
            UPDATE posts_by_id SET upvotes = %s, downvotes = %s WHERE post_id = %s
        """, (new_ups, new_downs, post_id))
        cassandra.execute("""
            UPDATE posts SET upvotes = %s, downvotes = %s 
            WHERE subreddit_id = %s AND created_at = %s AND post_id = %s
        """, (new_ups, new_downs, post["subreddit_id"], post["created_at"], post_id))
    
    # Update hot score
    if redis_client is not None:
        score = hot_score(new_ups, new_downs, post["created_at"].timestamp())
        redis_client.zadd(f"hot:{post['subreddit_id']}", {post_id: score})
        redis_client.zadd("hot:all", {post_id: score})
    
    # Update author karma
    karma_delta = vote_data.vote - existing
    await mongodb.users.update_one(
        {"_id": post["author_id"]},
        {"$inc": {"karma": karma_delta}}
    )
    
    return {"message": "Vote recorded", "vote_count": new_ups - new_downs, "user_vote": vote_data.vote}


@router.post("/{post_id}/comments", response_model=CommentResponse)
async def create_comment(
    post_id: str,
    data: CommentCreate,
    current_user: TokenData = Depends(get_current_user)
):
    """Add a comment"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    post = await mongodb.posts.find_one({"_id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    user = await mongodb.users.find_one({"_id": current_user.user_id})
    author_name = user["display_name"] if user else current_user.username
    
    depth = 0
    if data.parent_id:
        parent = await mongodb.comments.find_one({"_id": data.parent_id})
        if parent:
            depth = parent.get("depth", 0) + 1
    
    comment_doc = {
        "_id": comment_id,
        "post_id": post_id,
        "parent_id": data.parent_id,
        "author_id": current_user.user_id,
        "author_username": author_name,
        "content": data.content,
        "depth": depth,
        "upvotes": 0,
        "created_at": now
    }
    await mongodb.comments.insert_one(comment_doc)
    
    await mongodb.posts.update_one(
        {"_id": post_id},
        {"$inc": {"comment_count": 1}}
    )
    
    # Cassandra if available
    cassandra = get_cassandra()
    if cassandra is not None:
        path = comment_id[:8]
        cassandra.execute("""
            INSERT INTO comments (post_id, path, comment_id, parent_id, author_id, content, created_at, depth, upvotes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (post_id, path, comment_id, data.parent_id, current_user.user_id, data.content, now, depth, 0))
        
        cassandra.execute("""
            UPDATE posts_by_id SET comment_count = %s WHERE post_id = %s
        """, (post.get("comment_count", 0) + 1, post_id))
    
    return CommentResponse(
        id=comment_id,
        post_id=post_id,
        content=data.content,
        author_id=current_user.user_id,
        author_username=author_name,
        parent_id=data.parent_id,
        depth=depth,
        vote_count=0,
        user_vote=None,
        created_at=now
    )


@router.get("/{post_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    post_id: str,
    max_depth: int = 3,
    current_user: Optional[TokenData] = Depends(get_optional_user)
):
    """Get comments for a post"""
    mongodb = get_mongodb()
    redis_client = get_redis()
    if mongodb is None:
        return []
    
    comments_cursor = mongodb.comments.find({
        "post_id": post_id,
        "depth": {"$lte": max_depth}
    }).sort([("upvotes", -1), ("created_at", 1)])
    
    comments = await comments_cursor.to_list(500)
    
    # Get user votes on comments
    user_votes = {}
    if current_user:
        for c in comments:
            if redis_client is not None:
                vote = redis_client.hget(f"comment_votes:{c['_id']}", current_user.user_id)
                if vote:
                    user_votes[c["_id"]] = int(vote)
            else:
                vote_doc = await mongodb.comment_votes.find_one({
                    "comment_id": c["_id"], "user_id": current_user.user_id
                })
                if vote_doc:
                    user_votes[c["_id"]] = vote_doc["vote"]
    
    return [
        CommentResponse(
            id=c["_id"],
            post_id=post_id,
            content=c["content"],
            author_id=c["author_id"],
            author_username=c.get("author_username", ""),
            parent_id=c.get("parent_id"),
            depth=c.get("depth", 0),
            vote_count=c.get("upvotes", 0) - c.get("downvotes", 0),
            user_vote=user_votes.get(c["_id"]),
            created_at=c["created_at"]
        )
        for c in comments
    ]


@router.patch("/{post_id}/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    post_id: str,
    comment_id: str,
    content: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Update a comment (only by author)"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    comment = await mongodb.comments.find_one({"_id": comment_id, "post_id": post_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment["author_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")
    
    await mongodb.comments.update_one(
        {"_id": comment_id},
        {"$set": {"content": content, "edited": True}}
    )
    
    updated = await mongodb.comments.find_one({"_id": comment_id})
    
    return CommentResponse(
        id=comment_id,
        post_id=post_id,
        content=updated["content"],
        author_id=updated["author_id"],
        author_username=updated.get("author_username", ""),
        parent_id=updated.get("parent_id"),
        depth=updated.get("depth", 0),
        vote_count=updated.get("upvotes", 0) - updated.get("downvotes", 0),
        user_vote=1,
        created_at=updated["created_at"]
    )


@router.delete("/{post_id}/comments/{comment_id}")
async def delete_comment(
    post_id: str,
    comment_id: str,
    current_user: TokenData = Depends(get_current_user)
):
    """Delete a comment (only by author)"""
    mongodb = get_mongodb()
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    comment = await mongodb.comments.find_one({"_id": comment_id, "post_id": post_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment["author_id"] != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")
    
    # Soft delete - replace content with [deleted]
    await mongodb.comments.update_one(
        {"_id": comment_id},
        {"$set": {"content": "[deleted]", "deleted": True}}
    )
    
    # Update post comment count
    await mongodb.posts.update_one(
        {"_id": post_id},
        {"$inc": {"comment_count": -1}}
    )
    
    return {"message": "Comment deleted successfully"}


@router.post("/{post_id}/comments/{comment_id}/vote")
async def vote_on_comment(
    post_id: str,
    comment_id: str,
    vote_data: VoteCreate,
    current_user: TokenData = Depends(get_current_user)
):
    """Vote on a comment"""
    mongodb = get_mongodb()
    redis_client = get_redis()
    
    if mongodb is None:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    comment = await mongodb.comments.find_one({"_id": comment_id, "post_id": post_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    # Get existing vote
    existing = 0
    if redis_client is not None:
        existing_str = redis_client.hget(f"comment_votes:{comment_id}", current_user.user_id)
        existing = int(existing_str) if existing_str else 0
    else:
        vote_doc = await mongodb.comment_votes.find_one({
            "comment_id": comment_id, "user_id": current_user.user_id
        })
        existing = vote_doc["vote"] if vote_doc else 0
    
    if existing == vote_data.vote:
        return {"message": "Vote unchanged", "vote_count": comment.get("upvotes", 0) - comment.get("downvotes", 0)}
    
    # Calculate deltas
    up_delta = 0
    down_delta = 0
    
    if existing == 1:
        up_delta -= 1
    elif existing == -1:
        down_delta -= 1
    
    if vote_data.vote == 1:
        up_delta += 1
    elif vote_data.vote == -1:
        down_delta += 1
    
    # Update vote tracking
    if redis_client is not None:
        if vote_data.vote == 0:
            redis_client.hdel(f"comment_votes:{comment_id}", current_user.user_id)
        else:
            redis_client.hset(f"comment_votes:{comment_id}", current_user.user_id, vote_data.vote)
    else:
        if vote_data.vote == 0:
            await mongodb.comment_votes.delete_one({
                "comment_id": comment_id, "user_id": current_user.user_id
            })
        else:
            await mongodb.comment_votes.update_one(
                {"comment_id": comment_id, "user_id": current_user.user_id},
                {"$set": {"vote": vote_data.vote}},
                upsert=True
            )
    
    # Update comment counts
    new_ups = comment.get("upvotes", 0) + up_delta
    new_downs = comment.get("downvotes", 0) + down_delta
    await mongodb.comments.update_one(
        {"_id": comment_id},
        {"$set": {"upvotes": new_ups, "downvotes": new_downs}}
    )
    
    # Update author karma
    karma_delta = vote_data.vote - existing
    await mongodb.users.update_one(
        {"_id": comment["author_id"]},
        {"$inc": {"karma": karma_delta}}
    )
    
    return {"message": "Vote recorded", "vote_count": new_ups - new_downs, "user_vote": vote_data.vote}


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user)
):
    """Upload an image"""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    s3_client = get_s3()
    if s3_client is None:
        raise HTTPException(status_code=503, detail="Image storage unavailable")
    
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "jpg"
    object_key = f"posts/{current_user.user_id}/{uuid.uuid4()}.{ext}"
    
    s3_client.upload_fileobj(
        file.file,
        settings.s3_bucket,
        object_key,
        ExtraArgs={"ContentType": file.content_type}
    )
    
    image_url = f"{settings.s3_endpoint}/{settings.s3_bucket}/{object_key}"
    return {"image_url": image_url}
