"""
Pydantic Schemas

Request and response models for the API.
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Any, Literal
from datetime import datetime


# ============== Auth Schemas ==============

class UserCreate(BaseModel):
    """Schema for user registration"""
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


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


class RefreshRequest(BaseModel):
    """Schema for token refresh"""
    refresh_token: str


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
    is_online: bool = False
    created_at: datetime
    
    class Config:
        from_attributes = True


class DeviceUpdate(BaseModel):
    """Schema for updating device info"""
    name: Optional[str] = None
    is_active: Optional[bool] = None


class ProtectionStatusResponse(BaseModel):
    """Summary of the user's protection state across all devices"""
    has_devices: bool
    total_devices: int
    online_devices: int
    protection_active: bool
    devices: List[DeviceResponse]


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
    notification_metadata: Optional[str]  # JSON string
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


# ============== Chat Schemas ==============

class ChatMessage(BaseModel):
    """Single message in the chat history."""
    role: Literal["user", "assistant"]
    content: str


class ChatContextEvent(BaseModel):
    """Context event injected from dashboard sidebars."""
    source: str
    severity: Optional[str] = None
    timestamp: Optional[str] = None
    description: str


class ChatRequest(BaseModel):
    """Request payload for streamed chat completions."""
    messages: List[ChatMessage]
    context_events: List[ChatContextEvent] = []
    model: str = "gpt-4o-mini"
    conversation_id: Optional[str] = None


# ============== Setup Schemas ==============

class SetupPreferencesResponse(BaseModel):
    """Persisted setup preferences and gating metadata."""
    file_monitoring_enabled: bool
    process_monitoring_enabled: bool
    network_monitoring_enabled: bool
    email_enabled: bool
    sms_enabled: bool
    voice_call_enabled: bool
    sms_min_severity: Literal["low", "medium", "high", "critical"]
    voice_call_min_severity: Literal["low", "medium", "high", "critical"]
    sms_phone: Optional[str] = None
    voice_phone: Optional[str] = None
    desktop_available: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SetupPreferencesUpdate(BaseModel):
    """Patch payload for updating user setup preferences."""
    file_monitoring_enabled: Optional[bool] = None
    process_monitoring_enabled: Optional[bool] = None
    network_monitoring_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    voice_call_enabled: Optional[bool] = None
    sms_min_severity: Optional[Literal["low", "medium", "high", "critical"]] = None
    voice_call_min_severity: Optional[Literal["low", "medium", "high", "critical"]] = None
    sms_phone: Optional[str] = None
    voice_phone: Optional[str] = None

    @field_validator("sms_phone", "voice_phone")
    @classmethod
    def normalize_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = value.strip()
        if normalized == "":
            return None

        compact = (
            normalized.replace(" ", "")
            .replace("-", "")
            .replace("(", "")
            .replace(")", "")
            .replace(".", "")
        )
        has_plus = compact.startswith("+")
        digits = compact[1:] if has_plus else compact
        if not digits.isdigit():
            raise ValueError("Phone number must contain only digits and optional + prefix.")
        if len(digits) < 7 or len(digits) > 15:
            raise ValueError("Phone number must contain between 7 and 15 digits.")
        return f"+{digits}" if has_plus else digits


# ============== Enrichment Schemas ==============

class EnrichmentRequest(BaseModel):
    """Request payload for LLM-powered alert enrichment."""
    alert_type: str
    severity: str
    title: str
    description: Optional[str] = None
    details: Optional[dict] = None
    risk_score: Optional[float] = None
    baseline_context: Optional[dict] = None


class EnrichmentResponse(BaseModel):
    """LLM-enriched alert interpretation."""
    explanation: str
    recommendation: str
    confidence: float
    false_positive_likelihood: float


# ============== Conversation Schemas ==============

class ConversationResponse(BaseModel):
    """Schema for a conversation thread."""
    id: str
    title: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationListResponse(BaseModel):
    """Schema for listing conversations."""
    conversations: List[ConversationResponse]
    total: int
