# Gmail Integration - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           JobTracker Component                           │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │         GmailSync Component                        │  │   │
│  │  │  - Click "Connect Gmail" Button                   │  │   │
│  │  │  - Opens OAuth Popup                              │  │   │
│  │  │  - Handles Sync Response                          │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                        ↓                                   │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │      GmailCallbackHandler Component               │  │   │
│  │  │  - Receives OAuth Authorization Code             │  │   │
│  │  │  - Exchanges Code for Access Token               │  │   │
│  │  │  - Posts Token Back to Parent Window             │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                        ↓                                   │   │
│  │        api.syncGmail(accessToken)                         │   │
│  │                        ↓                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↓
                     HTTP POST Request
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  POST /api/jobs/sync/gmail                                       │
│  ├─ Receives accessToken                                         │
│  ├─ Creates Credentials object                                   │
│  │                                                               │
│  └─→ gmail_service.set_credentials()                             │
│      │                                                           │
│      └─→ gmail_service.get_job_emails()                          │
│          │                                                       │
│          ├─ Queries Gmail API with job keywords                  │
│          │  - Filters: job, position, interview, offer, etc    │
│          │  - Sender: careers@, jobs@, recruitment@            │
│          │                                                       │
│          ├─ For each email: extract_job_info()                   │
│          │  ├─ Parse headers (subject, sender, date)            │
│          │  ├─ Extract body text                                │
│          │  ├─ _extract_company()                               │
│          │  │  └─ Regex patterns + sender domain               │
│          │  ├─ _extract_role()                                  │
│          │  │  └─ Position/role patterns                       │
│          │  └─ _extract_status()                                │
│          │     └─ Keyword matching                              │
│          │                                                       │
│          └─ Return list of extracted job data                    │
│                                                                   │
│  Process Results:                                                 │
│  ├─ Check for duplicates (company + role)                        │
│  ├─ Skip existing entries                                        │
│  ├─ Create MongoDB documents                                     │
│  └─ Return created jobs + sync count                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                               ↓
                     MongoDB Database
                               ↓
            Job Collection with extracted data
```

## Component Interaction Flow

```
User Flow:
┌─────────────┐
│ User Opens  │
│ Job Tracker │
└──────┬──────┘
       ↓
┌────────────────────┐
│ Sees "Connect      │
│ Gmail" Button      │
└──────┬─────────────┘
       ↓
┌────────────────────┐
│ User Clicks Button │
└──────┬─────────────┘
       ↓
┌──────────────────────────────┐
│ GmailSync opens OAuth Popup  │
│ (window.open)                │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ User Sees Gmail Login Screen │
│ (Google OAuth Flow)          │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ User Authorizes Access       │
│ (Grants permission)          │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ Redirect to Callback Handler │
│ (?code=authorization_code)   │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ GmailCallbackHandler         │
│ Exchanges Code → Token       │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ postMessage(accessToken)     │
│ Sends to Parent Window       │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ GmailSync receives Token     │
│ Calls api.syncGmail()        │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ Backend: POST /jobs/sync/    │
│ gmail                        │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ GmailService fetches emails  │
│ Extracts job information     │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ Creates MongoDB entries      │
│ Skips duplicates             │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ Returns sync results         │
│ (count + job array)          │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ Frontend shows success msg   │
│ "Synced X jobs!"             │
└──────┬───────────────────────┘
       ↓
┌──────────────────────────────┐
│ Reloads job list             │
│ New jobs appear in table     │
└──────────────────────────────┘
```

## Data Extraction Pipeline

```
Gmail Email
    ↓
Parse Headers:
├─ Subject: "Congratulations on Your Offer!"
├─ From: "careers@google.com"
└─ Date: "2026-03-20T10:30:00Z"
    ↓
Extract Body:
├─ Parse HTML/Text
├─ Remove formatting
└─ Get clean text content
    ↓
Company Extraction:
├─ Try: Sender domain (google.com → Google)
├─ Try: Subject patterns ("from X", "at X")
├─ Try: Body patterns ("welcome at X", "join X")
└─ Default: "Unknown Company"
    ↓
