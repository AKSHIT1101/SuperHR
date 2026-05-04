"""
Transactional email via Brevo (https://developers.brevo.com/reference/sendtransacemail).
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from core.config import get_settings

logger = logging.getLogger(__name__)

BREVO_SMTP_URL = "https://api.brevo.com/v3/smtp/email"


def send_transactional_email(
    *,
    to_email: str,
    to_name: Optional[str],
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    sender_email: Optional[str] = None,
    sender_name: Optional[str] = None,
    reply_to_email: Optional[str] = None,
) -> dict:
    """
    Sends one email. Raises httpx.HTTPStatusError on non-2xx.
    """
    settings = get_settings()
    api_key = (settings.BREVO_API_KEY or "").strip()
    if not api_key:
        raise RuntimeError("BREVO_API_KEY is not configured")

    from_email = (sender_email or settings.BREVO_SENDER_EMAIL or "").strip()
    if not from_email:
        raise RuntimeError("BREVO_SENDER_EMAIL is not configured (must be a verified sender in Brevo)")

    from_name = (sender_name or settings.BREVO_SENDER_NAME or "Super HR").strip()

    payload: dict = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email.strip(), "name": (to_name or "").strip() or to_email.strip()}],
        "subject": subject,
        "htmlContent": html_content,
    }
    if text_content:
        payload["textContent"] = text_content
    if reply_to_email and reply_to_email.strip():
        payload["replyTo"] = {"email": reply_to_email.strip()}

    headers = {"accept": "application/json", "api-key": api_key, "content-type": "application/json"}

    with httpx.Client(timeout=60.0) as client:
        resp = client.post(BREVO_SMTP_URL, json=payload, headers=headers)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError:
            logger.warning("Brevo send failed: %s %s", resp.status_code, resp.text)
            raise
        try:
            return resp.json() if resp.content else {}
        except Exception:
            return {"raw": resp.text}
