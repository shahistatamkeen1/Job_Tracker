from openai import OpenAI
from app.config import settings


class ProfileExtractionService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model

    def extract_from_resume_text(self, resume_text: str) -> dict:
        """Extract profile data from resume text using AI"""
        print(f"[DEBUG] Starting profile extraction with OpenAI key: {'YES' if settings.openai_api_key else 'NO'}")
        
        if not settings.openai_api_key:
            print("[DEBUG] No OpenAI key, using fallback extraction")
            return self._section_based_extraction(resume_text)

        # First try section-based extraction to get the relevant sections
        sections = self._extract_sections(resume_text)
        print(f"[DEBUG] Found sections: {list(sections.keys())}")

        prompt = """Extract the following information from the resume text and return ONLY valid JSON:
{
    "skills": ["skill1", "skill2", "skill3", ...],
    "experiences": [
        {
            "title": "Job Title",
            "company": "Company Name",
            "location": "Location",
            "startDate": "YYYY-MM",
            "endDate": "YYYY-MM or Present",
            "description": "Brief description"
        }
    ],
    "projects": [
        {
            "name": "Project Name",
            "tech": "Technologies used",
            "description": "Project description",
            "link": "URL if available"
        }
    ],
    "publications": [
        {
            "title": "Publication Title",
            "publisher": "Publisher Name",
            "date": "YYYY-MM-DD",
            "link": "URL if available",
            "description": "Brief description"
        }
    ],
    "certifications": [
        {
            "name": "Certification Name",
            "issuer": "Issuing Organization",
            "issueDate": "YYYY-MM-DD",
            "credentialId": "ID if available",
            "link": "URL if available"
        }
    ],
    "achievements": [
        {
            "title": "Achievement",
            "date": "YYYY-MM-DD",
            "description": "Description"
        }
    ]
}

Resume Sections:
{sections_text}

Return ONLY valid JSON, no additional text or explanation."""

        sections_text = self._format_sections_for_prompt(sections)

        try:
            print("[DEBUG] Calling OpenAI API with section-based content")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt.format(sections_text=sections_text)}],
                temperature=0.3,
            )
            
            import json
            content = response.choices[0].message.content
            print(f"[DEBUG] OpenAI response received: {content[:300]}")
            
            result = json.loads(content)
            print(f"[DEBUG] Successfully parsed JSON: {list(result.keys())}")
            return result
        except Exception as e:
            print(f"[ERROR] Error extracting from resume with OpenAI: {e}")
            import traceback
            traceback.print_exc()
            return self._section_based_extraction(resume_text)

    def _extract_sections(self, text: str) -> dict:
        """Extract distinct sections from resume based on common headings"""
        sections = {}
        lines = text.split("\n")
        
        section_keywords = {
            "skills": ["skills", "technical skills", "core skills", "competencies", "expertise"],
            "experience": ["experience", "work experience", "employment", "professional experience", "career history"],
            "projects": ["projects", "personal projects", "portfolio", "work samples"],
            "education": ["education", "academic", "degree"],
            "certifications": ["certifications", "licenses", "certifications & licenses", "professional certifications"],
            "achievements": ["achievements", "awards", "honors", "accomplishments"],
            "publications": ["publications", "research", "papers"],
        }
        
        current_section = None
        current_content = []
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check if this line is a section heading
            is_section = False
            for section, keywords in section_keywords.items():
                if any(kw in line_lower for kw in keywords) and len(line) < 100:
                    if current_section and current_content:
                        sections[current_section] = "\n".join(current_content)
                    current_section = section
                    current_content = []
                    is_section = True
                    break
            
            if not is_section and current_section:
                current_content.append(line)
        
        # Add the last section
        if current_section and current_content:
            sections[current_section] = "\n".join(current_content)
        
        return sections

    def _format_sections_for_prompt(self, sections: dict) -> str:
        """Format sections for AI prompt"""
        formatted = []
        for section, content in sections.items():
            if content.strip():
                formatted.append(f"SECTION: {section.upper()}\n{content}")
        return "\n\n".join(formatted)

    def _section_based_extraction(self, text: str) -> dict:
        """Extract data based on sections without AI"""
        print("[DEBUG] Using section-based extraction (no AI)")
        
        sections = self._extract_sections(text)
        
        result = {
            "skills": self._extract_skills_from_section(sections.get("skills", "")),
            "experiences": self._extract_experiences_from_section(sections.get("experience", "")),
            "projects": self._extract_projects_from_section(sections.get("projects", "")),
            "publications": self._extract_publications_from_section(sections.get("publications", "")),
            "certifications": self._extract_certifications_from_section(sections.get("certifications", "")),
            "achievements": self._extract_achievements_from_section(sections.get("achievements", "")),
        }
        
        return result

    def _extract_skills_from_section(self, section: str) -> list:
        """Extract skills from skills section"""
        if not section:
            return []
        
        skills = []
        # Split by common delimiters
        for line in section.split("\n"):
            if line.strip():
                # Split by comma or pipe
                items = line.replace(",", "|").replace("•", "|").replace("-", "|").split("|")
                for item in items:
                    item = item.strip()
                    if item and len(item) < 50:
                        skills.append(item)
        
        return list(set(skills))[:20]

    def _extract_experiences_from_section(self, section: str) -> list:
        """Extract experience from experience section"""
        if not section:
            return []
        
        experiences = []
        blocks = section.split("\n\n")
        
        for block in blocks:
            if block.strip():
                lines = [l.strip() for l in block.split("\n") if l.strip()]
                if len(lines) >= 1:
                    exp = {
                        "title": lines[0][:100] if lines else "",
                        "company": lines[1][:100] if len(lines) > 1 else "",
                        "location": "",
                        "startDate": "",
                        "endDate": "",
                        "description": " ".join(lines[2:]) if len(lines) > 2 else "",
                    }
                    experiences.append(exp)
        
        return experiences[:10]

    def _extract_projects_from_section(self, section: str) -> list:
        """Extract projects from projects section"""
        if not section:
            return []
        
        projects = []
        blocks = section.split("\n\n")
        
        for block in blocks:
            if block.strip():
                lines = [l.strip() for l in block.split("\n") if l.strip()]
                if len(lines) >= 1:
                    project = {
                        "name": lines[0][:100] if lines else "",
                        "tech": lines[1][:100] if len(lines) > 1 else "",
                        "description": " ".join(lines[2:]) if len(lines) > 2 else "",
                        "link": "",
                    }
                    projects.append(project)
        
        return projects[:10]

    def _extract_publications_from_section(self, section: str) -> list:
        """Extract publications from publications section"""
        if not section:
            return []
        
        publications = []
        blocks = section.split("\n\n")
        
        for block in blocks:
            if block.strip():
                lines = [l.strip() for l in block.split("\n") if l.strip()]
                if len(lines) >= 1:
                    pub = {
                        "title": lines[0][:100] if lines else "",
                        "publisher": lines[1][:100] if len(lines) > 1 else "",
                        "date": "",
                        "link": "",
                        "description": " ".join(lines[2:]) if len(lines) > 2 else "",
                    }
                    publications.append(pub)
        
        return publications[:10]

    def _extract_certifications_from_section(self, section: str) -> list:
        """Extract certifications from certifications section"""
        if not section:
            return []
        
        certifications = []
        lines = [l.strip() for l in section.split("\n") if l.strip()]
        
        for line in lines:
            if line:
                cert = {
                    "name": line[:100],
                    "issuer": "",
                    "issueDate": "",
                    "credentialId": "",
                    "link": "",
                }
                certifications.append(cert)
        
        return certifications[:10]

    def _extract_achievements_from_section(self, section: str) -> list:
        """Extract achievements from achievements section"""
        if not section:
            return []
        
        achievements = []
        lines = [l.strip() for l in section.split("\n") if l.strip()]
        
        for line in lines:
            if line:
                achievement = {
                    "title": line[:100],
                    "date": "",
                    "description": "",
                }
                achievements.append(achievement)
        
        return achievements[:10]

    def _fallback_extraction(self, text: str) -> dict:
        """Fallback extraction when AI is not available"""
        print("[DEBUG] Using fallback extraction (no AI)")
        
        lines = text.split("\n")
        skills = []
        experiences = []
        projects = []
        
        # Extract skills
        for i, line in enumerate(lines):
            lower_line = line.lower()
            if "skill" in lower_line or "expertise" in lower_line or "technical" in lower_line:
                # Look at next lines for skill content
                for j in range(i + 1, min(i + 5, len(lines))):
                    if lines[j].strip():
                        # Split by common separators
                        skill_items = [s.strip() for s in lines[j].replace(",", "|").split("|") if s.strip()]
                        skills.extend(skill_items[:10])
                        break
        
        # Extract experiences
        for i, line in enumerate(lines):
            lower_line = line.lower()
            if any(x in lower_line for x in ["experience", "employment", "work history", "positions"]):
                # Try to find job entries
                for j in range(i + 1, min(i + 20, len(lines))):
                    if lines[j].strip() and any(x in lines[j].lower() for x in ["title", "company", "at", "-"]):
                        exp = {
                            "title": lines[j][:50],
                            "company": "",
                            "location": "",
                            "startDate": "",
                            "endDate": "",
                            "description": "",
                        }
                        experiences.append(exp)
        
        # Extract projects (basic)
        for i, line in enumerate(lines):
            lower_line = line.lower()
            if "project" in lower_line:
                for j in range(i + 1, min(i + 10, len(lines))):
                    if lines[j].strip():
                        project = {
                            "name": lines[j][:50],
                            "tech": "",
                            "description": "",
                            "link": "",
                        }
                        projects.append(project)
                        break
        
        print(f"[DEBUG] Fallback extracted: {len(skills)} skills, {len(experiences)} experiences, {len(projects)} projects")
        
        return {
            "skills": list(set(skills))[:20] if skills else [],
            "experiences": experiences[:10] if experiences else [],
            "projects": projects[:5] if projects else [],
            "publications": [],
            "certifications": [],
            "achievements": [],
        }


profile_extraction_service = ProfileExtractionService()
