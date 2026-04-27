from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.ai_service import ai_service
from app.services.debug_lab_service import run_dynamic_challenge


router = APIRouter(prefix="/debug-lab", tags=["debug-lab"])


class GenerateDynamicChallengeRequest(BaseModel):
    company: str = ""
    role: str = ""
    job_description: str


class RunDynamicChallengeRequest(BaseModel):
    challenge: dict
    code: str


@router.post("/generate")
def generate_debug_challenge(payload: GenerateDynamicChallengeRequest):
    try:
        return ai_service.generate_debug_challenge(
            company=payload.company,
            role=payload.role,
            job_description=payload.job_description,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/run-dynamic")
def run_debug_challenge(payload: RunDynamicChallengeRequest):
    try:
        return run_dynamic_challenge(
            challenge=payload.challenge,
            code=payload.code,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))