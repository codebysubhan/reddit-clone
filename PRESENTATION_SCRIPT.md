# Reddit Clone - Presentation Script
## Big Data Analytics Semester Project

---

# 🎯 PRESENTATION OVERVIEW

| Section | Duration | Content |
|---------|----------|---------|
| 1. Introduction | 2 min | Project overview, objectives |
| 2. Architecture | 3 min | System design, database selection |
| 3. Live Demo | 5 min | Working application showcase |
| 4. Database Deep Dive | 4 min | Show each database in action |
| 5. Big Data Concepts | 3 min | CAP theorem, consistency, scaling |
| 6. Conclusion | 2 min | Summary, lessons learned |
| 7. Q&A | 5 min | Questions from professors |

**Total: ~20-25 minutes**

---

# 📋 PRE-PRESENTATION CHECKLIST

Run these commands 10 minutes before presenting:

```bash
# Terminal 1: Start Cassandra
sudo -u cassandra JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64 /usr/sbin/cassandra
sleep 45

# Terminal 2: Start Backend
cd ~/Desktop/reddit_clone/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 3: Start Frontend
cd ~/Desktop/reddit_clone/frontend
npm run dev

# Terminal 4: Keep ready for commands
redis-cli
# (Keep this open for demo)

# Verify all services
curl -s http://localhost:8000/health | python3 -m json.tool
```

**Have these tabs open:**
- [ ] Frontend: http://localhost:3000
- [ ] Backend Docs: http://localhost:8000/docs
- [ ] Neo4j Browser: http://localhost:7474
- [ ] MongoDB Compass (optional)
- [ ] This script

---

# SECTION 1: INTRODUCTION (2 minutes)

## Opening Statement

> "Good morning/afternoon everyone. Today I'll be presenting my Big Data Analytics project - a **Reddit Clone** built to demonstrate **Polyglot Persistence** - the practice of using multiple specialized databases in a single application."

## Project Objectives

> "The main objectives of this project were to:
> 
> 1. **Demonstrate that one database doesn't fit all** - Different data types have different storage needs
> 2. **Handle large-scale social media data** - Posts, comments, votes, and relationships
> 3. **Implement real-time features** - Instant vote feedback, live rankings
> 4. **Build a graph-based recommendation engine** - Suggest communities based on user behavior
> 5. **Design for horizontal scalability** - Each component can scale independently"

## Quick Stats

> "To give you a sense of scale, our seed data includes:
> - **200 users** across the platform
> - **29 communities** in 5 categories
> - **1,700+ posts** with varied content
> - **34,000+ comments** with threading
> - **900,000+ votes** distributed across posts and comments
> 
> This data helps demonstrate how our architecture handles realistic social media workloads."

---

# SECTION 2: ARCHITECTURE (3 minutes)

## High-Level Overview

> "Let me walk you through our architecture."

**[Show architecture diagram from documentation or draw on whiteboard]**

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + TypeScript)               │
└─────────────────────────────────────────────────────────────────┘
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI + Python)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   ┌─────────┐          ┌─────────┐          ┌─────────┐
   │ MongoDB │          │  Redis  │          │  Neo4j  │
   │  :27017 │          │  :6379  │          │  :7687  │
   └─────────┘          └─────────┘          └─────────┘
        │                                         │
        └─────────────────┬───────────────────────┘
                          │
               ┌──────────┴──────────┐
               ▼                     ▼
          ┌─────────┐          ┌─────────┐
          │Cassandra│          │  MinIO  │
          │  :9042  │          │  :9000  │
          └─────────┘          └─────────┘
