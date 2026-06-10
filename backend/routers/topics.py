"""Topics and mini-game endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import TelegramUser, get_telegram_user
from database import get_db
from models import Achievement, Game, GameSession, Topic, User, UserAchievement
from routers.users import get_or_create_user
from schemas import (
    AchievementOut,
    GameFinishIn,
    GameFinishOut,
    GameOut,
    GameStartOut,
    TopicDetailOut,
    TopicOut,
)

router = APIRouter(prefix="/topics", tags=["topics"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
AuthDep = Annotated[TelegramUser, Depends(get_telegram_user)]


def _stars(score: int, total: int) -> int:
    if total == 0:
        return 0
    pct = score / total
    if pct >= 1.0:
        return 3
    if pct >= 0.75:
        return 2
    if pct >= 0.5:
        return 1
    return 0


async def _user_game_best(user_id: int, game_id: int, db: AsyncSession) -> dict:
    """Return best stars, best score, completed flag for a user/game pair."""
    result = await db.execute(
        select(
            func.max(GameSession.stars).label("best_stars"),
            func.max(GameSession.score).label("best_score"),
            func.count(GameSession.id).label("plays"),
        ).where(GameSession.user_id == user_id, GameSession.game_id == game_id)
    )
    row = result.one()
    return {
        "best_stars": row.best_stars or 0,
        "best_score": row.best_score,
        "completed": (row.plays or 0) > 0,
    }


@router.get("", response_model=list[TopicOut])
async def list_topics(tg: AuthDep, db: DbDep) -> list[TopicOut]:
    user = await get_or_create_user(tg, db)

    topics = (
        await db.scalars(select(Topic).order_by(Topic.order))
    ).all()

    result = []
    for t in topics:
        games = (
            await db.scalars(
                select(Game).where(Game.topic_id == t.id, Game.hidden == False)  # noqa: E712
            )
        ).all()
        game_ids = [g.id for g in games]

        games_done = 0
        points_earned = 0
        for gid in game_ids:
            best = await _user_game_best(user.id, gid, db)
            if best["completed"]:
                games_done += 1
            pts = await db.scalar(
                select(func.max(GameSession.points_earned)).where(
                    GameSession.user_id == user.id, GameSession.game_id == gid
                )
            )
            points_earned += pts or 0

        result.append(
            TopicOut(
                id=t.id,
                slug=t.slug,
                title=t.title,
                subtitle=t.subtitle,
                icon=t.icon,
                tone=t.tone,
                order=t.order,
                games_total=len(games),
                games_done=games_done,
                points_earned=points_earned,
            )
        )
    return result


@router.get("/{topic_id}", response_model=TopicDetailOut)
async def get_topic(topic_id: int, tg: AuthDep, db: DbDep) -> TopicDetailOut:
    user = await get_or_create_user(tg, db)

    t = await db.scalar(
        select(Topic).where(Topic.id == topic_id).options(selectinload(Topic.games))
    )
    if t is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    games_out = []
    games_done = 0
    points_earned = 0

    for g in sorted([gg for gg in t.games if not gg.hidden], key=lambda x: x.order):
        best = await _user_game_best(user.id, g.id, db)
        pts = await db.scalar(
            select(func.max(GameSession.points_earned)).where(
                GameSession.user_id == user.id, GameSession.game_id == g.id
            )
        ) or 0
        points_earned += pts
        if best["completed"]:
            games_done += 1
        games_out.append(
            GameOut(
                id=g.id,
                topic_id=g.topic_id,
                title=g.title,
                description=g.description,
                instructions=g.instructions,
                duration_mins=g.duration_mins,
                difficulty=g.difficulty,
                points_reward=g.points_reward,
                order=g.order,
                **best,
            )
        )

    return TopicDetailOut(
        id=t.id,
        slug=t.slug,
        title=t.title,
        subtitle=t.subtitle,
        icon=t.icon,
        tone=t.tone,
        order=t.order,
        games_total=len(t.games),
        games_done=games_done,
        points_earned=points_earned,
        games=games_out,
    )


# ── Game session ────────────────────────────────────────────────────────────
@router.post("/games/{game_id}/start", response_model=GameStartOut)
async def start_game(game_id: int, tg: AuthDep, db: DbDep) -> GameStartOut:
    user = await get_or_create_user(tg, db)
    game = await db.get(Game, game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    session = GameSession(user_id=user.id, game_id=game_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return GameStartOut(session_id=session.id, game_id=game_id)


@router.post("/games/{game_id}/finish", response_model=GameFinishOut)
async def finish_game(
    game_id: int, body: GameFinishIn, tg: AuthDep, db: DbDep
) -> GameFinishOut:
    user = await get_or_create_user(tg, db)
    session = await db.get(GameSession, body.session_id)

    if session is None or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    game = await db.get(Game, game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")

    stars = _stars(body.score, body.total)
    points = round(game.points_reward * (body.score / max(body.total, 1)))

    session.score = body.score
    session.total = body.total
    session.stars = stars
    session.points_earned = points
    session.time_spent_secs = body.time_spent_secs

    user.points += points
    await db.commit()

    new_achievements = await _check_achievements(user, session, game, db)

    return GameFinishOut(
        session_id=session.id,
        stars=stars,
        points_earned=points,
        new_achievements=[
            AchievementOut(
                id=a.id,
                slug=a.slug,
                name=a.name,
                description=a.description,
                icon=a.icon,
                tone=a.tone,
                points_reward=a.points_reward,
                earned=True,
            )
            for a in new_achievements
        ],
    )


async def _check_achievements(
    user: User, session: GameSession, game: Game, db: AsyncSession
) -> list[Achievement]:
    """Check and grant achievements. Returns newly granted ones."""
    new: list[Achievement] = []

    async def grant(slug: str) -> None:
        ach = await db.scalar(select(Achievement).where(Achievement.slug == slug))
        if ach is None:
            return
        already = await db.scalar(
            select(UserAchievement).where(
                UserAchievement.user_id == user.id,
                UserAchievement.achievement_id == ach.id,
            )
        )
        if already is None:
            db.add(UserAchievement(user_id=user.id, achievement_id=ach.id))
            user.points += ach.points_reward
            new.append(ach)

    total_sessions = await db.scalar(
        select(func.count()).where(GameSession.user_id == user.id)
    )

    if total_sessions == 1:
        await grant("first-shield")

    if session.score == session.total:
        await grant("perfect")

    if session.time_spent_secs < 120:
        await grant("lightning")

    if user.points >= 100:
        await grant("points-100")
    if user.points >= 500:
        await grant("points-500")

    if user.streak_days >= 3:
        await grant("streak-3")
    if user.streak_days >= 7:
        await grant("streak-7")

    # Topic completion achievements
    topic_row = await db.scalar(select(Topic).where(Topic.id == game.topic_id))
    if topic_row is not None:
        all_games = (
            await db.scalars(select(Game).where(Game.topic_id == game.topic_id))
        ).all()
        all_done = True
        all_3star = True
        for g in all_games:
            best = await _user_game_best(user.id, g.id, db)
            if not best["completed"]:
                all_done = False
                all_3star = False
                break
            if best["best_stars"] < 3:
                all_3star = False

        if all_done:
            if topic_row.slug == "passwords":
                await grant("password-master")
            if topic_row.slug == "cyberbullying":
                await grant("kind")

        if all_3star:
            await grant("topic-champion")

        # Check all topics done
        all_topic_ids = (
            await db.scalars(select(Topic.id))
        ).all()
        fully_done = True
        for tid in all_topic_ids:
            topic_games = (
                await db.scalars(select(Game).where(Game.topic_id == tid))
            ).all()
            for tg_game in topic_games:
                b = await _user_game_best(user.id, tg_game.id, db)
                if not b["completed"]:
                    fully_done = False
                    break
            if not fully_done:
                break
        if fully_done:
            await grant("all-topics")

    await db.commit()
    return new
