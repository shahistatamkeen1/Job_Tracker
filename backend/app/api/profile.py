from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from app.services.profile_extraction_service import profile_extraction_service
from app.services.file_extraction_service import file_extraction_service
import re
import httpx

router = APIRouter(tags=["profile"])


class ProfileExtractionRequest(BaseModel):
    resume_text: str = ""
    linkedin_url: str = ""


@router.post("/profile/extract-from-file")
async def extract_profile_from_file(file: UploadFile = File(...)):
    """Extract skills, experience, projects, etc. from resume file (PDF, DOCX, DOC)"""
    
    # Validate file type
    allowed_extensions = [".pdf", ".docx", ".doc"]
    file_ext = "." + (file.filename.split(".")[-1]).lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported: {', '.join(allowed_extensions)}"
        )
    
    try:
        # Read file content
        file_content = await file.read()
        
        if not file_content:
            raise HTTPException(status_code=400, detail="File is empty")
        
        print(f"[DEBUG] File received: {file.filename}, size: {len(file_content)} bytes")
        
        # Extract text from file
        resume_text = file_extraction_service.extract_from_file(file.filename, file_content)
        
        print(f"[DEBUG] Extracted text length: {len(resume_text)} characters")
        print(f"[DEBUG] First 200 chars: {resume_text[:200]}")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from file")
        
        # Extract profile data from text
        result = profile_extraction_service.extract_from_resume_text(resume_text)
        
        print(f"[DEBUG] Profile extraction result: {result}")
        
        return result
        
    except HTTPException:
        raise
    except ValueError as e:
        print(f"[ERROR] ValueError: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[ERROR] Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/profile/extract")
async def extract_profile_data(request: ProfileExtractionRequest):
    """Extract skills, experience, projects, etc. from resume or LinkedIn URL"""
    
    text_to_process = ""
    
    # If LinkedIn URL is provided, try to extract basic info (fallback, LinkedIn profile scraping requires auth)
    if request.linkedin_url:
        try:
            # LinkedIn profile scraping is complex and requires authorization
            # For now, we'll use the resume text if available
            if request.resume_text:
                text_to_process = request.resume_text
            else:
                # Return minimal data for LinkedIn-only case
                return {
                    "skills": [],
                    "experiences": [],
                    "projects": [],
                    "publications": [],
                    "certifications": [],
                    "achievements": [],
                    "note": "LinkedIn scraping requires additional setup. Please provide resume text for automatic extraction.",
                }
        except Exception as e:
            return {
                "error": f"Could not process LinkedIn URL: {str(e)}",
                "skills": [],
                "experiences": [],
                "projects": [],
                "publications": [],
                "certifications": [],
                "achievements": [],
            }
    
    # Process resume text
    if request.resume_text:
        text_to_process = request.resume_text
    
    if not text_to_process:
        raise HTTPException(status_code=400, detail="Please provide either resume text or LinkedIn URL")
    
    try:
        result = profile_extraction_service.extract_from_resume_text(text_to_process)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting profile data: {str(e)}")
