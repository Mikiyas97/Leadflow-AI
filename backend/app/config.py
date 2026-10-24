"""LeadFlow AI - Application Configuration"""
import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "LeadFlow AI Agent"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./leadflow.db")

    # API Keys
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    HUNTER_API_KEY: str = os.getenv("HUNTER_API_KEY", "")
    FIRECRAWL_API_KEY: str = os.getenv("FIRECRAWL_API_KEY", "")
    SERPER_API_KEY: str = os.getenv("SERPER_API_KEY", "")

    # CORS
    FRONTEND_ORIGIN: str = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

    # Server
    PORT: int = int(os.getenv("PORT", "8000"))

    # Gmail SMTP Configuration for Outreach Emails
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    GMAIL_USER: str = os.getenv("GMAIL_USER", "")
    GMAIL_APP_PASSWORD: str = os.getenv("GMAIL_APP_PASSWORD", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", os.getenv("GMAIL_USER", ""))


settings = Settings()
