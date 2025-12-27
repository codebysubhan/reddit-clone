"""
Database connections - all optional for development flexibility.
"""
from motor.motor_asyncio import AsyncIOMotorClient
import redis
import boto3
from botocore.client import Config

from app.config import settings

# Private variables
_mongodb_client: AsyncIOMotorClient = None
_mongodb = None
_cassandra_cluster = None
_cassandra_session = None
_neo4j_driver = None
_redis_client = None
_s3_client = None


# ============== Getters ==============
def get_mongodb():
    return _mongodb

def get_cassandra():
    return _cassandra_session

def get_neo4j():
    return _neo4j_driver

def get_redis():
    return _redis_client

def get_s3():
    return _s3_client


# ============== MongoDB ==============
async def connect_mongodb():
    global _mongodb_client, _mongodb
    try:
        _mongodb_client = AsyncIOMotorClient(settings.mongodb_url, serverSelectionTimeoutMS=5000)
        await _mongodb_client.admin.command('ping')
        _mongodb = _mongodb_client[settings.mongodb_db_name]
        print("✓ MongoDB connected")
        return True
    except Exception as e:
        print(f"✗ MongoDB failed: {e}")
        return False


async def close_mongodb():
    global _mongodb_client
    if _mongodb_client:
        _mongodb_client.close()


# ============== Cassandra ==============
def connect_cassandra():
    global _cassandra_cluster, _cassandra_session
    try:
        from cassandra.cluster import Cluster
        _cassandra_cluster = Cluster(settings.cassandra_hosts)
        _cassandra_session = _cassandra_cluster.connect()
        
        _cassandra_session.execute("""
            CREATE KEYSPACE IF NOT EXISTS reddit_clone
            WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
        """)
        _cassandra_session.set_keyspace(settings.cassandra_keyspace)
        
        _cassandra_session.execute("""
            CREATE TABLE IF NOT EXISTS posts (
                subreddit_id text,
                created_at timestamp,
                post_id text,
                author_id text,
                title text,
                content text,
                image_url text,
                upvotes int,
                downvotes int,
                comment_count int,
                PRIMARY KEY ((subreddit_id), created_at, post_id)
            ) WITH CLUSTERING ORDER BY (created_at DESC)
        """)
        
        _cassandra_session.execute("""
            CREATE TABLE IF NOT EXISTS posts_by_id (
                post_id text PRIMARY KEY,
                subreddit_id text,
                author_id text,
                title text,
                content text,
                image_url text,
                created_at timestamp,
                upvotes int,
                downvotes int,
                comment_count int
            )
        """)
        
        _cassandra_session.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                post_id text,
                path text,
                comment_id text,
                parent_id text,
                author_id text,
                content text,
                created_at timestamp,
                depth int,
                upvotes int,
                PRIMARY KEY ((post_id), path, comment_id)
            ) WITH CLUSTERING ORDER BY (path ASC)
        """)
        
        print("✓ Cassandra connected")
        return True
    except ImportError:
        print("✗ Cassandra driver not compatible with this Python version")
        print("  → Posts will be stored in MongoDB instead")
        return False
    except Exception as e:
        print(f"✗ Cassandra failed: {e}")
        print("  → Posts will be stored in MongoDB instead")
        return False


def close_cassandra():
    global _cassandra_cluster
    if _cassandra_cluster:
        _cassandra_cluster.shutdown()


# ============== Neo4j ==============
def connect_neo4j():
    global _neo4j_driver
    try:
        from neo4j import GraphDatabase
        _neo4j_driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
        _neo4j_driver.verify_connectivity()
        
        with _neo4j_driver.session() as session:
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (s:Subreddit) REQUIRE s.id IS UNIQUE")
        print("✓ Neo4j connected")
        return True
    except Exception as e:
        print(f"✗ Neo4j failed: {e}")
        print("  → Recommendations will be disabled")
        return False


def close_neo4j():
    global _neo4j_driver
    if _neo4j_driver:
        _neo4j_driver.close()


# ============== Redis ==============
def connect_redis():
    global _redis_client
    try:
        _redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=True,
            socket_connect_timeout=5
        )
        _redis_client.ping()
        print("✓ Redis connected")
        return True
    except Exception as e:
        print(f"✗ Redis failed: {e}")
        print("  → Voting/caching will use MongoDB fallback")
        return False


def close_redis():
    global _redis_client
    if _redis_client:
        _redis_client.close()


# ============== S3/MinIO ==============
def connect_s3():
    global _s3_client
    try:
        _s3_client = boto3.client(
            's3',
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=Config(signature_version='s3v4'),
            region_name='us-east-1'
        )
        try:
            _s3_client.head_bucket(Bucket=settings.s3_bucket)
        except:
            _s3_client.create_bucket(Bucket=settings.s3_bucket)
        print("✓ S3/MinIO connected")
        return True
    except Exception as e:
        print(f"✗ S3/MinIO failed: {e}")
        print("  → Image uploads will be disabled")
        return False


# ============== Init All ==============
async def init_databases():
    print("\n📦 Connecting to databases...")
    print("-" * 40)
    
    results = {
        "mongodb": await connect_mongodb(),
        "cassandra": connect_cassandra(),
        "neo4j": connect_neo4j(),
        "redis": connect_redis(),
        "s3": connect_s3(),
    }
    
    print("-" * 40)
    connected = sum(results.values())
    print(f"📊 {connected}/5 databases connected\n")
    
    if not results["mongodb"]:
        print("⚠️  WARNING: MongoDB is required! Please start MongoDB.")
    
    return results


async def close_databases():
    await close_mongodb()
    close_cassandra()
    close_neo4j()
    close_redis()
