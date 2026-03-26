# Quick Start - Gmail Integration

## 5-Minute Setup

### Step 1: Get Google OAuth Credentials
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project → Enable Gmail API → Create OAuth credentials
3. Copy your `Client ID` and `Client Secret`

### Step 2: Update .env
```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/gmail/callback
```

### Step 3: Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Step 4: Run Application
```bash
# Terminal 1 - Backend
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Step 5: Use Gmail Sync
1. Open http://localhost:5173
2. Click "Connect Gmail" button
3. Authorize Gmail access
4. ✨ Job applications auto-fill!

## API Reference

### Sync Gmail
```
POST /api/jobs/sync/gmail
{
  "access_token": "google_token",
  "token_type": "Bearer"
}

Response:
{
  "synced": 5,
  "jobs": [...],
  "message": "Successfully synced 5 job applications from Gmail"
}
```

### Get Gmail Auth URL
```
GET /api/auth/gmail/login

Response:
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random_state"
}
```

## What Gets Extracted

| Field | Extracted From | Example |
|-------|---|---|
| Company | Email sender or subject | "Google", "Microsoft" |
| Role | Subject + body | "Senior Software Engineer" |
| Status | Email content keywords | applied, interview, offer, rejected |
| Date | Email timestamp | 2026-03-20 |
| Description | Email body preview | First 500 characters |

## Status Keywords

### ✅ Offer
- congratulations, offer, accepted, hired, welcome, start date

### 📞 Interview
- interview, phone screen, next round, schedule, meet, discuss

### ❌ Rejected
- rejected, unfortunately, declined, not selected, not a fit

### 📝 Applied
- received, application, submitted, thank you for

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Popup blocked | Allow popups in browser settings |
| No credentials | Download JSON from Google Cloud Console |
| 401 Error | Check CLIENT_ID and CLIENT_SECRET |
| No emails synced | Check Gmail has job-related emails |
| Duplicates | Browser cached - refresh page |

## Environment Variables Needed

```env
# Gmail OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/gmail/callback

# Existing
MONGODB_URI=xxx
OPENAI_API_KEY=xxx
FRONTEND_ORIGIN=http://localhost:5173
```

## Files Modified

**Backend:**
- `app/config.py` - Added Gmail settings
- `app/api/jobs.py` - Added sync endpoint
- `app/api/auth.py` - Added Gmail OAuth endpoints
- `requirements.txt` - Added Gmail dependencies
- `app/services/gmail_service.py` - NEW service

**Frontend:**
- `src/lib/api.js` - Added Gmail methods
- `src/components/JobTracker.jsx` - Integrated sync
- `src/components/GmailSync.jsx` - NEW component
- `src/styles.css` - Added sync styling

## Feature Highlights

🔐 **Secure OAuth 2.0** - No passwords stored
📧 **Auto-Extract** - Company, role, date, status
🚫 **No Duplicates** - Smart duplicate detection
⚡ **Fast Sync** - Process 50 emails at once
📊 **Status Detection** - AI categorization
🎯 **Keyword Filtering** - Job-related emails only

## Production Deployment

Before deploying:
1. Update `GOOGLE_REDIRECT_URI` to production URL
2. Add production domain to Google OAuth settings
3. Keep `GOOGLE_CLIENT_SECRET` secure (use secrets manager)
4. Test with actual Gmail account

## Need Help?

See full documentation:
- Setup Guide: `GMAIL_INTEGRATION_SETUP.md`
- Implementation Details: `IMPLEMENTATION_SUMMARY.md`