```

## Database Selection Rationale

> "The key question in polyglot persistence is: **Why this database for this data?**"

**[Explain each choice]**

| Database | Data Type | Why This Choice |
|----------|-----------|-----------------|
| **MongoDB** | Users, Posts, Subreddits | "Flexible schema - posts can have optional images, content varies. Rich querying for search. Aggregation pipeline for analytics." |
| **Redis** | Votes, Rankings, Cache | "Sub-millisecond latency - users expect instant vote feedback. Atomic operations prevent double-voting. Sorted sets are perfect for leaderboards." |
| **Neo4j** | Subscriptions, Recommendations | "Relationships are first-class citizens. Finding 'users who subscribe to similar subreddits' is one query, not multiple JOINs." |
| **Cassandra** | Time-series feed data | "Linear write scalability - can handle millions of posts. Optimized for time-range queries like 'latest posts in subreddit'." |
| **MinIO/S3** | Images, Media files | "Infinite storage without bloating the database. CDN-ready. Cost-effective at scale." |

> "This is the essence of polyglot persistence - **using the right tool for each job** rather than forcing everything into one database."

---

# SECTION 3: LIVE DEMO (5 minutes)

## Demo Script

### 3.1 Health Check (30 seconds)

> "First, let me show you that all 5 databases are connected."

**[Run in terminal]**
```bash
curl -s http://localhost:8000/health | python3 -m json.tool
```

**Expected output:**
```json
{
    "api": "healthy",
    "mongodb": "connected",
    "cassandra": "connected",
    "neo4j": "connected",
    "redis": "connected"
}
```

> "As you can see, all 5 database connections are healthy. Let's see them in action."

---

### 3.2 Browsing the Feed (1 minute)

**[Open frontend at http://localhost:3000]**

> "This is our Reddit clone. Notice the familiar layout - we have:
> - A feed of posts sorted by 'Hot' (our ranking algorithm)
> - Sorting options: Hot, New, Top
> - Subreddit sidebar with communities
> - User authentication"

**[Click through Hot, New, Top tabs]**

> "When I switch between Hot, New, and Top:
> - **Hot** uses Redis sorted sets with our ranking algorithm
> - **New** queries by creation time
> - **Top** sorts by vote count
> 
> Each query is optimized for its specific access pattern."

---

### 3.3 Voting System (1 minute)

> "Let me demonstrate the voting system - this is where Redis really shines."

**[Click upvote on a post]**

> "Notice how the vote registers **instantly**. There's no loading spinner. This is because:
> 1. The frontend does an **optimistic update** - it assumes success
> 2. Redis handles the vote with **atomic operations** - HINCRBY
> 3. The hot score is recalculated immediately in Redis"

**[Show Redis CLI in terminal]**
```bash
redis-cli
> HGETALL votes:<post_id>
> ZREVRANGE hot:all 0 5 WITHSCORES
```

> "Here you can see the actual vote data in Redis - user IDs mapped to their votes, and the sorted set maintaining our hot rankings."

---

### 3.4 Creating a Post (1 minute)

**[Click Create Post, fill in form]**

> "When I create a post, multiple databases are involved:
> 1. **MongoDB** stores the post document with flexible schema
> 2. **Redis** initializes vote tracking and adds to hot feed
> 3. **Cassandra** stores a copy for time-series queries
> 4. If I add an image, **MinIO/S3** stores the file"

**[Submit the post]**

> "The post appears immediately in the feed, demonstrating our write path across multiple databases."

---

### 3.5 Comments with Threading (1 minute)

**[Open a post with comments]**

> "Our comment system supports **threaded discussions** up to 10 levels deep. Each comment knows its parent, and we use a **path-based sorting** algorithm to maintain the tree structure."

**[Add a reply to a comment]**

> "Comments are stored in both MongoDB and Cassandra - MongoDB for flexibility, Cassandra for efficient retrieval sorted by the thread path."

---

### 3.6 Subreddit Recommendations (30 seconds)

**[Show recommendations in sidebar or go to recommendations page]**

> "This is powered by **Neo4j graph queries**. The algorithm finds users who subscribe to the same subreddits as you, then recommends subreddits they like that you haven't joined."

**[If logged in, show personalized recommendations]**

> "This collaborative filtering would require complex SQL with multiple JOINs, but in Neo4j it's a simple graph traversal."

---

# SECTION 4: DATABASE DEEP DIVE (4 minutes)

## 4.1 Neo4j Graph Visualization (1.5 minutes)

**[Open Neo4j Browser at http://localhost:7474]**

> "Let me show you the graph structure."

**[Run query]**
```cypher
MATCH (u:User)-[r:SUBSCRIBED]->(s:Subreddit)
RETURN u, r, s LIMIT 50
```

> "Here you can visualize users connected to subreddits through SUBSCRIBED relationships. This is the data structure that powers our recommendations."

**[Run recommendation query]**
```cypher
MATCH (me:User {username: 'pythonista_pro'})-[:SUBSCRIBED]->(sub:Subreddit)
      <-[:SUBSCRIBED]-(other:User)-[:SUBSCRIBED]->(rec:Subreddit)
