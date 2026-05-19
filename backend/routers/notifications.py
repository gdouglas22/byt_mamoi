"""Notifications endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from auth import TelegramUser, get_telegram_user
from database import get_db
from models import Notification
from routers.users import get_or_create_user
from schemas import NotificationOut, OkResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
AuthDep = Annotated[TelegramUser, Depends(get_telegram_user)]


@router.get("", response_model=list[NotificationOut])
async def list_notifications(tg: AuthDep, db: DbDep) -> list[Notification]:
    user = await get_or_create_user(tg, db)
    notes = (
        await db.scalars(
            select(Notification)
            .where(Notification.user_id == user.id)
            .order_by(Notification.created_at.desc())
            .limit(50)
        )
    ).all()
    return list(notes)


@router.post("/read-all", response_model=OkResponse)
async def mark_all_read(tg: AuthDep, db: DbDep) -> OkResponse:
    user = await get_or_create_user(tg, db)
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read == False)  # noqa: E712
        .values(is_read=True)
    )
    await db.commit()
    return OkResponse()


@router.post("/{notification_id}/read", response_model=OkResponse)
async def mark_read(notification_id: int, tg: AuthDep, db: DbDep) -> OkResponse:
    user = await get_or_create_user(tg, db)
    note = await db.get(Notification, notification_id)
    if note and note.user_id == user.id:
        note.is_read = True
        await db.commit()
    return OkResponse()
