   hello .oy 
 `python -m venv .venv`
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
4. Run frontend:
   - `npm run dev`

Frontend URL: `http://localhost:5173`

## API Endpoints

- `GET /api/jobs`
- `POST /api/jobs`
- `PUT /api/jobs/{job_id}`
- `PATCH /api/jobs/{job_id}/status`
- `DELETE /api/jobs/{job_id}`
- `POST /api/ai/chat`
- `POST /api/ai/analyze-rejection`
- `POST /api/ai/ats-resume`

## Notes







- ` is empty, the app still works with fallback AI responses.

hello 