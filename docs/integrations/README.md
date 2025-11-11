# Integration System Documentation

## Overview

The integration system provides unified OAuth connections per provider. Connect once per provider to access all their services.

## Architecture

### Unified OAuth Per Provider

- **Google:** One connection = Gmail + Analytics + Ads + Calendar
- **Facebook:** One connection = Pages + Ads + Instagram
- **Microsoft:** One connection = Outlook + OneDrive + Calendar

### How It Works

1. User clicks "Connect Google"
2. System requests ALL Google scopes at once
3. User approves ONCE
4. System checks which scopes were granted
5. All services with granted scopes are automatically activated

## User Experience

### Connecting a Provider

1. Navigate to Settings → Integrations
2. Find provider card (Google, Facebook, Microsoft)
3. Click "Connect [Provider]"
4. Approve permissions on provider's site
5. Return to CRM - all services connected!

### Service Status

- **Connected:** ✅ Service is active and ready to use
- **Pending Verification:** ⏳ Waiting for app verification (2-6 weeks)
- **Needs Permission:** ⚠️ Missing some permissions - click "Enable"
- **Available:** ⚪ Not connected yet

## Technical Details

### Database Schema

- `integration_connections` - Stores OAuth tokens and connection status
- One row per service type
- Scopes stored in `scopes` array column
- Credentials encrypted in `integration_secret_vault`

### API Endpoints

- `POST /api/integrations/[type]/oauth/initiate` - Start OAuth flow
- `GET /api/integrations/[type]/oauth/callback` - Handle OAuth callback
- `GET /api/integrations/[type]/status` - Get service status
- `POST /api/integrations/[type]/connect` - Connect with API keys
- `POST /api/integrations/[type]/disconnect` - Disconnect integration
- `POST /api/integrations/migrate` - Migrate existing connections
- `GET /api/integrations/test` - Test integration system

### Scope Management

- Scopes requested: All scopes for provider in one OAuth flow
- Scopes granted: Checked from token response
- Service activation: Based on granted scopes
- Missing scopes: Incremental authorization available

## App Verification

Some scopes require app verification:
- Google: Gmail, Ads, Calendar (2-6 weeks)
- Facebook: Pages, Ads, Instagram (1-2 weeks)
- Microsoft: Admin consent for org accounts

See [App Verification Guide](./app-verification-guide.md) for details.

## Migration

Existing individual service connections can be migrated to unified OAuth:

```bash
POST /api/integrations/migrate
```

This will:
1. Group connections by provider
2. Find connection with most scopes
3. Create connections for all services in group
4. Share scopes across services

## Testing

Test the integration system:

```bash
GET /api/integrations/test
```

Returns:
- Table existence check
- Connection loading test
- Unified scopes test
- Service status test

## Error Handling

All errors are handled gracefully with user-friendly messages:
- Missing tables → Clear admin message
- Auth failures → Sign in prompt
- OAuth cancelled → Can retry
- Missing scopes → Enable button shown
- Network errors → Retry option

## Security

- OAuth tokens encrypted at rest
- Per-tenant isolation (RLS)
- PKCE for OAuth security
- Secure token storage
- Automatic token refresh

## Support

For issues or questions:
1. Check error messages in UI
2. Review status badges
3. Check verification status
4. Contact support if needed

