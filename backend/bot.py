"""
Telegram bot entry point.

Runs alongside the FastAPI server (or separately).
Responsible for:
  - /start — sends the Mini App launch button
  - /help  — brief help message
  - Inline button "Открыть приложение" → Mini App WebApp button
"""

import asyncio
import logging

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    BotCommand,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=settings.BOT_TOKEN)
dp = Dispatcher()


def _main_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🛡 Открыть Круг безопасности",
                    web_app=WebAppInfo(url=settings.MINI_APP_URL),
                )
            ]
        ]
    )


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
    await message.answer(
        "📚 <b>Помощь</b>\n\n"
        "/start — запустить приложение\n"
        "/help — показать эту справку\n\n"
        "Если ты <b>родитель</b>:\n"
        "Открой приложение → Профиль → «Привязать родителя», "
        "получи код у ребёнка и введи его в своём приложении.\n\n"
        "По вопросам пишите в поддержку: @byt_mamoi_support",
        parse_mode="HTML",
    )


async def set_bot_commands() -> None:
    await bot.set_my_commands(
        [
            BotCommand(command="start", description="Открыть приложение"),
            BotCommand(command="help", description="Помощь"),
        ]
    )


async def main() -> None:
    await set_bot_commands()
    logger.info("Bot started")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
