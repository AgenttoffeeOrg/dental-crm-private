# Sentry Setup Guide

This document describes the Sentry error monitoring setup for the Dental CRM application.

## Configuration Files

- `sentry.client.config.ts` - Client-side Sentry configuration
- `sentry.server.config.ts` - Server-side Sentry configuration
- `sentry.edge.config.ts` - Edge runtime Sentry configuration
- `.sentryclirc` - Sentry CLI configuration (for releases and source maps)
- `next.config.js` - Updated with Sentry webpack plugin

## Environment Variables

Add the following environment variables to your `.env.local` or deployment environment:

```bash
# Sentry DSN (Data Source Name) - Get this from your Sentry project settings
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here

# Optional: Sentry organization and project (for source maps upload)
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=your_project_slug

# Optional: Sentry auth token (for releases and source maps)
SENTRY_AUTH_TOKEN=your_auth_token_here

# Optional: Enable Sentry in development (default: disabled)
NEXT_PUBLIC_SENTRY_DEBUG=false
SENTRY_DEBUG=false
```

## Setup Steps

1. **Create a Sentry account** at https://sentry.io
2. **Create a new project** for Next.js
3. **Get your DSN** from the project settings
4. **Add the DSN to your environment variables** (see above)
5. **Optional: Configure Sentry CLI** for source maps upload:
   - Install Sentry CLI: `npm install -g @sentry/cli`
   - Login: `sentry-cli login`
   - Update `.sentryclirc` with your org and project names

## Features Enabled

- **Error Tracking**: Automatic capture of unhandled errors and exceptions
- **Performance Monitoring**: Transaction tracing (10% sample rate in production)
- **Session Replay**: User session recordings for debugging (10% sample rate in production)
- **Source Maps**: Upload source maps for better stack traces (requires Sentry CLI setup)
- **Environment Filtering**: Different behavior for development vs production
- **Error Filtering**: Filters out known non-critical errors (hydration errors, connection timeouts)

## Development vs Production

- **Development**:
  - Sentry is disabled by default (set `NEXT_PUBLIC_SENTRY_DEBUG=true` to enable)
  - 100% trace and replay sampling for testing
  - Debug mode enabled

- **Production**:
  - Sentry is enabled automatically
  - 10% trace and replay sampling
  - Source maps hidden from client bundles
  - Error filtering enabled

## Monitoring Route

Sentry uses a tunnel route at `/monitoring` to bypass ad-blockers. Make sure this route doesn't conflict with your Next.js middleware or API routes.

## Testing Sentry

To test Sentry integration:

1. Add `NEXT_PUBLIC_SENTRY_DEBUG=true` to your `.env.local`
2. Trigger a test error in your application
3. Check your Sentry dashboard for the error

## Troubleshooting

- **Errors not appearing**: Check that `NEXT_PUBLIC_SENTRY_DSN` is set correctly
- **Source maps not working**: Ensure Sentry CLI is configured and authenticated
- **Too many events**: Adjust `tracesSampleRate` and `replaysSessionSampleRate` in config files

## Documentation

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Session Replay](https://docs.sentry.io/platforms/javascript/session-replay/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
