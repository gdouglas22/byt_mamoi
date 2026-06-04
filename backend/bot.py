"""
Telegram bot entry point.

Runs alongside the FastAPI server (or separately).
Responsible for:
  - /start — sends the Mini App launch button
  - /help  — brief help (different for admins)
  - Admin commands (visible only to ADMIN_TG_IDS): /users /stats /requests /grant_key /keys /revoke
  - Inline-callback approve/reject for ParentLinkRequest notifications
"""

import asyncio
import logging
from typing import Iterable

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    BotCommand,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)
from sqlalchemy import func, select

from config import settings
from database import SessionLocal
from models import (
    ApiKey,
    GameSession,
    ParentChild,
    ParentLinkRequest,
    ParentLinkRequestStatus,
    User,
    UserAchievement,
)
from routers.parent import approve_parent_link_request, reject_parent_link_request

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=settings.BOT_TOKEN)
dp = Dispatcher()


def _is_admin(user_id: int | None) -> bool:
    if user_id is None:
        return False
    return user_id in settings.ADMIN_TG_IDS


def _main_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[[
            InlineKeyboardButton(
                text="🛡 Открыть Круг безопасности",
                web_app=WebAppInfo(url=settings.MINI_APP_URL),
            )
        ]]
    )


# ── Public commands ───────────────────────────────────────────────────────
@dp.message(CommandStart())
async def cmd_start(message: Message) -> None:
    name = message.from_user.first_name if message.from_user else "друг"
    await message.answer(
        f"Привет, {name}! 👋\n\n"
        "Я — бот проекта «Круг безопасности» Фонда «Быть мамой».\n\n"
        "Здесь дети 7–12 лет учатся безопасному поведению в интернете "
        "через короткие мини-игры: фишинг, пароли, личные данные и многое другое.\n\n"
        "Нажми кнопку ниже, чтобы начать обучение 👇",
        reply_markup=_main_keyboard(),
    )


@dp.message(Command("help"))
async def cmd_help(message: Message) -> None:
    tg_id = message.from_user.id if message.from_user else None
    if _is_admin(tg_id):
        await message.answer(_admin_help_text(), parse_mode="HTML")
    else:
        await message.answer(_user_help_text(), parse_mode="HTML")


def _user_help_text() -> str:
    return (
        "📚 <b>Помощь</b>\n\n"
        "/start — запустить приложение\n"
        "/help — показать эту справку\n\n"
        "Если ты <b>родитель</b>:\n"
        "Открой приложение → Профиль → «Привязать родителя», "
        "получи код у ребёнка и введи его в своём приложении. "
        "Заявка пройдёт модерацию — после одобрения родитель видит прогресс ребёнка.\n\n"
        "По вопросам пишите в поддержку: @byt_mamoi_support"
    )


def _admin_help_text() -> str:
    return (
        "🛠 <b>Админ-команды</b>\n\n"
        "<b>Пользователи и статистика</b>\n"
        "/users — последние пользователи\n"
        "/stats — общая статистика\n"
        "/find <code>&lt;tg_id или имя&gt;</code> — найти пользователя\n"
        "/reset <code>&lt;tg_id | all CONFIRM&gt;</code> — обнулить прогресс (профиль остаётся)\n"
        "/reset_full <code>&lt;tg_id | all CONFIRM&gt;</code> — полный сброс + перепрохождение онбординга\n\n"
        "<b>Привязки родитель ↔ ребёнок</b>\n"
        "/requests — ожидающие заявки на привязку (кнопки одобрить/отклонить)\n"
        "/links — все активные привязки (кнопка «разорвать»)\n\n"
        "<b>API-ключи</b>\n"
        "/keys — все API-ключи\n"
        "/grant_key <code>&lt;tg_id&gt; [имя]</code> — выдать ключ\n"
        "/revoke_key <code>&lt;id&gt;</code> — отозвать ключ\n\n"
        "Пользовательские: /start, /help"
    )


# ── Admin commands ─────────────────────────────────────────────────────────
async def _require_admin(message: Message) -> bool:
    tg_id = message.from_user.id if message.from_user else None
    if not _is_admin(tg_id):
        # Stay silent to non-admins — don't advertise admin features exist.
        return False
    return True


