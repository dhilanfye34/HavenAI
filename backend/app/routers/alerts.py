"""
Alert Routes

Handles security alert creation and retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timedelta
import json

from app.db.database import get_db
from app.db.models import User, Device, Alert
from app.schemas import AlertCreate, AlertResponse, AlertUpdate, AlertListResponse, AlertStatsResponse
from app.dependencies import get_current_user

router = APIRouter()


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    alert_data: AlertCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new security alert.
    
    Called by the desktop app when a threat is detected.
    """
    # Verify device belongs to user
    device = db.query(Device).filter(
        Device.id == alert_data.device_id,
        Device.user_id == user.id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # Create alert
    alert = Alert(
        device_id=device.id,
        user_id=user.id,
        type=alert_data.type,
        severity=alert_data.severity,
        title=alert_data.title,
        description=alert_data.description,
        details=json.dumps(alert_data.details) if alert_data.details else None,
        risk_score=alert_data.risk_score
    )
    
    db.add(alert)
    db.commit()
    db.refresh(alert)
    
    # TODO: Send notification (email/SMS) for high severity alerts
    
    return alert


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    device_id: Optional[str] = None,
    type: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List alerts for the current user with optional filters.
    """
    # Base query
    query = db.query(Alert).filter(Alert.user_id == user.id)
    
    # Apply filters
    if device_id:
        query = query.filter(Alert.device_id == device_id)
    if type:
        query = query.filter(Alert.type == type)
    if severity:
        query = query.filter(Alert.severity == severity)
    if resolved is not None:
        query = query.filter(Alert.is_resolved == resolved)
    
    # Get total count
    total = query.count()
    
    # Paginate
    offset = (page - 1) * limit
    alerts = query.order_by(Alert.created_at.desc()).offset(offset).limit(limit).all()
    
    # Calculate total pages
    pages = (total + limit - 1) // limit
    
    return AlertListResponse(
        alerts=alerts,
        total=total,
        page=page,
        pages=pages
    )


@router.get("/stats", response_model=AlertStatsResponse)
async def get_alert_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get alert statistics for the current user.
    """
    # Total alerts
    total = db.query(Alert).filter(Alert.user_id == user.id).count()
    
    # By severity
    severity_counts = db.query(
        Alert.severity,
        func.count(Alert.id)
    ).filter(Alert.user_id == user.id).group_by(Alert.severity).all()
    by_severity = {s: c for s, c in severity_counts}
    
    # By type
    type_counts = db.query(
        Alert.type,
        func.count(Alert.id)
    ).filter(Alert.user_id == user.id).group_by(Alert.type).all()
    by_type = {t: c for t, c in type_counts}
    
    # Last 24 hours
    yesterday = datetime.utcnow() - timedelta(hours=24)
    last_24h = db.query(Alert).filter(
        Alert.user_id == user.id,
        Alert.created_at >= yesterday
    ).count()
    
    # Last 7 days
    last_week = datetime.utcnow() - timedelta(days=7)
    last_7d = db.query(Alert).filter(
        Alert.user_id == user.id,
        Alert.created_at >= last_week
    ).count()
    
    # Unresolved
    unresolved = db.query(Alert).filter(
        Alert.user_id == user.id,
        Alert.is_resolved == False
    ).count()
    
    return AlertStatsResponse(
        total=total,
        by_severity=by_severity,
        by_type=by_type,
        last_24h=last_24h,
        last_7d=last_7d,
        unresolved=unresolved
    )


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details for a specific alert.
    """
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    return alert


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: str,
    alert_data: AlertUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an alert (e.g., mark as resolved).
    """
    alert = db.query(Alert).filter(
        Alert.id == alert_id,
        Alert.user_id == user.id
    ).first()
    
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Alert not found"
        )
    
    # Update fields
    if alert_data.is_resolved is not None:
        alert.is_resolved = alert_data.is_resolved
        if alert_data.is_resolved:
            alert.resolved_at = datetime.utcnow()
        else:
            alert.resolved_at = None
    
    db.commit()
    db.refresh(alert)
    
    return alert
