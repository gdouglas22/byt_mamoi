"""Parent ↔ Child linking and parent dashboard endpoints."""

import random
import string
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from auth import TelegramUser, get_telegram_user
from config import settings
from database import get_db
from models import (
    Achievement,
    Game,
    GameSession,
    LinkCode,
    Notification,
    NotificationType,
    ParentChild,
    ParentLinkRequest,
    ParentLinkRequestStatus,
    Topic,
    User,
    UserAchievement,
)
from routers.users import get_or_create_user
from routers.topics import _user_game_best
from schemas import ChildStatsOut, LinkCodeOut, LinkConfirmIn, OkResponse, UserOut
from tg_notify import approve_reject_keyboard, send_to_admins, send_to_user

router = APIRouter(prefix="/parent", tags=["parent"])

DbDep = Annotated[AsyncSession, Depends(get_db)]
AuthDep = Annotated[TelegramUser, Depends(get_telegram_user)]


def _generate_code(length: int = 6) -> str:
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choices(chars, k=length))


# ── Child side: generate link code ─────────────────────────────────────────
@router.post("/link/request", response_model=LinkCodeOut)
async def request_link_code(tg: AuthDep, db: DbDep) -> LinkCodeOut:
    """Child generates an OTP code to share with their parent."""
    child = await get_or_create_user(tg, db)

    # Invalidate any old unused codes
    old_codes = (
        await db.scalars(
            select(LinkCode).where(
                LinkCode.child_id == child.id, LinkCode.used == False  # noqa: E712
            )
        )
    ).all()
    for c in old_codes:
        c.used = True

    code = _generate_code()
    expires_at = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
        seconds=settings.OTP_TTL
    )
    link = LinkCode(child_id=child.id, code=code, expires_at=expires_at)
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return LinkCodeOut(code=link.code, expires_at=link.expires_at)


# ── Parent side: submit link request (awaits admin approval) ───────────────
@router.post("/link/confirm", response_model=OkResponse)
async def confirm_link(body: LinkConfirmIn, tg: AuthDep, db: DbDep) -> OkResponse:
    """
    Parent enters the code to link to a child.
    Doesn't create the link directly — that would let kids make each other
    each other's 'parents' for laughs. Creates a pending ParentLinkRequest
    and pings the admins on Telegram; they decide.
    """
    parent = await get_or_create_user(tg, db)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    link = await db.scalar(
        select(LinkCode).where(
            LinkCode.code == body.code.upper(),
            LinkCode.used == False,  # noqa: E712
            LinkCode.expires_at > now,
        )
    )
    if link is None:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    if link.child_id == parent.id:
        raise HTTPException(status_code=400, detail="Cannot link to yourself")

    # Already linked? Idempotent OK.
    already_linked = await db.scalar(
        select(ParentChild).where(
            ParentChild.parent_id == parent.id,
            ParentChild.child_id == link.child_id,
        )
    )
    if already_linked is not None:
        link.used = True
        await db.commit()
        return OkResponse()

    # Already a pending request? Don't spam admins.
    pending = await db.scalar(
        select(ParentLinkRequest).where(
            ParentLinkRequest.parent_id == parent.id,
            ParentLinkRequest.child_id == link.child_id,
            ParentLinkRequest.status == ParentLinkRequestStatus.PENDING,
        )
    )
    if pending is not None:
        link.used = True
        await db.commit()
        return OkResponse()

    request = ParentLinkRequest(
        parent_id=parent.id,
        child_id=link.child_id,
        status=ParentLinkRequestStatus.PENDING,
    )
    db.add(request)
    link.used = True
    await db.commit()
    await db.refresh(request)

    child = await db.get(User, link.child_id)
    text = (
        "🔗 <b>Заявка на привязку родителя</b>\n\n"
        f"Родитель: <b>{(parent.name or '?')}</b> "
        f"(tg=<code>{parent.telegram_id}</code>)\n"
        f"Ребёнок: <b>{(child.name if child else '?')}</b> "
        f"(tg=<code>{child.telegram_id if child else '?'}</code>)\n\n"
        f"Заявка #<code>{request.id}</code>"
    )
    await send_to_admins(text, reply_markup=approve_reject_keyboard(request.id))

    return OkResponse()


# ── Admin/bot helpers: approve / reject parent link request ───────────────
class DecisionResult:
    """Lightweight value type so callers know what happened."""
    def __init__(self, ok: bool, message: str, request: ParentLinkRequest | None = None):
        self.ok = ok
        self.message = message
        self.request = request


