"""
Main FastAPI application initialization.
Configures the server, connects to database, and registers all routes.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app import database
from app.routes import auth_router, class_router, attendance_router
from app.config import settings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup: Connect to MongoDB
    logger.info("🚀 Starting Virtual Classroom Backend...")
    try:
        await database.connect_db()
        logger.info("✓ Database connected successfully")
    except Exception as e:
        logger.error(f"✗ Failed to connect to database: {e}")
        logger.error("✗ MongoDB must be running. Please start MongoDB and restart the server.")
        raise  # Stop the app if database fails
    
    yield
    
    # Shutdown: Close database connection
    logger.info("🛑 Shutting down Virtual Classroom Backend...")
    await database.close_db()
    logger.info("✓ Database connection closed")


# Create FastAPI application
app = FastAPI(
    title="Virtual Classroom API",
    description="Backend API for Virtual Classroom with AI-powered attendance tracking",
    version="1.0.0",
    lifespan=lifespan
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(auth_router)
app.include_router(class_router)
app.include_router(attendance_router)


@app.get("/", tags=["Root"])
async def root():
    """
    Root endpoint - API health check.
    
    Returns:
        API status and information
    """
    return {
        "message": "Virtual Classroom API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "features": [
            "JWT Authentication",
            "Classroom Management",
            "AI-powered Face Detection",
            "Real-time Engagement Tracking",
            "WebSocket Support",
            "Attendance Reports"
        ]
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Server health status
    """
    try:
        # Test database connection
        db = database.get_database()
        await db.command("ping")
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": "2026-02-03T00:00:00Z"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {settings.host}:{settings.port}")
    
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info"
    )
