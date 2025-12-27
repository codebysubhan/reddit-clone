from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

from app.config import settings
from app.db import init_databases, close_databases, get_mongodb, get_cassandra, get_neo4j, get_redis
from app.routes import users, subreddits, posts, analytics, search, oauth, password


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("🚀 Starting Reddit Clone API...")
    
    await init_databases()
    print("✅ Ready to accept requests!")
    
    yield
    
    print("🛑 Shutting down...")
    await close_databases()
    print("👋 Goodbye!")


app = FastAPI(
    title=settings.app_name,
    description="Reddit Clone API - Polyglot Persistence Demo",
    version="1.0.0",
    lifespan=lifespan
)

# CORS - MUST be added before routes
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# Global exception handler to prevent CORS issues on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"❌ Error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


# Include routers
app.include_router(users.router, prefix="/api")
app.include_router(subreddits.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(oauth.router, prefix="/api")
app.include_router(password.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "message": "🔥 Welcome to Reddit Clone API",
        "docs": "/docs"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "api": "healthy",
        "mongodb": "connected" if get_mongodb() is not None else "disconnected",
        "cassandra": "connected" if get_cassandra() is not None else "disconnected",
        "neo4j": "connected" if get_neo4j() is not None else "disconnected",
        "redis": "connected" if get_redis() is not None else "disconnected",
    }
