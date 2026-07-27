from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

_CAMEL_CONFIG = ConfigDict(populate_by_name=True, serialize_by_alias=True)


class UserProfile(BaseModel):
    user_id: str = Field(..., alias="userId")
    email: str | None = None
    display_name: str | None = Field(default=None, alias="displayName")
    role: str
    weaver_id: str | None = Field(default=None, alias="weaverId")
    verified: bool

    model_config = _CAMEL_CONFIG


class AuthMe(BaseModel):
    user: dict[str, object]
    roles: list[str]
    profile: UserProfile | None = None


class AuthRoleList(BaseModel):
    roles: list[str]


class AuthProfilePatch(BaseModel):
    display_name: str | None = None
    weaver_id: str | None = None
    email: str | None = None
    role: str | None = None
    verified: bool | None = None
