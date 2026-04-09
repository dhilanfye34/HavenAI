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


# ── Known-suspicious sender domains (exact match) ──
SUSPICIOUS_SENDER_DOMAINS = {
    "paypa1.com", "paypal-secure.com", "paypal-verify.com",
    "micr0soft-support.com", "microsoft-alert.com", "microsft.com",
    "secure-verify-account.com", "account-verify-secure.com",
    "apple-id-verify.com", "apple-support-alert.com",
    "amazons-delivery.com", "amazon-order-confirm.com",
    "netflix-billing.com", "netfliix.com",
    "bankofamerica-alert.com", "chase-secure.com",
    "wells-fargo-alert.com", "citibank-verify.com",
    "irs-refund.com", "irs-gov-refund.com",
    "fedex-tracking-delivery.com", "ups-delivery-notice.com",
    "dhl-shipment.com",
}

# ── Suspicious keywords — higher weight means more suspicious ──
SUSPICIOUS_KEYWORDS = {
    # Urgency
    "urgent": 0.15, "immediate action": 0.2, "act now": 0.2,
    "expires today": 0.2, "last warning": 0.2, "final notice": 0.2,
    "within 24 hours": 0.15, "time sensitive": 0.15,
    # Account threats
    "suspended": 0.2, "deactivated": 0.2, "locked": 0.15,
    "unauthorized": 0.15, "compromised": 0.15, "unusual activity": 0.15,
    "security alert": 0.15, "verify your account": 0.25,
    "confirm your identity": 0.2, "update your information": 0.15,
    # Credential requests
    "password": 0.1, "login": 0.08, "credentials": 0.15,
    "social security": 0.25, "ssn": 0.25, "credit card": 0.2,
    "bank account": 0.15, "routing number": 0.2,
    # Action requests
    "click here": 0.15, "click below": 0.15, "click the link": 0.15,
    "open attachment": 0.2, "download": 0.1,
    "verify": 0.1, "confirm": 0.08,
    # Financial
    "wire transfer": 0.25, "gift card": 0.25, "bitcoin": 0.2,
    "cryptocurrency": 0.2, "invoice": 0.1, "payment": 0.08,
    "refund": 0.12, "prize": 0.2, "winner": 0.2, "lottery": 0.25,
    "inheritance": 0.25, "million dollars": 0.3,
}