def _fmt_user(u: User) -> str:
    name = u.name or "?"
    return f"<b>{name}</b> · tg=<code>{u.telegram_id}</code> · id={u.id}"


@dp.message(Command("users"))
async def cmd_users(message: Message) -> None:
    if not await _require_admin(message):
        return
    async with SessionLocal() as db:
        rows = (await db.scalars(select(User).order_by(User.id.desc()).limit(30))).all()
        total = await db.scalar(select(func.count()).select_from(User))
    if not rows:
        await message.answer("Пользователей нет.")
        return
    lines = [f"👥 <b>Последние пользователи</b> (всего: {total})\n"]
    for u in rows:
        age = f", {u.age} лет" if u.age else ""
        pts = f" · {u.points} баллов"
        lines.append(f"• {_fmt_user(u)}{age}{pts}")
    await message.answer("\n".join(lines), parse_mode="HTML")


@dp.message(Command("stats"))
async def cmd_stats(message: Message) -> None:
    if not await _require_admin(message):
        return
    async with SessionLocal() as db:
        users     = await db.scalar(select(func.count()).select_from(User)) or 0
        sessions  = await db.scalar(select(func.count()).select_from(GameSession)) or 0
        badges    = await db.scalar(select(func.count()).select_from(UserAchievement)) or 0
        parents   = await db.scalar(select(func.count()).select_from(ParentChild)) or 0
        pending   = await db.scalar(
            select(func.count()).select_from(ParentLinkRequest)
            .where(ParentLinkRequest.status == ParentLinkRequestStatus.PENDING)
        ) or 0
    await message.answer(
        "📊 <b>Статистика</b>\n\n"
        f"Пользователи: <b>{users}</b>\n"
        f"Игровых сессий: <b>{sessions}</b>\n"
        f"Выдано бейджей: <b>{badges}</b>\n"
        f"Привязок «родитель ↔ ребёнок»: <b>{parents}</b>\n"
        f"Заявок на модерации: <b>{pending}</b>\n",
        parse_mode="HTML",
    )


@dp.message(Command("find"))
async def cmd_find(message: Message) -> None:
    if not await _require_admin(message):
        return
    parts = (message.text or "").split(maxsplit=1)
    if len(parts) < 2:
        await message.answer("Использование: /find &lt;tg_id или имя&gt;", parse_mode="HTML")
        return
    needle = parts[1].strip()
    async with SessionLocal() as db:
        q = select(User)
        if needle.isdigit():
            q = q.where(User.telegram_id == int(needle))
        else:
            q = q.where(User.name.ilike(f"%{needle}%"))
        rows = (await db.scalars(q.limit(20))).all()
    if not rows:
        await message.answer("Никого не нашёл.")
        return
    lines = [f"🔍 <b>Найдено: {len(rows)}</b>\n"]
    for u in rows:
        lines.append(f"• {_fmt_user(u)} · {u.points} баллов")
    await message.answer("\n".join(lines), parse_mode="HTML")


async def _wipe_progress(user: User, db) -> None:
    """Reset gameplay state: sessions, achievements, points, streak. Profile stays."""
    from sqlalchemy import delete
    await db.execute(delete(GameSession).where(GameSession.user_id == user.id))
    await db.execute(delete(UserAchievement).where(UserAchievement.user_id == user.id))
    user.points = 0
    user.streak_days = 0
    user.last_active_date = None


async def _wipe_profile(user: User, db) -> None:
    """In addition to progress wipe — force onboarding next time, drop name/age."""
    await _wipe_progress(user, db)
    user.onboarding_done = False
    user.name = None
    user.age = None


