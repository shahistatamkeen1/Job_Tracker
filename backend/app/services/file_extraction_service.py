from io import BytesIO
from pypdf import PdfReader
from docx import Document


class FileExtractionService:
    """Extract text from various file formats"""

    @staticmethod
    def extract_text_from_pdf(file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_reader = PdfReader(BytesIO(file_content))
            print(f"[DEBUG] PDF has {len(pdf_reader.pages)} pages")
            
            if len(pdf_reader.pages) == 0:
                raise ValueError("PDF has no pages")
            
            text = ""
            for page_num, page in enumerate(pdf_reader.pages):
                page_text = page.extract_text()
                print(f"[DEBUG] Page {page_num}: extracted {len(page_text)} characters")
                text += page_text + "\n"
            
            print(f"[DEBUG] Total PDF text extracted: {len(text)} characters")
            return text
        except Exception as e:
            print(f"[ERROR] PDF extraction failed: {str(e)}")
            raise ValueError(f"Error reading PDF: {str(e)}")

    @staticmethod
    def extract_text_from_docx(file_content: bytes) -> str:
        """Extract text from DOCX file"""
        try:
            doc = Document(BytesIO(file_content))
            text = ""
            for paragraph in doc.paragraphs:
                text += paragraph.text + "\n"
            # Also extract text from tables if present
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        text += cell.text + "\n"
            return text
        except Exception as e:
            raise ValueError(f"Error reading DOCX: {str(e)}")

    @staticmethod
    def extract_text_from_doc(file_content: bytes) -> str:
        """Extract text from DOC file (legacy Word format)"""
        try:
            # DOC files are essentially DOCX format when saved as modern format
            # Try treating as DOCX first
            return FileExtractionService.extract_text_from_docx(file_content)
        except Exception:
            # Fallback for older DOC format - would need python-docx[oxml] or odfpy
            raise ValueError("DOC format support requires additional setup. Please convert to DOCX or PDF.")

    @staticmethod
    def extract_from_file(filename: str, file_content: bytes) -> str:
        """Extract text based on file extension"""
        filename_lower = filename.lower()
        
        if filename_lower.endswith(".pdf"):
            return FileExtractionService.extract_text_from_pdf(file_content)
        elif filename_lower.endswith(".docx"):
            return FileExtractionService.extract_text_from_docx(file_content)
        elif filename_lower.endswith(".doc"):
            return FileExtractionService.extract_text_from_doc(file_content)
        else:
            raise ValueError(f"Unsupported file format: {filename}. Supported: PDF, DOCX, DOC")


file_extraction_service = FileExtractionService()
