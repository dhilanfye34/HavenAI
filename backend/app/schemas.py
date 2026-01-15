"""
Pydantic Schemas

Request and response models for the API.
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime


# ============== Auth Schemas ==============

class UserCreate(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for user data in responses"""
    id: str
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """Schema for authentication tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    """Schema for login/register response"""
    user: UserResponse
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ============== Device Schemas ==============

class DeviceCreate(BaseModel):
    """Schema for registering a new device"""
    name: str
    os_type: str
    os_version: Optional[str] = None
    app_version: Optional[str] = None
    machine_id: Optional[str] = None


class DeviceResponse(BaseModel):
    """Schema for device data in responses"""
    id: str
    name: str
    os_type: str
    os_version: Optional[str]
    app_version: Optional[str]
    last_seen: datetime
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class DeviceUpdate(BaseModel):
    """Schema for updating device info"""
    name: Optional[str] = None
    is_active: Optional[bool] = None


# ============== Alert Schemas ==============

class AlertCreate(BaseModel):
    """Schema for creating a new alert (from desktop app)"""
    device_id: str
    type: str
    severity: str
    title: str
    description: Optional[str] = None
    details: Optional[dict] = None
    risk_score: Optional[float] = None


class AlertResponse(BaseModel):
    """Schema for alert data in responses"""
    id: str
    device_id: str
    type: str
    severity: str
    title: str
    description: Optional[str]
    details: Optional[str]  # JSON string
    risk_score: Optional[float]
    is_resolved: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    """Schema for updating an alert"""
    is_resolved: Optional[bool] = None


class AlertListResponse(BaseModel):
    """Schema for paginated alert list"""
    alerts: List[AlertResponse]
    total: int
    page: int
    pages: int


class AlertStatsResponse(BaseModel):
    """Schema for alert statistics"""
    total: int
    by_severity: dict
    by_type: dict
    last_24h: int
    last_7d: int
    unresolved: int