@dp.message(Command("reset"))
async def cmd_reset(message: Message) -> None:
    """/reset <tg_id> | /reset all CONFIRM — обнулить прогресс (профиль не трогаем)."""
    if not await _require_admin(message):
        return
    parts = (message.text or "").split()
    if len(parts) < 2:
        await message.answer(
            "Использование:\n"
            "  /reset &lt;tg_id&gt; — обнулить прогресс пользователя\n"
            "  /reset all CONFIRM — обнулить прогресс у ВСЕХ",
            parse_mode="HTML",
        )
        return

    target = parts[1].lower()
    if target == "all":
        if len(parts) < 3 or parts[2] != "CONFIRM":
            await message.answer(
                "⚠️ Опасная операция. Подтверди:\n"
                "<code>/reset all CONFIRM</code>",
                parse_mode="HTML",
            )
            return
        async with SessionLocal() as db:
            users = (await db.scalars(select(User))).all()
            for u in users:
                await _wipe_progress(u, db)
            await db.commit()
        await message.answer(f"♻️ Прогресс обнулён у {len(users)} пользователей. Профили (имя/возраст) сохранены.")
        return

    if not target.lstrip("-").isdigit():
        await message.answer("Использование: /reset &lt;tg_id&gt; или /reset all CONFIRM", parse_mode="HTML")
        return
    tg_id = int(target)
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.telegram_id == tg_id))
        if user is None:
            await message.answer(f"Пользователь с tg={tg_id} не найден.")
            return
        await _wipe_progress(user, db)
        await db.commit()
    await message.answer(f"♻️ Прогресс tg={tg_id} обнулён. Профиль сохранён.")


@dp.message(Command("reset_full"))
async def cmd_reset_full(message: Message) -> None:
    """/reset_full <tg_id> | /reset_full all CONFIRM — полный сброс: профиль + прогресс, онбординг с нуля."""
    if not await _require_admin(message):
        return
    parts = (message.text or "").split()
    if len(parts) < 2:
        await message.answer(
            "Использование:\n"
            "  /reset_full &lt;tg_id&gt; — полный сброс пользователя\n"
            "  /reset_full all CONFIRM — полный сброс у ВСЕХ\n\n"
            "Сбрасывает: прогресс + имя/возраст + флаг онбординга. "
            "Пользователь снова пройдёт онбординг при следующем входе.",
            parse_mode="HTML",
        )
        return

    target = parts[1].lower()
    if target == "all":
        if len(parts) < 3 or parts[2] != "CONFIRM":
            await message.answer(
                "⚠️ Это полностью обнулит всех пользователей. Подтверди:\n"
                "<code>/reset_full all CONFIRM</code>",
                parse_mode="HTML",
            )
            return
        async with SessionLocal() as db:
            users = (await db.scalars(select(User))).all()
            for u in users:
                await _wipe_profile(u, db)
            await db.commit()
        await message.answer(
            f"🗑 Полный сброс выполнен для {len(users)} пользователей. "
            "Все снова пройдут онбординг при следующем входе."
        )
        return

    if not target.lstrip("-").isdigit():
        await message.answer("Использование: /reset_full &lt;tg_id&gt; или /reset_full all CONFIRM", parse_mode="HTML")
        return
    tg_id = int(target)
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.telegram_id == tg_id))
        if user is None:
            await message.answer(f"Пользователь с tg={tg_id} не найден.")
            return
        await _wipe_profile(user, db)
        await db.commit()
    await message.answer(
        f"🗑 Полный сброс tg={tg_id}. При следующем входе — онбординг с нуля."
    )


@dp.message(Command("links"))
async def cmd_links(message: Message) -> None:
    """List all parent↔child links with inline 'unlink' buttons."""
    if not await _require_admin(message):
        return
    async with SessionLocal() as db:
        rows = (await db.scalars(
            select(ParentChild).order_by(ParentChild.linked_at.desc())
        )).all()
        if not rows:
            await message.answer("Привязок «родитель ↔ ребёнок» пока нет.")
            return
        await message.answer(
            f"🔗 <b>Привязки родитель ↔ ребёнок</b> ({len(rows)})",
            parse_mode="HTML",
        )
        for r in rows:
            parent = await db.get(User, r.parent_id)
            child  = await db.get(User, r.child_id)
            linked = r.linked_at.strftime("%d.%m.%Y") if r.linked_at else "—"
            text = (
                f"#<code>{r.id}</code> · {linked}\n"
                f"👨‍👩‍👧 Родитель: <b>{(parent.name or '?') if parent else '?'}</b> "
                f"(tg=<code>{parent.telegram_id if parent else '?'}</code>)\n"
                f"🧒 Ребёнок: <b>{(child.name or '?') if child else '?'}</b> "
                f"(tg=<code>{child.telegram_id if child else '?'}</code>)"
            )
            kb = InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(text="🔓 Разорвать", callback_data=f"pc:unlink:{r.id}"),
            ]])
            await message.answer(text, reply_markup=kb, parse_mode="HTML")


