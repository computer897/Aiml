"""
Configuration settings for the Virtual Classroom backend.
Loads environment variables and provides application settings.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database Configuration
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
    attendance_threshold: float = 75.0  # Percentage for present status
    frame_interval_seconds: int = 3  # How often to expect frames
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Create global settings instance
settings = Settings()
