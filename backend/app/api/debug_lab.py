from fastapi import APIRouter, HTTPException

from app.schemas.debug_lab import (
    DebugChallengeDetail,
    DebugChallengeSummary,
    DebugHintRequest,
    DebugHintResponse,
    DebugResetResponse,
    DebugRunRequest,
    DebugRunResponse,
)
from app.services.debug_lab_service import (
    get_challenge,
    get_hint,
    get_starter_code,
    list_challenges,
    run_challenge,
)

router = APIRouter(prefix="/debug-lab", tags=["debug-lab"])


@router.get("/challenges", response_model=list[DebugChallengeSummary])
def read_challenges():
    return list_challenges()


@router.get("/challenges/{challenge_id}", response_model=DebugChallengeDetail)
def read_challenge(challenge_id: str):
    try:
        return get_challenge(challenge_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/run", response_model=DebugRunResponse)
def run_debug_lab(payload: DebugRunRequest):
    try:
        return run_challenge(payload.challenge_id, payload.code)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/hint", response_model=DebugHintResponse)
def debug_hint(payload: DebugHintRequest):
    try:
        return get_hint(payload.challenge_id, payload.hint_index)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/reset/{challenge_id}", response_model=DebugResetResponse)
def reset_challenge(challenge_id: str):
    try:
        return {
            "challenge_id": challenge_id,
            "starter_code": get_starter_code(challenge_id),
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))