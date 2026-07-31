from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

_CAMEL_CONFIG = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class CommSendRequest(BaseModel):
    channel: Literal["whatsapp", "sms", "ussd"]
    recipient: str
    message: str
    listing_id: str | None = Field(default=None, alias="listingId")
    order_id: str | None = Field(default=None, alias="orderId")
    model_config = _CAMEL_CONFIG


class CommSendResponse(BaseModel):
    status: Literal["sent", "queued", "not_configured", "error"]
    channel: str
    recipient: str
    provider: str | None = None
    provider_message_id: str | None = Field(default=None, alias="providerMessageId")
    message: str | None = None
    model_config = _CAMEL_CONFIG

