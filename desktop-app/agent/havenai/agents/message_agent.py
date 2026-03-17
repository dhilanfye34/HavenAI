"""
Message Agent

Delivers alert notifications to external channels:
- Email (SMTP)
- SMS (Twilio)
- Voice call (Twilio)

This agent receives security alerts from the coordinator and routes
high-priority alerts to configured channels.
"""

import os
import smtplib
import time
from urllib.parse import quote
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from queue import Empty, Queue
from typing import Any, Dict, List, Tuple
import logging

import httpx

from .base import Agent

logger = logging.getLogger(__name__)


SEVERITY_ORDER = {"low": 1, "medium": 2, "high": 3, "critical": 4}


class MessageAgent(Agent):
    """Routes alerts to SMS/call/email channels based on severity and config."""

    def __init__(self, shared_context: Dict[str, Any], alert_queue: Queue):
        super().__init__(shared_context, alert_queue, name="MessageAgent")
        self._notification_queue: Queue = Queue()
        self._http = httpx.Client(timeout=10.0)

        # Channel config (all optional).
        self.smtp_host = os.getenv("HAVENAI_SMTP_HOST")
        self.smtp_port = int(os.getenv("HAVENAI_SMTP_PORT", "587"))
        self.smtp_user = os.getenv("HAVENAI_SMTP_USER")
        self.smtp_password = os.getenv("HAVENAI_SMTP_PASSWORD")
        self.email_from = os.getenv("HAVENAI_NOTIFICATION_EMAIL_FROM", self.smtp_user or "")
        self.email_to = os.getenv("HAVENAI_NOTIFICATION_EMAIL_TO")

        self.twilio_sid = os.getenv("HAVENAI_TWILIO_ACCOUNT_SID")
        self.twilio_token = os.getenv("HAVENAI_TWILIO_AUTH_TOKEN")
        self.twilio_from = os.getenv("HAVENAI_TWILIO_FROM_PHONE")
        self.sms_to = os.getenv("HAVENAI_NOTIFICATION_SMS_TO")
        self.call_to = os.getenv("HAVENAI_NOTIFICATION_CALL_TO")

        self.min_notify_severity = os.getenv("HAVENAI_NOTIFY_MIN_SEVERITY", "high").lower()
        if self.min_notify_severity not in SEVERITY_ORDER:
            self.min_notify_severity = "high"

    @property
    def cycle_interval(self) -> float:
        """Process notification jobs quickly as they arrive."""
        return 1.0

    def enqueue_alert(self, alert: Dict[str, Any]) -> None:
        """Called by coordinator to request channel notifications."""
        self._notification_queue.put(alert)

    def perceive(self) -> Dict[str, Any]:
        """Drain pending notification jobs from queue."""
        jobs: List[Dict[str, Any]] = []
        while True:
            try:
                jobs.append(self._notification_queue.get_nowait())
            except Empty:
                break
        return {"jobs": jobs, "timestamp": time.time()}

    def analyze(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Select alerts that should be externally notified."""
        selected: List[Dict[str, Any]] = []
        threshold = SEVERITY_ORDER.get(self.min_notify_severity, 3)

        for alert in observation["jobs"]:
            severity = str(alert.get("severity", "medium")).lower()
            if SEVERITY_ORDER.get(severity, 2) >= threshold:
                selected.append(alert)

        self.shared_context[self.name]["pending_jobs"] = len(observation["jobs"])
        self.shared_context[self.name]["selected_jobs"] = len(selected)
        return {"selected": selected}

    def act(self, analysis: Dict[str, Any]) -> None:
        """Send notifications to configured channels."""
        sent_count = 0
        error_count = 0

        for alert in analysis["selected"]:
            title = alert.get("title", "HavenAI Security Alert")
            severity = str(alert.get("severity", "medium")).upper()
            description = alert.get("description", "")
            details = alert.get("details", {})
            body = (
                f"[{severity}] {title}\n\n"
                f"{description}\n\n"
                f"Details: {details}"
            )

            # Email channel
            if self._email_configured():
                ok, err = self._send_email(title, body)
                if ok:
                    sent_count += 1
                else:
                    error_count += 1
                    logger.warning(f"MessageAgent email send failed: {err}")

            # SMS channel
            if self._twilio_configured() and self.sms_to:
                sms_text = f"[{severity}] {title}"
                ok, err = self._send_twilio_sms(self.sms_to, sms_text)
                if ok:
                    sent_count += 1
                else:
                    error_count += 1
                    logger.warning(f"MessageAgent SMS send failed: {err}")

            # Voice call channel
            if self._twilio_configured() and self.call_to:
                call_msg = f"HavenAI alert. Severity {severity}. {title}"
                ok, err = self._send_twilio_call(self.call_to, call_msg)
                if ok:
                    sent_count += 1
                else:
                    error_count += 1
                    logger.warning(f"MessageAgent voice call failed: {err}")

        self.shared_context[self.name]["last_sent_count"] = sent_count
        self.shared_context[self.name]["last_error_count"] = error_count
        self.shared_context[self.name]["last_run_at"] = time.time()

    def stop(self) -> None:
        self._http.close()
        super().stop()

    def _email_configured(self) -> bool:
        return bool(
            self.smtp_host
            and self.smtp_port
            and self.smtp_user
            and self.smtp_password
            and self.email_from
            and self.email_to
        )

    def _twilio_configured(self) -> bool:
        return bool(self.twilio_sid and self.twilio_token and self.twilio_from)

    def _send_email(self, subject: str, body: str) -> Tuple[bool, str]:
        try:
            msg = MIMEMultipart()
            msg["From"] = self.email_from
            msg["To"] = self.email_to
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.email_from, [self.email_to], msg.as_string())
            return True, ""
        except Exception as e:
            return False, str(e)

    def _send_twilio_sms(self, to_phone: str, text: str) -> Tuple[bool, str]:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Messages.json"
            response = self._http.post(
                url,
                auth=(self.twilio_sid, self.twilio_token),
                data={"From": self.twilio_from, "To": to_phone, "Body": text},
            )
            response.raise_for_status()
            return True, ""
        except Exception as e:
            return False, str(e)

    def _send_twilio_call(self, to_phone: str, text: str) -> Tuple[bool, str]:
        try:
            # Use inline TwiML via twimlets to avoid hosting a webhook.
            twiml_url = f"https://twimlets.com/message?Message%5B0%5D={quote(text)}"
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Calls.json"
            response = self._http.post(
                url,
                auth=(self.twilio_sid, self.twilio_token),
                data={"From": self.twilio_from, "To": to_phone, "Url": twiml_url},
            )
            response.raise_for_status()
            return True, ""
        except Exception as e:
            return False, str(e)
