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

from config import settings
from schemas import TelegramUser


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


def get_telegram_user(request: Request) -> TelegramUser:
    """
    FastAPI dependency. Accepts  Authorization: tma <initData>
    (the Telegram Mini App scheme) as well as  Authorization: Bearer <initData>.

    In DEBUG mode the token may be a raw JSON user object:
      Authorization: tma {"id":123,"first_name":"Test"}
    """
    auth_header = request.headers.get("Authorization", "")
    parts = auth_header.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() not in ("tma", "bearer"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing or invalid Authorization header",
        )
    token = parts[1]

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
