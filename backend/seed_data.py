#!/usr/bin/env python3
"""
Reddit Clone Seed Data Generator v2
High-quality diverse data with images for Big Data analytics demo
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import redis
import bcrypt
import math

# ============ Configuration ============
MONGODB_URL = "mongodb://localhost:27017"
MONGODB_DB = "reddit_clone"
REDIS_HOST = "localhost"
REDIS_PORT = 6379
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"

# Scale settings
NUM_USERS = 200
POSTS_PER_SUBREDDIT = (30, 80)
COMMENTS_PER_POST = (2, 25)
VOTES_PER_POST = (10, 150)
COMMENT_VOTES = (0, 50)

REDDIT_EPOCH = 1134028003

# ============ Diverse Subreddits ============
SUBREDDITS_DATA = [
    # Tech
    ("programming", "All about programming languages and best practices", "tech"),
    ("python", "The Python programming language community", "tech"),
    ("javascript", "JavaScript news, tutorials, and discussions", "tech"),
    ("webdev", "Web development news and discussions", "tech"),
    ("machinelearning", "Machine Learning research and applications", "tech"),
    ("linux", "Linux operating system and open source", "tech"),
    ("gamedev", "Game development techniques and industry news", "tech"),
    
    # Entertainment
    ("pics", "A place to share photographs and pictures", "entertainment"),
    ("funny", "Humor and comedy content", "entertainment"),
    ("memes", "Memes for all occasions", "entertainment"),
    ("aww", "Things that make you go AWW!", "entertainment"),
    ("gaming", "A subreddit for video game discussions", "entertainment"),
    ("movies", "Movie news, discussions, and reviews", "entertainment"),
    ("music", "The musical community of Reddit", "entertainment"),
    
    # Discussion
    ("AskReddit", "Ask and answer thought-provoking questions", "discussion"),
    ("todayilearned", "Learn something new every day", "discussion"),
    ("worldnews", "News from around the world", "discussion"),
    ("science", "Scientific discoveries and research", "discussion"),
    ("space", "Space exploration and astronomy", "discussion"),
    
    # Lifestyle
    ("food", "Sharing recipes and food photography", "lifestyle"),
    ("travel", "Travel experiences and destination guides", "lifestyle"),
    ("fitness", "Health and fitness discussions", "lifestyle"),
    ("photography", "For photography enthusiasts", "lifestyle"),
    
    # Niche
    ("buildapc", "Plan and build your perfect PC", "niche"),
    ("DIY", "Do it yourself projects", "niche"),
    ("cars", "Automotive news and discussions", "niche"),
    ("books", "For book lovers and readers", "niche"),
    ("art", "Sharing and discussing art", "niche"),
    ("nature", "Nature photography and appreciation", "niche"),
]

# ============ Usernames ============
USERNAME_PREFIXES = [
    "CodeNinja", "DataWizard", "PyMaster", "WebDevGuru", "CloudArchitect",
    "TechBlogger", "GameMaster", "PixelArtist", "MemeKing", "PhotoPro",
    "FoodLover", "TravelBug", "FitLife", "BookWorm", "ArtisticSoul",
    "SpaceNerd", "ScienceGeek", "MusicFan", "MovieBuff", "DIYMaster",
    "NatureLover", "CarEnthusiast", "PetLover", "CoffeAddict", "RetroGamer",
    "NightOwl", "EarlyBird", "CasualUser", "PowerUser", "Lurker",
    "ContentCreator", "CommunityMod", "RedditVet", "NewbiePoster", "DailyScroller",
    "CoolCat", "HappyPanda", "SilentWolf", "BrightStar", "DeepThinker",
    "QuickFox", "LazyBear", "SwiftEagle", "WiseTurtle", "BoldLion"
]

# ============ Post Data by Category ============
POSTS_DATA = {
    "programming": [
        ("What's your unpopular programming opinion?", "I'll start: tabs are better than spaces. Fight me.", None),
        ("Finally understood recursion after 3 years", "It finally clicked when I realized it's just functions calling themselves with a smaller problem each time.", None),
        ("Clean code is overrated", "Sometimes getting things done matters more than perfect architecture. Change my view.", None),
        ("My terminal setup after 5 years of tweaking", None, "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800"),
        ("The joy of deleting code", "Removed 2000 lines today and everything still works. Best feeling ever.", None),
    ],
    "python": [
        ("Python 3.12 is a game changer", "The new type parameter syntax is amazing! Anyone else excited?", None),
        ("I wrote my first Python script!", "It's just a simple calculator but I'm so proud of it.", None),
        ("FastAPI vs Django - which one for a new project?", "Building a REST API and can't decide. What's your experience?", None),
        ("My cozy Python development setup", None, "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800"),
        ("Beautiful Jupyter notebook visualization I made", None, "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800"),
    ],
    "javascript": [
        ("JavaScript fatigue is real in 2024", "New framework every week. How do you keep up?", None),
        ("TypeScript saved my sanity", "Caught 47 bugs before runtime today. Worth every keystroke.", None),
        ("React vs Vue vs Svelte - honest comparison", "I've used all three in production. Here's my take...", None),
        ("My VS Code theme for JavaScript development", None, "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800"),
    ],
    "webdev": [
        ("CSS is actually amazing once you understand it", "Grid and Flexbox changed everything for me.", None),
        ("My portfolio website I'm finally proud of", None, "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=800"),
        ("Web accessibility isn't optional", "Making websites usable for everyone should be the default.", None),
        ("Dark mode implementation tips", "Here's how I handle theme switching elegantly.", None),
    ],
    "machinelearning": [
        ("GPT-5 speculation thread", "What capabilities do you expect in the next generation?", None),
        ("My first neural network recognizes cats!", "90% accuracy after training overnight. So excited!", None),
        ("Visualization of how transformers process text", None, "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800"),
        ("The ethics of AI-generated content", "Where do we draw the line? Honest discussion needed.", None),
    ],
    "linux": [
        ("Finally switched to Linux full-time", "Windows 11 was the last straw. Never looking back.", None),
        ("My minimalist Arch Linux desktop", None, "https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=800"),
        ("Best distro for developers in 2024?", "Fedora, Ubuntu, or Arch? What's your pick?", None),
        ("Terminal customization that makes you productive", None, "https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800"),
    ],
    "gamedev": [
        ("My first game after 1 year of learning", None, "https://images.unsplash.com/photo-1556438064-2d7646166914?w=800"),
        ("Godot vs Unity for indie developers", "Made the switch and couldn't be happier.", None),
        ("Procedural generation is like magic", "Creating infinite worlds from math is mind-blowing.", None),
        ("The struggle of finishing a game project", "Scope creep is my nemesis. How do you deal with it?", None),
    ],
    "pics": [
        ("Sunset I captured yesterday evening", None, "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800"),
        ("My dog waiting for me to come home", None, "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800"),
        ("First snow of the season in my city", None, "https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=800"),
        ("The view from my morning commute", None, "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800"),
        ("My grandma's garden in full bloom", None, "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800"),
        ("Street art I found in my neighborhood", None, "https://images.unsplash.com/photo-1499781350541-7783f6c6a0c8?w=800"),
        ("Northern lights from last night", None, "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800"),
        ("My cat judging my life choices", None, "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800"),
    ],
    "funny": [
        ("The accuracy hurts", None, "https://images.unsplash.com/photo-1485178575877-1a13bf489dfe?w=800"),
        ("My attempt at cooking vs the recipe picture", None, "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800"),
        ("Monday morning vibes", None, "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800"),
        ("When the code works on the first try", "We all know that suspicious feeling...", None),
        ("Expectations vs Reality: Working from home", None, "https://images.unsplash.com/photo-1585435557343-3b348031fa00?w=800"),
    ],
    "memes": [
        ("This is fine", None, "https://images.unsplash.com/photo-1516802273409-68526ee1bdd6?w=800"),
        ("Programmers at 3am be like", None, "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800"),
        ("When the junior dev pushes to main", "We've all been there...", None),
        ("Stack Overflow copy-paste workflow", None, "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800"),
    ],
    "aww": [
        ("My rescue puppy on her first day home", None, "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800"),
        ("Just adopted this senior cat", None, "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=800"),
        ("Baby elephant learning to use its trunk", None, "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=800"),
        ("These kittens were born in my garage", None, "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=800"),
        ("My dog's reaction when I come home", None, "https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=800"),
    ],
    "gaming": [
        ("After 10 years I finally 100% completed this game", None, "https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=800"),
        ("My retro gaming collection", None, "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800"),
        ("The best gaming setup isn't the most expensive", None, "https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=800"),
        ("This game's graphics aged incredibly well", None, "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800"),
        ("My gaming corner setup complete", None, "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=800"),
    ],
    "movies": [
        ("Just rewatched this classic - still holds up", None, "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800"),
        ("Underrated movies that deserve more love", "What's your hidden gem recommendation?", None),
        ("Movie theater experience vs streaming at home", "Is the cinema experience worth it in 2024?", None),
        ("The best cinematography I've ever seen", None, "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800"),
    ],
    "music": [
        ("My vinyl collection after 5 years", None, "https://images.unsplash.com/photo-1483412033650-1015ddeb83d1?w=800"),
        ("Learning guitar at 40 - never too late", None, "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800"),
        ("What song changed your life?", "For me it was 'Stairway to Heaven'", None),
        ("My home studio setup", None, "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800"),
    ],
    "AskReddit": [
        ("What's the best advice you've ever received?", "Mine: 'You can't pour from an empty cup'", None),
        ("What's a skill everyone should learn?", "I'd say basic cooking and financial literacy.", None),
        ("What's your 'I met a celebrity' story?", "Share your encounters!", None),
        ("What small thing makes your day better?", "For me it's that first cup of coffee.", None),
        ("What's something you wish you knew at 20?", "Time flies faster than you think.", None),
        ("What's your comfort movie when you're sad?", "Mine is The Princess Bride.", None),
    ],
    "todayilearned": [
        ("TIL honey never spoils", "Archaeologists found 3000-year-old honey in Egyptian tombs that was still edible!", None),
        ("TIL octopuses have three hearts", "And their blood is blue because it contains copper.", None),
        ("TIL the inventor of Pringles is buried in a Pringles can", "Fredric Baur requested this in his will.", None),
        ("TIL bananas are berries but strawberries aren't", "Botanical classification is wild.", None),
    ],
    "worldnews": [
        ("Major climate agreement reached at summit", "195 countries agree to new emissions targets.", None),
        ("Historic discovery in archaeology", "Ancient city found using satellite imaging.", None),
        ("Breakthrough in renewable energy", "New solar technology achieves record efficiency.", None),
    ],
    "science": [
        ("Scientists discover New species in deep ocean", None, "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800"),
        ("Breakthrough in quantum computing announced", "100x improvement in qubit stability.", None),
        ("New study reveals surprising brain plasticity", "The brain can change at any age.", None),
        ("James Webb Telescope captures stunning nebula", None, "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=800"),
    ],
    "space": [
        ("Tonight's moon was spectacular", None, "https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=800"),
        ("My astrophotography of the Milky Way", None, "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800"),
        ("SpaceX successfully lands another rocket", None, "https://images.unsplash.com/photo-1516849841032-87cbac4d88f7?w=800"),
        ("The scale of the universe is mind-blowing", None, "https://images.unsplash.com/photo-1462332420958-a05d1e002413?w=800"),
    ],
    "food": [
        ("Homemade ramen from scratch", None, "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800"),
        ("My grandmother's secret pasta recipe", None, "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800"),
        ("First attempt at croissants - 3 days of work", None, "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800"),
        ("Sunday morning pancakes", None, "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800"),
        ("Perfect medium-rare steak", None, "https://images.unsplash.com/photo-1546833998-877b37c2e5c6?w=800"),
    ],
    "travel": [
        ("Sunrise at Machu Picchu", None, "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800"),
        ("Hidden gem in Portugal nobody talks about", None, "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800"),
        ("Japan during cherry blossom season", None, "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800"),
        ("Road trip through Iceland", None, "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=800"),
        ("The Swiss Alps never disappoint", None, "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800"),
    ],
    "fitness": [
        ("6 month transformation - consistency is key", None, "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800"),
        ("Home gym setup complete", None, "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800"),
        ("Running my first marathon at 50", "It's never too late to start.", None),
        ("Meal prep Sunday game strong", None, "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800"),
    ],
    "photography": [
        ("Golden hour at the beach", None, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800"),
        ("Long exposure of city traffic", None, "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800"),
        ("Macro shot of a water droplet", None, "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800"),
        ("Portrait using natural light only", None, "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800"),
    ],
    "buildapc": [
        ("First PC build - nervous but excited", None, "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800"),
        ("RTX 4090 + clean cable management", None, "https://images.unsplash.com/photo-1591799265444-d66432b91588?w=800"),
        ("Budget build under $500 that games great", None, "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800"),
        ("To that guy who advised me to get 64GB RAM", "You were right. Thank you stranger.", None),
    ],
    "DIY": [
        ("Built this bookshelf from scratch", None, "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800"),
        ("Renovated my garage into a workshop", None, "https://images.unsplash.com/photo-1581165825571-3f6e7ae9e9c0?w=800"),
        ("Handmade leather wallet for my dad", None, "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800"),
        ("3D printed phone stand I designed", None, "https://images.unsplash.com/photo-1631131372333-3e0b6e1e9c32?w=800"),
    ],
    "cars": [
        ("Finally got my dream car", None, "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800"),
        ("Restored this classic over 2 years", None, "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800"),
        ("Sunday morning cruise", None, "https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800"),
        ("EV charging road trip experience", "Range anxiety is real but manageable.", None),
    ],
    "books": [
        ("My reading nook setup", None, "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800"),
        ("What book changed your perspective on life?", "For me it was 'Man's Search for Meaning'", None),
        ("2024 reading goal achieved!", "Read 52 books this year. Ask me for recommendations!", None),
        ("Found this first edition at a garage sale", None, "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800"),
    ],
    "art": [
        ("Oil painting I've been working on for months", None, "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800"),
        ("Digital art portrait commission", None, "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800"),
        ("Watercolor sunset practice", None, "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800"),
        ("My sketchbook journey over 1 year", None, "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800"),
    ],
    "nature": [
        ("Morning mist in the forest", None, "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800"),
        ("Found this waterfall during a hike", None, "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?w=800"),
        ("Deer visited my backyard this morning", None, "https://images.unsplash.com/photo-1484406566174-9da000fda645?w=800"),
        ("Autumn colors are peaking", None, "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800"),
        ("Rainbow after the storm", None, "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800"),
    ],
}

# ============ Comment Templates ============
COMMENTS = [
    "This is incredible! Thanks for sharing.",
    "Wow, this made my day!",
    "I had the same experience last week.",
    "Underrated post right here.",
    "This needs more upvotes.",
    "Finally someone said it!",
    "I can't believe I never knew this.",
    "Source? I'd like to read more.",
    "Saved for later, this is gold.",
    "The real tip is always in the comments.",
    "This is the way.",
    "Take my upvote and get out.",
    "I came here to say this.",
    "As someone who works in this field, can confirm.",
    "This is why I love this subreddit.",
    "Username checks out.",
    "Didn't expect to learn something today.",
    "This deserves way more attention.",
    "Crying in the club right now.",
    "Instructions unclear, got stuck.",
    "Thanks, I hate it. But also love it.",
    "This is the content I subscribed for.",
    "My faith in humanity is restored.",
    "How do I upvote twice?",
    "This hits different at 3am.",
    "10/10 would recommend.",
    "Life hack level: expert.",
    "Thanks for coming to my TED talk.",
    "OK but hear me out...",
    "This is the type of content we need more of.",
    "Absolutely beautiful!",
    "Where was this taken?",
    "What camera/lens did you use?",
    "Adding this to my bucket list.",
    "Goals right there.",
    "This gives me so much inspiration.",
    "Been there, done that, can confirm it's amazing.",
    "This is giving me all the feels.",
    "I'm not crying, you're crying.",
    "Bookmarking this for sure.",
]

REPLY_COMMENTS = [
    "I totally agree with this.",
    "Great point, never thought of it that way.",
    "This deserves more upvotes.",
    "Came here to say exactly this.",
    "You beat me to it!",
    "Underrated comment.",
    "This should be the top comment.",
    "Facts.",
    "Can't argue with that logic.",
    "Well said!",
]


def hot_score(ups: int, downs: int, timestamp: float) -> float:
    score = ups - downs
    order = math.log10(max(abs(score), 1))
    sign = 1 if score > 0 else -1 if score < 0 else 0
    seconds = timestamp - REDDIT_EPOCH
    return round(sign * order + seconds / 45000, 7)


async def main():
    print("🌱 Reddit Clone Seed Data Generator v2")
    print("=" * 60)
    print("Creating high-quality diverse data for Big Data analytics")
    print("=" * 60)
    
    # Connect to databases
    print("\n📦 Connecting to databases...")
    mongo_client = AsyncIOMotorClient(MONGODB_URL)
    mongodb = mongo_client[MONGODB_DB]
    
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    
    try:
        from neo4j import GraphDatabase
        neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        neo4j_driver.verify_connectivity()
        neo4j_available = True
        print("  ✓ Neo4j connected")
    except:
        neo4j_available = False
        print("  ✗ Neo4j not available")
    
    # Clear existing data
    print("\n🧹 Clearing existing data...")
    await mongodb.users.delete_many({})
    await mongodb.subreddits.delete_many({})
    await mongodb.posts.delete_many({})
    await mongodb.comments.delete_many({})
    await mongodb.votes.delete_many({})
    await mongodb.comment_votes.delete_many({})
    
    redis_client.flushdb()
    
    if neo4j_available:
        with neo4j_driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")
    
    print("  ✓ All data cleared")
    
    # Create users
    print(f"\n👥 Creating {NUM_USERS} users...")
    users = []
    used_usernames = set()
    
    for i in range(NUM_USERS):
        while True:
            prefix = random.choice(USERNAME_PREFIXES)
            suffix = random.randint(1, 9999)
            username = f"{prefix}{suffix}"
            if username.lower() not in used_usernames:
                used_usernames.add(username.lower())
                break
        
        user_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(30, 730))
        
        user = {
            "_id": user_id,
            "username": username.lower(),
            "display_name": username,
            "email": f"{username.lower()}@example.com",
            "password_hash": bcrypt.hashpw("password123".encode(), bcrypt.gensalt()).decode(),
            "karma": 0,
            "created_at": created_at
        }
        users.append(user)
        
        if neo4j_available:
            with neo4j_driver.session() as session:
                session.run(
                    "CREATE (u:User {id: $id, username: $username})",
                    id=user_id, username=username.lower()
                )
    
    await mongodb.users.insert_many(users)
    print(f"  ✓ Created {len(users)} users")
    
    # Create subreddits
    print(f"\n📁 Creating {len(SUBREDDITS_DATA)} diverse subreddits...")
    subreddits = []
    
    for name, description, category in SUBREDDITS_DATA:
        sub_id = str(uuid.uuid4())
        creator = random.choice(users)
        created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(180, 1000))
        
        subreddit = {
            "_id": sub_id,
            "name": name.lower(),
            "display_name": f"r/{name}",
            "description": description,
            "category": category,
            "creator_id": creator["_id"],
            "member_count": 0,
            "created_at": created_at
        }
        subreddits.append(subreddit)
        
        if neo4j_available:
            with neo4j_driver.session() as session:
                session.run(
                    "CREATE (s:Subreddit {id: $id, name: $name, category: $category})",
                    id=sub_id, name=name.lower(), category=category
                )
    
    await mongodb.subreddits.insert_many(subreddits)
    print(f"  ✓ Created {len(subreddits)} subreddits in {len(set(s['category'] for s in subreddits))} categories")
    
    # Create subscriptions with preference for certain categories
    print("\n🔗 Creating user subscriptions with category preferences...")
    subscription_count = 0
    
    for user in users:
        # Each user has a preferred category
        preferred_categories = random.sample(["tech", "entertainment", "discussion", "lifestyle", "niche"], k=random.randint(1, 3))
        
        # Subscribe to more subreddits from preferred categories
        preferred_subs = [s for s in subreddits if s.get("category") in preferred_categories]
        other_subs = [s for s in subreddits if s.get("category") not in preferred_categories]
        
        # 5-12 from preferred, 1-5 from others
        num_preferred = min(random.randint(5, 12), len(preferred_subs))
        num_other = min(random.randint(1, 5), len(other_subs))
        
        user_subs = random.sample(preferred_subs, num_preferred)
        user_subs += random.sample(other_subs, num_other)
        
        for sub in user_subs:
            await mongodb.subreddits.update_one(
                {"_id": sub["_id"]},
                {"$inc": {"member_count": 1}}
            )
            subscription_count += 1
            
            if neo4j_available:
                with neo4j_driver.session() as session:
                    session.run("""
                        MATCH (u:User {id: $user_id}), (s:Subreddit {id: $sub_id})
                        MERGE (u)-[:SUBSCRIBED]->(s)
                    """, user_id=user["_id"], sub_id=sub["_id"])
    
    print(f"  ✓ Created {subscription_count} subscriptions")
    
    # Create posts
    print("\n📝 Creating posts with images...")
    posts = []
    post_count = 0
    image_count = 0
    
    for sub in subreddits:
        sub_posts = POSTS_DATA.get(sub["name"], POSTS_DATA.get("pics", []))
        num_posts = random.randint(*POSTS_PER_SUBREDDIT)
        
        for i in range(num_posts):
            post_id = str(uuid.uuid4())
            author = random.choice(users)
            
            # Pick a post template, cycling through if needed
            template = sub_posts[i % len(sub_posts)]
            title, content, image_url = template
            
            # Categorize posts: 15% brand new, 10% legendary old, 75% normal
            post_type = random.random()
            
            if post_type < 0.15:
                # BRAND NEW posts (last 3 hours) - will show up first in "New" tab
                created_at = datetime.now(timezone.utc) - timedelta(
                    hours=random.randint(0, 3),
                    minutes=random.randint(0, 59)
                )
                title = f"[JUST NOW] {title}" if random.random() < 0.3 else title
                initial_votes = random.randint(1, 15)  # Low votes since they're new
            elif post_type < 0.25:
                # LEGENDARY posts (1-6 months old) - will show up first in "Top" tab
                created_at = datetime.now(timezone.utc) - timedelta(
                    days=random.randint(30, 180),
                    hours=random.randint(0, 23)
                )
                title = f"{title} [LEGENDARY]" if random.random() < 0.2 else title
                initial_votes = random.randint(500, 2000)  # Very high votes
            else:
                # NORMAL posts - varied timestamps
                created_at = datetime.now(timezone.utc) - timedelta(
                    days=random.randint(1, 60),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59)
                )
                initial_votes = random.randint(10, 200)
            
            # Add some variation to titles
            if random.random() < 0.2 and not image_url:
                title = title + " [OC]" if random.random() < 0.5 else title
            
            post = {
                "_id": post_id,
                "subreddit_id": sub["_id"],
                "subreddit_name": sub["name"],
                "author_id": author["_id"],
                "author_username": author["display_name"],
                "title": title,
                "content": content,
                "image_url": image_url,
                "upvotes": initial_votes,  # Pre-set votes for sorting
                "downvotes": max(0, initial_votes // 10),  # Some downvotes
                "comment_count": 0,
                "created_at": created_at
            }
            posts.append(post)
            post_count += 1
            if image_url:
                image_count += 1
    
    await mongodb.posts.insert_many(posts)
    print(f"  ✓ Created {post_count} posts ({image_count} with images)")
    
    # Create votes and update Redis with hot scores
    print("\n🗳️ Setting up votes and hot rankings...")
    vote_count = 0
    karma_updates = {}
    
    for post in posts:
        up_votes = post["upvotes"]
        down_votes = post["downvotes"]
        
        # Store vote counts in Redis
        redis_client.hset(f"vote_counts:{post['_id']}", mapping={"up": up_votes, "down": down_votes})
        
        # Calculate and store hot score
        score = hot_score(up_votes, down_votes, post["created_at"].timestamp())
        redis_client.zadd(f"hot:{post['subreddit_id']}", {post["_id"]: score})
        redis_client.zadd("hot:all", {post["_id"]: score})
        
        # Track karma
        karma_updates[post["author_id"]] = karma_updates.get(post["author_id"], 0) + (up_votes - down_votes)
        vote_count += up_votes + down_votes
    
    # Update user karma
    for user_id, karma in karma_updates.items():
        await mongodb.users.update_one(
            {"_id": user_id},
            {"$inc": {"karma": karma}}
        )
    
    print(f"  ✓ Created {vote_count} post votes")
    
    # Create comments with threading and votes
    print("\n💬 Creating threaded comments with votes...")
    comments = []
    comment_vote_count = 0
    
    for post in posts:
        num_comments = random.randint(*COMMENTS_PER_POST)
        # Viral posts get more comments
        if post.get("upvotes", 0) > 100:
            num_comments = min(num_comments * 2, 50)
        
        post_comments = []
        
        for i in range(num_comments):
            comment_id = str(uuid.uuid4())
            author = random.choice(users)
            
            # 40% chance of being a reply
            parent_id = None
            depth = 0
            if post_comments and random.random() < 0.4:
                parent = random.choice(post_comments[-10:])  # Reply to recent comments
                parent_id = parent["_id"]
                depth = min(parent["depth"] + 1, 4)
                content = random.choice(REPLY_COMMENTS)
            else:
                content = random.choice(COMMENTS)
            
            created_at = post["created_at"] + timedelta(
                hours=random.randint(1, 72),
                minutes=random.randint(0, 59)
            )
            
            # Comment votes
            up = random.randint(0, COMMENT_VOTES[1])
            down = random.randint(0, max(1, up // 5))  # Fewer downvotes
            
            comment = {
                "_id": comment_id,
                "post_id": post["_id"],
                "parent_id": parent_id,
                "author_id": author["_id"],
                "author_username": author["display_name"],
                "content": content,
                "depth": depth,
                "upvotes": up,
                "downvotes": down,
                "created_at": created_at
            }
            comments.append(comment)
            post_comments.append(comment)
            
            # Store some comment votes in Redis
            if up > 10:
                for _ in range(min(up, 20)):
                    voter = random.choice(users)
                    redis_client.hset(f"comment_votes:{comment_id}", voter["_id"], 1)
                    comment_vote_count += 1
        
        await mongodb.posts.update_one(
            {"_id": post["_id"]},
            {"$set": {"comment_count": len(post_comments)}}
        )
    
    if comments:
        await mongodb.comments.insert_many(comments)
    print(f"  ✓ Created {len(comments)} comments with {comment_vote_count} votes")
    
    # Create indexes including text search
    print("\n📇 Creating database indexes...")
    await mongodb.users.create_index("username", unique=True)
    await mongodb.users.create_index("email", unique=True)
    await mongodb.subreddits.create_index("name", unique=True)
    await mongodb.subreddits.create_index("category")
    await mongodb.posts.create_index([("subreddit_id", 1), ("created_at", -1)])
    await mongodb.posts.create_index([("author_id", 1), ("created_at", -1)])
    await mongodb.posts.create_index([("title", "text"), ("content", "text")])  # Text search
    await mongodb.comments.create_index([("post_id", 1), ("created_at", 1)])
    await mongodb.comments.create_index([("post_id", 1), ("upvotes", -1)])
    print("  ✓ Indexes created (including text search)")
    
    # Print summary
    print("\n" + "=" * 60)
    print("✅ SEED DATA COMPLETE!")
    print("=" * 60)
    
    # Calculate stats
    total_images = sum(1 for p in posts if p.get("image_url"))
    categories = {}
    for s in subreddits:
        cat = s.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1
    
    print(f"""
📊 Data Summary:
   ├─ Users:           {len(users)}
   ├─ Subreddits:      {len(subreddits)}
   │  └─ Categories:   {', '.join(f'{k}({v})' for k, v in categories.items())}
   ├─ Posts:           {len(posts)}
   │  └─ With images:  {total_images}
   ├─ Comments:        {len(comments)}
   ├─ Post votes:      {vote_count}
   ├─ Comment votes:   {comment_vote_count}
   └─ Subscriptions:   {subscription_count}

🔍 Search: Text search index created on posts (title + content)

📈 Big Data Features Active:
   ├─ MongoDB:    User profiles, posts, comments (document store)
   ├─ Redis:      Hot rankings, vote tracking (in-memory cache)
   ├─ Neo4j:      User subscriptions graph (relationship queries)
   └─ Analytics:  Ready for dashboard queries

🔑 Test Login:
   Username: {users[0]['username']}
   Password: password123

🌐 Open http://localhost:3000 to see your data!
""")
    
    # Close connections
    mongo_client.close()
    redis_client.close()
    if neo4j_available:
        neo4j_driver.close()


if __name__ == "__main__":
    asyncio.run(main())
