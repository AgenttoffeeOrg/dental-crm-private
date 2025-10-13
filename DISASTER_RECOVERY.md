# Disaster Recovery Plan

## Backup Strategy

### Database Backups
- **Frequency:** Daily automated backups
- **Retention:** 30 days
- **Location:** Supabase automatic + manual S3
- **Testing:** Monthly restore tests

### Application Backups
- **Git repository:** GitHub (private)
- **Branches:** main (production), staging, dev
- **Tags:** Version checkpoints (v1, v2, etc.)

## Recovery Procedures

### Scenario 1: Database Corruption
1. Stop all writes
2. Identify corruption point
3. Restore from last good backup
4. Replay transaction logs
5. Verify data integrity
6. Resume operations

**RTO:** 2 hours  
**RPO:** <24 hours

### Scenario 2: Application Error
1. Rollback to previous deployment
2. Investigate error
3. Fix in staging
4. Test thoroughly
5. Redeploy

**RTO:** 30 minutes  
**RPO:** 0 (no data loss)

### Scenario 3: Complete Service Outage
1. Switch to backup region (if configured)
2. Restore database
3. Deploy application
4. Verify functionality
5. Update DNS

**RTO:** 4 hours  
**RPO:** <24 hours

## Prevention

### Monitoring
- Uptime monitoring (every 1 min)
- Error tracking (Sentry)
- Performance monitoring
- Automated alerts

### Health Checks
- Database connection
- API responsiveness
- Authentication service
- Third-party integrations

## Contact Information

**On-Call:** your-email@example.com  
**Supabase Support:** support@supabase.com  
**Hosting Provider:** Vercel support

## Backup Restoration

### Quick Restore Script
```bash
# Restore database
psql -h your-host -U postgres -d your-db < backup.sql

# Restore application
git reset --hard v6-before-transformation
npm install
npm run build
```

## Testing Recovery

**Schedule:** Quarterly
**Process:** 
1. Restore backup to test environment
2. Verify all features work
3. Document any issues
4. Update recovery procedures

## Post-Incident

1. Write incident report
2. Identify root cause
3. Implement fixes
4. Update monitoring
5. Train team
6. Update this document

