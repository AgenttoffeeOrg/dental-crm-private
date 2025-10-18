# Sentry Error Tracking & Monitoring

## Overview
This application uses Sentry for error tracking, performance monitoring, and session replay.

## Configuration Files

- `sentry.client.config.ts` - Client-side (browser) error tracking
- `sentry.server.config.ts` - Server-side (API routes, server components)
- `sentry.edge.config.ts` - Edge runtime (middleware)
- `.env.sentry-build-plugin` - Build-time configuration for source maps

## Environment Variables

### Required (in `.env.local` or `.env.sentry-build-plugin`)

```bash
NEXT_PUBLIC_SENTRY_DSN=https://9f500122e319dce965baba25e330cf07@o4510207888392192.ingest.de.sentry.io/4510207920701520
SENTRY_AUTH_TOKEN=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
SENTRY_ORG=agenttoffeeorg
SENTRY_PROJECT=dental-crm
```

### Optional

```bash
# Enable Sentry in development (default: disabled)
SENTRY_DEV=true
```

## Features Enabled

### 1. Error Tracking
- ✅ Client-side JavaScript errors
- ✅ Server-side API errors
- ✅ Unhandled promise rejections
- ✅ React component errors

### 2. Performance Monitoring
- ✅ Page load times
- ✅ API route response times
- ✅ Database query performance
- ✅ External API call tracking

### 3. Session Replay
- ✅ 10% of normal sessions recorded
- ✅ 100% of error sessions recorded
- ✅ Privacy: All text masked, all media blocked

### 4. Source Maps
- ✅ Automatically uploaded during build
- ✅ See TypeScript code in error traces
- ✅ Hidden from client bundles

## Viewing Errors

1. Go to: https://agenttoffeeorg.sentry.io/
2. Select project: `dental-crm`
3. View:
   - **Issues**: All errors grouped by type
   - **Performance**: Transaction traces
   - **Replays**: Session recordings

## Testing Sentry

### Test Client-Side Error

Add this to any page:

```tsx
<button onClick={() => {
  throw new Error('Test Sentry client error');
}}>
  Test Sentry
</button>
```

### Test Server-Side Error

Add this to any API route:

```ts
export async function GET() {
  throw new Error('Test Sentry server error');
}
```

### View in Sentry

Errors should appear in Sentry within ~30 seconds.

## Development vs Production

### Development
- Sentry is **disabled by default** in development
- To enable: Set `SENTRY_DEV=true` in `.env.local`
- Errors logged to console only

### Production
- Sentry is **automatically enabled**
- All errors sent to Sentry
- Source maps uploaded on build

## Ignored Errors

The following errors are automatically filtered out:

### Client-Side
- Browser extension errors
- Network failures (user's internet)
- Ad blocker interference

### Server-Side
- Connection timeouts (ETIMEDOUT)
- Connection refused (ECONNREFUSED)
- DNS failures (ENOTFOUND)

## Performance Budgets

Current settings:
- **Traces Sample Rate**: 100% (adjust to 10% in production)
- **Replays Session Sample Rate**: 10%
- **Replays Error Sample Rate**: 100%

## Cost Optimization

To reduce Sentry costs in production:

1. **Adjust trace sample rate** in `sentry.*.config.ts`:
   ```ts
   tracesSampleRate: 0.1, // 10% instead of 100%
   ```

2. **Reduce replay sample rate**:
   ```ts
   replaysSessionSampleRate: 0.01, // 1% instead of 10%
   ```

## Troubleshooting

### Source maps not uploading

1. Check `SENTRY_AUTH_TOKEN` is set
2. Check `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry project
3. Run: `npm run build` and check for Sentry upload logs

### Errors not appearing in Sentry

1. Check `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Check you're in production mode or `SENTRY_DEV=true`
3. Wait 30-60 seconds for errors to appear

### Too many errors

1. Check `ignoreErrors` in `sentry.*.config.ts`
2. Add common patterns to filter list
3. Use `beforeSend` hook to filter programmatically

## GitHub Actions Integration

Add these secrets to GitHub Actions:

```yaml
env:
  NEXT_PUBLIC_SENTRY_DSN: ${{ secrets.NEXT_PUBLIC_SENTRY_DSN }}
  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
  SENTRY_ORG: agenttoffeeorg
  SENTRY_PROJECT: dental-crm
```

## Additional Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Dashboard](https://agenttoffeeorg.sentry.io/)
- [Source Maps Guide](https://docs.sentry.io/platforms/javascript/sourcemaps/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

## Support

For issues with Sentry integration, contact:
- Sentry Support: https://sentry.io/support/
- Internal: #engineering on Slack

