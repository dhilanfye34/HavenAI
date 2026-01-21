"""
HavenAI Backend API

FastAPI application that handles:
- User authentication (register, login)
- Device management
- Alert storage and retrieval
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, devices, alerts, health
from app.db.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="HavenAI API",
    description="Backend API for HavenAI cybersecurity agent",
    version="0.1.0"
)

# Configure CORS (allow requests from web dashboard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Local webapp development
        "http://localhost:3001",      # Local Electron renderer
        "https://havenai.vercel.app", # Vercel deployment (update with your URL)
        "https://*.vercel.app",       # Any Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(devices.router, prefix="/devices", tags=["Devices"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(health.router, tags=["Health"])


@app.get("/")
async def root():
    """Root endpoint - API info"""
    return {
        "name": "HavenAI API",
        "version": "0.1.0",
        "docs": "/docs"
    }
