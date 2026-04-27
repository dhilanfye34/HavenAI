"""
Configuration management for HavenAI Backend

Loads settings from environment variables with sensible defaults.
"""

from pathlib import Path
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
REPO_ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/havenai"
    
    # JWT Authentication
    # Default is a placeholder usable ONLY when environment == "development".
    # In any non-dev environment the startup check below will refuse to run with this value.
    jwt_secret: str = "dev-secret-change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # Notification providers (optional)
    notification_email_provider: str = "sendgrid"
    notification_sms_provider: str = "twilio"
    notification_voice_provider: str = "twilio"
    sendgrid_api_key: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("SENDGRID_API_KEY", "HAVENAI_SENDGRID_API_KEY"),
    )
    from_email: str = Field(
        default="noreply@havenai.ai",
        validation_alias=AliasChoices("FROM_EMAIL", "HAVENAI_NOTIFICATION_EMAIL_FROM"),
    )
    twilio_account_sid: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("TWILIO_ACCOUNT_SID", "HAVENAI_TWILIO_ACCOUNT_SID"),
    )
    twilio_auth_token: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices("TWILIO_AUTH_TOKEN", "HAVENAI_TWILIO_AUTH_TOKEN"),
    )
    twilio_from_phone: Optional[str] = Field(
        default=None,
        validation_alias=AliasChoices(
            "TWILIO_FROM_PHONE",
            "TWILIO_PHONE_NUMBER",
            "HAVENAI_TWILIO_FROM_PHONE",
        ),
    )

    # AI provider
    openai_api_key: Optional[str] = None
    
    # Environment
    environment: str = "development"
    debug: bool = False

    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT_DIR / ".env"),
        extra="ignore",
    )


import logging

_logger = logging.getLogger(__name__)

# Global settings instance
settings = Settings()


_DEFAULT_JWT_SECRET = "dev-secret-change-this-in-production"


def log_config_warnings() -> None:
    """Validate startup config. Raises on insecure prod, warns on missing optional creds."""
    # Hard fail: refuse to run in non-dev environments with the default JWT secret.
    # The default is published in this repo, so any token signed with it is forgable.
    if settings.jwt_secret == _DEFAULT_JWT_SECRET and settings.environment != "development":
        raise RuntimeError(
            "JWT_SECRET is set to the default placeholder value. Refusing to start in "
            f"environment={settings.environment!r}. Set the JWT_SECRET environment "
            "variable to a 64-char random hex string "
            "(generate with: python -c \"import secrets; print(secrets.token_hex(32))\")."
        )

    if not settings.sendgrid_api_key or settings.sendgrid_api_key.startswith("your-"):
        _logger.warning(
            "SENDGRID_API_KEY is not configured — email notifications will be skipped."
        )
    if not settings.twilio_account_sid or settings.twilio_account_sid.startswith("your-"):
        _logger.warning(
            "TWILIO_ACCOUNT_SID is not configured — SMS and voice call notifications will be skipped."
        )
    if not settings.openai_api_key:
        _logger.warning(
            "OPENAI_API_KEY is not configured — AI chat assistant will not function."
        )
    if settings.jwt_secret == _DEFAULT_JWT_SECRET:
        # Reached only when environment == "development".
        _logger.warning(
            "JWT_SECRET is the default placeholder. Fine for local dev only — set a real "
            "secret before deploying anywhere users will sign in."
        )
    if settings.debug and settings.environment != "development":
        _logger.warning(
            "DEBUG is enabled in environment=%r — error responses may leak stack traces.",
            settings.environment,
        )
