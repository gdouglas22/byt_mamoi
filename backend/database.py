import logging

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.DATABASE_URL, echo=False)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with SessionLocal() as session:
        yield session


# ── Lightweight forward migrations ─────────────────────────────────────────
# `Base.metadata.create_all` only creates missing tables — it never alters an
# existing one. For tiny additive changes (new column with default) we just
# issue best-effort ALTERs here. They no-op on a fresh DB (table is freshly
# made with the column) and add the column on a pre-existing one.
_MIGRATIONS: list[str] = [
    "ALTER TABLE users ADD COLUMN tour_home_done BOOLEAN NOT NULL DEFAULT 0",
    "ALTER TABLE games ADD COLUMN hidden BOOLEAN NOT NULL DEFAULT 0",
]


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for stmt in _MIGRATIONS:
            try:
                await conn.execute(text(stmt))
            except Exception as exc:  # noqa: BLE001
                # Column already exists (most common) — that's fine.
                logger.debug("Migration skipped (%s): %s", stmt, exc)
