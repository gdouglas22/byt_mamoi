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


settings = Settings()
