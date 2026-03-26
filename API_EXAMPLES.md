# API Examples & Response Formats

## Email Extraction Examples

### Example 1: Offer Email

**Gmail Email:**
```
From: careers@google.com
Subject: Congratulations! We're excited to make you an offer

Dear Candidate,

Congratulations! We're thrilled to offer you the position of Senior Software Engineer at Google.

We would like to welcome you to our team and discuss the details of your offer.

Best regards,
Google Recruitment Team
```

**Extracted Data:**
```json
{
  "company": "Google",
  "role": "Senior Software Engineer",
  "status": "offer",
  "applied_on": "2026-03-20",
  "email_subject": "Congratulations! We're excited to make you an offer",
  "email_from": "careers@google.com",
  "email_body_preview": "Dear Candidate, Congratulations! We're thrilled to offer you...",
  "source": "gmail"
}
```

---

### Example 2: Interview Invitation

**Gmail Email:**
```
From: noreply@amazon.jobs
Subject: Your Amazon Interview - Next Steps

Hello,

Thank you for your interest in the Cloud Architect position at Amazon.

We would like to invite you to interview with our team next week.

Please let us know your availability for a phone screen.

Thank you,
Amazon Careers
```

**Extracted Data:**
```json
{
  "company": "Amazon",
  "role": "Cloud Architect",
  "status": "interview",
  "applied_on": "2026-03-19",
  "email_subject": "Your Amazon Interview - Next Steps",
  "email_from": "noreply@amazon.jobs",
  "email_body_preview": "Hello, Thank you for your interest in the Cloud Architect...",
  "source": "gmail"
}
```

---

### Example 3: Rejection Email

**Gmail Email:**
```
From: jobs@microsoft.com
Subject: Application Status Update

Hi there,

Thank you for applying to the Product Manager role at Microsoft.

Unfortunately, we've decided to move forward with other candidates...

Best of luck in your job search!

Microsoft Recruitment
```

**Extracted Data:**
```json
{
  "company": "Microsoft",
  "role": "Product Manager",
  "status": "rejected",
  "applied_on": "2026-03-15",
  "email_subject": "Application Status Update",
  "email_from": "jobs@microsoft.com",
  "email_body_preview": "Hi there, Thank you for applying to the Product Manager...",
  "source": "gmail"
}
```

---

### Example 4: Application Confirmation

**Gmail Email:**
```
From: recruitment@apple.com
Subject: Application Received - Data Scientist Position

Dear Applicant,

We have received your application for the Data Scientist position at Apple.

Thank you for your interest in joining our team.

We will review your profile and contact you soon.

Regards,
Apple Talent Team
```

**Extracted Data:**
```json
{
  "company": "Apple",
  "role": "Data Scientist",
  "status": "applied",
  "applied_on": "2026-03-18",
  "email_subject": "Application Received - Data Scientist Position",
  "email_from": "recruitment@apple.com",
  "email_body_preview": "Dear Applicant, We have received your application...",
  "source": "gmail"
}
```

---

## API Request/Response Examples

### 1. Get Gmail Auth URL

**Request:**
```http
GET /api/auth/gmail/login
```

**Response (200 OK):**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=696567052531-xxxx.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fauth%2Fgmail%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly&state=random_state_string&access_type=offline&prompt=consent",
  "state": "random_state_string"
}
```

---

### 2. Gmail Callback

**Request:**
```http
GET /api/auth/gmail/callback?code=4/0AX4XfWibN7j_xxxx_xxxx
```

**Response (200 OK):**
```json
{
  "access_token": "ya29.a0AfH6SMBxxx...",
  "token_type": "Bearer",
  "message": "Gmail authorization successful"
}
```

**Error Response (500):**
```json
{
  "detail": "Error handling Gmail callback: Invalid authorization code"
}
```

---

### 3. Sync Gmail Endpoint

**Request:**
```http
POST /api/jobs/sync/gmail
Content-Type: application/json

