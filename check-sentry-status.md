# How to Check Sentry Test Results

## 1. Sentry Dashboard

1. Go to **https://sentry.io**
2. Log in to your account
3. Select your project
4. Click **"Issues"** in the left sidebar
5. You should see errors like:
   - "Test client-side Sentry error!"
   - "Test server-side Sentry error from API route!"
   - "Test message from Sentry test page"

## 2. What to Look For

### In the Issues List:
- **Error Title**: Should show the error message
- **Count**: Number of times the error occurred
- **Users**: Number of users affected
- **Last Seen**: When it was last triggered
- **Environment**: Should show "development"

### In Error Details:
- **Stack Trace**: Shows where the error occurred
- **Breadcrumbs**: Shows user actions leading to the error
- **User Context**: Browser, OS, device info
- **Tags**: Environment, release info

## 3. Local Verification

### Check Browser Console:
- Open DevTools (F12)
- Go to Console tab
- Look for Sentry debug messages (if `NEXT_PUBLIC_SENTRY_DEBUG=true`)
- Should see messages like: `[Sentry] [Debug] Sending event...`

### Check Terminal:
- Look at your dev server terminal
- Should see Sentry initialization messages
- May see debug logs about events being sent

## 4. If You Don't See Events

### Common Issues:

1. **DSN Not Set**: Check `.env.local` has `NEXT_PUBLIC_SENTRY_DSN` with your actual DSN
2. **Server Not Restarted**: Restart `npm run dev` after adding DSN
3. **Wrong Project**: Make sure you're looking at the correct Sentry project
4. **Filtered Out**: Check Sentry filters aren't hiding development events
5. **Network Issue**: Check browser console for network errors

### Debug Steps:

1. Check `.env.local`:
   ```bash
   cat .env.local | grep SENTRY
   ```

2. Check browser console for errors

3. Check Sentry project settings:
   - Go to Settings → Projects → Your Project
   - Verify DSN matches what's in `.env.local`

4. Test with a simple error:
   - Open browser console
   - Run: `throw new Error("Manual test")`
   - Check Sentry dashboard

## 5. Verify Sentry is Working

### Quick Test:
1. Open browser console (F12)
2. Run this command:
   ```javascript
   Sentry.captureMessage("Manual test from console", "info");
   ```
3. Check Sentry dashboard immediately

### Expected Result:
- Event appears in Sentry within 5-10 seconds
- Shows up in Issues or can be found via search



