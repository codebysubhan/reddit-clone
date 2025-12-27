from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


# ============ USER SCHEMAS ============
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    karma: int = 0
    created_at: datetime


class UserProfile(BaseModel):
    id: str
    username: str
    karma: int
    post_count: int
    comment_count: int
    created_at: datetime


# ============ SUBREDDIT SCHEMAS ============
class SubredditCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=21, pattern=r'^[a-zA-Z0-9_]+$')
    description: str = Field(..., max_length=500)


class SubredditResponse(BaseModel):
    id: str
    name: str
    description: str
    member_count: int
    created_at: datetime
    creator_id: str
    is_member: bool = False


# ============ POST SCHEMAS ============
class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    content: Optional[str] = Field(None, max_length=40000)
    subreddit_id: str
    image_url: Optional[str] = None


class PostResponse(BaseModel):
    id: str
    title: str
    content: Optional[str]
    subreddit_id: str
    subreddit_name: str
    author_id: str
    author_username: str
    image_url: Optional[str]
    vote_count: int
    comment_count: int
    user_vote: Optional[int] = None  # -1, 0, 1
    created_at: datetime


class PostFeed(BaseModel):
    posts: list[PostResponse]
    next_cursor: Optional[str] = None
    has_more: bool = False


# ============ COMMENT SCHEMAS ============
class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    parent_id: Optional[str] = None  # None for top-level comments


class CommentResponse(BaseModel):
    id: str
    post_id: str
    content: str
    author_id: str
    author_username: str
    parent_id: Optional[str]
    depth: int
    vote_count: int
    user_vote: Optional[int] = None
    created_at: datetime


# ============ VOTE SCHEMAS ============
class VoteCreate(BaseModel):
    vote: int = Field(..., ge=-1, le=1)  # -1 downvote, 0 remove, 1 upvote


# ============ RECOMMENDATION SCHEMAS ============
class SubredditRecommendation(BaseModel):
    id: str
    name: str
    description: str
    member_count: int
    overlap_score: int  # How many similar users


# ============ ANALYTICS SCHEMAS ============
class AnalyticsOverview(BaseModel):
    total_users: int
    total_posts: int
    total_comments: int
    total_subreddits: int
    posts_today: int
    active_users_today: int


class SubredditAnalytics(BaseModel):
    name: str
    member_count: int
    post_count: int


class TrendingData(BaseModel):
    subreddit: str
    post_count: int
    vote_activity: int


# ============ TOKEN SCHEMAS ============
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str
    username: str

