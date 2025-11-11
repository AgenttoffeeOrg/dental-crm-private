# App Verification Guide

## Overview

Some OAuth scopes require app verification by the provider (Google, Facebook, etc.). This guide walks you through the verification process.

## Google OAuth Verification

### Scopes Requiring Verification

- **Gmail** (`gmail.send`, `gmail.readonly`) - ✅ REQUIRES VERIFICATION
- **Google Ads** (`adwords`) - ✅ REQUIRES VERIFICATION
- **Google Calendar** (`calendar`, `calendar.events`) - ✅ REQUIRES VERIFICATION

### Scopes NOT Requiring Verification

- **Google Analytics** (`analytics.readonly`) - ✅ NO VERIFICATION NEEDED

### Verification Process

1. **Prepare Required Materials:**
   - Privacy Policy URL
   - Terms of Service URL
   - Video demo (3-5 minutes) showing how your app uses the scopes
   - OAuth consent screen configuration
   - Application description

2. **Submit for Verification:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Navigate to APIs & Services → OAuth consent screen
   - Click "Submit for Verification"
   - Fill out the form with all required information
   - Upload video demo
   - Submit

3. **Timeline:**
   - Initial review: 1-2 weeks
   - Additional questions: 1-2 weeks
   - Total: 2-6 weeks

### What Happens During Verification

- **Before Verification:** Sensitive scopes are blocked, but non-sensitive scopes (like Analytics) work immediately
- **After Verification:** All requested scopes work

### User Experience

- Users can still connect Google
- Analytics works immediately ✅
- Gmail/Ads/Calendar show "Pending Verification" status ⏳
- Once verified, all services automatically activate ✅

## Facebook OAuth Verification

### Verification Requirements

- App Review required for:
  - `pages_manage_posts`
  - `ads_management`
  - `instagram_basic`
  - `instagram_manage_messages`

### Process

1. Complete App Review in Facebook Developer Console
2. Provide use case explanation
3. Submit test credentials
4. Wait for approval (1-2 weeks)

## Microsoft OAuth Verification

### Verification Requirements

- Most Microsoft scopes require admin consent for organization accounts
- Personal accounts work without verification
- Admin consent required for:
  - `Mail.Send`
  - `Calendars.ReadWrite`
  - `Files.ReadWrite`

### Process

1. Register app in Azure Portal
2. Configure API permissions
3. Request admin consent (for org accounts)
4. Personal accounts work immediately

## Best Practices

1. **Request Only What You Need:** Don't request scopes you won't use
2. **Clear Use Cases:** Explain exactly why you need each scope
3. **Video Demo:** Show real usage, not just screenshots
4. **Privacy Policy:** Must be publicly accessible
5. **Terms of Service:** Must be publicly accessible

## Status Tracking

The integration system automatically tracks verification status:
- Shows "Pending Verification" for services waiting on approval
- Automatically activates services once verified
- Users see clear status messages

## Support

If verification is rejected:
1. Review feedback from provider
2. Address concerns
3. Resubmit with improvements
4. Contact support if needed

