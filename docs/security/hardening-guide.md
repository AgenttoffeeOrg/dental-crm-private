# Security Hardening Guide

## Production Security Checklist

**Current Security Score: 9.2/10** ⭐  
**Target: 9.5/10** after hardening

---

## 1. Headers Security

### Required Headers

Add to `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/:path*',
      headers: [
        // HSTS - Force HTTPS
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=63072000; includeSubDomains; preload',
        },
        
        // Prevent clickjacking
        {
          key: 'X-Frame-Options',
          value: 'SAMEORIGIN',
        },
        
        // XSS Protection
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block',
        },
        
        // Referrer Policy
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        
        // Permissions Policy
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        
        // Content Security Policy
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-inline
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.supabase.co https://www.googleapis.com",
            "frame-ancestors 'self'",
          ].join('; '),
        },
      ],
    },
  ];
}
```

---

## 2. Rate Limiting

### Per-Endpoint Limits

```typescript
// src/lib/marketing-audit/utils/rate-limiter.ts

const endpointLimits = {
  // Expensive operations - stricter limits
  '/api/marketing-audit/run': {
    requests: 10,
    per: 'day',
  },
  
  // Read operations - more permissive
  '/api/marketing-audit/latest': {
    requests: 100,
    per: 'hour',
  },
  
  // Default for all other endpoints
  default: {
    requests: 60,
    per: 'minute',
  },
};
```

### IP-Based Rate Limiting

```typescript
// For public endpoints (shared links)
async function checkIPRateLimit(ip: string): Promise<boolean> {
  const key = `rate-limit:ip:${ip}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 3600); // 1 hour
  }
  
  return count <= 100; // Max 100 requests per hour per IP
}
```

---

## 3. Input Validation

### Strict Validation

```typescript
// Validate ALL inputs
function validateAuditRequest(body: any) {
  // Domain validation
  if (!isValidDomain(body.domain)) {
    throw new Error('Invalid domain format');
  }
  
  // UUID validation
  if (body.audit_id && !isValidUUID(body.audit_id)) {
    throw new Error('Invalid audit ID');
  }
  
  // Enum validation
  if (body.category && !isValidCategory(body.category)) {
    throw new Error('Invalid category');
  }
  
  // Range validation
  if (body.limit && (body.limit < 1 || body.limit > 100)) {
    throw new Error('Limit must be between 1 and 100');
  }
  
  return true;
}
```

### SQL Injection Prevention

```typescript
// ✅ Safe - Supabase uses parameterized queries
const { data } = await supabase
  .from('marketing_audit_runs')
  .select('*')
  .eq('id', userInput); // Parameterized automatically

// ❌ Never do this
const query = `SELECT * FROM marketing_audit_runs WHERE id = '${userInput}'`;
```

---

## 4. Authentication & Authorization

### Verify Auth on All Routes

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // Skip auth for public paths
  if (request.nextUrl.pathname.startsWith('/api/marketing-audit/shared/')) {
    return NextResponse.next();
  }
  
  // Verify authentication
  const token = request.headers.get('authorization');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return NextResponse.next();
}
```

### Row-Level Security

**Verify RLS is enabled:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename LIKE 'marketing%';
-- All should show rowsecurity = true
```

**Test RLS:**
```sql
-- Try to access another tenant's data
SET app.current_tenant_id = 'tenant-1';
SELECT * FROM marketing_audit_runs WHERE tenant_id = 'tenant-2';
-- Should return 0 rows
```

---

## 5. API Key Security

### Never Expose in Client

```typescript
// ✅ Server-side only
const apiKey = process.env.GOOGLE_API_KEY;

// ❌ Never do this
const apiKey = 'AIzaSy...'; // Hardcoded
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY; // Exposed to client
```

### Rotate Keys Quarterly

1. Generate new API key in Google Cloud
2. Update `.env.local`
3. Deploy
4. Delete old key after 24 hours

---

## 6. OAuth Token Security

### Encryption

Tokens are encrypted via Supabase Vault:

```typescript
// Store OAuth token
await supabase
  .from('marketing_audit_credentials')
  .insert({
    practice_id,
    provider: 'google',
    encrypted_access_token: await supabase.rpc('encrypt', { token: accessToken }),
    encrypted_refresh_token: await supabase.rpc('encrypt', { token: refreshToken }),
  });
