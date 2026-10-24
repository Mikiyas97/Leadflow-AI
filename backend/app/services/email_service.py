"""LeadFlow AI - Gmail SMTP Email Sending Service"""
import logging
import re
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Any, Optional

from backend.app.config import settings

logger = logging.getLogger("leadflow.email")


class EmailService:
    def __init__(
        self,
        smtp_host: Optional[str] = None,
        smtp_port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        email_from: Optional[str] = None
    ):
        self.smtp_host = smtp_host if smtp_host is not None else settings.SMTP_HOST
        self.smtp_port = smtp_port if smtp_port is not None else settings.SMTP_PORT
        self.username = username if username is not None else settings.GMAIL_USER
        self.password = password if password is not None else settings.GMAIL_APP_PASSWORD
        self.email_from = email_from if email_from is not None else (settings.EMAIL_FROM or self.username)

    def is_configured(self) -> bool:
        """Returns True if minimum required Gmail SMTP credentials are set."""
        return bool(self.username and self.password)

    def validate_email_address(self, email: str) -> bool:
        """Validates standard email address syntax."""
        if not email or not isinstance(email, str):
            return False
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        return bool(re.match(pattern, email.strip()))

    def send_outreach_email(
        self,
        recipient_email: str,
        subject: str,
        body_text: str,
        idempotency_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends an outreach email via Gmail SMTP (STARTTLS on port 587 or SSL on port 465).
        Returns a structured dictionary indicating success, acceptance status, and sanitized details.
        Never logs or exposes passwords or sensitive credentials.
        """
        if not recipient_email or not self.validate_email_address(recipient_email):
            return {
                "success": False,
                "status": "INVALID_RECIPIENT",
                "error": f"Invalid recipient email address: '{recipient_email}'",
                "sent_at": None
            }

        if not subject or not subject.strip():
            return {
                "success": False,
                "status": "MISSING_SUBJECT",
                "error": "Subject line cannot be empty",
                "sent_at": None
            }

        if not body_text or not body_text.strip():
            return {
                "success": False,
                "status": "MISSING_BODY",
                "error": "Email body content cannot be empty",
                "sent_at": None
            }

        if not self.is_configured():
            return {
                "success": False,
                "status": "NOT_CONFIGURED",
                "error": (
                    "Gmail SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD "
                    "in server environment variables. See documentation to create a Google App Password."
                ),
                "sent_at": None
            }

        sender = self.email_from or self.username

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject.strip()
        msg["From"] = sender
        msg["To"] = recipient_email.strip()
        msg["Date"] = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

        # Plain text part
        part_text = MIMEText(body_text.strip(), "plain", "utf-8")
        msg.attach(part_text)

        try:
            if self.smtp_port == 465:
                # Implicit SSL
                server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, timeout=15.0)
            else:
                # STARTTLS (port 587)
                server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15.0)
                server.ehlo()
                server.starttls()
                server.ehlo()

            with server:
                server.login(self.username, self.password)
                refused = server.send_message(msg)

                if refused:
                    return {
                        "success": False,
                        "status": "RECIPIENTS_REFUSED",
                        "error": f"Recipient '{recipient_email}' was rejected by the SMTP server",
                        "sent_at": None
                    }

            sent_timestamp = datetime.now(timezone.utc)
            return {
                "success": True,
                "status": "ACCEPTED_BY_SMTP",
                "message": (
                    f"Message accepted by {self.smtp_host} for delivery to {recipient_email}. "
                    "Note: SMTP acceptance confirms relay submission."
                ),
                "recipient": recipient_email.strip(),
                "sender": sender,
                "subject": subject.strip(),
                "sent_at": sent_timestamp,
                "idempotency_key": idempotency_key
            }

        except smtplib.SMTPAuthenticationError as auth_err:
            sanitized_err = (
                "Gmail SMTP authentication failed. Please verify that GMAIL_USER is correct and that "
                "GMAIL_APP_PASSWORD is a valid 16-character Google App Password (2-Step Verification required)."
            )
            logger.error(f"SMTP Auth Error: {sanitized_err}")
            return {
                "success": False,
                "status": "AUTHENTICATION_FAILED",
                "error": sanitized_err,
                "sent_at": None
            }

        except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, TimeoutError) as net_err:
            sanitized_err = f"Could not connect to SMTP server ({self.smtp_host}:{self.smtp_port}). Connection timed out or disconnected."
            logger.error(f"SMTP Network Error: {sanitized_err}")
            return {
                "success": False,
                "status": "CONNECTION_FAILED",
                "error": sanitized_err,
                "sent_at": None
            }

        except smtplib.SMTPException as smtp_err:
            sanitized_err = f"SMTP protocol error: {type(smtp_err).__name__}"
            logger.error(f"SMTP Error: {sanitized_err}")
            return {
                "success": False,
                "status": "SMTP_ERROR",
                "error": sanitized_err,
                "sent_at": None
            }

        except Exception as e:
            sanitized_err = f"Unexpected error while sending email: {type(e).__name__}"
            logger.error(f"Email send error: {sanitized_err}")
            return {
                "success": False,
                "status": "FAILED",
                "error": sanitized_err,
                "sent_at": None
            }

    def send_test_email(self, to_email: str) -> Dict[str, Any]:
        """Sends an explicit test verification email to confirm credentials."""
        subject = "LeadFlow AI - SMTP Verification Test"
        body = (
            "Hello,\n\n"
            "This is a test message from your LeadFlow AI Agent.\n"
            "If you are reading this, your Gmail SMTP configuration (host, port, STARTTLS, App Password) "
            "is working correctly and ready for human-approved outreach.\n\n"
            "— LeadFlow Operations Team"
        )
        return self.send_outreach_email(recipient_email=to_email, subject=subject, body_text=body)


email_service = EmailService()
