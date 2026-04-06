"""
SQLAlchemy Database Models

Defines the database schema for:
- Users
- Devices
- Alerts
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, Float, text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.database import Base


def generate_uuid():
    """Generate a UUID string"""
    return str(uuid.uuid4())


class User(Base):
    """User account model"""
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    is_verified = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    setup_preferences = relationship(
        "UserSetupPreferences",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )


class Device(Base):
    """User device model - represents an installed HavenAI client"""
    __tablename__ = "devices"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)  # e.g., "MacBook Pro"
    os_type = Column(String(50), nullable=False)  # e.g., "macos", "windows", "linux"
    os_version = Column(String(50), nullable=True)  # e.g., "14.0"
    app_version = Column(String(20), nullable=True)  # e.g., "0.1.0"
    machine_id = Column(String(255), unique=True, nullable=True)  # Unique hardware ID
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="devices")
    alerts = relationship("Alert", back_populates="device", cascade="all, delete-orphan")


class Alert(Base):
    """Security alert model"""
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    device_id = Column(String, ForeignKey("devices.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Alert details
    type = Column(String(50), nullable=False)  # suspicious_download, phishing_email, etc.
    severity = Column(String(20), nullable=False)  # low, medium, high, critical
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    details = Column(Text, nullable=True)  # JSON string with additional details
    notification_metadata = Column(Text, nullable=True)  # JSON string with notification results
    risk_score = Column(Float, nullable=True)
    
    # Status
    is_resolved = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    device = relationship("Device", back_populates="alerts")
    user = relationship("User", back_populates="alerts")


class Conversation(Base):
    """Chat conversation thread."""
    __tablename__ = "conversations"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="conversations")
    messages = relationship("ConversationMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ConversationMessage.created_at")


class ConversationMessage(Base):
    """Individual message within a conversation."""
    __tablename__ = "conversation_messages"

    id = Column(String, primary_key=True, default=generate_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user', 'assistant'
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")


class UserSetupPreferences(Base):
    """Per-user setup state for monitors and cloud alert channels."""
    __tablename__ = "user_setup_preferences"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    # Desktop-dependent monitors
    file_monitoring_enabled = Column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    process_monitoring_enabled = Column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    network_monitoring_enabled = Column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )

    # Cloud channels
    email_enabled = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    sms_enabled = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    voice_call_enabled = Column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    sms_min_severity = Column(String(20), nullable=False, default="high", server_default="high")
    voice_call_min_severity = Column(
        String(20), nullable=False, default="high", server_default="high"
    )
    sms_phone = Column(String(32), nullable=True)
    voice_phone = Column(String(32), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="setup_preferences")
