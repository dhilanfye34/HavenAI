from pathlib import Path
import sys

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure `backend/app` is importable as `app` when running pytest from repo root.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.db.database import Base
from app.db.models import Device, User, UserSetupPreferences
from app.dependencies import get_current_user
from app.routers import alerts, setup


@pytest.fixture
def test_db_session():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def seeded_user(test_db_session):
    user = User(
        id="user-1",
        email="user@example.com",
        hashed_password="hashed",
        full_name="Test User",
        is_active=True,
        is_verified=True,
    )
    device = Device(
        id="device-1",
        user_id="user-1",
        name="Test Laptop",
        os_type="windows",
        is_active=True,
    )
    prefs = UserSetupPreferences(
        user_id="user-1",
        email_enabled=True,
        sms_enabled=False,
        voice_call_enabled=False,
        sms_min_severity="high",
        voice_call_min_severity="high",
    )
    test_db_session.add_all([user, device, prefs])
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def app_client(test_db_session, seeded_user):
    app = FastAPI()
    app.include_router(setup.router, prefix="/setup")
    app.include_router(alerts.router, prefix="/alerts")

    def override_get_db():
        yield test_db_session

    def override_get_current_user():
        return seeded_user

    app.dependency_overrides[alerts.get_db] = override_get_db
    app.dependency_overrides[setup.get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user

    with TestClient(app) as client:
        yield client