Role Extraction:
├─ Search for: "Software Engineer", "Developer", etc
├─ Pattern: "[Title] position/role"
├─ Keywords: "software", "engineer", "analyst"
└─ Default: "Position"
    ↓
Status Extraction:
├─ Offer: "congratulations", "offer", "hired"
├─ Interview: "interview", "phone screen", "schedule"
├─ Rejected: "rejected", "unfortunately", "declined"
└─ Default: "applied"
    ↓
Create Document:
{
  company: "Google",
  role: "Senior Software Engineer",
  status: "offer",
  applied_on: "2026-03-20",
  email_subject: "Congratulations...",
  email_from: "careers@google.com",
  source: "gmail"
}
    ↓
Check Duplicates:
├─ Query: {company: "Google", role: "Senior...", source: "gmail"}
├─ If exists: Skip
└─ If not: Insert into MongoDB
```

## File Structure After Implementation

```
Job_Tracker/
├── backend/
│   ├── requirements.txt (UPDATED - Added Gmail deps)
│   ├── app/
│   │   ├── config.py (UPDATED - Gmail settings)
│   │   ├── main.py
│   │   ├── db.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py (UPDATED - Gmail OAuth endpoints)
│   │   │   ├── jobs.py (UPDATED - Gmail sync endpoint)
│   │   │   ├── ai.py
│   │   │   └── profile.py
│   │   ├── services/
│   │   │   ├── ai_service.py
│   │   │   ├── gmail_service.py (NEW - Gmail integration)
│   │   │   └── ...
│   │   └── schemas/
│   │       └── job.py
│   ├── .env (NEEDS UPDATE - Add Gmail settings)
│   └── .gitignore
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.js (UPDATED - Gmail API methods)
│   │   ├── components/
│   │   │   ├── JobTracker.jsx (UPDATED - Integrated sync)
│   │   │   ├── GmailSync.jsx (NEW - Sync UI)
│   │   │   ├── GmailCallbackHandler.jsx (NEW - OAuth callback)
│   │   │   └── ...
│   │   └── styles.css (UPDATED - Gmail styling)
│   ├── package.json
│   └── vite.config.js
│
├── GMAIL_INTEGRATION_SETUP.md (NEW - Complete setup guide)
├── IMPLEMENTATION_SUMMARY.md (NEW - What was built)
├── QUICK_START.md (NEW - Quick reference)
├── README.md (existing)
└── .env.example (suggested)
```

## OAuth 2.0 Flow Diagram

```
┌─────────┐                                      ┌──────────┐
│ Frontend│                                      │ Backend  │
└────┬────┘                                      └────┬─────┘
     │                                                │
     │  Click "Connect Gmail"                        │
     ├─────────────────────────────────────────────→│
     │    GET /api/auth/gmail/login                 │
     │                                               │
     │  ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
     │         {auth_url, state}                    │
     │                                               │
     │ Open OAuth Popup (auth_url)                   │
     ├───────────────────────┐                       │
     │    ┌──────────────┐   │                       │
     │    │ Google OAuth │   │                       │
     │    │   Consent    │   │                       │
     │    │   Screen     │   │                       │
     │    └──────────────┘   │                       │
     │          │ User grants access                 │
     │          ↓                                     │
     │    ┌──────────────────────┐                   │
     │    │ Redirect with ?code= │────────────────→ │
     │    │ authorization_code   │                   │
     │    └──────────────────────┘                   │
     │                                               │
     │  ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
     │     {access_token}                           │
     │     (from callback handler)                   │
     │                                               │
     │  POST /api/jobs/sync/gmail                    │
     ├─────────────────────────────────────────────→│
     │     {access_token, token_type}               │
     │                                               │
     │                    Gmail API Query            │
     │                         │                     │
     │              ┌──────────┴──────────┐          │
     │              ↓                     ↓          │
     │         Fetch Emails          Process Jobs   │
     │              │                     │         │
     │              └──────────┬──────────┘         │
     │                         ↓                     │
     │               Insert to MongoDB              │
     │                         │                     │
     │  ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┴ ─ ─ ─ ─ ─ ─ ─ ┤
     │       {synced, jobs, message}               │
     │                                               │
     │ Update UI with results                        │
     │                                               │
