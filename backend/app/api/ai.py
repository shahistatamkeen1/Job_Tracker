from fastapi import APIRouter, HTTPException

from app.schemas.job import ATSResumeRequest, ChatRequest, RejectionAnalysisRequest
from app.services.ai_service import ai_service


router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/analyze-rejection")
async def analyze_rejection(payload: RejectionAnalysisRequest):
    analysis = ai_service.analyze_rejection(
        job_description=payload.job_description,
        user_notes=payload.user_notes,
        status_history=payload.status_history,
    )
    return {"analysis": analysis}


@router.post("/chat")
async def chat(payload: ChatRequest):
    try:
        reply = ai_service.chat_about_jd(
            job_description=payload.job_description,
            message=payload.message,
            history=payload.history,
        )
        return {"reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/ats-resume")
async def ats_resume(payload: ATSResumeRequest):
    return ai_service.ats_resume_feedback(
        job_description=payload.job_description,
        resume_text=payload.resume_text,
    )
