"""
Health Check Routes

Simple endpoints to verify the API is running.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import get_db

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check - is the API running?
    """
    return {"status": "ok", "service": "havenai-api"}


@router.get("/health/db")
async def database_health(db: Session = Depends(get_db)):
    """
    Database health check - is the database connected?
    """
    try:
        # Execute a simple query
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": "disconnected", "error": str(e)}
