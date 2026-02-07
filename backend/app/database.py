"""
Database connection and configuration for MongoDB.
Handles connection pooling and database initialization.
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
from fastapi import HTTPException
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Global client variable
_client: AsyncIOMotorClient = None


async def connect_db():
    """
    Establish connection to MongoDB.
    Called on application startup.
    """
    global _client
    logger.info(f"Attempting to connect to MongoDB at {settings.mongodb_url}")
    try:
        _client = AsyncIOMotorClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=5000
        )
        # Verify connection
        await _client.admin.command('ping')
        logger.info(f"✓ Connected to MongoDB successfully")
        return _client
    except ServerSelectionTimeoutError as e:
        logger.error(f"✗ Failed to connect to MongoDB: {e}")
        raise
    except Exception as e:
        logger.error(f"✗ Unexpected error connecting to MongoDB: {e}")
        raise


async def close_db():
    """
    Close MongoDB connection.
    Called on application shutdown.
    """
    global _client
    if _client:
        _client.close()
        logger.info("✓ MongoDB connection closed")


def get_database():
    """Get the database instance."""
    global _client
    if _client is None:
        logger.error("Database client is None - connection not established")
        raise Exception("Database not connected. Please ensure MongoDB is running.")
    return _client[settings.database_name]


# Helper function to get database instance for dependency injection
def get_db():
    """Returns the database instance for dependency injection in routes."""
    global _client
    if _client is None:
        logger.error("Database client is None - connection not established")
        raise HTTPException(
            status_code=503,
            detail="Database connection error. Please ensure MongoDB is running."
        )
    return _client[settings.database_name]

