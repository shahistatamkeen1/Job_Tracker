from datetime import datetime
from pydantic import BaseModel

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from google.oauth2.credentials import Credentials

from app.db import get_jobs_collection
from app.schemas.job import JobApplicationCreate, JobApplicationUpdate, StatusUpdateRequest
from app.services.ai_service import ai_service
from app.services.gmail_service import gmail_service


router = APIRouter(prefix="/jobs", tags=["jobs"])


class GmailSyncRequest(BaseModel):
    access_token: str
    token_type: str = "Bearer"


class AIInsightRequest(BaseModel):
    company: str
    role: str
    job_description: str
    status: str
    notes: str = ""
    description: str = ""


def serialize(doc: dict) -> dict:
    doc["id"] = str(doc.pop("_id"))
    return doc


def parse_object_id(job_id: str) -> ObjectId:
    try:
        return ObjectId(job_id)
    except InvalidId as exc:
        raise HTTPException(status_code=400, detail="Invalid job ID") from exc


@router.get("")
async def list_jobs():
    collection = get_jobs_collection()
    docs = await collection.find().sort("updated_at", -1).to_list(length=500)
    return [serialize(d) for d in docs]


@router.post("")
async def create_job(payload: JobApplicationCreate):
    collection = get_jobs_collection()
    now = datetime.utcnow()
    doc = {
        **payload.model_dump(),
        "ai_rejection_reason": "",
        "status_history": [{"status": payload.status, "note": "Initial status", "at": now.isoformat()}],
        "created_at": now,
        "updated_at": now,
    }
    # Convert date object to datetime for MongoDB storage
    if isinstance(doc.get("applied_on"), datetime) is False:
        applied_on = doc.get("applied_on")
        if applied_on is not None:
            doc["applied_on"] = datetime.combine(applied_on, datetime.min.time())
    
    result = await collection.insert_one(doc)
    created = await collection.find_one({"_id": result.inserted_id})
    return serialize(created)


@router.put("/{job_id}")
async def update_job(job_id: str, payload: JobApplicationUpdate):
    collection = get_jobs_collection()
    object_id = parse_object_id(job_id)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.utcnow()

    result = await collection.update_one({"_id": object_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job application not found")

    updated = await collection.find_one({"_id": object_id})
    return serialize(updated)


@router.patch("/{job_id}/status")
async def update_status(job_id: str, payload: StatusUpdateRequest):
    collection = get_jobs_collection()
    object_id = parse_object_id(job_id)
    job = await collection.find_one({"_id": object_id})
    if not job:
        raise HTTPException(status_code=404, detail="Job application not found")

    now = datetime.utcnow()
    history = job.get("status_history", [])
    history.append({"status": payload.status, "note": payload.note, "at": now.isoformat()})

    ai_reason = job.get("ai_rejection_reason", "")
    if payload.status == "rejected":
        ai_reason = ai_service.analyze_rejection(
            job_description=job["job_description"],
            user_notes=f"{job.get('notes', '')}\n{payload.note}",
            status_history=history,
        )

    await collection.update_one(
        {"_id": object_id},
        {
            "$set": {
                "status": payload.status,
                "status_history": history,
                "ai_rejection_reason": ai_reason,
                "updated_at": now,
            }
        },
    )

    updated = await collection.find_one({"_id": object_id})
    return serialize(updated)


@router.delete("/{job_id}")
async def delete_job(job_id: str):
    collection = get_jobs_collection()
    object_id = parse_object_id(job_id)
    result = await collection.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job application not found")
    return {"deleted": True}


@router.post("/sync/gmail")
async def sync_gmail(request: GmailSyncRequest):
    """Sync job applications from Gmail and create entries in the database."""
    try:
        # Create credentials from access token
        credentials = Credentials(token=request.access_token)
        gmail_service.set_credentials(credentials)

        # Fetch job emails
        job_emails = gmail_service.get_job_emails(max_results=50)

        if not job_emails:
            return {"synced": 0, "jobs": [], "message": "No job emails found"}

        collection = get_jobs_collection()
        created_jobs = []
        now = datetime.utcnow()

        for email_data in job_emails:
            # Check if job already exists (by company and role combination)
            existing = await collection.find_one({
                "company": email_data["company"],
                "role": email_data["role"],
                "source": "gmail"
            })

            if existing:
                continue  # Skip duplicate

            # Create job application entry
            job_doc = {
                "company": email_data["company"],
                "role": email_data["role"],
                "job_description": email_data["email_body_preview"],
                "status": email_data["status"],
                "applied_on": email_data["applied_on"],
                "notes": f"Imported from email: {email_data['email_subject']}",
                "ai_rejection_reason": "",
                "status_history": [
                    {
                        "status": email_data["status"],
                        "note": "Imported from Gmail",
                        "at": now.isoformat()
                    }
                ],
                "source": "gmail",
                "email_subject": email_data["email_subject"],
                "email_from": email_data["email_from"],
                "created_at": now,
                "updated_at": now,
            }

            result = await collection.insert_one(job_doc)
            created = await collection.find_one({"_id": result.inserted_id})
            created_jobs.append(serialize(created))

        return {
            "synced": len(created_jobs),
            "jobs": created_jobs,
            "message": f"Successfully synced {len(created_jobs)} job applications from Gmail"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing Gmail: {str(e)}")


@router.post("/{job_id}/generate-insight")
async def generate_ai_insight(job_id: str):
    """Generate AI insight for a specific job application"""
    try:
        collection = get_jobs_collection()
        object_id = parse_object_id(job_id)
        job = await collection.find_one({"_id": object_id})
        
        if not job:
            raise HTTPException(status_code=404, detail="Job application not found")
        
        insight = ai_service.generate_application_insight(
            company=job.get("company", ""),
            role=job.get("role", ""),
            job_description=job.get("job_description", ""),
            status=job.get("status", ""),
            notes=job.get("notes", ""),
            description=job.get("description", "")
        )
        
        # Update the job with the AI insight
        await collection.update_one(
            {"_id": object_id},
            {
                "$set": {
                    "ai_rejection_reason": insight,
                    "updated_at": datetime.utcnow(),
                }
            }
        )
        
        return {
            "insight": insight,
            "message": "AI insight generated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating AI insight: {str(e)}")


@router.post("/ai-insight")
async def generate_insight_direct(request: AIInsightRequest):
    """Generate AI insight without saving to database"""
    try:
        insight = ai_service.generate_application_insight(
            company=request.company,
            role=request.role,
            job_description=request.job_description,
            status=request.status,
            notes=request.notes,
            description=request.description
        )
        return {"insight": insight}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating AI insight: {str(e)}")

@router.delete("/{job_id}")
async def delete_job(job_id: str):
    collection = get_jobs_collection()
    object_id = parse_object_id(job_id)
    result = await collection.delete_one({"_id": object_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job application not found")
    return {"deleted": True}
