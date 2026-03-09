"""
Device Routes

Handles device registration and management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from app.db.database import get_db
from app.db.models import User, Device
from app.schemas import DeviceCreate, DeviceResponse, DeviceUpdate, ProtectionStatusResponse
from app.dependencies import get_current_user

router = APIRouter()

ONLINE_THRESHOLD = timedelta(minutes=3)


def _is_device_online(device: Device) -> bool:
    """A device is 'online' if its last heartbeat was within the threshold."""
    if not device.last_seen:
        return False
    return datetime.utcnow() - device.last_seen < ONLINE_THRESHOLD


def _device_to_response(device: Device) -> DeviceResponse:
    return DeviceResponse.model_validate(
        {**{c.name: getattr(device, c.name) for c in device.__table__.columns},
         "is_online": _is_device_online(device)}
    )


@router.get("/status", response_model=ProtectionStatusResponse)
async def protection_status(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get an overall protection status summary for the current user.
    """
    devices = db.query(Device).filter(
        Device.user_id == user.id,
        Device.is_active == True,
    ).all()

    device_responses = [_device_to_response(d) for d in devices]
    online_count = sum(1 for d in device_responses if d.is_online)

    return ProtectionStatusResponse(
        has_devices=len(devices) > 0,
        total_devices=len(devices),
        online_devices=online_count,
        protection_active=online_count > 0,
        devices=device_responses,
    )


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_device(
    device_data: DeviceCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Register a new device for the current user.
    
    Called when HavenAI desktop app is first set up.
    """
    # Check if device with same machine_id already exists
    if device_data.machine_id:
        existing = db.query(Device).filter(Device.machine_id == device_data.machine_id).first()
        if existing:
            existing.name = device_data.name
            existing.os_version = device_data.os_version
            existing.app_version = device_data.app_version
            existing.last_seen = datetime.utcnow()
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return _device_to_response(existing)
    
    device = Device(
        user_id=user.id,
        name=device_data.name,
        os_type=device_data.os_type,
        os_version=device_data.os_version,
        app_version=device_data.app_version,
        machine_id=device_data.machine_id
    )
    
    db.add(device)
    db.commit()
    db.refresh(device)
    
    return _device_to_response(device)


@router.get("", response_model=List[DeviceResponse])
async def list_devices(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all devices for the current user.
    """
    devices = db.query(Device).filter(Device.user_id == user.id).all()
    return [_device_to_response(d) for d in devices]


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get details for a specific device.
    """
    device = db.query(Device).filter(
        Device.id == device_id,
        Device.user_id == user.id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    return _device_to_response(device)


@router.put("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: str,
    device_data: DeviceUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update device information.
    """
    device = db.query(Device).filter(
        Device.id == device_id,
        Device.user_id == user.id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    if device_data.name is not None:
        device.name = device_data.name
    if device_data.is_active is not None:
        device.is_active = device_data.is_active
    
    db.commit()
    db.refresh(device)
    
    return _device_to_response(device)


@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a device.
    """
    device = db.query(Device).filter(
        Device.id == device_id,
        Device.user_id == user.id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    db.delete(device)
    db.commit()


@router.post("/{device_id}/heartbeat", response_model=DeviceResponse)
async def device_heartbeat(
    device_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update device last_seen timestamp.
    
    Called periodically by desktop app to show device is online.
    """
    device = db.query(Device).filter(
        Device.id == device_id,
        Device.user_id == user.id
    ).first()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    device.last_seen = datetime.utcnow()
    db.commit()
    db.refresh(device)
    
    return _device_to_response(device)