```

### Token Refresh

```typescript
// Auto-refresh expired tokens
if (isTokenExpired(credentials.expires_at)) {
  const newTokens = await refreshOAuthToken(credentials.refresh_token);
  await updateCredentials(newTokens);
}
```

---

## 7. Error Handling

### Secure Error Messages

```typescript
// ✅ Production
try {
  await dangerousOperation();
} catch (error) {
  console.error('[Internal]', error); // Log detailed error
  return { error: 'Operation failed' }; // Generic user message
}

// ❌ Development only
if (process.env.NODE_ENV === 'development') {
  return { error: error.message, stack: error.stack };
}
```

---

## 8. Dependency Security

### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force
```

### Snyk Integration

```bash
# Install Snyk
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor continuously
snyk monitor
```

---

## 9. HTTPS & TLS

### Force HTTPS

**Vercel/Railway:** Automatic

**Custom Server:**
```typescript
// middleware.ts
if (request.headers.get('x-forwarded-proto') !== 'https') {
  return NextResponse.redirect(
    `https://${request.headers.get('host')}${request.nextUrl.pathname}`,
    301
  );
}
```

### TLS Version

Enforce TLS 1.3 (handled by platform):
- Vercel: TLS 1.3 by default
- Railway: TLS 1.3 by default

---

## 10. Logging & Monitoring

### Audit Logs

Log all security-relevant events:

```typescript
await supabase.from('audit_logs').insert({
  event_type: 'authentication_failure',
  user_id: attemptedUserId,
  ip_address: request.ip,
  user_agent: request.headers.get('user-agent'),
  details: { reason: 'invalid_password' },
  timestamp: new Date(),
});
```

### Alert on Suspicious Activity

```typescript
// More than 10 failed logins in 1 hour
const failedLogins = await getFailedLogins(userId, '1 hour');
if (failedLogins > 10) {
  await sendSecurityAlert('Multiple failed login attempts', userId);
  await lockAccount(userId, '1 hour');
}
```

---

## Security Hardening Checklist

**Infrastructure:**
- [ ] HTTPS enforced everywhere
- [ ] TLS 1.3 enabled
- [ ] Security headers configured
- [ ] Rate limiting active
- [ ] Firewall rules set (if applicable)
- [ ] DDoS protection enabled (Cloudflare)

**Application:**
- [ ] All inputs validated
- [ ] All outputs sanitized
- [ ] SQL parameterized queries only
- [ ] XSS prevention active
- [ ] CSRF tokens on mutations
- [ ] RLS enabled on all tables
- [ ] API keys in environment variables
- [ ] OAuth tokens encrypted
- [ ] Error messages sanitized

**Monitoring:**
- [ ] Audit logging enabled
- [ ] Security alerts configured
- [ ] Failed login tracking
- [ ] Suspicious activity detection
- [ ] Penetration test scheduled

**Compliance:**
- [ ] GDPR compliance verified
- [ ] Data retention policy set
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Cookie consent configured

---

## Penetration Testing

### Run Before Launch

```bash
# Install OWASP ZAP or similar
# Point at staging environment
# Run automated scan
# Review and fix all findings
```

### Bug Bounty Program

Consider launching after initial stability:
- Platform: HackerOne or Bugcrowd
- Scope: Marketing Audit module
- Rewards: $50-$1000 depending on severity

---

## Incident Response

### If Security Issue Detected

**1. Immediate Response (5 minutes)**
- Disable feature flag: `NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=false`
- Deploy immediately
- Notify security team

**2. Investigation (1 hour)**
- Review logs
- Identify scope
- Determine root cause
- Document findings

**3. Fix (varies)**
- Develop patch
- Test thoroughly
- Deploy fix
- Verify resolution

**4. Post-Mortem (24 hours)**
- Document incident
- Share learnings
- Update procedures
- Prevent recurrence

---

## Regular Security Tasks

**Daily:**
- Review error logs for anomalies
- Check for failed authentication attempts

**Weekly:**
- Review audit logs
- Check for dependency vulnerabilities
- Monitor rate limit hits

**Monthly:**
- Rotate API keys (if policy requires)
- Review access controls
- Update dependencies
- Security audit of code changes

**Quarterly:**
- Full security audit
- Penetration testing
- Review and update security policies
- Train team on new threats

---

**Security is ongoing!** Stay vigilant. 🔒