WHERE NOT (me)-[:SUBSCRIBED]->(rec) AND me <> other
RETURN rec.name, COUNT(DISTINCT other) as overlap
ORDER BY overlap DESC
LIMIT 5
```

> "This single query finds recommendations based on user similarity - something that would be very complex in a relational database."

---

## 4.2 Redis Data Structures (1 minute)

**[In Redis CLI terminal]**

```bash
# Show vote tracking
HGETALL votes:<any_post_id>

# Show hot rankings
ZREVRANGE hot:all 0 10 WITHSCORES

# Show vote counts
HGETALL vote_counts:<any_post_id>
```

> "Redis stores:
> - **Hashes** for vote tracking (who voted what)
> - **Sorted Sets** for rankings (hot scores)
> - This enables O(1) vote checks and O(log n) ranking updates"

---

## 4.3 MongoDB Documents (1 minute)

**[Show in MongoDB Compass or terminal]**

```javascript
// Show a post document
db.posts.findOne()

// Show flexible schema - some posts have images, some don't
db.posts.find({image_url: {$exists: true}}).limit(1)
db.posts.find({image_url: {$exists: false}}).limit(1)
```

> "MongoDB's document model allows **flexible schemas**. Posts can optionally have images, different content types - all without schema migrations."

---

## 4.4 Cassandra Time-Series (30 seconds)

**[If time permits, show cqlsh]**

```sql
USE reddit_clone;
SELECT * FROM posts WHERE subreddit_id = <uuid> LIMIT 5;
```

> "Cassandra partitions data by subreddit and clusters by time - making 'get latest posts in subreddit' extremely efficient, even with millions of posts."

---

# SECTION 5: BIG DATA CONCEPTS (3 minutes)

## 5.1 CAP Theorem Application

> "Our system makes deliberate CAP theorem trade-offs:"

| Database | CAP Choice | Explanation |
|----------|------------|-------------|
| MongoDB | CP | "We prioritize consistency - users see accurate data" |
| Redis | AP | "High availability for votes - eventual consistency is acceptable" |
| Cassandra | AP (tunable) | "Available for writes, we tune consistency per query" |

> "For example, votes use eventual consistency - if two users vote simultaneously, we don't need perfect ordering, just eventual accuracy. But user authentication must be consistent - you can't have 'maybe logged in'."

---

## 5.2 Consistency Model

> "We implement **eventual consistency** for non-critical data:"

```
User votes → Redis (instant) → Background sync → MongoDB (persistent)
```

> "The user sees immediate feedback from Redis, while MongoDB is updated asynchronously. This is a conscious trade-off: **speed over immediate consistency** for votes."

---

## 5.3 Horizontal Scaling Strategy

> "Each database can scale independently:"

| Database | Scaling Method |
|----------|---------------|
| MongoDB | Sharding by subreddit_id |
| Redis | Cluster mode with hash slots |
| Cassandra | Add nodes, data rebalances automatically |
| Neo4j | Read replicas for query distribution |
| S3/MinIO | Unlimited object storage |

> "This is a key advantage of polyglot persistence - we can scale the bottleneck (e.g., Redis for votes during peak hours) without scaling everything."

---

## 5.4 Graceful Degradation

> "The system is designed to work even when some databases fail."

**[Demonstrate if time allows]**
```bash
# Stop Cassandra
sudo pkill -f cassandra