@dp.message(Command("requests"))
async def cmd_requests(message: Message) -> None:
    if not await _require_admin(message):
        return
    async with SessionLocal() as db:
        rows = (await db.scalars(
            select(ParentLinkRequest)
            .where(ParentLinkRequest.status == ParentLinkRequestStatus.PENDING)
            .order_by(ParentLinkRequest.created_at.desc())
        )).all()
        if not rows:
            await message.answer("Заявок на привязку нет.")
            return
        for r in rows:
            parent = await db.get(User, r.parent_id)
            child  = await db.get(User, r.child_id)
            text = (
                f"🔗 Заявка #<code>{r.id}</code>\n"
                f"Родитель: <b>{(parent.name or '?') if parent else '?'}</b> "
                f"(tg=<code>{parent.telegram_id if parent else '?'}</code>)\n"
                f"Ребёнок: <b>{(child.name or '?') if child else '?'}</b> "
                f"(tg=<code>{child.telegram_id if child else '?'}</code>)"
            )
            kb = InlineKeyboardMarkup(inline_keyboard=[[
                InlineKeyboardButton(text="✅ Одобрить", callback_data=f"plr:approve:{r.id}"),
                InlineKeyboardButton(text="❌ Отклонить", callback_data=f"plr:reject:{r.id}"),
            ]])
            await message.answer(text, reply_markup=kb, parse_mode="HTML")


@dp.message(Command("keys"))
async def cmd_keys(message: Message) -> None:
    if not await _require_admin(message):
        return
    async with SessionLocal() as db:
        rows = (await db.scalars(select(ApiKey).order_by(ApiKey.id.desc()).limit(30))).all()
        if not rows:
            await message.answer("Ключей нет.")
            return
        lines = ["🔑 <b>API-ключи</b>\n"]
        for k in rows:
            user = await db.get(User, k.user_id)
            mark = "REVOKED" if k.revoked else "active"
            who = user.name if user else "?"
            lines.append(f"• #{k.id} [{mark}] {who} (tg={user.telegram_id if user else '?'}) — {k.name or '—'}")
    await message.answer("\n".join(lines), parse_mode="HTML")


@dp.message(Command("grant_key"))
async def cmd_grant_key(message: Message) -> None:
    if not await _require_admin(message):
        return
    import secrets
    from auth import API_KEY_PREFIX, hash_api_key
    parts = (message.text or "").split(maxsplit=2)
    if len(parts) < 2 or not parts[1].lstrip("-").isdigit():
        await message.answer(
            "Использование: /grant_key &lt;tg_id&gt; [имя]",
            parse_mode="HTML",
        )
        return
    tg_id = int(parts[1])
    name = parts[2].strip() if len(parts) > 2 else "via bot"
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.telegram_id == tg_id))
        if user is None:
            await message.answer(f"Пользователь с tg={tg_id} не найден. Попроси его открыть бота.")
            return
        raw = API_KEY_PREFIX + secrets.token_urlsafe(32)
        db.add(ApiKey(user_id=user.id, key_hash=hash_api_key(raw), name=name))
        await db.commit()
    await message.answer(
        f"🔑 Ключ для tg={tg_id}:\n<code>{raw}</code>\n\nПокажи только один раз.",
        parse_mode="HTML",
    )


@dp.message(Command("revoke_key"))
async def cmd_revoke_key(message: Message) -> None:
    if not await _require_admin(message):
        return
    parts = (message.text or "").split()
    if len(parts) < 2 or not parts[1].isdigit():
        await message.answer("Использование: /revoke_key &lt;id&gt;", parse_mode="HTML")
        return
    key_id = int(parts[1])
    async with SessionLocal() as db:
        k = await db.get(ApiKey, key_id)
        if k is None:
            await message.answer(f"Ключ #{key_id} не найден.")
            return
        k.revoked = True
        await db.commit()
    await message.answer(f"Ключ #{key_id} отозван.")


