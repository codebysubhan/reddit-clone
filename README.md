# Reddit Clone - Polyglot Persistence Demo

A Reddit-like social platform demonstrating **polyglot persistence** principles.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React + TypeScript                        │
│                    (Vite + Tailwind CSS)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│              (REST API + JWT Authentication)                 │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   MongoDB   │      │  Cassandra  │      │   Neo4j     │
│   Users     │      │   Posts     │      │   Social    │
│   Metadata  │      │   Comments  │      │   Graph     │
└─────────────┘      └─────────────┘      └─────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
             ┌───────────┐        ┌───────────┐
             │   Redis   │        │   MinIO   │
             │   Cache   │        │   Images  │
             │   Voting  │        │   (S3)    │
             └───────────┘        └───────────┘
```

## 🗃️ Database Usage

| Database | Purpose | Why This DB? |
|----------|---------|--------------|
| **MongoDB** | User profiles, subreddit metadata | Flexible schema, fast reads |
| **Cassandra** | Posts, comments | High write throughput, time-series partitioning |
| **Neo4j** | Social graph, recommendations | Efficient relationship traversal |
| **Redis** | Caching, voting, hot rankings | In-memory speed, sorted sets |
| **MinIO/S3** | Image storage | Blob storage, CDN-ready |

## ✨ Features

- ✅ User authentication (JWT)
- ✅ Subreddit creation & management
- ✅ Posts with image uploads
- ✅ Nested comments
- ✅ Upvote/Downvote with deduplication
- ✅ Hot/Trending algorithm (Reddit-style)
- ✅ Cursor-based infinite scroll
- ✅ Graph-based recommendations
- ✅ Analytics dashboard

## 🚀 Quick Start

### Prerequisites

Install databases locally or use cloud free tiers:
- MongoDB (or MongoDB Atlas)
- Cassandra (or Astra DB)
- Neo4j (or Neo4j Aura)
- Redis (or Redis Cloud)
- MinIO (optional, for images)

### Backend Setup (using uv)

```bash
cd backend

# Install uv if you haven't
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create venv and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv sync

# Run the server
uvicorn app.main:app --reload --port 8000
```

Or with pip (alternative):
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend: http://localhost:3000

## 📁 Project Structure

```
reddit_clone/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   ├── config.py         # Settings
│   │   ├── db.py             # All database connections
│   │   ├── auth.py           # JWT authentication
│   │   ├── schemas.py        # Pydantic models
│   │   └── routes/
│   │       ├── users.py      # Auth & profiles
│   │       ├── subreddits.py # Communities
│   │       ├── posts.py      # Posts, comments, voting
│   │       └── analytics.py  # Dashboard data
│   └── pyproject.toml
│
├── frontend/
│   ├── src/
│   │   ├── api/client.ts     # API client
│   │   ├── store/auth.ts     # Auth state
│   │   ├── components/       # UI components
│   │   └── pages/            # Route pages
│   └── package.json
│
└── README.md
```

## 🔑 Key Algorithms

### Hot Ranking (Redis)
```python
def hot_score(ups, downs, timestamp):
    score = ups - downs
    order = log10(max(abs(score), 1))
    sign = 1 if score > 0 else -1 if score < 0 else 0
    seconds = timestamp - REDDIT_EPOCH
    return sign * order + seconds / 45000
```

### Graph Recommendations (Neo4j)
```cypher
MATCH (me:User {id: $userId})-[:SUBSCRIBED]->(sub)
      <-[:SUBSCRIBED]-(other)-[:SUBSCRIBED]->(rec)
WHERE NOT (me)-[:SUBSCRIBED]->(rec)
RETURN rec.name, COUNT(DISTINCT other) AS overlap
ORDER BY overlap DESC LIMIT 5
```

### Cursor Pagination (Cassandra)
```sql
SELECT * FROM posts 
WHERE subreddit_id = ? 
AND (created_at, post_id) < (?, ?)
ORDER BY created_at DESC LIMIT 20
```

## 🧪 Test the API

```bash
# Register
curl -X POST http://localhost:8000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "email": "test@test.com", "password": "password"}'

# Login  
curl -X POST http://localhost:8000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "password"}'

# Health check (shows DB status)
curl http://localhost:8000/health
```

## 📊 Analytics Dashboard

Visit `/analytics` to see:
- Platform stats (users, posts, comments)
- Top communities
- Trending subreddits (24h)
- Neo4j graph statistics
- Personal user stats

## 🎓 Presentation Points

1. **Why Polyglot?** Each DB excels at different patterns
2. **MongoDB** - Flexible schemas for user data
3. **Cassandra** - Write-heavy posts with time partitioning
4. **Neo4j** - Graph traversal for social features
5. **Redis** - Real-time voting and rankings
6. **Trade-offs** - CAP theorem, complexity vs performance

## 📝 License

MIT - Free for educational use
