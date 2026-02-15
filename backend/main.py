"""
Main FastAPI application initialization.
Configures the server, connects to database, and registers all routes.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app import database
from app.routes import auth_router, class_router, attendance_router, join_request_router, announcement_router, document_router
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
    Database connection is NON-BLOCKING so the app always boots
    and Render can detect the open port.
    """
    # Startup
    logger.info("Starting Virtual Classroom Backend...")
    await database.connect_db()  # never raises — logs warnings instead

    if database.is_connected():
        logger.info("Database connected successfully")
    else:
        logger.warning("App started WITHOUT database — DB will reconnect on first request")

    yield

    # Shutdown
    logger.info("Shutting down Virtual Classroom Backend...")
    await database.close_db()
    logger.info("Shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="Virtual Classroom API",
    description="Backend API for Virtual Classroom with AI-powered attendance tracking",
    version="1.0.0",
    lifespan=lifespan
)


# Configure CORS
cors_origins = (
    [settings.frontend_url]
    if settings.environment == "production"
    else ["*"]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(auth_router)
app.include_router(class_router)
app.include_router(attendance_router)
app.include_router(join_request_router)
app.include_router(announcement_router)
app.include_router(document_router)


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
    from datetime import datetime, timezone

    try:
        db = database.get_database()
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check DB ping failed: {e}")
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    # Render injects PORT env var; fall back to config for local dev
    port = int(os.environ.get("PORT", settings.port))
    is_prod = settings.environment == "production"
    logger.info(f"Starting server on {settings.host}:{port} (env={settings.environment})")

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=port,
        reload=not is_prod,
        log_level="info",
    )
