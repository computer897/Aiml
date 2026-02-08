"""
Configuration settings for the Virtual Classroom backend.
Loads environment variables and provides application settings.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database Configuration
    # Set MONGODB_URL env var to your Atlas connection string:
    # mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "virtual_classroom"

    # JWT Configuration
    secret_key: str = "your-secret-key-here-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours

    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 10000
    environment: str = "development"  # "development" or "production"
    frontend_url: str = "http://localhost:5173"

    # Engagement Thresholds
    attendance_threshold: float = 75.0
    frame_interval_seconds: int = 3

    class Config:
        env_file = ".env"
        case_sensitive = False

    def __init__(self, **kwargs):
        import os
        # Allow MONGODB_URI as an alias for MONGODB_URL (Atlas convention)
        if "mongodb_url" not in kwargs and "MONGODB_URL" not in os.environ:
            uri = os.environ.get("MONGODB_URI")
            if uri:
                kwargs["mongodb_url"] = uri
        super().__init__(**kwargs)


# Create global settings instance
settings = Settings()
