"""
Automated tests for EmailInboxAgent phishing detection heuristics.

These tests feed synthetic email metadata into the agent's analysis
functions and verify that known-phishing patterns are scored correctly
while legitimate emails pass cleanly.
"""

from queue import Queue

import pytest

from havenai.agents.email_inbox_agent import EmailInboxAgent


@pytest.fixture()
def agent():
    shared_context = {"baseline": {}}
    queue = Queue()
    a = EmailInboxAgent(shared_context, queue)
    return a


def _email(
    from_email="sender@example.com",
    from_name="",
    subject="Hello",
    snippet="",
    has_attachments=False,
):
    return {
        "message_id": "<test@test>",
        "uid": "1",
        "from_email": from_email,
        "from_name": from_name,
        "subject": subject,
        "snippet": snippet,
        "received_at": "Mon, 31 Mar 2026 12:00:00 +0000",
        "has_attachments": has_attachments,
    }


class TestPhishingDetection:
    """Tests for the heuristic scoring engine."""

    def test_known_suspicious_domain(self, agent):
        """Emails from known-phishing domains should score high."""
        email = _email(from_email="support@paypa1.com", subject="Verify your account")
        risk, reasons = agent._analyze_email(email)
        assert risk >= 0.5, f"Known suspicious domain should be high risk: {risk}"
        assert any("known suspicious" in r.lower() for r in reasons)

    def test_brand_impersonation_in_domain(self, agent):
        """A domain that looks like a brand but isn't legit should be flagged."""
        email = _email(from_email="alert@microsoft-alert.com", subject="Account suspended")
        risk, reasons = agent._analyze_email(email)
        assert risk >= 0.3, f"Brand impersonation domain should be flagged: {risk}"

    def test_urgency_keywords(self, agent):
        """Emails packed with urgency/threat language should score higher."""
        email = _email(
            from_email="info@randomsite.xyz",
            subject="URGENT: Your account has been suspended",
            snippet="Immediate action required. Verify your account within 24 hours or it will be deactivated. Click here to confirm your identity.",
        )
        risk, reasons = agent._analyze_email(email)
        assert risk >= 0.3, f"Urgency-packed email should be risky: {risk}"
        assert any("suspicious language" in r.lower() for r in reasons)

    def test_link_with_credential_language(self, agent):
        """An email combining a URL with credential-related words should be flagged."""
        email = _email(
            from_email="no-reply@randomsite.xyz",
            subject="Verify your login credentials",
            snippet="Please click https://shady-site.com/verify to confirm your password.",
        )
        risk, reasons = agent._analyze_email(email)
        assert risk >= 0.2
        assert any("link combined with credential" in r.lower() for r in reasons)

    def test_shortened_url_flagged(self, agent):
        """Emails containing shortened URLs should get a risk bump."""
        email = _email(
            from_email="promo@randomsite.xyz",
            subject="You won a prize!",
            snippet="Claim your prize here: https://bit.ly/3xYz123",
        )
        risk, reasons = agent._analyze_email(email)
        assert any("shortened" in r.lower() for r in reasons)

    def test_display_name_spoofing(self, agent):
        """Display name says 'Apple' but email is from a random domain."""
        email = _email(
            from_email="scam@random-domain.com",
            from_name="Apple Support",
            subject="Your Apple ID was used to sign in",
        )
        risk, reasons = agent._analyze_email(email)
        assert risk >= 0.2
        assert any("display name" in r.lower() for r in reasons)

    def test_free_provider_brand_claim(self, agent):
        """Claims to be a brand but sent from gmail.com."""
        email = _email(
            from_email="paypal.support@gmail.com",
            from_name="PayPal Security",
            subject="Unauthorized transaction on your account",
        )
        risk, reasons = agent._analyze_email(email)
        assert risk >= 0.25
        assert any("claims to be" in r.lower() for r in reasons)

    def test_attachment_with_urgency(self, agent):
        """An attachment combined with urgent language should be flagged."""
        email = _email(
            from_email="invoices@randomcorp.biz",
            subject="URGENT: Invoice attached - payment required",
            snippet="Please see attached invoice for immediate payment.",
            has_attachments=True,
        )
        risk, reasons = agent._analyze_email(email)
        assert any("attachment" in r.lower() for r in reasons)

    def test_all_caps_subject(self, agent):
        """Subjects in all caps should add a small risk bump."""
        email = _email(
            from_email="alerts@randomsite.xyz",
            subject="YOUR ACCOUNT IS LOCKED",
        )
        risk, reasons = agent._analyze_email(email)
        assert any("uppercase" in r.lower() for r in reasons)

    def test_trusted_sender_passes(self, agent):
        """Emails from trusted senders (google.com, apple.com) should score 0."""
        email = _email(
            from_email="no-reply@google.com",
            subject="Security alert: new sign-in detected",
            snippet="Someone signed in to your account. If this was you, you can ignore this.",
        )
        risk, reasons = agent._analyze_email(email)
        assert risk == 0.0, f"Trusted sender should be score 0, got {risk}"
        assert reasons == []

    def test_normal_email_low_risk(self, agent):
        """A regular email from a normal sender should be low risk."""
        email = _email(
            from_email="colleague@company.com",
            from_name="Jane Smith",
            subject="Meeting tomorrow at 3pm",
            snippet="Hey, just confirming our meeting tomorrow. Let me know if the time works.",
        )
        risk, reasons = agent._analyze_email(email)
        assert risk < 0.3, f"Normal email should be low risk, got {risk}"

    def test_recommendation_levels(self, agent):
        """Recommendations should escalate with risk score."""
        low = agent._get_recommendation(0.35)
        medium = agent._get_recommendation(0.5)
        high = agent._get_recommendation(0.7)
        critical = agent._get_recommendation(0.9)

        assert "double-check" in low.lower() or "minor" in low.lower()
        assert "cautious" in medium.lower() or "suspicious" in medium.lower()
        assert "do not click" in high.lower() or "verify" in high.lower()
        assert "do not click" in critical.lower() or "delete" in critical.lower()

    def test_act_sends_alert_for_findings(self, agent):
        """The act() method should queue alerts for each finding."""
        finding = {
            "email": _email(from_email="scam@phish.com", subject="Verify now"),
            "risk_score": 0.7,
            "reasons": ["Suspicious domain"],
            "recommendation": "Do not click.",
        }
        agent.act({"findings": [finding]})

        alerts = []
        while not agent.alert_queue.empty():
            alerts.append(agent.alert_queue.get_nowait())

        assert len(alerts) == 1
        assert alerts[0]["type"] == "suspicious_email"
        assert alerts[0]["severity"] == "high"
