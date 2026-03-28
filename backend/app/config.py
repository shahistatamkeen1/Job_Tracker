from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://careeruser:adminpass@ac-weizmgo-shard-00-00.mq8nben.mongodb.net:27017,ac-weizmgo-shard-00-01.mq8nben.mongodb.net:27017,ac-weizmgo-shard-00-02.mq8nben.mongodb.net:27017/?ssl=true&replicaSet=atlas-g8kljl-shard-0&authSource=admin&appName=jobtracker"
    mongodb_db_name: str = "jobtracker"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    frontend_origin: str = "http://localhost:5173"
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/api/auth/gmail/callback"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
