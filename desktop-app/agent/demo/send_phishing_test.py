"""
HavenAI Demo: Send Test Phishing Emails

Sends fake phishing emails to a target inbox so the Email Agent flags them.
Uses Gmail SMTP — requires a Gmail account with an app-specific password.

Usage:
  python send_phishing_test.py --to TARGET_EMAIL --from SENDER_GMAIL --password APP_PASSWORD

The sender Gmail needs an app-specific password:
  https://myaccount.google.com → Security → App passwords
"""

import argparse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import time


PHISHING_EMAILS = [
    {
        "subject": "URGENT: Your account has been suspended - Immediate action required",
        "from_name": "Apple Security Team",
        "body": (
            "Dear Customer,\n\n"
            "We have detected unauthorized access to your Apple ID. "
            "Your account has been suspended for your protection.\n\n"
            "You must verify your account within 24 hours or it will be "
            "permanently deactivated. Click here to verify your identity: "
            "http://bit.ly/apple-verify-now\n\n"
            "Please confirm your identity and update your password and "
            "credit card information immediately.\n\n"
            "This is your final notice.\n\n"
            "Apple Support"
        ),
    },
    {
        "subject": "You've won $1,000,000 - Claim your prize NOW!!!",
        "from_name": "International Lottery Commission",
        "body": (
            "CONGRATULATIONS!!!\n\n"
            "You are the winner of our international lottery drawing. "
            "You have won ONE MILLION DOLLARS ($1,000,000.00).\n\n"
            "To claim your prize, please send your bank account and "
            "routing number, along with your social security number "
            "to verify your identity.\n\n"
            "You must act now — this offer expires today!\n\n"
            "Send your credentials to claim your gift card prize.\n\n"
            "Wire transfer instructions will follow.\n\n"
            "International Lottery Commission"
        ),
    },
    {
        "subject": "Invoice #INV-29571 - Payment Required - Last Warning",
        "from_name": "PayPal Billing",
        "body": (
            "Dear Customer,\n\n"
            "Your payment of $499.99 is overdue. Your account will be "
            "locked if payment is not received within 24 hours.\n\n"
            "Click below to confirm your payment details and avoid "
            "account deactivation:\n"
            "http://tinyurl.com/paypal-invoice-confirm\n\n"
            "If you do not verify your account, we will be forced to "
            "suspend your access. This is urgent — immediate action required.\n\n"
            "Download the attached invoice for details.\n\n"
            "PayPal Billing Department"
        ),
    },
]


def send_email(smtp_user: str, smtp_password: str, to_email: str, subject: str, from_name: str, body: str):
    msg = MIMEMultipart()
    msg["From"] = f"{from_name} <{smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, to_email, msg.as_string())


def main():
    parser = argparse.ArgumentParser(description="Send test phishing emails for HavenAI demo")
    parser.add_argument("--to", required=True, help="Target email (the inbox HavenAI is monitoring)")
    parser.add_argument("--from", dest="sender", required=True, help="Gmail address to send from")
    parser.add_argument("--password", required=True, help="Gmail app-specific password for the sender")
    parser.add_argument("--which", type=int, choices=[1, 2, 3], help="Send only one email (1, 2, or 3). Default: all")
    args = parser.parse_args()

    emails = PHISHING_EMAILS if not args.which else [PHISHING_EMAILS[args.which - 1]]

    print("HavenAI Email Agent Demo")
    print(f"Sending {len(emails)} phishing test email(s) to {args.to}...\n")

    for i, email in enumerate(emails, 1):
        print(f"[{i}/{len(emails)}] Sending: {email['subject'][:60]}...")
        try:
            send_email(args.sender, args.password, args.to, email["subject"], email["from_name"], email["body"])
            print(f"         Sent!")
        except Exception as e:
            print(f"         Failed: {e}")
        if i < len(emails):
            time.sleep(2)

    print(f"\nDone! Wait ~20 seconds for the Email Agent to scan, then check the dashboard.")


if __name__ == "__main__":
    main()
