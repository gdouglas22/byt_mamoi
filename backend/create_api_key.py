"""
Generate an API key for an existing user.

Usage:
    python create_api_key.py --telegram-id 12345 --name "friend dev"
    python create_api_key.py --telegram-id 12345 --name "friend dev" --revoke <key_id>
    python create_api_key.py --list

The plaintext key is printed ONCE. Store it — only the hash is kept in DB.
"""

import argparse
import asyncio
import secrets

from sqlalchemy import select

from auth import API_KEY_PREFIX, hash_api_key
from database import SessionLocal, init_db
from models import ApiKey, User


def _gen_key() -> str:
    return API_KEY_PREFIX + secrets.token_urlsafe(32)


async def create(telegram_id: int, name: str) -> None:
    await init_db()
    async with SessionLocal() as db:
        user = await db.scalar(select(User).where(User.telegram_id == telegram_id))
        if user is None:
            print(f"ERROR: no user with telegram_id={telegram_id}.")
            print("Ask the friend to open the bot once in Telegram, then retry.")
            return
        raw = _gen_key()
        db.add(ApiKey(user_id=user.id, key_hash=hash_api_key(raw), name=name))
        await db.commit()
        print(f"User: {user.name or '—'} (id={user.id}, tg={user.telegram_id})")
        print(f"Name: {name}")
        print()
        print("API key (copy now, it will not be shown again):")
        print(f"  {raw}")
        print()
        print("Usage:")
        print(f'  curl https://YOUR-DOMAIN/api/me -H "Authorization: Bearer {raw}"')


async def list_keys() -> None:
    await init_db()
    async with SessionLocal() as db:
        rows = (await db.scalars(select(ApiKey))).all()
        if not rows:
            print("(no keys)")
            return
        for k in rows:
            user = await db.get(User, k.user_id)
            mark = "REVOKED" if k.revoked else "active"
            uname = user.name if user else "?"
            print(
                f"  [{k.id:>3}] {mark:8} user={uname} (tg={user.telegram_id if user else '?'}) "
                f"name='{k.name}' created={k.created_at:%Y-%m-%d} last_used={k.last_used_at}"
            )


async def revoke(key_id: int) -> None:
    await init_db()
    async with SessionLocal() as db:
        k = await db.get(ApiKey, key_id)
        if k is None:
            print(f"ERROR: no key with id={key_id}")
            return
        k.revoked = True
        await db.commit()
        print(f"Revoked key id={key_id}.")


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--telegram-id", type=int, help="Telegram user id to bind the key to")
    p.add_argument("--name", type=str, default="", help="Human-readable label")
    p.add_argument("--list", action="store_true", help="List all keys")
    p.add_argument("--revoke", type=int, metavar="KEY_ID", help="Revoke a key by id")
    args = p.parse_args()

    if args.list:
        asyncio.run(list_keys())
    elif args.revoke is not None:
        asyncio.run(revoke(args.revoke))
    elif args.telegram_id is not None:
        asyncio.run(create(args.telegram_id, args.name or "unnamed"))
    else:
        p.print_help()


if __name__ == "__main__":
    main()
