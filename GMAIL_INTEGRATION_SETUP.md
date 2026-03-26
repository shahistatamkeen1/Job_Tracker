# Gmail Integration Setup Guide

## Overview
This integration automatically extracts job application emails from Gmail and populates your Job Tracker with company name, role, application date, and status.

## Setup Steps

### 1. Backend Configuration

#### Update `.env` file
Add the following environment variables to your `.env` file:

```env
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=696567052531-2usg9lllvdvk7kjhl0tb589ic7c5m3ia.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/gmail/callback
```

#### Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Search for "Gmail API" in the search bar
   - Click on "Gmail API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "Credentials" in the left sidebar
   - Click "Create Credentials" → "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:8000/api/auth/gmail/callback` (development)
     - Your production URL (when deploying)
   - Copy the Client ID and Client Secret
5. Update your `.env` file with these values

### 2. Install Dependencies

Run the following command in the backend directory:

```bash
pip install -r requirements.txt
```

New packages added:
- `google-auth-oauthlib==1.2.1` - OAuth 2.0 library for Google
- `google-auth-httplib2==0.2.0` - HTTP library for Google Auth
- `google-api-python-client==2.104.0` - Google API Python client
- `beautifulsoup4==4.12.3` - HTML parsing for email bodies

### 3. Features

#### Email Extraction
The system automatically:
- Filters emails by job-related keywords (job, position, application, interview, offer, etc.)
- Extracts from career emails (careers@, jobs@, recruitment@, noreply@)

#### Information Extraction
Extracts and auto-populates:
- **Company Name**: Parsed from sender domain or email content
- **Role/Position**: Extracted from subject line and body
- **Application Date**: From email timestamp
- **Status**: Automatically categorized as:
  - `applied` - Initial application confirmation
  - `interview` - Interview invitation or scheduling
  - `rejected` - Rejection notification
  - `offer` - Job offer received

#### Duplicate Prevention
The system prevents duplicate entries by checking for existing combinations of company + role from Gmail.

### 4. API Endpoints

#### Get Gmail Auth URL
```
GET /api/auth/gmail/login
```
Returns the OAuth authorization URL for Gmail login.

#### Gmail Callback
```
GET /api/auth/gmail/callback?code=authorization_code
```
Exchanges the authorization code for an access token.

#### Sync Gmail
```
POST /api/jobs/sync/gmail
```
Body:
```json
{
  "access_token": "google_access_token",
  "token_type": "Bearer"
}
```

### 5. Frontend Usage

#### Using the Gmail Sync Component

The `GmailSync` component is integrated into the JobTracker page:

```jsx
<GmailSync onSync={handleGmailSync} />
```

#### Flow:
1. User clicks "Connect Gmail" button
2. Gmail OAuth consent screen opens in a popup
3. User authorizes access to read emails
4. Access token is sent to backend
5. Backend fetches and processes job emails
6. New job applications are added to the database
7. UI updates with synced jobs

#### Callback Handler
The `GmailCallbackHandler` component handles the OAuth redirect and exchanges the code for an access token.

### 6. Configuration Settings

Update these in `app/config.py`:

```python
google_client_id: str = "your_client_id"
google_client_secret: str = "your_client_secret"
google_redirect_uri: str = "http://localhost:8000/api/auth/gmail/callback"
```

### 7. Database Schema

New fields added to job documents:
```json
{
  "company": "string",
  "role": "string",
  "status": "applied|interview|rejected|offer",
  "applied_on": "date",
  "job_description": "string",
  "notes": "string",
  "ai_rejection_reason": "string",
  "status_history": [
    {
      "status": "string",
      "note": "string",
      "at": "ISO timestamp"
    }
  ],
  "source": "gmail",
  "email_subject": "string",
  "email_from": "string",
  "created_at": "ISO timestamp",
  "updated_at": "ISO timestamp"
}
```

### 8. Troubleshooting

#### "Popup blocked" error
- Check browser popup settings
- Make sure popups are allowed for your localhost

#### "Invalid credentials" error
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- Check that Gmail API is enabled in Google Cloud Console
- Verify redirect URI matches exactly

#### No emails synced
- Check Gmail account has job-related emails
- Verify email subject contains job keywords
- Check backend logs for parsing errors

#### Duplicate entries
- Refresh the page to see latest status
- Existing company+role combinations are skipped

### 9. Security Notes

- Access tokens are not stored in the database
- Each sync operation uses a fresh token from the user
- Credentials are only used to read emails (readonly scope)
- No sensitive information is logged

### 10. Future Enhancements

Possible improvements:
- Scheduled syncing (sync emails periodically)
- Persistent token storage with refresh token handling
- Advanced filters (date range, sender filters)
- Email label organization
- Automatic salary extraction
- Link parsing for job posting URLs
- Machine learning for better status detection
