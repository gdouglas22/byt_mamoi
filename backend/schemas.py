from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from models import Difficulty, NotificationType, UserRole


# ── Auth ───────────────────────────────────────────────────────────────────
class TelegramUser(BaseModel):
    id: int
    first_name: str
    last_name: str | None = None
    username: str | None = None
    language_code: str | None = None


# ── User ───────────────────────────────────────────────────────────────────
class UserOut(BaseModel):
    id: int
    telegram_id: int
    name: str | None
    age: int | None
    avatar: str | None
    role: UserRole
    points: int
    streak_days: int
    onboarding_done: bool
    tour_home_done: bool = False
    parent_linked: bool = False
    is_parent: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = Field(None, max_length=128)
    age: int | None = Field(None, ge=6, le=18)
    avatar: str | None = Field(None, max_length=32)
    role: UserRole | None = None
    onboarding_done: bool | None = None
    tour_home_done: bool | None = None


# ── Topics ─────────────────────────────────────────────────────────────────
class GameOut(BaseModel):
    id: int
    topic_id: int
    title: str
    description: str
    instructions: str
    duration_mins: int
    difficulty: Difficulty
    points_reward: int
    order: int
    # progress fields filled per-user
    best_stars: int = 0
    best_score: int | None = None
    completed: bool = False

    model_config = {"from_attributes": True}


class TopicOut(BaseModel):
    id: int
    slug: str
    title: str
    subtitle: str
    icon: str
    tone: str
    order: int
    games_total: int = 0
    games_done: int = 0
    points_earned: int = 0

    model_config = {"from_attributes": True}


class TopicDetailOut(TopicOut):
    games: list[GameOut] = []


# ── Game session ────────────────────────────────────────────────────────────
class GameStartOut(BaseModel):
    session_id: int
    game_id: int


class GameFinishIn(BaseModel):
    session_id: int
    score: int = Field(..., ge=0)
    total: int = Field(..., ge=1)
    time_spent_secs: int = Field(..., ge=0)


class GameFinishOut(BaseModel):
    session_id: int
    stars: int
    points_earned: int
    new_achievements: list["AchievementOut"] = []


# ── Achievements ────────────────────────────────────────────────────────────
class AchievementOut(BaseModel):
    id: int
    slug: str
    name: str
    description: str
    icon: str
    tone: str
    points_reward: int
    earned: bool = False
    earned_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── Parent linking ─────────────────────────────────────────────────────────
class LinkCodeOut(BaseModel):
    code: str
    expires_at: datetime


class LinkConfirmIn(BaseModel):
    code: str = Field(..., min_length=6, max_length=8)


class ChildStatsOut(BaseModel):
    child: UserOut
    total_progress_pct: int
    games_done: int
    games_total: int
    topics_done: int
    topics_total: int
    week_time_mins: int
    badges_earned: int
    badges_total: int


# ── Notifications ───────────────────────────────────────────────────────────
class NotificationOut(BaseModel):
    id: int
    type: NotificationType
    icon: str
    tone: str
    title: str
    subtitle: str | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Common ──────────────────────────────────────────────────────────────────
class OkResponse(BaseModel):
    ok: Literal[True] = True


GameFinishOut.model_rebuild()
