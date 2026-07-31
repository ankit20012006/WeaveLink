from __future__ import annotations

from app.core.config import settings


def _normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit() or ch == "+")
    if not digits:
        raise ValueError("Recipient phone number is required")
    return digits


def _is_configured(channel: str) -> bool:
    if channel == "whatsapp":
        return bool(
            settings.twilio_account_sid
            and settings.twilio_auth_token
            and settings.twilio_whatsapp_from
        )
    if channel == "sms":
        return bool(
            settings.twilio_account_sid
            and settings.twilio_auth_token
            and settings.twilio_from_number
        )
    return False


async def send_message(*, channel: str, recipient: str, message: str) -> tuple[str, str]:
    if not _is_configured(channel):
        raise RuntimeError(f"{channel} channel is not configured")

    if len(message.strip()) > 1600:
        raise ValueError("Message too long for transport")

    to = _normalize_phone(recipient)

    from twilio.rest import Client

    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    if channel == "whatsapp":
        if not to.startswith("whatsapp:"):
            to = f"whatsapp:{to}"
        from_number = settings.twilio_whatsapp_from
        if not from_number.startswith("whatsapp:"):
            from_number = f"whatsapp:{from_number}"
    elif channel == "sms":
        from_number = settings.twilio_from_number
    else:
        raise RuntimeError("Unsupported channel")

    message_obj = client.messages.create(
        to=to,
        from_=from_number,
        body=message.strip(),
    )

    return (
        "twilio",
        getattr(message_obj, "sid", ""),
    )
