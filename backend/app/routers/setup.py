"""
Setup Routes

Stores user setup preferences for monitor modules and cloud channels.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import Device, User, UserSetupPreferences
from app.dependencies import get_current_user
from app.schemas import SetupPreferencesResponse, SetupPreferencesUpdate

router = APIRouter()


def _desktop_available(db: Session, user_id: str) -> bool:
    active_device = (
        db.query(Device)
        .filter(Device.user_id == user_id, Device.is_active == True)  # noqa: E712
        .first()
    )
    return active_device is not None


def _get_or_create_preferences(db: Session, user_id: str) -> UserSetupPreferences:
    preferences = (
        db.query(UserSetupPreferences)
        .filter(UserSetupPreferences.user_id == user_id)
        .first()
    )
    if preferences:
        return preferences

    preferences = UserSetupPreferences(user_id=user_id)
    db.add(preferences)
    db.commit()
    db.refresh(preferences)
    return preferences


def _to_response(
    preferences: UserSetupPreferences,
    desktop_available: bool,
) -> SetupPreferencesResponse:
    return SetupPreferencesResponse(
        file_monitoring_enabled=preferences.file_monitoring_enabled,
        process_monitoring_enabled=preferences.process_monitoring_enabled,
        network_monitoring_enabled=preferences.network_monitoring_enabled,
        email_enabled=preferences.email_enabled,
        sms_enabled=preferences.sms_enabled,
        voice_call_enabled=preferences.voice_call_enabled,
        sms_min_severity=preferences.sms_min_severity,
        voice_call_min_severity=preferences.voice_call_min_severity,
        sms_phone=preferences.sms_phone,
        voice_phone=preferences.voice_phone,
        desktop_available=desktop_available,
        created_at=preferences.created_at,
        updated_at=preferences.updated_at,
    )


@router.get("/preferences", response_model=SetupPreferencesResponse)
async def get_preferences(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preferences = _get_or_create_preferences(db, user.id)
    return _to_response(preferences, _desktop_available(db, user.id))


@router.put("/preferences", response_model=SetupPreferencesResponse)
async def update_preferences(
    payload: SetupPreferencesUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    preferences = _get_or_create_preferences(db, user.id)
    desktop_available = _desktop_available(db, user.id)

    # Desktop gating for system monitoring modules.
    requested_monitor_enable = any(
        value is True
        for value in (
            payload.file_monitoring_enabled,
            payload.process_monitoring_enabled,
            payload.network_monitoring_enabled,
        )
    )
    if requested_monitor_enable and not desktop_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Desktop app must be installed and linked before enabling monitoring modules.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(preferences, field, value)

    if preferences.sms_enabled and not preferences.sms_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SMS is enabled but no SMS phone number is set.",
        )
    if preferences.voice_call_enabled and not preferences.voice_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone call alerts are enabled but no voice phone number is set.",
        )

    db.commit()
    db.refresh(preferences)
    return _to_response(preferences, desktop_available)
