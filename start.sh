#!/bin/bash
set -e
cd backend
# Telegram bot runs in background (polling)
python bot.py &
# FastAPI serves both API and built frontend
exec python -m uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
