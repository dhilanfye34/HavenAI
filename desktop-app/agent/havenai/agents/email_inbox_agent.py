"""
Email Inbox Agent

Monitors a user's email inbox for suspicious phishing-like messages.
Uses IMAP to pull unseen messages and applies lightweight heuristics.
"""

import imaplib
import os
import time
from email import message_from_bytes
from email.utils import parseaddr
from queue import Queue
from typing import Any, Dict, List, Optional, Set, Tuple
import logging
import re

from .base import Agent

logger = logging.getLogger(__name__)


SUSPICIOUS_SENDER_DOMAINS = {
    "paypa1.com",
    "micr0soft-support.com",
    "secure-verify-account.com",
}

SUSPICIOUS_KEYWORDS = {
    "urgent",
    "verify",
    "password",
    "suspended",
    "click here",
    "invoice",
    "wire transfer",
    "gift card",
}


class EmailInboxAgent(Agent):
    """Agent that inspects incoming inbox messages for phishing indicators."""

    def __init__(self, shared_context: Dict[str, Any], alert_queue: Queue):
        super().__init__(shared_context, alert_queue, name="EmailInboxAgent")
        self.imap_host = os.getenv("HAVENAI_IMAP_HOST")
        self.imap_port = int(os.getenv("HAVENAI_IMAP_PORT", "993"))
        self.imap_user = os.getenv("HAVENAI_IMAP_USER")
        self.imap_password = os.getenv("HAVENAI_IMAP_PASSWORD")
        self.imap_folder = os.getenv("HAVENAI_IMAP_FOLDER", "INBOX")

        self._seen_ids: Set[str] = set()

        if not self._is_enabled():
            logger.info(
                "EmailInboxAgent disabled: set HAVENAI_IMAP_HOST/USER/PASSWORD to enable."
            )

    @property
    def cycle_interval(self) -> float:
        """Poll mailbox every 20 seconds."""
        return 20.0

    def _is_enabled(self) -> bool:
        return bool(self.imap_host and self.imap_user and self.imap_password)

    def perceive(self) -> Dict[str, Any]:
        """Fetch unseen inbox messages and return parsed metadata."""
        if not self._is_enabled():
            return {"enabled": False, "emails": [], "timestamp": time.time()}

        emails: List[Dict[str, Any]] = []

        try:
            with imaplib.IMAP4_SSL(self.imap_host, self.imap_port) as mail:
                mail.login(self.imap_user, self.imap_password)
                mail.select(self.imap_folder, readonly=True)

                status, msg_nums = mail.search(None, "(UNSEEN)")
                if status != "OK":
                    return {"enabled": True, "emails": [], "timestamp": time.time()}

                # Limit scan size to keep the cycle lightweight.
                raw_ids = msg_nums[0].split()[-20:]
                for msg_id in raw_ids:
                    status, msg_data = mail.fetch(msg_id, "(RFC822)")
                    if status != "OK" or not msg_data or not msg_data[0]:
                        continue

                    raw_message = msg_data[0][1]
                    parsed = message_from_bytes(raw_message)

                    message_id = parsed.get("Message-ID") or f"uid:{msg_id.decode()}"
                    if message_id in self._seen_ids:
                        continue
                    self._seen_ids.add(message_id)

                    sender_raw = parsed.get("From", "")
                    sender_name, sender_email = parseaddr(sender_raw)
                    subject = (parsed.get("Subject") or "").strip()
                    snippet = self._extract_text_snippet(parsed)

                    emails.append(
                        {
                            "message_id": message_id,
                            "uid": msg_id.decode(errors="ignore"),
                            "from_name": sender_name,
                            "from_email": sender_email.lower(),
                            "subject": subject,
                            "snippet": snippet,
                            "received_at": parsed.get("Date"),
                        }
                    )
        except Exception as e:
            logger.debug(f"EmailInboxAgent mailbox poll failed: {e}")

        return {"enabled": True, "emails": emails, "timestamp": time.time()}

    def analyze(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Score each email and emit findings for suspicious ones."""
        findings: List[Dict[str, Any]] = []

        for email_msg in observation.get("emails", []):
            risk_score, reasons = self._analyze_email(email_msg)
            if risk_score > 0.5:
                findings.append(
                    {
                        "email": email_msg,
                        "risk_score": risk_score,
                        "reasons": reasons,
                        "recommendation": self._get_recommendation(risk_score),
                    }
                )

        self.shared_context[self.name]["findings"] = findings
        self.shared_context[self.name]["last_scan_count"] = len(observation.get("emails", []))
        self.shared_context[self.name]["enabled"] = observation.get("enabled", False)

        return {"findings": findings}

    def act(self, analysis: Dict[str, Any]) -> None:
        """Send phishing alerts for suspicious inbox messages."""
        for finding in analysis["findings"]:
            email_msg = finding["email"]
            risk = finding["risk_score"]

            if risk >= 0.9:
                severity = "critical"
            elif risk >= 0.7:
                severity = "high"
            elif risk >= 0.5:
                severity = "medium"
            else:
                severity = "low"

            self.send_alert(
                {
                    "type": "suspicious_email",
                    "severity": severity,
                    "title": f"Potential phishing email: {email_msg.get('subject') or '(no subject)'}",
                    "description": "A potentially suspicious email was detected in your inbox.",
                    "details": {
                        "from_name": email_msg.get("from_name"),
                        "from_email": email_msg.get("from_email"),
                        "subject": email_msg.get("subject"),
                        "snippet": email_msg.get("snippet"),
                        "message_id": email_msg.get("message_id"),
                        "risk_score": risk,
                        "reasons": finding["reasons"],
                        "recommendation": finding["recommendation"],
                    },
                }
            )

    def _analyze_email(self, email_msg: Dict[str, Any]) -> Tuple[float, List[str]]:
        risk = 0.0
        reasons: List[str] = []

        from_email = email_msg.get("from_email", "")
        subject = (email_msg.get("subject") or "").lower()
        snippet = (email_msg.get("snippet") or "").lower()
        from_name = (email_msg.get("from_name") or "").strip()

        domain = from_email.split("@")[-1] if "@" in from_email else ""
        if domain in SUSPICIOUS_SENDER_DOMAINS:
            risk += 0.5
            reasons.append(f"Sender domain is known suspicious: {domain}")

        text = f"{subject} {snippet}"
        for keyword in SUSPICIOUS_KEYWORDS:
            if keyword in text:
                risk += 0.15
                reasons.append(f"Contains suspicious keyword: '{keyword}'")
                if risk >= 0.7:
                    break

        if re.search(r"https?://", text) and any(
            token in text for token in ("login", "password", "verify", "account")
        ):
            risk += 0.25
            reasons.append("Contains link plus credential-related language")

        # Display-name spoofing style indicator.
        if from_name and from_email and from_name.lower() not in from_email:
            if any(brand in from_name.lower() for brand in ("microsoft", "apple", "paypal", "bank")):
                risk += 0.2
                reasons.append("Brand-like display name with mismatched sender address")

        return min(risk, 1.0), reasons

    def _extract_text_snippet(self, parsed_email: Any, max_len: int = 400) -> str:
        """Extract a plain-text preview from a MIME email message."""
        try:
            if parsed_email.is_multipart():
                for part in parsed_email.walk():
                    if part.get_content_type() == "text/plain":
                        payload = part.get_payload(decode=True) or b""
                        charset = part.get_content_charset() or "utf-8"
                        return payload.decode(charset, errors="ignore").strip()[:max_len]
                return ""

            payload = parsed_email.get_payload(decode=True) or b""
            charset = parsed_email.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="ignore").strip()[:max_len]
        except Exception:
            return ""

    def _get_recommendation(self, risk_score: float) -> str:
        if risk_score >= 0.8:
            return "Do not click links or attachments. Mark this message as phishing."
        if risk_score >= 0.6:
            return "Verify the sender independently before taking any action."
        return "Treat this message with caution and confirm legitimacy."
