"""
Admin endpoints — API key management.

Protected by a shared secret in the X-Admin-Secret header
(value comes from the ADMIN_SECRET env var). If ADMIN_SECRET is empty,
all endpoints return 404 (the router is hidden).
"""

import secrets
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import API_KEY_PREFIX, hash_api_key
from config import settings
from database import get_db
from models import ApiKey, User

router = APIRouter(prefix="/admin", tags=["admin"], include_in_schema=False)

DbDep = Annotated[AsyncSession, Depends(get_db)]


def _check_secret(x_admin_secret: str | None) -> None:
    if not settings.ADMIN_SECRET:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    if not x_admin_secret or not secrets.compare_digest(
        x_admin_secret, settings.ADMIN_SECRET
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bad or missing X-Admin-Secret",
        )


AdminDep = Annotated[None, Depends(lambda x_admin_secret=Header(None, alias="X-Admin-Secret"): _check_secret(x_admin_secret))]


# ── Users ──────────────────────────────────────────────────────────────────
@router.get("/users")
async def list_users(_: AdminDep, db: DbDep) -> list[dict]:
    rows = (await db.scalars(select(User).order_by(User.id))).all()
    return [
        {
            "id": u.id,
            "telegram_id": u.telegram_id,
            "username": u.username,
            "name": u.name,
            "role": u.role.value if u.role else None,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in rows
    ]


# ── API keys ───────────────────────────────────────────────────────────────
class CreateKeyIn(BaseModel):
    telegram_id: int
    name: str = ""


@router.post("/api-keys", status_code=201)
async def create_api_key(body: CreateKeyIn, _: AdminDep, db: DbDep) -> dict:
    user = await db.scalar(select(User).where(User.telegram_id == body.telegram_id))
    if user is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No user with telegram_id={body.telegram_id}. "
                "Ask them to open the bot once first."
            ),
        )
    raw = API_KEY_PREFIX + secrets.token_urlsafe(32)
    db.add(ApiKey(user_id=user.id, key_hash=hash_api_key(raw), name=body.name or "unnamed"))
    await db.commit()
    return {
        "key": raw,
        "user_id": user.id,
        "telegram_id": user.telegram_id,
        "name": body.name,
        "note": "Save this key now — it is not stored in plaintext.",
    }


@router.get("/api-keys")
async def list_api_keys(_: AdminDep, db: DbDep) -> list[dict]:
    rows = (await db.scalars(select(ApiKey).order_by(ApiKey.id))).all()
    out = []
    for k in rows:
        user = await db.get(User, k.user_id)
        out.append({
            "id": k.id,
            "name": k.name,
            "revoked": k.revoked,
            "user_id": k.user_id,
            "user_name": user.name if user else None,
            "telegram_id": user.telegram_id if user else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
        })
    return out


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(key_id: int, _: AdminDep, db: DbDep) -> dict:
    k = await db.get(ApiKey, key_id)
    if k is None:
        raise HTTPException(status_code=404, detail="key not found")
    k.revoked = True
    await db.commit()
    return {"id": key_id, "revoked": True}
