"""
Database connection and configuration for MongoDB.
Handles connection pooling and database initialization.
Non-blocking: the app starts even if MongoDB is temporarily unavailable.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
from fastapi import HTTPException
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Global client variable
_client: AsyncIOMotorClient = None
_db_connected: bool = False


async def connect_db():
    """
    Establish connection to MongoDB.
    Non-blocking: creates the client and attempts a ping,
    but does NOT raise if MongoDB is unreachable so the app can still boot.
    """
    global _client, _db_connected

    mongo_url = settings.mongodb_url
    # Mask credentials in log output
    safe_url = mongo_url.split("@")[-1] if "@" in mongo_url else mongo_url
    logger.info(f"Connecting to MongoDB at ...@{safe_url}")

    try:
        _client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
            retryWrites=True,
            retryReads=True,
        )
        # Verify connection
        await _client.admin.command("ping")
        _db_connected = True
        logger.info("Connected to MongoDB successfully")
        return _client
    except ServerSelectionTimeoutError as e:
        _db_connected = False
        logger.warning(f"MongoDB not reachable yet (will retry on first request): {e}")
        # Do NOT raise — let the app boot so Render detects the port
    except Exception as e:
        _db_connected = False
        logger.warning(f"MongoDB connection issue (non-fatal): {e}")


async def close_db():
    """
    Close MongoDB connection.
    Called on application shutdown.
    """
    global _client, _db_connected
    if _client:
        _client.close()
        _db_connected = False
        logger.info("MongoDB connection closed")


async def _ensure_connected():
    """Lazy-reconnect helper: retries ping if we haven't confirmed connectivity."""
    global _db_connected
    if _client and not _db_connected:
        try:
            await _client.admin.command("ping")
            _db_connected = True
            logger.info("MongoDB connection established (lazy reconnect)")
        except Exception:
            pass  # still unavailable — caller will handle


def get_database():
    """Get the database instance."""
    global _client
    if _client is None:
        raise Exception("Database client not initialised.")
    return _client[settings.database_name]


def is_connected() -> bool:
    """Return current connection status."""
    return _db_connected


# Helper function to get database instance for dependency injection
def get_db():
    """Returns the database instance for dependency injection in routes."""
    global _client
    if _client is None:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Please try again shortly.",
        )
    return _client[settings.database_name]

