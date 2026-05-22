"""
Telegram Mini App authentication.

The Mini App frontend sends window.Telegram.WebApp.initData as the
Authorization header:  Authorization: tma <initData>

We validate the HMAC-SHA256 signature per the official Telegram spec:
https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
"""

import hashlib
import hmac
import json
import urllib.parse
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from models import ApiKey, User
from schemas import TelegramUser

API_KEY_PREFIX = "bm_"


def hash_api_key(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _validate_init_data(init_data: str) -> dict:
    """Parse and verify the initData string. Returns the parsed dict."""
    parsed = dict(urllib.parse.parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise ValueError("hash missing")

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed.items())
    )

    secret_key = hmac.new(
        b"WebAppData",
        settings.BOT_TOKEN.encode(),
        hashlib.sha256,
    ).digest()

    expected_hash = hmac.new(
        secret_key, data_check_string.encode(), hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_hash, received_hash):
        raise ValueError("invalid hash")

    return parsed


async def _resolve_api_key(token: str, db: AsyncSession) -> TelegramUser:
    key = await db.scalar(
        select(ApiKey).where(ApiKey.key_hash == hash_api_key(token))
    )
    if key is None or key.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
        )
    user = await db.get(User, key.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key references missing user",
        )
    from datetime import datetime, timezone
    key.last_used_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    return TelegramUser(
        id=user.telegram_id,
        first_name=user.name or "API",
        username=user.username,
    )


async def get_telegram_user(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TelegramUser:
    """
    FastAPI dependency. Accepts three auth schemes:
      - Authorization: tma <initData>             — Telegram Mini App signature
      - Authorization: Bearer <initData>          — same, alt scheme
      - Authorization: Bearer bm_<api_key>        — long-lived dev API key

    In DEBUG mode initData may be a raw JSON user object.
    """
    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() not in ("tma", "bearer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid Authorization header",
        )
    token = parts[1]

    if token.startswith(API_KEY_PREFIX):
        return await _resolve_api_key(token, db)

    if settings.DEBUG:
        try:
            data = json.loads(token)
            return TelegramUser(**data)
        except Exception:
            pass  # fall through to real validation

    try:
        parsed = _validate_init_data(token)
        user_json = parsed.get("user")
        if not user_json:
            raise ValueError("user field missing")
        user_data = json.loads(user_json)
        return TelegramUser(**user_data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Telegram auth: {exc}",
        ) from exc
