# Reddit Clone - Big Data Analytics Project
## Comprehensive Technical Documentation

---

# Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Polyglot Persistence - Database Design](#3-polyglot-persistence---database-design)
4. [Technology Stack](#4-technology-stack)
5. [Features Implementation](#5-features-implementation)
6. [Big Data Concepts Demonstrated](#6-big-data-concepts-demonstrated)
7. [API Documentation](#7-api-documentation)
8. [Data Flow & Algorithms](#8-data-flow--algorithms)
9. [Security Implementation](#9-security-implementation)
10. [Performance Optimizations](#10-performance-optimizations)
11. [Setup & Deployment](#11-setup--deployment)
12. [Conclusion](#12-conclusion)

---

# 1. Project Overview

## 1.1 Introduction

This project is a **Reddit Clone** built as a demonstration of **Polyglot Persistence** - the practice of using multiple database technologies in a single application, each chosen for its specific strengths. The application mimics core Reddit functionality while showcasing how different databases excel at different tasks in a big data context.

## 1.2 Objectives

1. **Demonstrate Polyglot Persistence**: Use 5 different database technologies appropriately
2. **Handle Large-Scale Data**: Support millions of posts, comments, and votes
3. **Real-time Features**: Implement hot rankings, live vote counts
4. **Graph-Based Recommendations**: Leverage graph databases for social features
5. **Scalable Architecture**: Design for horizontal scaling

## 1.3 Key Metrics (Seed Data)

| Metric | Count |
|--------|-------|
| Users | 200 |
| Subreddits | 29 (5 categories) |
| Posts | 1,693 |
| Comments | 33,906 |
| Post Votes | ~388,000 |
| Comment Votes | ~502,000 |
| Subscriptions | 2,112 |

---

# 2. System Architecture

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              React + TypeScript Frontend                 │    │
│  │         (Vite, TailwindCSS, React Query)                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 FastAPI Backend                          │    │
│  │    (Python 3.12, Async, JWT Auth, CORS)                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   MongoDB     │   │    Redis      │   │    Neo4j      │
│  (Documents)  │   │   (Cache)     │   │   (Graph)     │
└───────────────┘   └───────────────┘   └───────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
            ┌───────────────┐   ┌───────────────┐
            │  Cassandra    │   │   MinIO/S3    │
            │ (Wide-Column) │   │   (Objects)   │
            └───────────────┘   └───────────────┘
```

## 2.2 Component Interaction

```
User Action          Frontend              Backend              Databases
    │                   │                    │                     │
    │ Click Upvote      │                    │                     │
    ├──────────────────►│                    │                     │
    │                   │ POST /api/vote     │                     │
    │                   ├───────────────────►│                     │
    │                   │                    │ HSET votes:post_id  │
    │                   │                    ├────────────────────►│ Redis
    │                   │                    │ Update hot score    │
    │                   │                    ├────────────────────►│ Redis
    │                   │                    │ Update karma        │
    │                   │                    ├────────────────────►│ MongoDB
    │                   │                    │◄────────────────────┤
    │                   │◄───────────────────┤                     │
    │ Optimistic Update │                    │                     │
    │◄──────────────────┤                    │                     │
```

---

# 3. Polyglot Persistence - Database Design

## 3.1 Why Polyglot Persistence?

> "One size does NOT fit all in data storage."

Different data types have different access patterns, consistency requirements, and scaling needs. Using a single database for everything leads to:
- Performance bottlenecks
- Complex workarounds
- Inability to scale specific components

## 3.2 Database Selection Matrix

| Database | Type | Use Case | Why This Choice |
|----------|------|----------|-----------------|
| **MongoDB** | Document | Users, Posts, Subreddits | Flexible schema, rich queries, aggregation pipeline |
| **Redis** | Key-Value | Votes, Hot Rankings, Cache | Sub-millisecond latency, atomic operations, sorted sets |
| **Neo4j** | Graph | Subscriptions, Recommendations | Relationship traversal, graph algorithms |
| **Cassandra** | Wide-Column | High-write feeds (optional) | Linear scalability, time-series data |
| **MinIO/S3** | Object | Images, Media | Unlimited storage, CDN-ready, cheap |

## 3.3 Detailed Database Usage

### 3.3.1 MongoDB (Document Store)

**Collections:**
```javascript
// users
{
  "_id": "uuid",
  "username": "string",
  "email": "string",
  "password_hash": "string",
  "google_id": "string (optional)",
  "karma": "number",
  "created_at": "datetime"
}

// subreddits
{
  "_id": "uuid",
  "name": "string",
  "description": "string",
  "creator_id": "uuid",
  "member_count": "number",
  "category": "string",
  "created_at": "datetime"
}

// posts
{
  "_id": "uuid",
  "title": "string",
  "content": "string",
  "subreddit_id": "uuid",
  "subreddit_name": "string",
  "author_id": "uuid",
  "author_username": "string",
  "image_url": "string",
  "upvotes": "number",
  "downvotes": "number",
  "comment_count": "number",
  "created_at": "datetime"
}

// comments
{
  "_id": "uuid",
  "post_id": "uuid",
  "content": "string",
  "author_id": "uuid",
  "parent_id": "uuid (null for root)",
  "depth": "number",
  "upvotes": "number",
  "downvotes": "number",
  "created_at": "datetime"
}
```

**Why MongoDB?**
- **Flexible Schema**: Posts can have optional fields (image_url, content)
- **Embedded Documents**: Denormalized data for faster reads
- **Text Search**: Built-in full-text indexing for search
- **Aggregation Pipeline**: Complex analytics queries

### 3.3.2 Redis (In-Memory Cache & Real-time)

**Data Structures Used:**

```redis
# Vote tracking (Hash)
votes:{post_id} = {
  "user_id_1": 1,    # upvote
  "user_id_2": -1,   # downvote
}

# Vote counts (Hash) 
vote_counts:{post_id} = {
  "up": 150,
  "down": 12
}

# Hot posts ranking (Sorted Set)
hot:all = [
  (post_id_1, score_1),
  (post_id_2, score_2),
  ...
]

hot:{subreddit_id} = [
  (post_id_1, score_1),
  ...
]

# Comment votes (Hash)
comment_votes:{comment_id} = {
  "user_id": vote
}
```

**Why Redis?**
- **Speed**: Sub-millisecond operations (votes need instant feedback)
- **Atomic Operations**: HINCRBY prevents race conditions
- **Sorted Sets**: Perfect for leaderboards/rankings
- **Memory Efficiency**: Vote data fits in RAM

### 3.3.3 Neo4j (Graph Database)

**Graph Model:**

```cypher
// Nodes
(:User {id, username})
(:Subreddit {id, name, category})

// Relationships
(User)-[:SUBSCRIBED]->(Subreddit)
```

**Key Queries:**

```cypher
// Get user's subscriptions
MATCH (u:User {id: $user_id})-[:SUBSCRIBED]->(s:Subreddit)
RETURN s

// Recommend subreddits (collaborative filtering)
MATCH (u:User {id: $user_id})-[:SUBSCRIBED]->(s:Subreddit)
      <-[:SUBSCRIBED]-(other:User)-[:SUBSCRIBED]->(rec:Subreddit)
WHERE NOT (u)-[:SUBSCRIBED]->(rec)
RETURN rec.name, COUNT(other) as overlap
ORDER BY overlap DESC
LIMIT 5
```

**Why Neo4j?**
- **Relationship-First**: Subscriptions are relationships, not join tables
- **Graph Algorithms**: Built-in PageRank, community detection
- **Pattern Matching**: Find similar users in one query
- **No Join Overhead**: Traversal is O(1) per relationship

### 3.3.4 MinIO/S3 (Object Storage)

**Bucket Structure:**
```
reddit-images/
├── posts/
│   └── {user_id}/
│       └── {uuid}.{ext}
└── avatars/
    └── {user_id}.{ext}
```

**Why S3/MinIO?**
- **Unlimited Storage**: No database bloat from binary data
- **CDN Integration**: Serve images globally
- **Cost Effective**: Cheapest storage per GB
- **Presigned URLs**: Secure direct uploads

### 3.3.5 Cassandra (Wide-Column - Optional)

**Table Design:**
```cql
CREATE TABLE posts (
    subreddit_id UUID,
    created_at TIMESTAMP,
    post_id UUID,
    author_id UUID,
    title TEXT,
    content TEXT,
    image_url TEXT,
    upvotes INT,
    downvotes INT,
    PRIMARY KEY ((subreddit_id), created_at, post_id)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

**Why Cassandra?**
- **Write Throughput**: 100K+ writes/second
- **Time-Series**: Perfect for feeds sorted by time
- **Linear Scaling**: Add nodes, get linear performance
- **No Single Point of Failure**: Masterless architecture

---

# 4. Technology Stack

## 4.1 Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Python** | 3.12 | Primary language |
| **FastAPI** | 0.109+ | Async REST framework |
| **Uvicorn** | 0.27+ | ASGI server |
| **Motor** | 3.3+ | Async MongoDB driver |
| **Redis-py** | 5.0+ | Redis client |
| **Neo4j** | 5.16+ | Graph database driver |
| **Boto3** | 1.34+ | S3/MinIO client |
| **PyJWT** | 3.3+ | JWT authentication |
| **Passlib** | 1.7+ | Password hashing (bcrypt) |
| **HTTPX** | 0.28+ | Async HTTP (OAuth) |

## 4.2 Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18+ | UI framework |
| **TypeScript** | 5+ | Type safety |
| **Vite** | 5+ | Build tool |
| **TailwindCSS** | 3+ | Styling |
| **React Query** | 5+ | Data fetching & caching |
| **React Router** | 6+ | Routing |
| **Zustand** | 4+ | State management |
| **date-fns** | 3+ | Date formatting |
| **Lucide React** | 0.300+ | Icons |

## 4.3 Database Technologies

| Database | Version | Port | Purpose |
|----------|---------|------|---------|
| MongoDB | 7.0+ | 27017 | Document store |
| Redis | 7.0+ | 6379 | Cache & real-time |
| Neo4j | 5.0+ | 7687 | Graph database |
| Cassandra | 4.1+ | 9042 | Wide-column (optional) |
| MinIO | Latest | 9000 | Object storage |

---

# 5. Features Implementation

## 5.1 Core Features

### 5.1.1 User Authentication

| Feature | Technology | Implementation |
|---------|------------|----------------|
| Registration | MongoDB + bcrypt | Store hashed passwords |
| Login | JWT + Redis | Stateless tokens |
| Google OAuth | HTTPX + Google API | OAuth 2.0 flow |
| Password Reset | SMTP + MongoDB | Token-based reset |

**Flow:**
```
1. User registers → Password hashed with bcrypt → Stored in MongoDB
2. User logs in → Verify password → Generate JWT → Return token
3. Protected routes → Verify JWT → Extract user_id
4. Google OAuth → Exchange code → Get user info → Create/link account
```

### 5.1.2 Posts & Comments (CRUD)

| Operation | Databases Used | Why |
|-----------|---------------|-----|
| Create Post | MongoDB, Redis, S3 | Store metadata, initialize votes, upload image |
| Read Feed | Redis + MongoDB | Get hot scores from Redis, full data from MongoDB |
| Update Post | MongoDB | Only metadata changes |
| Delete Post | MongoDB, Redis, S3 | Cascade delete across all stores |

### 5.1.3 Voting System

**Architecture:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   FastAPI   │────▶│    Redis    │
│ (Optimistic)│     │  (Validate) │     │  (Atomic)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   MongoDB   │
                    │ (Fallback)  │
                    └─────────────┘
```

**Why Redis for Votes?**
- **Atomic Operations**: `HINCRBY` prevents race conditions
- **Speed**: <1ms latency for vote feedback
- **Deduplication**: Hash structure prevents double-voting

### 5.1.4 Hot Ranking Algorithm

Based on Reddit's algorithm:

```python
def hot_score(ups: int, downs: int, created_timestamp: float) -> float:
    """
    Reddit's hot ranking algorithm
    - Higher score = higher in feed
    - New posts get initial boost
    - Votes increase score logarithmically
    - Time decay after 12 hours
    """
    score = ups - downs
    order = math.log10(max(abs(score), 1))
    sign = 1 if score > 0 else (-1 if score < 0 else 0)
    
    # Epoch: Jan 1, 2000
    seconds = created_timestamp - 946684800
    
    return round(sign * order + seconds / 45000, 7)
```

**Stored in Redis Sorted Sets:**
```redis
ZADD hot:all {score} {post_id}
ZREVRANGE hot:all 0 19  # Get top 20
```

### 5.1.5 Subreddit Recommendations

**Graph-Based Collaborative Filtering:**

```cypher
// Users who subscribe to same subreddits as you
// also subscribe to these (that you don't)
MATCH (me:User {id: $user_id})-[:SUBSCRIBED]->(common:Subreddit)
      <-[:SUBSCRIBED]-(similar:User)-[:SUBSCRIBED]->(rec:Subreddit)
WHERE me <> similar 
  AND NOT (me)-[:SUBSCRIBED]->(rec)
RETURN rec.name, rec.id, COUNT(similar) as overlap_score
ORDER BY overlap_score DESC
LIMIT 5
```

**Why This Works:**
- If you like Python and JavaScript subreddits
- Find users who also like both
- See what else they subscribe to
- Recommend those subreddits

### 5.1.6 Search Implementation

**MongoDB Text Search:**
```javascript
// Create text index
db.posts.createIndex({ title: "text", content: "text" })

// Search query
db.posts.find(
  { $text: { $search: "machine learning" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

### 5.1.7 Image Upload Pipeline

```
1. Client selects image
2. Frontend validates (size < 10MB, type = image/*)
3. POST to /api/posts/upload-image
4. Backend generates unique filename
5. Upload to MinIO/S3
6. Return public URL
7. Include URL in post creation
```

---

# 6. Big Data Concepts Demonstrated

## 6.1 CAP Theorem Application

| Database | Consistency | Availability | Partition Tolerance | Trade-off |
|----------|-------------|--------------|---------------------|-----------|
| MongoDB | Strong | High | Yes | CP system (consistency over availability) |
| Redis | Eventual | Very High | Limited | AP for cache, sync for critical ops |
| Neo4j | Strong | High | Limited | Optimized for single-cluster |
| Cassandra | Tunable | Very High | Yes | AP with tunable consistency |

## 6.2 Data Partitioning Strategies

### 6.2.1 MongoDB Sharding (Horizontal)
```
Collection: posts
Shard Key: subreddit_id (hashed)

Shard 1: subreddits A-M
Shard 2: subreddits N-Z
```

### 6.2.2 Redis Clustering
```
Slot 0-5460:    Node 1 (votes for posts 0-33%)
Slot 5461-10922: Node 2 (votes for posts 33-66%)
Slot 10923-16383: Node 3 (votes for posts 66-100%)
```

### 6.2.3 Cassandra Partitioning
```
Partition Key: subreddit_id
Clustering Key: created_at DESC, post_id

Each subreddit's posts on same node = efficient time-range queries
```

## 6.3 Replication Strategies

| Database | Replication Type | Consistency Model |
|----------|------------------|-------------------|
| MongoDB | Replica Sets (Primary-Secondary) | Read-your-writes |
| Redis | Master-Replica | Async replication |
| Cassandra | Multi-datacenter | Tunable (ONE, QUORUM, ALL) |

## 6.4 Caching Strategies

### 6.4.1 Cache-Aside Pattern (Used)
```python
async def get_post(post_id: str):
    # 1. Check cache
    cached = redis.get(f"post:{post_id}")
    if cached:
        return json.loads(cached)
    
    # 2. Cache miss → fetch from DB
    post = await mongodb.posts.find_one({"_id": post_id})
    
    # 3. Populate cache
    redis.setex(f"post:{post_id}", 300, json.dumps(post))
    
    return post
```

### 6.4.2 Write-Through for Votes
```python
async def vote(post_id: str, user_id: str, vote: int):
    # Update Redis (primary)
    redis.hset(f"votes:{post_id}", user_id, vote)
    
    # Sync to MongoDB (async/eventual)
    await mongodb.posts.update_one(
        {"_id": post_id},
        {"$set": {"upvotes": get_upvotes(post_id)}}
    )
```

## 6.5 Eventual Consistency Handling

**Problem**: Vote counts may be slightly out of sync

**Solution**: 
1. Redis is source of truth for real-time
2. MongoDB synced periodically
3. Frontend shows optimistic updates
4. Reconciliation on page refresh

## 6.6 Time-Series Data (Cassandra)

```
┌─────────────────────────────────────────────────────┐
│ Partition: subreddit_id = "programming"             │
├──────────────────┬──────────────────┬───────────────┤
│ created_at       │ post_id          │ title         │
├──────────────────┼──────────────────┼───────────────┤
│ 2024-01-15 12:00 │ uuid-1           │ "Post 1"      │
│ 2024-01-15 11:30 │ uuid-2           │ "Post 2"      │
│ 2024-01-15 10:00 │ uuid-3           │ "Post 3"      │
│ ...              │ ...              │ ...           │
└──────────────────┴──────────────────┴───────────────┘
```

**Query**: Get latest 20 posts in r/programming
```cql
SELECT * FROM posts 
WHERE subreddit_id = 'programming-uuid'
ORDER BY created_at DESC
LIMIT 20;
```
**Performance**: O(1) - single partition scan

---

# 7. API Documentation

## 7.1 Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Login and get JWT |
| GET | `/api/users/me` | Get current user |
| PATCH | `/api/users/me` | Update profile |
| DELETE | `/api/users/me` | Delete account |

## 7.2 OAuth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/google/login` | Redirect to Google |
| GET | `/api/auth/google/callback` | OAuth callback |
| GET | `/api/auth/google/status` | Check if OAuth enabled |

## 7.3 Password Reset Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/password/forgot` | Request reset email |
| POST | `/api/password/reset` | Reset with token |
| GET | `/api/password/verify-token/{token}` | Validate token |

## 7.4 Posts Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts/feed` | Get paginated feed |
| GET | `/api/posts/{id}` | Get single post |
| POST | `/api/posts` | Create post |
| PATCH | `/api/posts/{id}` | Update post |
| DELETE | `/api/posts/{id}` | Delete post |
| POST | `/api/posts/{id}/vote` | Vote on post |
| POST | `/api/posts/upload-image` | Upload image |

## 7.5 Comments Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts/{id}/comments` | Get comments |
| POST | `/api/posts/{id}/comments` | Create comment |
| PATCH | `/api/posts/{id}/comments/{cid}` | Update comment |
| DELETE | `/api/posts/{id}/comments/{cid}` | Delete comment |
| POST | `/api/posts/{id}/comments/{cid}/vote` | Vote on comment |

## 7.6 Subreddits Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subreddits` | List all |
| GET | `/api/subreddits/r/{name}` | Get by name |
| POST | `/api/subreddits` | Create subreddit |
| PATCH | `/api/subreddits/{id}` | Update subreddit |
| DELETE | `/api/subreddits/{id}` | Delete subreddit |
| POST | `/api/subreddits/{id}/join` | Join |
| POST | `/api/subreddits/{id}/leave` | Leave |
| GET | `/api/subreddits/recommendations/for-me` | Get recommendations |

## 7.7 Search Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search/posts?q=` | Search posts |
| GET | `/api/search/subreddits?q=` | Search subreddits |
| GET | `/api/search/users?q=` | Search users |
| GET | `/api/search/all?q=` | Search everything |

## 7.8 Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/overview` | Platform stats |
| GET | `/api/analytics/top-subreddits` | Top communities |
| GET | `/api/analytics/trending` | Trending topics |
| GET | `/api/analytics/user-graph-stats` | Graph analytics |
| GET | `/api/analytics/my-stats` | User's stats |

---

# 8. Data Flow & Algorithms

## 8.1 Feed Generation Flow

```
User requests feed (sort=hot)
         │
         ▼
┌─────────────────────────┐
│ Check Redis sorted set  │
│ ZREVRANGE hot:all 0 19  │
└─────────────────────────┘
         │
         ▼ [post_ids with scores]
┌─────────────────────────┐
│ Fetch full posts from   │
│ MongoDB by IDs          │
└─────────────────────────┘
         │
         ▼ [full post objects]
┌─────────────────────────┐
│ Get user's votes from   │
│ Redis HGET votes:{id}   │
└─────────────────────────┘
         │
         ▼ [posts with user_vote]
┌─────────────────────────┐
│ Return paginated feed   │
│ with cursor             │
└─────────────────────────┘
```

## 8.2 Cursor-Based Pagination

**Why not offset-based?**
- Offset is O(n) - must skip rows
- Inconsistent with real-time data
- Poor performance at high pages

**Cursor implementation:**
```python
# Encode cursor
cursor = base64.encode(json.dumps({
    "score": last_item.hot_score,
    "id": last_item.id
}))

# Decode and query
cursor_data = json.loads(base64.decode(cursor))
redis.zrevrangebyscore(
    "hot:all",
    max=cursor_data["score"],
    min="-inf",
    start=0,
    num=limit
)
```

## 8.3 Comment Threading Algorithm

```python
def build_comment_tree(comments: list) -> dict:
    """
    Input: Flat list of comments with parent_id
    Output: Nested tree structure
    """
    tree = {}
    
    for comment in comments:
        parent = comment.get("parent_id")
        if parent not in tree:
            tree[parent] = []
        tree[parent].append(comment)
    
    return tree
    
# Usage
root_comments = tree[None]  # Top-level comments
for comment in root_comments:
    children = tree.get(comment["id"], [])
```

---

# 9. Security Implementation

## 9.1 Authentication Security

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcrypt with salt rounds = 12 |
| JWT Tokens | HS256, 7-day expiry |
| Token Storage | httpOnly cookies (frontend localStorage) |
| Password Length | Truncated to 72 bytes (bcrypt limit) |

## 9.2 Authorization

```python
# Route-level protection
@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    current_user: TokenData = Depends(get_current_user)  # Requires auth
):
    post = await mongodb.posts.find_one({"_id": post_id})
    
    # Owner check
    if post["author_id"] != current_user.user_id:
        raise HTTPException(403, "Not authorized")
```

## 9.3 Input Validation

```python
# Pydantic models
class PostCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    content: Optional[str] = Field(None, max_length=40000)
    subreddit_id: str
    
    @validator('title')
    def sanitize_title(cls, v):
        return v.strip()
```

## 9.4 CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

# 10. Performance Optimizations

## 10.1 Database Indexing

### MongoDB Indexes
```javascript
// Compound indexes for common queries
db.posts.createIndex({ "subreddit_id": 1, "created_at": -1 })
db.posts.createIndex({ "author_id": 1, "created_at": -1 })
db.comments.createIndex({ "post_id": 1, "path": 1 })

// Text index for search
db.posts.createIndex({ "title": "text", "content": "text" })
```

### Neo4j Indexes
```cypher
CREATE INDEX user_id FOR (u:User) ON (u.id)
CREATE INDEX subreddit_id FOR (s:Subreddit) ON (s.id)
```

## 10.2 Query Optimization

**N+1 Prevention:**
```python
# Bad: N+1 queries
for post in posts:
    author = await db.users.find_one({"_id": post["author_id"]})

# Good: Batch fetch
author_ids = [p["author_id"] for p in posts]
authors = await db.users.find({"_id": {"$in": author_ids}}).to_list()
author_map = {a["_id"]: a for a in authors}
```

## 10.3 Frontend Optimizations

| Technique | Implementation |
|-----------|----------------|
| **Optimistic Updates** | Update UI before server confirms |
| **Infinite Scroll** | Load data as user scrolls |
| **Query Caching** | React Query 5-minute stale time |
| **Image Lazy Loading** | `loading="lazy"` attribute |
| **Code Splitting** | Dynamic imports for routes |

---

# 11. Setup & Deployment

## 11.1 Prerequisites

```bash
# Required
- Python 3.10+
- Node.js 18+
- MongoDB 7.0+
- Redis 7.0+
- Neo4j 5.0+
- MinIO (or AWS S3)

# Optional
- Cassandra 4.1+ (requires Java 11)
```

## 11.2 Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install uv
uv sync

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run server
uvicorn app.main:app --reload --port 8000
```

## 11.3 Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

## 11.4 Seed Data

```bash
cd backend
source .venv/bin/activate
python seed_data.py
```

## 11.5 Environment Variables

```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=reddit_clone

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# MinIO/S3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=reddit-images

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRE_MINUTES=10080

# Google OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

# Email (Gmail SMTP)
MAIL_USERNAME=your@gmail.com
MAIL_PASSWORD=app-password
MAIL_FROM=your@gmail.com
```

---

# 12. Conclusion

## 12.1 Key Achievements

1. **Polyglot Persistence**: Successfully integrated 5 different database technologies
2. **Scalable Architecture**: Each component can scale independently
3. **Real-time Features**: Sub-millisecond vote updates with Redis
4. **Graph Analytics**: Neo4j-powered recommendations
5. **Full CRUD**: Complete create, read, update, delete for all entities
6. **OAuth Integration**: Google Sign-In with automatic account linking
7. **Search**: Full-text search across posts

## 12.2 Lessons Learned

1. **Right tool for the right job**: Using Redis for votes instead of MongoDB reduced latency by 10x
2. **Graceful degradation**: App works even when Cassandra is offline
3. **Denormalization trade-offs**: Faster reads, but careful update management
4. **Graph databases shine**: Recommendations that would be complex SQL are simple Cypher

## 12.3 Future Enhancements

- [ ] Vector database for semantic search (Qdrant/Pinecone)
- [ ] Real-time notifications with WebSockets
- [ ] Message queue for async processing (RabbitMQ/Kafka)
- [ ] Kubernetes deployment for horizontal scaling
- [ ] CDN for image serving
- [ ] Rate limiting with Redis

## 12.4 References

1. Reddit's Ranking Algorithms: https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9
2. Polyglot Persistence: https://martinfowler.com/bliki/PolyglotPersistence.html
3. CAP Theorem: https://en.wikipedia.org/wiki/CAP_theorem
4. Neo4j Cypher Manual: https://neo4j.com/docs/cypher-manual/current/
5. MongoDB Aggregation: https://www.mongodb.com/docs/manual/aggregation/
6. Redis Data Structures: https://redis.io/docs/data-types/

---

*Documentation generated: December 2024*

