# Security Policy

## Overview

The Dental CRM Marketing Audit module follows enterprise-grade security practices to protect sensitive practice data and comply with healthcare data protection requirements.

## Security Features

### 1. Authentication & Authorization
- **OAuth 2.0 with PKCE**: Secure authorization for Google APIs
- **Row-Level Security (RLS)**: Database-level access control via Supabase
- **JWT Tokens**: Stateless authentication with automatic refresh
- **Multi-tenancy**: Complete data isolation between practices

### 2. Data Protection
- **Encryption at Rest**: All data encrypted in Supabase
- **Encryption in Transit**: TLS 1.3 for all connections
- **PII Minimization**: Only collect necessary data
- **Token Vault**: Secure storage of OAuth tokens with encryption
- **Credential Rotation**: Automatic rotation of API credentials

### 3. API Security
- **Rate Limiting**: Multi-strategy rate limiting (token bucket, sliding window)
- **Request Validation**: Zod schemas for all API inputs
- **CORS**: Strict origin validation
- **API Key Rotation**: Regular rotation of third-party API keys
- **Error Sanitization**: No sensitive data in error responses

### 4. Application Security
- **Content Security Policy**: Strict CSP headers
- **HSTS**: HTTP Strict Transport Security enabled
- **XSS Protection**: Context-aware output encoding
- **CSRF Protection**: Same-site cookies and CSRF tokens
- **Clickjacking Protection**: X-Frame-Options DENY
- **Dependency Scanning**: Regular security audits via npm audit

### 5. Infrastructure Security
- **Secure Headers**: Comprehensive security headers
- **Secret Management**: Environment variables, never hardcoded
- **Audit Logging**: All access logged with timestamps
- **Monitoring**: Real-time security event monitoring
- **DDoS Protection**: Railway.app/Vercel built-in protection

### 6. Compliance
- **GDPR**: Data export, deletion, consent management
- **HIPAA-Aware**: Designed for healthcare data sensitivity
- **SOC 2**: Infrastructure providers are SOC 2 certified
- **Data Retention**: Configurable retention policies

## Security Headers

All responses include:
```
Content-Security-Policy: [strict policy]
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: [restricted permissions]
```

## Rate Limits

### API Endpoints
- **Audit Run**: 10 requests per hour per tenant
- **Data Fetch**: 100 requests per 15 minutes per tenant
- **OAuth**: 10 requests per minute per IP
- **General API**: 1000 requests per hour per user

### Third-Party APIs
- **Google APIs**: Respect quota limits with automatic backoff
- **PageSpeed Insights**: 25 requests per day per domain
- **Search Console**: Batch requests with rate limiting

## Authentication Flow

1. User logs in via Supabase Auth (email/password or SSO)
2. JWT token issued with 1-hour expiration
3. Refresh token used for automatic renewal
4. OAuth tokens stored encrypted in database
5. All API requests validated via middleware

## Data Access

### Database (Supabase)
- Row-Level Security enforces tenant isolation
- All queries scoped to authenticated user's tenant
- Audit logs for all data access
- Automatic backups with point-in-time recovery

### Third-Party APIs
- OAuth tokens refreshed automatically
- Minimum required scopes requested
- Tokens revocable by user at any time
- No data stored in third-party services

## Vulnerability Reporting

### Reporting Process
1. **Email**: security@dentalcrm.com (create this email)
2. **Response Time**: Within 24 hours
3. **Resolution**: Critical issues patched within 7 days
4. **Disclosure**: Coordinated disclosure after fix deployed

### Severity Levels
- **Critical**: Remote code execution, authentication bypass
- **High**: Data exposure, privilege escalation
- **Medium**: XSS, CSRF, information disclosure
- **Low**: Configuration issues, minor vulnerabilities

### Bug Bounty
- Critical: $500-$2000
- High: $200-$500
- Medium: $50-$200
- Low: Recognition in hall of fame

## Incident Response

### Detection
- Automated monitoring for suspicious activity
- Real-time alerts for security events
- Regular security audits and penetration testing

### Response Plan
1. **Identify**: Alert triggered or vulnerability reported
2. **Contain**: Isolate affected systems
3. **Investigate**: Determine scope and impact
4. **Remediate**: Deploy fix and verify
5. **Notify**: Inform affected users if required
6. **Review**: Post-mortem and prevention measures

### Contact
- **Security Team**: security@dentalcrm.com
- **Emergency**: +1-XXX-XXX-XXXX (24/7 on-call)

## Security Checklist

### Development
- [ ] All dependencies up to date
- [ ] No hardcoded secrets
- [ ] Input validation on all endpoints
- [ ] Output encoding for XSS prevention
- [ ] SQL parameterization (handled by Supabase)
- [ ] Error messages don't leak sensitive info
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Rate limiting implemented
- [ ] Authentication required for protected routes

### Deployment
- [ ] Environment variables set correctly
- [ ] Database RLS policies active
- [ ] API keys rotated
- [ ] Monitoring configured
- [ ] Backup verified
- [ ] Security headers tested
- [ ] SSL certificate valid
- [ ] OAuth redirect URIs correct
- [ ] CORS origins configured
- [ ] Error tracking enabled

### Operations
- [ ] Regular security audits
- [ ] Dependency updates
- [ ] Log review
- [ ] Access review
- [ ] Penetration testing
- [ ] Incident response drills
- [ ] Security training
- [ ] Compliance audits

## Security Resources

### Tools Used
- **Supabase**: Authentication, database, RLS
- **Redis**: Rate limiting, session storage
- **Zod**: Input validation
- **Helmet**: Security headers (Next.js native)
- **npm audit**: Dependency scanning
- **Playwright**: Security testing
- **Lighthouse**: Security best practices

### Best Practices
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Controls](https://www.cisecurity.org/controls)

## Regular Security Tasks

### Daily
- Monitor security alerts
- Review access logs for anomalies
- Check error rates

### Weekly
- Review failed login attempts
- Audit API rate limit hits
- Check dependency vulnerabilities

### Monthly
- Rotate API keys
- Review user access
- Security training updates
- Penetration testing

### Quarterly
- Full security audit
- Compliance review
- Disaster recovery drill
- Third-party security assessment

## Version History

- **v1.0.0** (2025-01-16): Initial security policy
- Security policy will be updated with each major release

## Contact

For security inquiries:
- Email: security@dentalcrm.com
- Encrypted: PGP key available on request
- Emergency: 24/7 on-call team

---

**Last Updated**: January 16, 2025
**Next Review**: April 16, 2025

