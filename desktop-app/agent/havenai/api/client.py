"""
HavenAI API Client

Handles communication between the desktop agent and the cloud backend.
"""

import httpx
from typing import Optional, Dict, Any
import logging
import json
from pathlib import Path

logger = logging.getLogger(__name__)

# Config file location
CONFIG_DIR = Path.home() / ".havenai"
CONFIG_FILE = CONFIG_DIR / "config.json"


class APIClient:
    """
    Client for communicating with the HavenAI backend API.
    
    Handles:
    - Authentication (login, token refresh)
    - Device registration
    - Alert syncing
    """
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.device_id: Optional[str] = None
        self.user_id: Optional[str] = None
        
        # HTTP client with timeout
        self.client = httpx.Client(timeout=10.0)
        
        # Try to load saved credentials
        self._load_config()
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers with auth token if available."""
        headers = {"Content-Type": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers
    
    def _save_config(self) -> None:
        """Save credentials to config file."""
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        config = {
            "access_token": self.access_token,
            "refresh_token": self.refresh_token,
            "device_id": self.device_id,
            "user_id": self.user_id,
            "base_url": self.base_url
        }
        CONFIG_FILE.write_text(json.dumps(config, indent=2))
        logger.debug("Config saved")
    
    def _load_config(self) -> bool:
        """Load credentials from config file."""
        if CONFIG_FILE.exists():
            try:
                config = json.loads(CONFIG_FILE.read_text())
                self.access_token = config.get("access_token")
                self.refresh_token = config.get("refresh_token")
                self.device_id = config.get("device_id")
                self.user_id = config.get("user_id")
                if config.get("base_url"):
                    self.base_url = config.get("base_url")
                logger.info("Loaded saved credentials")
                return True
            except Exception as e:
                logger.warning(f"Failed to load config: {e}")
        return False
    
    def is_authenticated(self) -> bool:
        """Check if we have valid credentials."""
        return self.access_token is not None and self.device_id is not None
    
    def register(self, email: str, password: str, full_name: str = None) -> Dict[str, Any]:
        """
        Register a new user account.
        
        Args:
            email: User's email
            password: User's password
            full_name: Optional full name
            
        Returns:
            Response data with user and tokens
        """
        response = self.client.post(
            f"{self.base_url}/auth/register",
            json={
                "email": email,
                "password": password,
                "full_name": full_name
            }
        )
        response.raise_for_status()
        data = response.json()
        
        # Save tokens
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]
        self.user_id = data["user"]["id"]
        self._save_config()
        
        logger.info(f"Registered as {email}")
        return data
    
    def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Login to existing account.
        
        Args:
            email: User's email
            password: User's password
            
        Returns:
            Response data with user and tokens
        """
        response = self.client.post(
            f"{self.base_url}/auth/login",
            json={
                "email": email,
                "password": password
            }
        )
        response.raise_for_status()
        data = response.json()
        
        # Save tokens
        self.access_token = data["access_token"]
        self.refresh_token = data["refresh_token"]
        self.user_id = data["user"]["id"]
        self._save_config()
        
        logger.info(f"Logged in as {email}")
        return data
    
    def register_device(self, name: str, os_type: str, os_version: str = None, app_version: str = "0.1.0") -> Dict[str, Any]:
        """
        Register this device with the backend.
        
        Args:
            name: Device name (e.g., "MacBook Pro")
            os_type: OS type (macos, windows, linux)
            os_version: OS version
            app_version: HavenAI app version
            
        Returns:
            Device data including device_id
        """
        response = self.client.post(
            f"{self.base_url}/devices",
            headers=self._get_headers(),
            json={
                "name": name,
                "os_type": os_type,
                "os_version": os_version,
                "app_version": app_version
            }
        )
        response.raise_for_status()
        data = response.json()
        
        # Save device ID
        self.device_id = data["id"]
        self._save_config()
        
        logger.info(f"Registered device: {name} ({self.device_id})")
        return data
    
    def send_alert(self, alert: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Send an alert to the backend.
        
        Args:
            alert: Alert data from agent
            
        Returns:
            Created alert data, or None if failed
        """
        if not self.is_authenticated():
            logger.warning("Cannot send alert: not authenticated")
            return None
        
        # Format alert for API
        api_alert = {
            "device_id": self.device_id,
            "type": alert.get("type", "unknown"),
            "severity": alert.get("severity", "medium"),
            "title": alert.get("title", "Security Alert"),
            "description": alert.get("description"),
            "details": alert.get("details"),
            "risk_score": alert.get("details", {}).get("risk_score") if isinstance(alert.get("details"), dict) else None
        }
        
        try:
            response = self.client.post(
                f"{self.base_url}/alerts",
                headers=self._get_headers(),
                json=api_alert
            )
            response.raise_for_status()
            data = response.json()
            logger.info(f"Alert sent to cloud: {data['id']}")
            return data
        except httpx.HTTPStatusError as e:
            logger.error(f"Failed to send alert: {e.response.status_code} - {e.response.text}")
            # Try to refresh token if unauthorized
            if e.response.status_code == 401:
                self._refresh_access_token()
            return None
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
            return None
    
    def _refresh_access_token(self) -> bool:
        """Refresh the access token using refresh token."""
        if not self.refresh_token:
            return False
        
        try:
            response = self.client.post(
                f"{self.base_url}/auth/refresh",
                params={"refresh_token": self.refresh_token}
            )
            response.raise_for_status()
            data = response.json()
            
            self.access_token = data["access_token"]
            self.refresh_token = data["refresh_token"]
            self._save_config()
            
            logger.info("Access token refreshed")
            return True
        except Exception as e:
            logger.error(f"Failed to refresh token: {e}")
            return False
    
    def heartbeat(self) -> bool:
        """Send heartbeat to update device last_seen."""
        if not self.is_authenticated():
            return False
        
        try:
            response = self.client.post(
                f"{self.base_url}/devices/{self.device_id}/heartbeat",
                headers=self._get_headers()
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.debug(f"Heartbeat failed: {e}")
            return False
    
    def get_alerts(self, limit: int = 20) -> list:
        """Get recent alerts from backend."""
        if not self.is_authenticated():
            return []
        
        try:
            response = self.client.get(
                f"{self.base_url}/alerts",
                headers=self._get_headers(),
                params={"limit": limit}
            )
            response.raise_for_status()
            return response.json().get("alerts", [])
        except Exception as e:
            logger.error(f"Failed to get alerts: {e}")
            return []


# Singleton instance
_client: Optional[APIClient] = None


def get_client() -> APIClient:
    """Get the global API client instance."""
    global _client
    if _client is None:
        _client = APIClient()
    return _client
