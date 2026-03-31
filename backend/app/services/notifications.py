"""
Notification service for dispatching alert notifications.

All provider failures are handled as non-blocking results.
"""

from __future__ import annotations

from dataclasses import dataclass
from base64 import b64encode
from html import escape as html_escape
from typing import Dict, Optional
import json
import logging
import urllib.error
import urllib.parse
import urllib.request

from app.config import settings
from app.db.models import Alert, User, UserSetupPreferences


logger = logging.getLogger(__name__)

SEVERITY_RANK: Dict[str, int] = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


@dataclass
class NotificationResult:
    channel: str
    attempted: bool
    success: bool
    status: str
    detail: Optional[str] = None

    def as_dict(self) -> dict:
        return {
            "channel": self.channel,
            "attempted": self.attempted,
            "success": self.success,
            "status": self.status,
            "detail": self.detail,
        }


def _severity_at_least(current: str, minimum: str) -> bool:
    current_rank = SEVERITY_RANK.get((current or "").lower(), 0)
    minimum_rank = SEVERITY_RANK.get((minimum or "").lower(), 0)
    return current_rank >= minimum_rank


class NotificationService:
    """Routes alert notifications to enabled channels per user preferences."""

    def dispatch_for_alert(
        self,
        *,
        alert: Alert,
        user: User,
        preferences: Optional[UserSetupPreferences],
    ) -> dict:
        if preferences is None:
            return {
                "severity": alert.severity,
                "results": [
                    NotificationResult(
                        channel="all",
                        attempted=False,
                        success=False,
                        status="skipped",
                        detail="User setup preferences not found.",
                    ).as_dict()
                ],
            }

        results = [
            self._send_email(alert=alert, user=user, preferences=preferences),
            self._send_sms(alert=alert, user=user, preferences=preferences),
            self._send_voice_call(alert=alert, user=user, preferences=preferences),
        ]
        return {
            "severity": alert.severity,
            "results": [result.as_dict() for result in results],
        }

    def _alert_message(self, alert: Alert) -> str:
        return (
            f"[HavenAI] {alert.severity.upper()} alert: {alert.title}\n"
            f"Type: {alert.type}\n"
            f"Description: {alert.description or 'No description provided.'}"
        )

    def _send_email(
        self,
        *,
        alert: Alert,
        user: User,
        preferences: UserSetupPreferences,
    ) -> NotificationResult:
        if not preferences.email_enabled:
            return NotificationResult(
                channel="email",
                attempted=False,
                success=False,
                status="skipped",
                detail="Email notifications are disabled.",
            )

        if settings.notification_email_provider.lower() != "sendgrid":
            logger.info("Email provider unsupported: %s", settings.notification_email_provider)
            return NotificationResult(
                channel="email",
                attempted=False,
                success=False,
                status="skipped",
                detail="Unsupported email provider.",
            )

        if not settings.sendgrid_api_key:
            logger.info("Skipping SendGrid email; sendgrid_api_key is not configured.")
            return NotificationResult(
                channel="email",
                attempted=False,
                success=False,
                status="skipped",
                detail="SendGrid API key is not configured.",
            )

        body = {
            "personalizations": [{"to": [{"email": user.email}]}],
            "from": {"email": settings.from_email},
            "subject": f"HavenAI {alert.severity.upper()} alert: {alert.title}",
            "content": [{"type": "text/plain", "value": self._alert_message(alert)}],
        }
        request = urllib.request.Request(
            "https://api.sendgrid.com/v3/mail/send",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {settings.sendgrid_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                if 200 <= response.status < 300:
                    return NotificationResult(
                        channel="email",
                        attempted=True,
                        success=True,
                        status="sent",
                        detail="SendGrid accepted the message.",
                    )
                return NotificationResult(
                    channel="email",
                    attempted=True,
                    success=False,
                    status="failed",
                    detail=f"SendGrid returned HTTP {response.status}.",
                )
        except urllib.error.HTTPError as exc:
            return NotificationResult(
                channel="email",
                attempted=True,
                success=False,
                status="failed",
                detail=f"SendGrid HTTP error: {exc.code}",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Email send failed: %s", exc)
            return NotificationResult(
                channel="email",
                attempted=True,
                success=False,
                status="failed",
                detail=str(exc),
            )

    def _send_sms(
        self,
        *,
        alert: Alert,
        user: User,
        preferences: UserSetupPreferences,
    ) -> NotificationResult:
        if not preferences.sms_enabled:
            return NotificationResult(
                channel="sms",
                attempted=False,
                success=False,
                status="skipped",
                detail="SMS notifications are disabled.",
            )

        if not preferences.sms_phone:
            return NotificationResult(
                channel="sms",
                attempted=False,
                success=False,
                status="skipped",
                detail="SMS phone number is not configured.",
            )

        if not _severity_at_least(alert.severity, preferences.sms_min_severity):
            return NotificationResult(
                channel="sms",
                attempted=False,
                success=False,
                status="skipped",
                detail=f"Alert severity below SMS threshold ({preferences.sms_min_severity}).",
            )

        return self._send_twilio_message(
            channel="sms",
            to_phone=preferences.sms_phone,
            body=self._alert_message(alert),
        )

    def _send_voice_call(
        self,
        *,
        alert: Alert,
        user: User,  # noqa: ARG002
        preferences: UserSetupPreferences,
    ) -> NotificationResult:
        if not preferences.voice_call_enabled:
            return NotificationResult(
                channel="voice_call",
                attempted=False,
                success=False,
                status="skipped",
                detail="Voice call notifications are disabled.",
            )

        if not preferences.voice_phone:
            return NotificationResult(
                channel="voice_call",
                attempted=False,
                success=False,
                status="skipped",
                detail="Voice phone number is not configured.",
            )

        if not _severity_at_least(alert.severity, preferences.voice_call_min_severity):
            return NotificationResult(
                channel="voice_call",
                attempted=False,
                success=False,
                status="skipped",
                detail=f"Alert severity below voice threshold ({preferences.voice_call_min_severity}).",
            )

        # Basic TwiML for voice alerts.
        # Escape title to prevent XML injection in TwiML.
        safe_title = html_escape(alert.title or "", quote=True)
        safe_severity = html_escape(alert.severity or "", quote=True)
        message = (
            f"Haven A I {safe_severity} alert. {safe_title}. "
            "Check your Haven dashboard for details."
        )
        twiml = f"<Response><Say>{message}</Say></Response>"
        return self._send_twilio_call(to_phone=preferences.voice_phone, twiml=twiml)

    def _send_twilio_message(self, *, channel: str, to_phone: str, body: str) -> NotificationResult:
        if settings.notification_sms_provider.lower() != "twilio":
            return NotificationResult(
                channel=channel,
                attempted=False,
                success=False,
                status="skipped",
                detail="Unsupported SMS provider.",
            )

        credentials_missing = not (
            settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_phone
        )
        if credentials_missing:
            return NotificationResult(
                channel=channel,
                attempted=False,
                success=False,
                status="skipped",
                detail="Twilio credentials are not fully configured.",
            )

        url = (
            f"https://api.twilio.com/2010-04-01/Accounts/"
            f"{settings.twilio_account_sid}/Messages.json"
        )
        payload = urllib.parse.urlencode(
            {
                "From": settings.twilio_from_phone,
                "To": to_phone,
                "Body": body,
            }
        ).encode("utf-8")
        auth = b64encode(
            f"{settings.twilio_account_sid}:{settings.twilio_auth_token}".encode("utf-8")
        ).decode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                if 200 <= response.status < 300:
                    return NotificationResult(
                        channel=channel,
                        attempted=True,
                        success=True,
                        status="sent",
                        detail="Twilio accepted the message.",
                    )
                return NotificationResult(
                    channel=channel,
                    attempted=True,
                    success=False,
                    status="failed",
                    detail=f"Twilio returned HTTP {response.status}.",
                )
        except urllib.error.HTTPError as exc:
            return NotificationResult(
                channel=channel,
                attempted=True,
                success=False,
                status="failed",
                detail=f"Twilio HTTP error: {exc.code}",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Twilio message send failed: %s", exc)
            return NotificationResult(
                channel=channel,
                attempted=True,
                success=False,
                status="failed",
                detail=str(exc),
            )

    def _send_twilio_call(self, *, to_phone: str, twiml: str) -> NotificationResult:
        if settings.notification_voice_provider.lower() != "twilio":
            return NotificationResult(
                channel="voice_call",
                attempted=False,
                success=False,
                status="skipped",
                detail="Unsupported voice provider.",
            )

        credentials_missing = not (
            settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_phone
        )
        if credentials_missing:
            return NotificationResult(
                channel="voice_call",
                attempted=False,
                success=False,
                status="skipped",
                detail="Twilio credentials are not fully configured.",
            )

        url = (
            f"https://api.twilio.com/2010-04-01/Accounts/"
            f"{settings.twilio_account_sid}/Calls.json"
        )
        payload = urllib.parse.urlencode(
            {
                "From": settings.twilio_from_phone,
                "To": to_phone,
                "Twiml": twiml,
            }
        ).encode("utf-8")
        auth = b64encode(
            f"{settings.twilio_account_sid}:{settings.twilio_auth_token}".encode("utf-8")
        ).decode("utf-8")
        request = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                if 200 <= response.status < 300:
                    return NotificationResult(
                        channel="voice_call",
                        attempted=True,
                        success=True,
                        status="sent",
                        detail="Twilio accepted the call request.",
                    )
                return NotificationResult(
                    channel="voice_call",
                    attempted=True,
                    success=False,
                    status="failed",
                    detail=f"Twilio returned HTTP {response.status}.",
                )
        except urllib.error.HTTPError as exc:
            return NotificationResult(
                channel="voice_call",
                attempted=True,
                success=False,
                status="failed",
                detail=f"Twilio HTTP error: {exc.code}",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Twilio call send failed: %s", exc)
            return NotificationResult(
                channel="voice_call",
                attempted=True,
                success=False,
                status="failed",
                detail=str(exc),
            )


_notification_service = NotificationService()


def get_notification_service() -> NotificationService:
    return _notification_service
