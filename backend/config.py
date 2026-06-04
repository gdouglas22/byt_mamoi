from functools import cached_property

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", populate_by_name=True)

    BOT_TOKEN: str = "REPLACE_ME"
    MINI_APP_URL: str = "https://example.com"
    DATABASE_URL: str = "sqlite+aiosqlite:///./byt_mamoi.db"

    # CORS origins for the Mini App (Telegram serves it from their CDN)
    ALLOWED_ORIGINS: list[str] = ["https://web.telegram.org", "https://telegram.org"]

    # OTP code TTL in seconds (10 minutes)
    OTP_TTL: int = 600

    # In development set to True to skip Telegram signature verification
    DEBUG: bool = False

    # Secret for /admin endpoints (API key management). Empty disables them.
    ADMIN_SECRET: str = ""

    # Comma-separated Telegram user IDs allowed to run admin bot commands
    # and receive parent-link approval notifications. Stored as a string and
    # split lazily — pydantic-settings tries to JSON-parse complex fields from
    # env, which trips on single bare numbers like `12345`.
    # Example in Railway Variables:  ADMIN_TG_IDS=12345,67890
    ADMIN_TG_IDS_RAW: str = Field(default="", alias="ADMIN_TG_IDS")

    @cached_property
    def ADMIN_TG_IDS(self) -> list[int]:
        out: list[int] = []
        for chunk in (self.ADMIN_TG_IDS_RAW or "").replace(";", ",").split(","):
            chunk = chunk.strip()
            if not chunk:
                continue
            try:
                out.append(int(chunk))
            except ValueError:
                pass
        return out


settings = Settings()
