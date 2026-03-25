# AI Job Tracker (React + FastAPI + MongoDB Atlas)

A full-stack job application tracker with:

- Application CRUD and status pipeline (applied, interview, rejected, offer)
- Automatic AI rejection reason analysis when status changes to rejected
- AI chatbot for JD analysis, skill suggestions, and interview prep guidance
- ATS resume section with score, gaps, and improved resume draft

## Project Structure

- `backend/` FastAPI API + MongoDB Atlas integration + AI services
- `frontend/` React (Vite) UI

## 1. Backend Setup

1. Go to backend folder:
   - `cd backend`
2. Create virtual environment:
   - `python -m venv .venv`
   - `.venv\Scripts\activate`
3. Install dependencies:
   - `pip install -r requirements.txt`
4. Create env file:
   - copy `.env.example` to `.env`
5. Fill values in `.env`:
   - `MONGODB_URI` from your MongoDB Atlas cluster
   - `MONGODB_DB_NAME` default is `jobtracker`
   - `OPENAI_API_KEY` optional but recommended for full AI quality
   - `OPENAI_MODEL` default `gpt-4o-mini`
6. Run backend:
   - `uvicorn app.main:app --reload --port 8000`

Backend URL: `http://localhost:8000`

## 2. Frontend Setup

1. Open new terminal and go to frontend:
   - `cd frontend`
2. Install dependencies:
   - `npm install`
3. Create env file:
   - copy `.env.example` to `.env`
   - Add your Google Client ID (see Google OAuth setup below)
4. Run frontend:
   - `npm run dev`

Frontend URL: `http://localhost:5173`

## 3. Google OAuth Setup

To enable Google login:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the OAuth 2.0 API
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized JavaScript origins: `http://localhost:5173`
   - Authorized redirect URIs: `http://localhost:8000/api/auth/google`
5. Copy the Client ID
6. Add to your environment files:
   - Frontend: `VITE_GOOGLE_CLIENT_ID=your_client_id` in `.env`
   - Backend: `GOOGLE_CLIENT_ID=your_client_id` in `.env`

## API Endpoints

- `GET /api/jobs`
- `POST /api/jobs`
- `PUT /api/jobs/{job_id}`
- `PATCH /api/jobs/{job_id}/status`
- `DELETE /api/jobs/{job_id}`
- `POST /api/ai/chat`
- `POST /api/ai/analyze-rejection`
- `POST /api/ai/ats-resume`
- `POST /api/auth/google` (Google OAuth login)

## Notes

- If `OPENAI_API_KEY` is empty, the app still works with fallback AI responses.
- For production use, add authentication and encrypt sensitive user data.
