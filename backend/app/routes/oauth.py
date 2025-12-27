from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
import httpx
import uuid
from datetime import datetime
from urllib.parse import urlencode

from app.config import settings
from app.db import get_mongodb, get_neo4j
from app.auth import create_access_token

router = APIRouter(prefix="/auth", tags=["OAuth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


@router.get("/google/login")
async def google_login():
    """Redirect to Google OAuth login page"""
    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")
    
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    
    url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/google/callback")
async def google_callback(code: str = None, error: str = None):
    """Handle Google OAuth callback"""
    if error:
        return RedirectResponse(url=f"{settings.frontend_url}/login?error={error}")
    
    if not code:
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=no_code")
    
    try:
        # Exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.google_redirect_uri,
                },
            )
            
            if token_response.status_code != 200:
                print(f"Token error: {token_response.text}")
                return RedirectResponse(url=f"{settings.frontend_url}/login?error=token_failed")
            
            tokens = token_response.json()
            access_token = tokens.get("access_token")
            
            # Get user info
            userinfo_response = await client.get(
                GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if userinfo_response.status_code != 200:
                return RedirectResponse(url=f"{settings.frontend_url}/login?error=userinfo_failed")
            
            userinfo = userinfo_response.json()
        
        google_id = userinfo.get("id")
        email = userinfo.get("email")
        name = userinfo.get("name", "").replace(" ", "_").lower()
        picture = userinfo.get("picture")
        
        if not email:
            return RedirectResponse(url=f"{settings.frontend_url}/login?error=no_email")
        
        mongodb = get_mongodb()
        if mongodb is None:
            return RedirectResponse(url=f"{settings.frontend_url}/login?error=db_unavailable")
        
        # Check if user exists by google_id or email
        user = await mongodb.users.find_one({
            "$or": [
                {"google_id": google_id},
                {"email": email.lower()}
            ]
        })
        
        if user:
            # Update google_id if not set (user registered with email first)
            if not user.get("google_id"):
                await mongodb.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"google_id": google_id, "avatar_url": picture}}
                )
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            
            # Generate unique username from name/email
            base_username = name[:15] if name else email.split("@")[0][:15]
            username = base_username.lower().replace(" ", "_")
            
            # Check if username exists, add random suffix if so
            existing = await mongodb.users.find_one({"username": username})
            if existing:
                username = f"{username}_{str(uuid.uuid4())[:4]}"
            
            user = {
                "_id": user_id,
                "username": username,
                "display_name": userinfo.get("name", username),
                "email": email.lower(),
                "google_id": google_id,
                "avatar_url": picture,
                "password_hash": None,  # No password for OAuth users
                "karma": 0,
                "created_at": datetime.utcnow()
            }
            
            await mongodb.users.insert_one(user)
            
            # Create user in Neo4j
            neo4j_driver = get_neo4j()
            if neo4j_driver is not None:
                with neo4j_driver.session() as session:
                    session.run(
                        "MERGE (u:User {id: $id}) SET u.username = $username",
                        id=user_id, username=username
                    )
        
        # Create JWT token
        jwt_token = create_access_token(user["_id"], user["username"])
        
        # Redirect to frontend with token
        return RedirectResponse(
            url=f"{settings.frontend_url}/oauth/callback?token={jwt_token}"
        )
        
    except Exception as e:
        print(f"Google OAuth error: {e}")
        return RedirectResponse(url=f"{settings.frontend_url}/login?error=oauth_failed")


@router.get("/google/status")
async def google_oauth_status():
    """Check if Google OAuth is configured"""
    return {
        "enabled": bool(settings.google_client_id and settings.google_client_secret),
        "login_url": "/api/auth/google/login"
    }

