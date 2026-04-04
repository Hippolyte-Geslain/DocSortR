from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    secret_key: str = "change-me-to-a-random-string"
    server_host: str = "0.0.0.0"
    server_port: int = 8000

    # OAuth - Google
    google_client_id: str = ""
    google_client_secret: str = ""

    # OAuth - GitHub
    github_client_id: str = ""
    github_client_secret: str = ""

    # Mistral AI
    mistral_api_key: str = ""

    # Database
    database_url: str = "sqlite+aiosqlite:///./docsortr.db"

    # CORS
    allowed_origins: str = "http://localhost:5173"

    # JWT
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 30

    # File limits
    max_upload_size_mb: int = 50
    allowed_extensions: list[str] = [".pdf", ".jpg", ".jpeg", ".png"]

    # Archive
    archive_base_path: str = "./data/archive"
    staging_path: str = "./data/staging"
    review_path: str = "./data/review"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
