"""Achievements (badges) endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import TelegramUser, get_telegram_user
from database import get_db
from models import Achievement, UserAchievement
from routers.users import get_or_create_user
from schemas import AchievementOut

router = APIRouter(prefix="/achievements", tags=["achievements"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
AuthDep = Annotated[TelegramUser, Depends(get_telegram_user)]


@router.get("", response_model=list[AchievementOut])
async def list_achievements(tg: AuthDep, db: DbDep) -> list[AchievementOut]:
    user = await get_or_create_user(tg, db)

    all_achievements = (await db.scalars(select(Achievement))).all()

    earned_map: dict[int, UserAchievement] = {}
    earned_rows = (
        await db.scalars(
            select(UserAchievement).where(UserAchievement.user_id == user.id)
        )
    ).all()
    for row in earned_rows:
        earned_map[row.achievement_id] = row

    result = []
    for a in all_achievements:
        ua = earned_map.get(a.id)
        result.append(
            AchievementOut(
                id=a.id,
                slug=a.slug,
                name=a.name,
                description=a.description,
                icon=a.icon,
                tone=a.tone,
                points_reward=a.points_reward,
                earned=ua is not None,
                earned_at=ua.earned_at if ua else None,
            )
        )
    return result