# ── Brands commonly spoofed ──
SPOOFED_BRANDS = {
    "microsoft", "apple", "google", "amazon", "paypal",
    "netflix", "facebook", "instagram", "whatsapp",
    "bank of america", "chase", "wells fargo", "citibank",
    "irs", "usps", "fedex", "ups", "dhl",
    "dropbox", "linkedin", "twitter", "tiktok",
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
            return {
                "enabled": False,
                "emails": [],
                "timestamp": time.time(),
                "scan_ok": False,
            }

        emails: List[Dict[str, Any]] = []
        scan_ok = False
        last_error: Optional[str] = None

        try:
            with imaplib.IMAP4_SSL(self.imap_host, self.imap_port) as mail:
                mail.login(self.imap_user, self.imap_password)
                mail.select(self.imap_folder, readonly=True)

                status, msg_nums = mail.search(None, "(UNSEEN)")
                if status != "OK":
                    return {
                        "enabled": True,
                        "emails": [],
                        "timestamp": time.time(),
                        "scan_ok": False,
                        "error": "IMAP search failed",
                    }

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
                    has_attachments = self._has_attachments(parsed)

                    emails.append(
                        {
                            "message_id": message_id,
                            "uid": msg_id.decode(errors="ignore"),
                            "from_name": sender_name,
                            "from_email": sender_email.lower(),
                            "subject": subject,
                            "snippet": snippet,
                            "received_at": parsed.get("Date"),
                            "has_attachments": has_attachments,
                        }
                    )

                logger.info(f"EmailInboxAgent scanned {len(raw_ids)} messages, {len(emails)} new")
                scan_ok = True

        except imaplib.IMAP4.error as e:
            msg = str(e)
            logger.warning(f"EmailInboxAgent IMAP error: {msg}")
            # imaplib raises this for both auth failures and protocol errors.
            # Treat any mention of 'auth' / 'login' / 'credential' as a credential problem.
            lower = msg.lower()
            if any(w in lower for w in ("auth", "login", "credential", "password")):
                last_error = "Authentication failed. Your app password may have been revoked or is incorrect."
            else:
                last_error = f"IMAP error: {msg}"
        except Exception as e:
            logger.debug(f"EmailInboxAgent mailbox poll failed: {e}")
            last_error = f"Connection failed: {e}"

        return {
            "enabled": True,
            "emails": emails,
            "timestamp": time.time(),
            "scan_ok": scan_ok,
            "error": last_error,
        }

    def analyze(self, observation: Dict[str, Any]) -> Dict[str, Any]:
        """Score each email and emit findings for suspicious ones."""
        findings: List[Dict[str, Any]] = []

        for email_msg in observation.get("emails", []):
            risk_score, reasons = self._analyze_email(email_msg)

            # Log every email's score for debugging
            subject = email_msg.get("subject", "(no subject)")[:50]
            logger.info(f"Email scored: {risk_score:.2f} — \"{subject}\" from {email_msg.get('from_email', '?')}")

            if risk_score >= 0.3:  # Lower threshold — flag anything mildly suspicious
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
        self.shared_context[self.name]["total_scanned"] = len(self._seen_ids)

        # Health tracking — surfaced via module_details.email so the UI can
        # detect broken credentials, stale scans, etc.
        now = observation.get("timestamp") or time.time()
        scan_ok = bool(observation.get("scan_ok"))
        error_msg = observation.get("error")
        ctx = self.shared_context[self.name]
        ctx["last_scan_at"] = now
        if scan_ok:
            ctx["last_successful_scan_at"] = now
            ctx["last_error"] = None
            ctx["consecutive_failures"] = 0
        elif observation.get("enabled"):
            ctx["consecutive_failures"] = int(ctx.get("consecutive_failures", 0) or 0) + 1
            if error_msg:
                ctx["last_error"] = error_msg
                ctx["last_error_at"] = now

        return {"findings": findings}

    def act(self, analysis: Dict[str, Any]) -> None:
        """Send phishing alerts for suspicious inbox messages."""
        for finding in analysis["findings"]:
            email_msg = finding["email"]
            risk = finding["risk_score"]

            if risk >= 0.8:
                severity = "critical"
            elif risk >= 0.6:
                severity = "high"
            elif risk >= 0.4:
                severity = "medium"
            else:
                severity = "low"

            reasons_text = "; ".join(finding["reasons"][:3])

            self.send_alert(
                {
                    "type": "suspicious_email",
                    "severity": severity,
                    "title": f"Suspicious email: {email_msg.get('subject') or '(no subject)'}",
                    "description": f"From: {email_msg.get('from_name', '')} <{email_msg.get('from_email', 'unknown')}>. {reasons_text}",
                    "details": {
                        "from_name": email_msg.get("from_name"),
                        "from_email": email_msg.get("from_email"),
                        "subject": email_msg.get("subject"),
                        "snippet": email_msg.get("snippet", "")[:200],
                        "message_id": email_msg.get("message_id"),
                        "risk_score": risk,
                        "reasons": finding["reasons"],
                        "recommendation": finding["recommendation"],
                    },
                }
            )
            logger.info(f"Alert sent for email: \"{email_msg.get('subject', '')}\" (score={risk:.2f}, severity={severity})")

    # Domains whose automated emails contain security keywords but are legitimate
    TRUSTED_SENDER_DOMAINS = {
        "google.com", "accounts.google.com", "googlemail.com",
        "apple.com", "id.apple.com",
        "microsoft.com", "account.microsoft.com", "outlook.com",
        "amazon.com", "paypal.com",
        "github.com", "noreply.github.com",
        "linkedin.com", "facebookmail.com",
        "twitter.com", "x.com",
        "stripe.com", "twilio.com",
        "zoom.us", "dropbox.com", "slack.com",
    }

    def _analyze_email(self, email_msg: Dict[str, Any]) -> Tuple[float, List[str]]:
        risk = 0.0
        reasons: List[str] = []

        from_email = email_msg.get("from_email", "")
        subject = (email_msg.get("subject") or "").lower()
        snippet = (email_msg.get("snippet") or "").lower()
        from_name = (email_msg.get("from_name") or "").strip()
        has_attachments = email_msg.get("has_attachments", False)

        domain = from_email.split("@")[-1] if "@" in from_email else ""
        text = f"{subject} {snippet}"

        # 0. Skip trusted senders — legitimate security notifications
        if domain in self.TRUSTED_SENDER_DOMAINS:
            return 0.0, []

        # 1. Known-suspicious sender domain
        if domain in SUSPICIOUS_SENDER_DOMAINS:
            risk += 0.5
            reasons.append(f"Sender domain is known suspicious: {domain}")

        # 2. Domain looks like a spoofed version of a real brand
        for brand in SPOOFED_BRANDS:
            brand_compact = brand.replace(" ", "")
            if brand_compact in domain.replace("-", "").replace(".", "") and domain not in self._get_legit_domains(brand):
                risk += 0.3
                reasons.append(f"Domain looks like it's impersonating {brand}")
                break

        # 3. Weighted keyword matching
        matched_weight = 0.0
        matched_keywords = []
        for keyword, weight in SUSPICIOUS_KEYWORDS.items():
            if keyword in text:
                matched_weight += weight
                matched_keywords.append(keyword)
                if matched_weight >= 0.5:
                    break
        if matched_keywords:
            risk += min(matched_weight, 0.5)
            top_keywords = matched_keywords[:3]
            reasons.append(f"Contains suspicious language: {', '.join(top_keywords)}")

        # 4. Link + credential language combination
        has_link = bool(re.search(r"https?://", text))
        credential_words = {"login", "password", "verify", "account", "confirm", "credentials", "ssn", "bank"}
        has_credential_language = any(w in text for w in credential_words)
        if has_link and has_credential_language:
            risk += 0.2
            reasons.append("Contains link combined with credential-related language")

        # 5. Shortened/obfuscated URLs
        short_url_pattern = r"https?://(bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|buff\.ly|ow\.ly|rb\.gy)"
        if re.search(short_url_pattern, text):
            risk += 0.15
            reasons.append("Contains shortened/obfuscated URL")

        # 6. Display-name spoofing
        if from_name and from_email:
            from_name_lower = from_name.lower()
            for brand in SPOOFED_BRANDS:
                if brand in from_name_lower and brand not in from_email:
                    risk += 0.2
                    reasons.append(f"Display name mentions '{brand}' but email doesn't match")
                    break

        # 7. Attachment with urgency
        if has_attachments and any(w in text for w in ("urgent", "invoice", "payment", "action required")):
            risk += 0.15
            reasons.append("Has attachments with urgent language")

        # 8. All-caps subject or excessive punctuation
        raw_subject = (email_msg.get("subject") or "")
        if raw_subject and len(raw_subject) > 5:
            caps_ratio = sum(1 for c in raw_subject if c.isupper()) / len(raw_subject)
            if caps_ratio > 0.6:
                risk += 0.1
                reasons.append("Subject line is mostly UPPERCASE")
            if raw_subject.count("!") >= 2 or raw_subject.count("?") >= 2:
                risk += 0.05
                reasons.append("Subject has excessive punctuation")

        # 9. Reply-to mismatch (common in phishing)
        # This would need the Reply-To header — check if from_name has brand but email is a random domain
        if from_name and "@" not in from_name and domain:
            # Free email provider sending as a brand
            free_providers = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "mail.com", "protonmail.com"}
            if domain in free_providers:
                for brand in SPOOFED_BRANDS:
                    if brand in from_name.lower():
                        risk += 0.25
                        reasons.append(f"Claims to be '{brand}' but sent from {domain}")
                        break

        return min(risk, 1.0), reasons

    def _get_legit_domains(self, brand: str) -> Set[str]:
        """Return legitimate domains for a brand to avoid false positives."""
        legit = {
            "microsoft": {"microsoft.com", "office.com", "live.com", "outlook.com", "hotmail.com"},
            "apple": {"apple.com", "icloud.com", "me.com", "mac.com"},
            "google": {"google.com", "gmail.com", "googlemail.com", "youtube.com"},
            "amazon": {"amazon.com", "amazon.co.uk", "amazon.de", "amazon.fr", "amazonaws.com"},
            "paypal": {"paypal.com", "paypal.me"},
            "netflix": {"netflix.com"},
            "facebook": {"facebook.com", "fb.com", "meta.com"},
            "instagram": {"instagram.com"},
            "chase": {"chase.com", "jpmorgan.com"},
            "wells fargo": {"wellsfargo.com"},
            "bank of america": {"bankofamerica.com", "bofa.com"},
        }
        return legit.get(brand, set())

    def _has_attachments(self, parsed_email: Any) -> bool:
        """Check if the email has attachments."""
        if not parsed_email.is_multipart():
            return False
        for part in parsed_email.walk():
            disposition = str(part.get("Content-Disposition") or "")
            if "attachment" in disposition:
                return True
        return False

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

    @staticmethod
    def test_connection(host: str, port: int, user: str, password: str) -> Dict[str, Any]:
        """Test IMAP connection with provided credentials."""
        try:
            with imaplib.IMAP4_SSL(host, port) as mail:
                mail.login(user, password)
                mail.select("INBOX", readonly=True)
                status, msg_nums = mail.search(None, "UNSEEN")
                unread = len(msg_nums[0].split()) if status == "OK" and msg_nums[0] else 0
                return {"success": True, "message": f"Connected. {unread} unread messages.", "unread_count": unread}
        except imaplib.IMAP4.error as e:
            return {"success": False, "message": f"Authentication failed: {e}"}
        except Exception as e:
            return {"success": False, "message": f"Connection failed: {e}"}

    def configure(self, host: str, port: int, user: str, password: str) -> None:
        """Hot-reload IMAP credentials without restarting the agent."""
        # Only clear seen IDs if the account changed (different user)
        if user != self.imap_user:
            self._seen_ids.clear()
        self.imap_host = host
        self.imap_port = port
        self.imap_user = user
        self.imap_password = password
        masked = user.split("@")[0][:3] + "***@" + user.split("@")[-1] if "@" in user else "***"
        logger.info(f"EmailInboxAgent reconfigured for {masked}")

    def disconnect(self) -> None:
        """Clear credentials and stop monitoring."""
        self.imap_host = None
        self.imap_port = 993
        self.imap_user = None
        self.imap_password = None
        self._seen_ids.clear()
        logger.info("EmailInboxAgent disconnected")

    def _get_recommendation(self, risk_score: float) -> str:
        if risk_score >= 0.8:
            return "Do not click links or attachments. Mark this message as phishing and delete it."
        if risk_score >= 0.6:
            return "This looks suspicious. Do not click links. Verify the sender independently before taking any action."
        if risk_score >= 0.4:
            return "This message has some suspicious characteristics. Be cautious with any links or requests."
        return "This message has minor red flags. Double-check the sender before taking action."
