# Security Best Practices

## Environment Variables
Never commit to git:
- `.env.local`
- `.env.production`
- Any file containing keys

## Authentication
- Use Supabase Auth
- Enable 2FA in production
- Set strong password requirements
- Monitor failed login attempts

## Data Protection
- All data encrypted at rest (Supabase)
- HTTPS in production
- Session tokens expire
- Implement CSRF protection

## Access Control
- Role-based permissions
- Row-level security (RLS)
- API key rotation
- Audit logs enabled

## Input Validation
- Sanitize all user inputs
- Use Zod schemas
- Escape HTML
- Prevent SQL injection

## API Security
- Rate limiting enabled
- API key authentication
- Webhook signature verification
- CORS configured

## Database
- RLS policies enabled
- Service role used sparingly
- Regular backups
- Encrypted connections

## Monitoring
- Log all access attempts
- Track API usage
- Monitor for anomalies
- Set up alerts

## Compliance
- GDPR: Data export/deletion
- HIPAA: Encrypt PHI
- Audit trails
- Data retention policies

## Incident Response
1. Detect breach
2. Contain damage
3. Investigate
4. Notify users
5. Document learnings
6. Improve security

