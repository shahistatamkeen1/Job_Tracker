from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb+srv://careeruser:adminpass@jobtracker.mq8nben.mongodb.net/"
    mongodb_db_name: str = "jobtracker"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    frontend_origin: str = "http://localhost:5173"
    google_client_id: str = "696567052531-2usg9lllvdvk7kjhl0tb589ic7c5m3ia.apps.googleusercontent.com"
    google_client_secret: str = "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"
    google_redirect_uri: str = "http://localhost:8000/api/auth/gmail/callback"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
