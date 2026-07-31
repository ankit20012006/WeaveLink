from __future__ import annotations

from app.api.deps import require_optional_auth
from app.schemas.comms import CommSendRequest, CommSendResponse
from app.services import communication_service
from fastapi import APIRouter, Depends

router = APIRouter(prefix="/comms", tags=["comms"])


@router.post("/notify", response_model=CommSendResponse)
async def notify(
    payload: CommSendRequest,
    _user: dict[str, object] | None = Depends(require_optional_auth),
) -> CommSendResponse:
    del _user
    if payload.channel == "ussd":
        return CommSendResponse(
            status="not_configured",
            channel=payload.channel,
            recipient=payload.recipient,
            message="USSD lite requires an external USSD gateway integration. "
            "Use WhatsApp or SMS channels until USSD setup is added.",
        )

    if not payload.message.strip():
        return CommSendResponse(
            status="error",
            channel=payload.channel,
            recipient=payload.recipient,
            message="message is required",
        )

    try:
        provider, message_id = await communication_service.send_message(
            channel=payload.channel,
            recipient=payload.recipient,
            message=payload.message.strip(),
        )
        return CommSendResponse(
            status="sent",
            channel=payload.channel,
            recipient=payload.recipient,
            provider=provider,
            providerMessageId=message_id,
        )
    except RuntimeError as exc:
        return CommSendResponse(
            status="not_configured",
            channel=payload.channel,
            recipient=payload.recipient,
            message=str(exc),
        )
    except Exception as exc:
        return CommSendResponse(
            status="error",
            channel=payload.channel,
            recipient=payload.recipient,
            message=str(exc),
        )
