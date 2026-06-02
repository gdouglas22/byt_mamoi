"""User profile endpoints."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import TelegramUser, get_telegram_user
from database import get_db
from models import GameSession, ParentChild, User, UserAchievement
from schemas import OkResponse, UserOut, UserUpdate

router = APIRouter(prefix="/me", tags=["users"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
AuthDep = Annotated[TelegramUser, Depends(get_telegram_user)]


async def get_or_create_user(tg: TelegramUser, db: AsyncSession) -> User:
    user = await db.scalar(select(User).where(User.telegram_id == tg.id))
    if user is None:
        user = User(
            telegram_id=tg.id,
            username=tg.username,
            name=tg.first_name,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    return user


@router.get("", response_model=UserOut)
async def get_me(tg: AuthDep, db: DbDep) -> UserOut:
    user = await get_or_create_user(tg, db)
    has_parent = await db.scalar(
        select(func.count()).select_from(ParentChild).where(ParentChild.child_id == user.id)
    )
    out = UserOut.model_validate(user)
    out.parent_linked = bool(has_parent)
    return out


@router.get("/activity-week")
async def get_activity_week(tg: AuthDep, db: DbDep) -> dict:
    """Game-session counts for the last 7 days. Index 0 = Monday, 6 = Sunday."""
    user = await get_or_create_user(tg, db)
    today = datetime.now(timezone.utc).date()
    monday = today - timedelta(days=today.weekday())

    rows = await db.execute(
        select(
            func.date(GameSession.completed_at).label("day"),
            func.count().label("n"),
        )
        .where(GameSession.user_id == user.id, GameSession.completed_at >= monday)
        .group_by(func.date(GameSession.completed_at))
    )
    by_day = {row.day: row.n for row in rows}

    counts: list[int] = []
    for i in range(7):
        d = monday + timedelta(days=i)
        # SQLite returns ISO string; PostgreSQL — date. Normalize:
        key_iso = d.isoformat()
        counts.append(int(by_day.get(d) or by_day.get(key_iso) or 0))
    return {"counts": counts, "week_start": monday.isoformat()}


@router.patch("", response_model=UserOut)
async def update_me(body: UserUpdate, tg: AuthDep, db: DbDep) -> User:
    user = await get_or_create_user(tg, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


@router.get("/stats")
async def get_my_stats(tg: AuthDep, db: DbDep) -> dict:
    user = await get_or_create_user(tg, db)

    total_sessions = await db.scalar(
        select(func.count()).where(GameSession.user_id == user.id)
    )
    badges_earned = await db.scalar(
        select(func.count()).where(UserAchievement.user_id == user.id)
    )

    return {
        "points": user.points,
        "streak_days": user.streak_days,
        "games_done": total_sessions or 0,
        "badges_earned": badges_earned or 0,
    }


@router.post("/ping", response_model=OkResponse)
async def ping_activity(tg: AuthDep, db: DbDep) -> OkResponse:
    """Call on app open to update streak."""
    user = await get_or_create_user(tg, db)
    today = datetime.now(timezone.utc).date()

    if user.last_active_date is None:
        user.streak_days = 1
    else:
        last = user.last_active_date.date() if user.last_active_date else None
        if last == today:
            pass  # already counted today
        elif last and (today - last).days == 1:
            user.streak_days += 1
        else:
            user.streak_days = 1

    user.last_active_date = datetime.now(timezone.utc).replace(tzinfo=None)
    await db.commit()
    return OkResponse()
