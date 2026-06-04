"""
Send Telegram messages from the HTTP API process.

The bot runs as a separate process (polling), so the API can't reach into it.
But both share the same BOT_TOKEN, so we can instantiate a thin aiogram Bot
client here and post directly to api.telegram.org. No shared state required.
"""

import logging
from typing import Any

from aiogram import Bot
from aiogram.exceptions import TelegramAPIError
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from config import settings

logger = logging.getLogger(__name__)

_bot: Bot | None = None


def _get_bot() -> Bot:
    global _bot
    if _bot is None:
        _bot = Bot(token=settings.BOT_TOKEN)
    return _bot


async def send_to_admins(text: str, reply_markup: InlineKeyboardMarkup | None = None) -> None:
    """Send a message to every admin in ADMIN_TG_IDS. Errors are swallowed —
    a missing admin chat must not break the request flow."""
    bot = _get_bot()
    for admin_id in settings.ADMIN_TG_IDS:
        try:
            await bot.send_message(admin_id, text, reply_markup=reply_markup, parse_mode="HTML")
        except TelegramAPIError as exc:
            logger.warning("Failed to notify admin %s: %s", admin_id, exc)


async def send_to_user(tg_id: int, text: str, **kwargs: Any) -> None:
    bot = _get_bot()
    try:
        await bot.send_message(tg_id, text, parse_mode="HTML", **kwargs)
    except TelegramAPIError as exc:
        logger.warning("Failed to notify tg=%s: %s", tg_id, exc)


def approve_reject_keyboard(request_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="✅ Одобрить", callback_data=f"plr:approve:{request_id}"),
        InlineKeyboardButton(text="❌ Отклонить", callback_data=f"plr:reject:{request_id}"),
    ]])
