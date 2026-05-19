"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from database import init_db
from routers import achievements, notifications, parent, topics, users
from seed import run_seed
from database import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await init_db()
    async with SessionLocal() as db:
        await run_seed(db)
    yield


app = FastAPI(
    title="Круг безопасности — API",
    description="Backend for the «Быть мамой» Telegram Mini App",
    version="1.0.0",
    lifespan=lifespan,
)

_origins = settings.ALLOWED_ORIGINS + ["*"] if settings.DEBUG else settings.ALLOWED_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(topics.router, prefix="/api")
app.include_router(achievements.router, prefix="/api")
app.include_router(parent.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


# Serve built frontend — must be LAST so API routes take priority
_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="frontend")
