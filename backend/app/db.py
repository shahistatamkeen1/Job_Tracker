from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings


client = AsyncIOMotorClient(settings.mongodb_uri)
database: AsyncIOMotorDatabase = client[settings.mongodb_db_name]


def get_jobs_collection():
    return database.get_collection("applications")
