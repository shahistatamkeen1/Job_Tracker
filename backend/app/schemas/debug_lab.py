from pydantic import BaseModel, Field
from typing import Any, List, Optional


class DebugChallengeSummary(BaseModel):
    id: str
    title: str
    difficulty: str
    topic: str
    language: str
    description: str
    bug_type: str


class DebugChallengeDetail(DebugChallengeSummary):
    starter_code: str
    function_name: str
    expected_behavior: str
    hint_count: int


class DebugRunRequest(BaseModel):
    challenge_id: str
    code: str = Field(..., min_length=1)
    linked_job_id: Optional[int] = None


class DebugTestResult(BaseModel):
    passed: bool
    input: Any
    expected: Any
    actual: Any = None
    error: Optional[str] = None


class DebugRunResponse(BaseModel):
    challenge_id: str
    tests_passed: int
    total_tests: int
    score: int
    all_passed: bool
    results: List[DebugTestResult]
    feedback: str


class DebugHintRequest(BaseModel):
    challenge_id: str
    hint_index: int = 0
    code: Optional[str] = None


class DebugHintResponse(BaseModel):
    challenge_id: str
    hint_index: int
    hint: str


class DebugResetResponse(BaseModel):
    challenge_id: str
    starter_code: str