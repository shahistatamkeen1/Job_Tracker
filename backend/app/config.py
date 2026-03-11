from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str
    mongodb_db_name: str = "jobtracker"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env.example", env_file_encoding="utf-8")


settings = Settings()
