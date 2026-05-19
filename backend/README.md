# Круг безопасности — Backend

Backend for the «Быть мамой» Telegram Mini App teaching children 7–12 cybersecurity basics.

## Stack

| Layer | Technology |
|---|---|
| API | FastAPI + uvicorn |
| DB | SQLite + SQLAlchemy async (aiosqlite) |
| Bot | aiogram 3.x |
| Auth | Telegram initData HMAC-SHA256 |

---

## Quick start

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # edit BOT_TOKEN and MINI_APP_URL
```

**Run the API server:**
```bash
uvicorn main:app --reload --port 8000
```

**Run the bot (separate terminal):**
```bash
python bot.py
```

Swagger UI: http://localhost:8000/docs

---

## Authentication

Every request from the Mini App must include the Telegram initData:

```
Authorization: tma <window.Telegram.WebApp.initData>
```

**Local development** — set `DEBUG=True` in `.env`, then you can pass a raw JSON object:
```
Authorization: tma {"id": 123, "first_name": "Test"}
```

---

## API Reference

### Users
| Method | Path | Description |
|---|---|---|
| GET | `/me` | Get current user profile (creates if not exists) |
| PATCH | `/me` | Update name / age / avatar / role |
| GET | `/me/stats` | Points, streak, games done, badges |
| POST | `/me/ping` | Call on app open to update daily streak |

### Topics & Games
| Method | Path | Description |
|---|---|---|
| GET | `/topics` | List all topics with user progress |
| GET | `/topics/{id}` | Topic detail with games and per-game progress |
| POST | `/topics/games/{id}/start` | Start a game session → `session_id` |
| POST | `/topics/games/{id}/finish` | Submit result, get stars + points + new achievements |

**finish body:**
```json
{
  "session_id": 42,
  "score": 7,
  "total": 8,
  "time_spent_secs": 324
}
```

### Achievements
| Method | Path | Description |
|---|---|---|
| GET | `/achievements` | All achievements with earned/locked status |

### Parent Linking
| Method | Path | Description |
|---|---|---|
| POST | `/parent/link/request` | Child generates a 6-char OTP code (valid 10 min) |
| POST | `/parent/link/confirm` | Parent enters code to link accounts |
| GET | `/parent/children` | Parent: list linked children |
| GET | `/parent/children/{id}/stats` | Parent: full stats for a child |

### Notifications
| Method | Path | Description |
|---|---|---|
| GET | `/notifications` | Last 50 notifications for current user |
| POST | `/notifications/read-all` | Mark all as read |
| POST | `/notifications/{id}/read` | Mark one as read |

---

## DB schema (summary)

```
users           — Telegram user, name, age, avatar, role, points, streak
topics          — Cybersecurity topics (seeded)
games           — Mini-games per topic (seeded)
game_sessions   — Completed plays with score/stars/time
achievements    — Badge definitions (seeded)
user_achievements — Earned badges per user
parent_child    — Parent↔child link
link_codes      — OTP codes for linking
notifications   — In-app notification feed
```

---

## Deployment notes

- Set `MINI_APP_URL` to the HTTPS URL where the frontend is hosted (required by Telegram).
- For production, use PostgreSQL: `DATABASE_URL=postgresql+asyncpg://user:pass@host/db`.
- Run behind a reverse proxy (nginx/caddy) with TLS termination.
- The bot can use either long polling (`bot.py`) or a webhook — add a `/webhook` handler to `main.py` if needed.
