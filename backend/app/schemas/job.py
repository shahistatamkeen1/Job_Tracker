from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


JobStatus = Literal["applied", "interview", "rejected", "offer"]


class JobApplicationCreate(BaseModel):
    company: str = Field(min_length=1, max_length=150)
    role: str = Field(min_length=1, max_length=150)
    job_description: str = Field(min_length=10)
    status: JobStatus = "applied"
    applied_on: date
    notes: str = ""


class JobApplicationUpdate(BaseModel):
    company: Optional[str] = Field(default=None, min_length=1, max_length=150)
    role: Optional[str] = Field(default=None, min_length=1, max_length=150)
    job_description: Optional[str] = Field(default=None, min_length=10)
    status: Optional[JobStatus] = None
    notes: Optional[str] = None


class JobApplicationInDB(BaseModel):
    id: str
    company: str
    role: str
    job_description: str
    status: JobStatus
    applied_on: date
    notes: str
    ai_rejection_reason: str = ""
    status_history: list[dict] = []
    created_at: datetime
    updated_at: datetime


class StatusUpdateRequest(BaseModel):
    status: JobStatus
    note: str = ""


class RejectionAnalysisRequest(BaseModel):
    job_description: str = Field(min_length=10)
    user_notes: str = ""
    status_history: list[dict] = []


class ChatRequest(BaseModel):
    job_description: str = Field(min_length=10)
    message: str = Field(min_length=1)
    history: list[dict] = []


class ATSResumeRequest(BaseModel):
    job_description: str = Field(min_length=10)
    resume_text: str = Field(min_length=50)
