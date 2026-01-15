"""
Device Routes

Handles device registration and management.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.db.database import get_db
from app.db.models import User, Device
from app.schemas import DeviceCreate, DeviceResponse, DeviceUpdate
from app.dependencies import get_current_user

router = APIRouter()


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
            # Update existing device instead of creating new one
            existing.name = device_data.name
            existing.os_version = device_data.os_version
            existing.app_version = device_data.app_version
            existing.last_seen = datetime.utcnow()
            existing.is_active = True
            db.commit()
            db.refresh(existing)
            return existing
    
    # Create new device
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
    
    return device


@router.get("", response_model=List[DeviceResponse])
async def list_devices(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all devices for the current user.
    """
    devices = db.query(Device).filter(Device.user_id == user.id).all()
    return devices


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
    
    return device


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
    
    # Update fields
    if device_data.name is not None:
        device.name = device_data.name
    if device_data.is_active is not None:
        device.is_active = device_data.is_active
    
    db.commit()
    db.refresh(device)
    
    return device


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
    
    return device