```

## Keyword Matching for Status Detection

```
Email Content Analysis:

┌─────────────────────────────────────┐
│   Email Subject & Body Content      │
└────────────┬────────────────────────┘
             ↓
    ┌────────────────────┐
    │ Contains:          │
    │ - "congratulations"│  → OFFER ✅
    │ - "offer"          │
    │ - "hired"          │
    │ - "welcome"        │
    │ - "start date"     │
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ Contains:          │
    │ - "interview"      │  → INTERVIEW 📞
    │ - "phone screen"   │
    │ - "next round"     │
    │ - "schedule"       │
    │ - "meet"           │
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ Contains:          │
    │ - "rejected"       │  → REJECTED ❌
    │ - "unfortunately"  │
    │ - "declined"       │
    │ - "not selected"   │
    │ - "not a fit"      │
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ Contains:          │
    │ - "received"       │  → APPLIED 📝
    │ - "application"    │
    │ - "submitted"      │
    │ - "thank you"      │
    └────────────────────┘
             ↓
    ┌────────────────────┐
    │ No keywords match  │  → APPLIED 📝
    │ (Default)          │  (Safe default)
    └────────────────────┘
```

## Environment Setup

```
Development Setup:
┌─────────────────────────────────────────┐
│ 1. Google Cloud Console                 │
│    - Create Project                     │
│    - Enable Gmail API                   │
│    - Create OAuth 2.0 Credentials       │
│    - Download Client ID & Secret        │
└─────────┬───────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│ 2. .env File Configuration              │
│    GOOGLE_CLIENT_ID=xxx                 │
│    GOOGLE_CLIENT_SECRET=yyy             │
│    GOOGLE_REDIRECT_URI=xxx              │
└─────────┬───────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│ 3. Install Dependencies                 │
│    pip install -r requirements.txt      │
└─────────┬───────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│ 4. Start Backend                        │
│    uvicorn app.main:app --reload        │
└─────────┬───────────────────────────────┘
          ↓
┌─────────────────────────────────────────┐
│ 5. Start Frontend                       │
│    npm run dev                          │
└─────────┬───────────────────────────────┘
          ↓
         Ready to use!
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layers                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Layer 1: OAuth 2.0 Authorization                            │
│ ├─ User grants permission                                   │
│ ├─ Secure redirect with authorization code                 │
│ └─ Code exchanged for token (backend only)                 │
│                                                              │
│ Layer 2: Gmail API Scope                                    │
│ ├─ Read-only access (readonly scope)                        │
│ ├─ Cannot send/delete emails                               │
│ └─ Limited to email retrieval                              │
│                                                              │
│ Layer 3: CORS Protection                                    │
│ ├─ Frontend CORS configured                                │
│ ├─ Only requests from localhost:5173 allowed              │
│ └─ Prevents cross-site requests                            │
│                                                              │
│ Layer 4: Token Management                                  │
│ ├─ Tokens NOT stored in database                           │
│ ├─ Fresh token for each sync operation                     │
│ ├─ User-provided tokens from OAuth                         │
│ └─ Short-lived access tokens                               │
│                                                              │
│ Layer 5: Data Privacy                                       │
│ ├─ Only extracted info stored (no email bodies)            │
│ ├─ Gmail timestamps used (not stored)                      │
│ ├─ Sensitive data not logged                               │
│ └─ MongoDB access controlled                               │
│                                                              │
│ Layer 6: Error Handling                                    │
│ ├─ No credential exposure in errors                        │
│ ├─ Generic error messages to frontend                      │
│ ├─ Full errors logged in backend only                      │
│ └─ Invalid tokens handled gracefully                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

This architecture ensures secure Gmail integration with your Job Tracker application!
