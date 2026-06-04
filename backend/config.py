from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

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
    # AND to receive parent-link approval notifications.
    # Example in Railway Variables:  ADMIN_TG_IDS=12345,67890
    ADMIN_TG_IDS: list[int] = []

    @field_validator("ADMIN_TG_IDS", mode="before")
    @classmethod
    def _parse_admin_ids(cls, v):
        if isinstance(v, str):
            return [int(x.strip()) for x in v.split(",") if x.strip()]
        return v


settings = Settings()
