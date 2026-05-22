from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UserRole(str, PyEnum):
    CHILD = "child"
    PARENT = "parent"


class Difficulty(str, PyEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class NotificationType(str, PyEnum):
    ACHIEVEMENT = "achievement"
    PROGRESS = "progress"
    TIP = "tip"
    STREAK = "streak"


# ── Users ──────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    telegram_id: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(64))
    name: Mapped[str | None] = mapped_column(String(128))
    age: Mapped[int | None] = mapped_column(Integer)
    avatar: Mapped[str | None] = mapped_column(String(32))  # icon key: "shield", "spark" …
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.CHILD)
    points: Mapped[int] = mapped_column(Integer, default=0)
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_active_date: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    onboarding_done: Mapped[bool] = mapped_column(Boolean, default=False)

    sessions: Mapped[list["GameSession"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    user_achievements: Mapped[list["UserAchievement"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    link_codes: Mapped[list["LinkCode"]] = relationship(back_populates="child", foreign_keys="[LinkCode.child_id]", cascade="all, delete-orphan")

    # Parent → Children links
    children_links: Mapped[list["ParentChild"]] = relationship(
        back_populates="parent",
        foreign_keys="[ParentChild.parent_id]",
        cascade="all, delete-orphan",
    )
    parent_links: Mapped[list["ParentChild"]] = relationship(
        back_populates="child",
        foreign_keys="[ParentChild.child_id]",
        cascade="all, delete-orphan",
    )


# ── Topics ─────────────────────────────────────────────────────────────────
class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    subtitle: Mapped[str] = mapped_column(Text, default="")
    icon: Mapped[str] = mapped_column(String(32), default="shield")   # icon key
    tone: Mapped[str] = mapped_column(String(32), default="tone-blue")
    order: Mapped[int] = mapped_column(Integer, default=0)

    games: Mapped[list["Game"]] = relationship(back_populates="topic", order_by="Game.order", cascade="all, delete-orphan")


# ── Games ──────────────────────────────────────────────────────────────────
class Game(Base):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    topic_id: Mapped[int] = mapped_column(ForeignKey("topics.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    instructions: Mapped[str] = mapped_column(Text, default="")
    duration_mins: Mapped[int] = mapped_column(Integer, default=5)
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), default=Difficulty.EASY)
    points_reward: Mapped[int] = mapped_column(Integer, default=30)
    order: Mapped[int] = mapped_column(Integer, default=0)

    topic: Mapped["Topic"] = relationship(back_populates="games")
    sessions: Mapped[list["GameSession"]] = relationship(back_populates="game", cascade="all, delete-orphan")


# ── Game Sessions ──────────────────────────────────────────────────────────
class GameSession(Base):
    __tablename__ = "game_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    stars: Mapped[int] = mapped_column(Integer, default=0)   # 0-3
    points_earned: Mapped[int] = mapped_column(Integer, default=0)
    time_spent_secs: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    user: Mapped["User"] = relationship(back_populates="sessions")
    game: Mapped["Game"] = relationship(back_populates="sessions")


# ── Achievements ───────────────────────────────────────────────────────────
class Achievement(Base):
    __tablename__ = "achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    icon: Mapped[str] = mapped_column(String(32), default="medal")
    tone: Mapped[str] = mapped_column(String(32), default="tone-honey")
    points_reward: Mapped[int] = mapped_column(Integer, default=50)

    user_achievements: Mapped[list["UserAchievement"]] = relationship(back_populates="achievement")


class UserAchievement(Base):
    __tablename__ = "user_achievements"
    __table_args__ = (UniqueConstraint("user_id", "achievement_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    achievement_id: Mapped[int] = mapped_column(ForeignKey("achievements.id"), nullable=False)
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    user: Mapped["User"] = relationship(back_populates="user_achievements")
    achievement: Mapped["Achievement"] = relationship(back_populates="user_achievements")


# ── Parent ↔ Child linking ─────────────────────────────────────────────────
class ParentChild(Base):
    __tablename__ = "parent_child"
    __table_args__ = (UniqueConstraint("parent_id", "child_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    parent_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    child_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    linked_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    parent: Mapped["User"] = relationship(back_populates="children_links", foreign_keys=[parent_id])
    child: Mapped["User"] = relationship(back_populates="parent_links", foreign_keys=[child_id])


class LinkCode(Base):
    """OTP code generated by child, entered by parent to link accounts."""

    __tablename__ = "link_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    child_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)

    child: Mapped["User"] = relationship(back_populates="link_codes", foreign_keys=[child_id])


# ── API Keys ───────────────────────────────────────────────────────────────
class ApiKey(Base):
    """Long-lived API token for external developers."""

    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


# ── Notifications ──────────────────────────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[NotificationType] = mapped_column(Enum(NotificationType), default=NotificationType.PROGRESS)
    icon: Mapped[str] = mapped_column(String(32), default="bell")
    tone: Mapped[str] = mapped_column(String(32), default="tone-blue")
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(256))
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now_utc)

    user: Mapped["User"] = relationship(back_populates="notifications")