# ── Inline callback: unlink an existing ParentChild row ──────────────────
@dp.callback_query(F.data.startswith("pc:unlink:"))
async def on_parent_child_unlink(cb: CallbackQuery) -> None:
    tg_id = cb.from_user.id if cb.from_user else None
    if not _is_admin(tg_id):
        await cb.answer("Только админам", show_alert=True)
        return
    try:
        link_id = int((cb.data or "").split(":", 2)[2])
    except (ValueError, IndexError):
        await cb.answer("Неверный формат")
        return

    async with SessionLocal() as db:
        link = await db.get(ParentChild, link_id)
        if link is None:
            await cb.answer(f"Привязка #{link_id} уже удалена", show_alert=False)
        else:
            parent = await db.get(User, link.parent_id)
            child  = await db.get(User, link.child_id)
            await db.delete(link)
            await db.commit()
            # Telegram-уведомление обеим сторонам
            if parent:
                from tg_notify import send_to_user as _send
                await _send(
                    parent.telegram_id,
                    "⚠️ Привязка к ребёнку отменена администратором. "
                    "Если это ошибка — напиши в поддержку: @byt_mamoi_support",
                )
            if child:
                from tg_notify import send_to_user as _send
                await _send(
                    child.telegram_id,
                    "ℹ️ Один из привязанных родителей был отвязан администратором.",
                )
            await cb.answer(f"Привязка #{link_id} разорвана", show_alert=False)

    # Сворачиваем кнопки и помечаем сообщение
    if cb.message:
        try:
            await cb.message.edit_text(
                (cb.message.html_text or cb.message.text or "") + "\n\n<b>🔓 Разорвано</b>",
                reply_markup=None,
                parse_mode="HTML",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to edit unlink message: %s", exc)


# ── Inline callbacks for parent-link approval ─────────────────────────────
@dp.callback_query(F.data.startswith("plr:"))
async def on_parent_link_decision(cb: CallbackQuery) -> None:
    tg_id = cb.from_user.id if cb.from_user else None
    if not _is_admin(tg_id):
        await cb.answer("Только админам", show_alert=True)
        return
    try:
        _, action, raw_id = (cb.data or "").split(":", 2)
        request_id = int(raw_id)
    except (ValueError, TypeError):
        await cb.answer("Неверный формат")
        return

    async with SessionLocal() as db:
        if action == "approve":
            res = await approve_parent_link_request(request_id, admin_tg_id=tg_id or 0, db=db)
        elif action == "reject":
            res = await reject_parent_link_request(request_id, admin_tg_id=tg_id or 0, db=db)
        else:
            await cb.answer("Неизвестное действие")
            return

    await cb.answer(res.message, show_alert=False)
    # Edit the original message — remove buttons, add status line.
    if cb.message:
        try:
            badge = "✅ Одобрено" if action == "approve" and res.ok else (
                "❌ Отклонено" if action == "reject" and res.ok else f"⚠ {res.message}"
            )
            await cb.message.edit_text(
                (cb.message.html_text or cb.message.text or "") + f"\n\n<b>{badge}</b>",
                reply_markup=None,
                parse_mode="HTML",
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to edit decision message: %s", exc)


async def set_bot_commands() -> None:
    # Public command list (shown to everyone in the / menu).
    await bot.set_my_commands([
        BotCommand(command="start", description="Открыть приложение"),
        BotCommand(command="help",  description="Помощь"),
    ])
    # Admin command list — visible only in chats with admins.
    for admin_id in settings.ADMIN_TG_IDS:
        try:
            from aiogram.types import BotCommandScopeChat
            await bot.set_my_commands(
                [
                    BotCommand(command="start",      description="Открыть приложение"),
                    BotCommand(command="help",       description="Помощь (админ)"),
                    BotCommand(command="users",      description="Последние пользователи"),
                    BotCommand(command="stats",      description="Общая статистика"),
                    BotCommand(command="find",       description="Найти пользователя"),
                    BotCommand(command="reset",      description="Обнулить прогресс юзера"),
                    BotCommand(command="reset_full", description="Полный сброс (с онбордингом)"),
                    BotCommand(command="requests",   description="Заявки на привязку"),
                    BotCommand(command="links",      description="Активные привязки родителей"),
                    BotCommand(command="keys",       description="API-ключи"),
                    BotCommand(command="grant_key",  description="Выдать API-ключ"),
                    BotCommand(command="revoke_key", description="Отозвать API-ключ"),
                ],
                scope=BotCommandScopeChat(chat_id=admin_id),
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to set admin commands for %s: %s", admin_id, exc)


async def main() -> None:
    await set_bot_commands()
    logger.info("Bot started, admins: %s", list(settings.ADMIN_TG_IDS))
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