{
  "access_token": "ya29.a0AfH6SMBxxx...",
  "token_type": "Bearer"
}
```

**Success Response (200 OK) - 3 jobs synced:**
```json
{
  "synced": 3,
  "jobs": [
    {
      "id": "507f1f77bcf86cd799439011",
      "company": "Google",
      "role": "Senior Software Engineer",
      "job_description": "Congratulations! We're thrilled to offer you...",
      "status": "offer",
      "applied_on": "2026-03-20",
      "notes": "Imported from email: Congratulations! We're excited to make you an offer",
      "ai_rejection_reason": "",
      "status_history": [
        {
          "status": "offer",
          "note": "Imported from Gmail",
          "at": "2026-03-20T15:30:45.123456"
        }
      ],
      "source": "gmail",
      "email_subject": "Congratulations! We're excited to make you an offer",
      "email_from": "careers@google.com",
      "created_at": "2026-03-20T15:30:45.123456",
      "updated_at": "2026-03-20T15:30:45.123456"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "company": "Amazon",
      "role": "Cloud Architect",
      "job_description": "Hello, Thank you for your interest in the Cloud...",
      "status": "interview",
      "applied_on": "2026-03-19",
      "notes": "Imported from email: Your Amazon Interview - Next Steps",
      "ai_rejection_reason": "",
      "status_history": [
        {
          "status": "interview",
          "note": "Imported from Gmail",
          "at": "2026-03-20T15:30:45.234567"
        }
      ],
      "source": "gmail",
      "email_subject": "Your Amazon Interview - Next Steps",
      "email_from": "noreply@amazon.jobs",
      "created_at": "2026-03-20T15:30:45.234567",
      "updated_at": "2026-03-20T15:30:45.234567"
    },
    {
      "id": "507f1f77bcf86cd799439013",
      "company": "Microsoft",
      "role": "Product Manager",
      "job_description": "Hi there, Thank you for applying to the Product...",
      "status": "rejected",
      "applied_on": "2026-03-15",
      "notes": "Imported from email: Application Status Update",
      "ai_rejection_reason": "",
      "status_history": [
        {
          "status": "rejected",
          "note": "Imported from Gmail",
          "at": "2026-03-20T15:30:45.345678"
        }
      ],
      "source": "gmail",
      "email_subject": "Application Status Update",
      "email_from": "jobs@microsoft.com",
      "created_at": "2026-03-20T15:30:45.345678",
      "updated_at": "2026-03-20T15:30:45.345678"
    }
  ],
  "message": "Successfully synced 3 job applications from Gmail"
}
```

**No emails found (200 OK):**
```json
{
  "synced": 0,
  "jobs": [],
  "message": "No job emails found"
}
```

**Error Response (500):**
```json
{
  "detail": "Error syncing Gmail: Invalid access token"
}
```

---

### 4. List Jobs (with Gmail imports)

**Request:**
```http
GET /api/jobs
```

**Response (200 OK):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "company": "Google",
    "role": "Senior Software Engineer",
    "job_description": "Congratulations! We're thrilled to offer you...",
    "status": "offer",
    "applied_on": "2026-03-20",
    "notes": "Imported from email: Congratulations! We're excited...",
    "ai_rejection_reason": "",
    "status_history": [...],
    "source": "gmail",
    "email_subject": "Congratulations! We're excited to make you an offer",
    "email_from": "careers@google.com",
    "created_at": "2026-03-20T15:30:45.123456",
    "updated_at": "2026-03-20T15:30:45.123456"
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "company": "Tesla",
    "role": "Battery Engineer",
    "job_description": "You applied to Battery Engineer...",
    "status": "applied",
    "applied_on": "2026-03-20",
    "notes": "Manual entry",
    "ai_rejection_reason": "",
    "status_history": [...],
    "source": "manual",
    "created_at": "2026-03-19T10:15:30.000000",
    "updated_at": "2026-03-19T10:15:30.000000"
  }
]
```

---

## Data Structure Reference

### Job Document in MongoDB

```json
{
  "_id": "ObjectId",
  "company": "string (required)",
  "role": "string (required)",
  "job_description": "string (required, min 10 chars)",
  "status": "applied|interview|rejected|offer",
  "applied_on": "date (YYYY-MM-DD)",
  "notes": "string (optional)",
  "ai_rejection_reason": "string (optional)",
  "status_history": [
    {
      "status": "string",
      "note": "string",
      "at": "ISO 8601 timestamp"
    }
  ],
  "source": "gmail|manual",
  "email_subject": "string (Gmail only)",
  "email_from": "string (Gmail only)",
  "email_body_preview": "string (Gmail only, first 500 chars)",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp"
}
```

---

## HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Jobs synced, list retrieved |
| 401 | Invalid token | Bad Gmail access token |
| 404 | Not found | Job ID doesn't exist |
| 500 | Server error | Gmail API error, DB error |

---

## Error Handling Examples

### Invalid Token Error
```json
{
  "detail": "Error syncing Gmail: Invalid access token"
}
```

### Gmail API Error
```json
{
  "detail": "Error syncing Gmail: Gmail API returned 403 Forbidden"
}
```

### Missing Required Field
```json
{
  "detail": "Field required: company"
}
```

### Duplicate Handling (Silent)
```
If a job with same company + role + source exists:
- Email is skipped
- No error returned
- Job count reflects only new entries
```

---

## Frontend API Calls

### Example 1: Complete Gmail Sync Flow

```javascript
// 1. Get auth URL
const { auth_url } = await api.getGmailAuthUrl();

// 2. Open popup (handled by component)
window.open(auth_url, 'gmail-auth', ...);

// 3. User authorizes, popup posts message
window.addEventListener('message', (event) => {
  if (event.data.type === 'gmail-auth-success') {
    const accessToken = event.data.access_token;
    
    // 4. Sync Gmail
    const result = await api.syncGmail(accessToken);
    console.log(`Synced ${result.synced} jobs`);
  }
});
```

### Example 2: Handle Sync Results

```javascript
try {
  const response = await api.syncGmail(accessToken);
  
  setSuccess(`Successfully synced ${response.synced} job applications!`);
  
  // Process new jobs
  response.jobs.forEach(job => {
    console.log(`${job.company} - ${job.role}: ${job.status}`);
  });
  
  // Reload job list
  const allJobs = await api.listJobs();
  setJobs(allJobs);
  
} catch (error) {
  setError(`Sync failed: ${error.message}`);
}
```

---

## Testing Examples

### Test Case: Valid Gmail Sync

```bash
curl -X POST http://localhost:8000/api/jobs/sync/gmail \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "ya29.a0AfH6SMB...",
    "token_type": "Bearer"
  }'
```

Expected: 200 OK with job array

### Test Case: Invalid Token

```bash
curl -X POST http://localhost:8000/api/jobs/sync/gmail \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "invalid_token",
    "token_type": "Bearer"
  }'
```

Expected: 500 with error detail

---

## Common Response Patterns

### Success Pattern
```json
{
  "synced": <number>,
  "jobs": [<job>, ...],
  "message": "string describing result"
}
```

### Error Pattern
```json
{
  "detail": "string describing error"
}
```

### Resource Pattern
```json
{
  "id": "string",
  "company": "string",
  "role": "string",
  ...
}
```

This document provides comprehensive examples of API usage and responses for the Gmail integration feature.