# App still works - just falls back to MongoDB for feeds
curl -s http://localhost:8000/health
```

> "If Cassandra goes down, we fall back to MongoDB. Users may see slightly slower feeds, but the app continues functioning."

---

# SECTION 6: CONCLUSION (2 minutes)

## Key Achievements

> "To summarize what we've built:"

1. ✅ **Polyglot Persistence** - 5 databases working together
2. ✅ **Real-time Features** - Sub-millisecond vote updates
3. ✅ **Graph-based Recommendations** - Neo4j collaborative filtering
4. ✅ **Scalable Architecture** - Each component scales independently
5. ✅ **Full CRUD Operations** - Posts, comments, users, subreddits
6. ✅ **OAuth Integration** - Google Sign-In
7. ✅ **Modern Tech Stack** - FastAPI, React, TypeScript

---

## Lessons Learned

> "Key insights from this project:"

1. **"Right tool for the right job"** - Using Redis for votes reduced latency by 10x compared to MongoDB
2. **"Denormalization has trade-offs"** - Faster reads, but we must carefully manage updates
3. **"Graph databases excel at relationships"** - What would be 5 SQL JOINs became 1 Cypher query
4. **"Design for failure"** - Graceful degradation keeps the app running

---

## Future Enhancements

> "If we were to continue developing this project:"

- Vector database for semantic search (find similar posts by meaning)
- WebSockets for real-time notifications
- Kafka/RabbitMQ for async event processing
- Kubernetes for container orchestration

---

## Closing Statement

> "This project demonstrates that **modern applications benefit from specialized databases**. By understanding the strengths of each database type and matching them to our data access patterns, we built a system that's both performant and scalable.
>
> Thank you for your attention. I'm happy to answer any questions."

---

# SECTION 7: Q&A PREPARATION

## Anticipated Questions & Answers

### Q: "Why not just use PostgreSQL for everything?"

> "Great question. PostgreSQL is excellent and could handle all this data. However:
> - Votes would require table locks or complex transaction handling - Redis does this atomically
> - Recommendations would need recursive CTEs or multiple JOINs - Neo4j handles this natively
> - We'd lose the ability to scale components independently
> 
> Polyglot persistence isn't about 'can't' - it's about optimal performance at scale."

---

### Q: "How do you handle data consistency across databases?"

> "We use **eventual consistency** for non-critical operations like votes. Critical operations like user creation are synchronous across MongoDB and Neo4j. For votes:
> 1. Redis is the source of truth for real-time
> 2. MongoDB is updated asynchronously
> 3. Any discrepancy resolves within seconds"

---

### Q: "What happens if Redis goes down?"

> "We have fallback logic. If Redis is unavailable:
> 1. Votes are stored directly in MongoDB (slower but functional)
> 2. Hot rankings fall back to MongoDB aggregation
> 3. The app continues working, just with degraded performance
> 
> This is graceful degradation - essential for production systems."

---

### Q: "How would this scale to millions of users?"

> "Each database scales differently:
> - **MongoDB**: Shard by subreddit_id or user_id
> - **Redis**: Cluster mode distributes across nodes
> - **Cassandra**: Add nodes, it rebalances automatically
> - **Neo4j**: Read replicas for query distribution
> 
> The beauty is we can scale only what needs scaling. If votes are the bottleneck, we add Redis nodes without touching MongoDB."

---

### Q: "Why Cassandra when MongoDB already stores posts?"

> "Cassandra is optimized for **time-series writes** and **partition-based reads**. 
> - Writing 10,000 posts/second? Cassandra handles it linearly.
> - 'Get posts from subreddit X in the last hour' is a single partition scan.
> 
> MongoDB is better for complex queries and flexibility. We use both for their strengths."

---

### Q: "What's the most challenging part of this project?"

> "Honestly, **keeping data in sync** across databases. When a user deletes a post:
> - Delete from MongoDB
> - Remove from Redis hot rankings
> - Delete from Cassandra
> - Clean up votes
> 
> We had to carefully design cascading operations and handle partial failures."

---

### Q: "Can you explain the hot ranking algorithm?"

> "We use Reddit's algorithm:
> ```
> score = log10(max(|votes|, 1)) × sign(votes)
> hot_score = score + (timestamp / 45000)
> ```
> - More votes = higher score (logarithmic, so diminishing returns)
> - Newer posts get a boost (timestamp factor)
> - Stored in Redis sorted sets for O(log n) ranking updates"

---

# 📝 NOTES FOR PRESENTER

## Timing Cues
- If running long: Skip Cassandra deep dive
- If running short: Add more Neo4j graph visualizations
- If questions are slow: Offer to show code implementation

## Emergency Procedures
- **Database won't connect**: Have backup video ready
- **Frontend crash**: Show API directly at /docs
- **Forgot password**: Create new test user live

## Body Language
- Stand confidently
- Make eye contact with all professors
- Use hand gestures when explaining architecture
- Point to diagrams/screens while explaining

## Remember
- You built this - you know it best
- It's okay to say "Let me check that" for specific questions
- Enthusiasm is contagious - show you're proud of the work!

---

**Good luck! You've got this! 🚀**