async def approve_parent_link_request(
    request_id: int, admin_tg_id: int, db: AsyncSession
) -> DecisionResult:
    req = await db.get(ParentLinkRequest, request_id)
    if req is None:
        return DecisionResult(False, f"Заявка #{request_id} не найдена")
    if req.status != ParentLinkRequestStatus.PENDING:
        return DecisionResult(
            False,
            f"Заявка #{request_id} уже {req.status.value}",
            request=req,
        )

    # Create the link (idempotent — race-safe).
    existing = await db.scalar(
        select(ParentChild).where(
            ParentChild.parent_id == req.parent_id,
            ParentChild.child_id == req.child_id,
        )
    )
    if existing is None:
        db.add(ParentChild(parent_id=req.parent_id, child_id=req.child_id))

    req.status = ParentLinkRequestStatus.APPROVED
    req.decided_at = datetime.now(timezone.utc).replace(tzinfo=None)
    req.decided_by_tg_id = admin_tg_id

    # Notify child in-app
    child = await db.get(User, req.child_id)
    if child:
        db.add(
            Notification(
                user_id=child.id,
                type=NotificationType.PROGRESS,
                icon="mail",
                tone="tone-blue",
                title="Родитель подключился",
                subtitle="Теперь мама/папа видит твои успехи",
            )
        )

    await db.commit()

    # Telegram notice for the parent — they likely closed the Mini App while waiting.
    parent = await db.get(User, req.parent_id)
    if parent:
        await send_to_user(
            parent.telegram_id,
            "✅ Ваша заявка на привязку к ребёнку одобрена. "
            "Откройте приложение — теперь видны успехи ребёнка.",
        )
    return DecisionResult(True, f"Заявка #{request_id} одобрена", request=req)


async def reject_parent_link_request(
    request_id: int, admin_tg_id: int, db: AsyncSession
) -> DecisionResult:
    req = await db.get(ParentLinkRequest, request_id)
    if req is None:
        return DecisionResult(False, f"Заявка #{request_id} не найдена")
    if req.status != ParentLinkRequestStatus.PENDING:
        return DecisionResult(
            False,
            f"Заявка #{request_id} уже {req.status.value}",
            request=req,
        )

    req.status = ParentLinkRequestStatus.REJECTED
    req.decided_at = datetime.now(timezone.utc).replace(tzinfo=None)
    req.decided_by_tg_id = admin_tg_id
    await db.commit()

    parent = await db.get(User, req.parent_id)
    if parent:
        await send_to_user(
            parent.telegram_id,
            "❌ К сожалению, ваша заявка на привязку к ребёнку отклонена. "
            "Если это ошибка — напишите в поддержку: @byt_mamoi_support",
        )
    return DecisionResult(True, f"Заявка #{request_id} отклонена", request=req)


# ── Parent dashboard ────────────────────────────────────────────────────────
@router.get("/children", response_model=list[UserOut])
async def get_children(tg: AuthDep, db: DbDep) -> list[User]:
    parent = await get_or_create_user(tg, db)
    links = (
        await db.scalars(
            select(ParentChild).where(ParentChild.parent_id == parent.id)
        )
    ).all()
    children: list[User] = []
    for link in links:
        child = await db.get(User, link.child_id)
        if child:
            children.append(child)
    return children


@router.get("/children/{child_id}/stats", response_model=ChildStatsOut)
async def get_child_stats(child_id: int, tg: AuthDep, db: DbDep) -> ChildStatsOut:
    parent = await get_or_create_user(tg, db)

    # Verify parent is linked to this child
    link = await db.scalar(
        select(ParentChild).where(
            ParentChild.parent_id == parent.id, ParentChild.child_id == child_id
        )
    )
    if link is None:
        raise HTTPException(status_code=403, detail="Not linked to this child")

    child = await db.get(User, child_id)
    if child is None:
        raise HTTPException(status_code=404, detail="Child not found")

    all_topics = (await db.scalars(select(Topic))).all()
    all_games = (await db.scalars(select(Game))).all()

    games_done = 0
    topics_done = 0
    for topic in all_topics:
        topic_games = [g for g in all_games if g.topic_id == topic.id]
        topic_complete = True
        for g in topic_games:
            b = await _user_game_best(child.id, g.id, db)
            if b["completed"]:
                games_done += 1
            else:
                topic_complete = False
        if topic_complete and topic_games:
            topics_done += 1

    # Time in last 7 days
    from datetime import timezone as tz

    week_ago = datetime.now(tz.utc).replace(tzinfo=None) - timedelta(days=7)
    week_secs = await db.scalar(
        select(func.sum(GameSession.time_spent_secs)).where(
            GameSession.user_id == child.id,
            GameSession.completed_at >= week_ago,
        )
    )

    badges_earned = await db.scalar(
        select(func.count()).where(UserAchievement.user_id == child.id)
    )
    badges_total = await db.scalar(select(func.count(Achievement.id)))

    total_pct = (
        round(games_done / len(all_games) * 100) if all_games else 0
    )

    return ChildStatsOut(
        child=UserOut.model_validate(child),
        total_progress_pct=total_pct,
        games_done=games_done,
        games_total=len(all_games),
        topics_done=topics_done,
        topics_total=len(all_topics),
        week_time_mins=round((week_secs or 0) / 60),
        badges_earned=badges_earned or 0,
        badges_total=badges_total or 0,
    )
