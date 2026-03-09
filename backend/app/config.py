"""
Configuration management for HavenAI Backend

Loads settings from environment variables with sensible defaults.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
REPO_ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "sqlite:///./havenai.db"  # Default to SQLite for easy dev
    
    # JWT Authentication
    jwt_secret: str = "dev-secret-change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Email (optional)
    sendgrid_api_key: Optional[str] = None
    from_email: str = "noreply@havenai.ai"

    # AI provider
    openai_api_key: Optional[str] = None
    
    # Environment
    environment: str = "development"
    debug: bool = True

    model_config = SettingsConfigDict(
        env_file=(
            str(BACKEND_DIR / ".env"),
            str(REPO_ROOT_DIR / ".env"),
        ),
        extra="ignore",
    )


# Global settings instance
settings = Settings()
