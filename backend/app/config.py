from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Reddit Clone API"
    debug: bool = True
    
    # MongoDB (local or MongoDB Atlas free tier)
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "reddit_clone"
    
    # Cassandra (local)
    cassandra_hosts: list[str] = ["127.0.0.1"]
    cassandra_keyspace: str = "reddit_clone"
    
    # Neo4j (local or Aura free tier)
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    
    # Redis (local)
    redis_host: str = "localhost"
    redis_port: int = 6379
    
    # MinIO/S3 (local MinIO or AWS S3)
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "reddit-images"
    s3_use_ssl: bool = False
    
    # JWT
    jwt_secret: str = "change-this-secret-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 10080  # 7 days
    
    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/google/callback"
    
    # Frontend URL for redirect after OAuth
    frontend_url: str = "http://localhost:5173"
    
    # Email (Gmail SMTP)
    mail_username: str = ""
    mail_password: str = ""
    mail_from: str = ""
    mail_server: str = "smtp.gmail.com"
    mail_port: int = 587
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
