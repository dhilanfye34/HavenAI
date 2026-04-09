"""
HavenAI Backend API

FastAPI application that handles:
- User authentication (register, login)
- Device management
- Alert storage and retrieval
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.routers import auth, devices, alerts, health, downloads, chat, setup, enrich, telemetry
from app.db.database import engine, Base
from app.config import log_config_warnings
from app.rate_limit import limiter

# Create database tables
Base.metadata.create_all(bind=engine)

# Log warnings for any missing optional credentials
log_config_warnings()

# Create FastAPI app
app = FastAPI(
    title="HavenAI API",
    description="Backend API for HavenAI cybersecurity agent",
    version="0.1.0"
)

# Rate limiting — protects auth endpoints from credential-stuffing and brute-force
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configure CORS (allow requests from web dashboard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(devices.router, prefix="/devices", tags=["Devices"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(downloads.router, prefix="/downloads", tags=["Downloads"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(setup.router, prefix="/setup", tags=["Setup"])
app.include_router(enrich.router, prefix="/enrich", tags=["Enrichment"])
app.include_router(telemetry.router, prefix="/telemetry", tags=["Telemetry"])
app.include_router(health.router, tags=["Health"])


@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {
        "name": "HavenAI API",
        "version": "0.1.0",
        "docs": "/docs"
    }