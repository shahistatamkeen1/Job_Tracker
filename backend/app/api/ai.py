from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.ai_service import ai_service


router = APIRouter(tags=["AI"])


class ChatRequest(BaseModel):
    job_description: str = Field(default="")
    message: str = Field(default="")
    history: list[dict] = Field(default_factory=list)


class ATSRequest(BaseModel):
    job_description: str = Field(default="")
    resume_text: str = Field(default="")


class DebugRequest(BaseModel):
    job_description: str = Field(default="")
    role: str = Field(default="")
    company: str = Field(default="")


def build_chat_reply(payload: ChatRequest):
    reply = ai_service.chat_about_jd(
        payload.job_description,
        payload.message,
        payload.history or [],
    )
    return {"reply": reply}


@router.post("/api/ai/chat")
def chat_api(payload: ChatRequest):
    return build_chat_reply(payload)


@router.post("/ai/chat")
def chat_legacy(payload: ChatRequest):
    return build_chat_reply(payload)


@router.post("/api/ai/ats-resume")
def ats_resume(payload: ATSRequest):
    return ai_service.ats_resume_feedback(
        payload.job_description,
        payload.resume_text,
    )


@router.post("/api/ai/debug-challenge")
def debug_challenge(payload: DebugRequest):
    return ai_service.generate_debug_challenge(
        payload.job_description,
        payload.role,
        payload.company,
    )