# Rollout Playbook - Multi-Location & Billing System

Strategic playbook for rolling out multi-location and seat-based billing features to production.

---

## Executive Summary

**Objective:** Roll out enterprise-grade multi-location support and seat-based billing with zero downtime and zero impact on existing customers.

**Strategy:** Gradual, phased rollout with feature flags, starting with internal testing and expanding to 5%, 25%, 50%, and finally 100% of users.

**Timeline:** 6 weeks from migration to full activation

**Risk Level:** **LOW** ⚡ (Due to dual-path architecture and backward compatibility)

---

## Rollout Phases

### Phase 0: Internal Testing (Week 1)

**Objective:** Validate all features work correctly in production environment

#### Activities

1. **Deploy to Production** (Feature flags OFF)
   ```bash
   # All feature flags disabled initially
   NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=false
   NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=false
   NEXT_PUBLIC_ENABLE_MULTI_LOCATION=false
   ENABLE_SEAT_ENFORCEMENT=false
   ```

2. **Internal Team Testing**
   - Create test organization
   - Test all workflows end-to-end
   - Verify seat management
   - Test join requests
   - Verify location switching
   - Load test with 1000+ concurrent users

3. **Performance Baseline**
   ```sql
   -- Capture baseline metrics
   SELECT * FROM analyze_rls_performance('internal.user@company.com');
   
   -- Average query times
   SELECT 
     query,
     mean_exec_time,
     calls
   FROM pg_stat_statements
   WHERE query LIKE '%tenant_id%'
   ORDER BY mean_exec_time DESC;
   ```

#### Success Criteria

- ✅ All integration tests pass
- ✅ No performance regression
- ✅ Zero errors in logs
- ✅ Internal team approves

#### Go/No-Go Decision

**Go to Phase 1 if:**
- All tests pass
- Performance acceptable
- No critical bugs
- Team confidence high

---

### Phase 1: Foundation Features (Week 2)

**Objective:** Enable core features that benefit all users

#### Enable Features

```bash
# Enable domain discovery (prevents duplicates)
NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=true

# Enable join requests (better onboarding)
NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=true

# Enable seat enforcement (prepare for billing)
ENABLE_SEAT_ENFORCEMENT=true
```

#### Rollout to: **ALL USERS** (100%)

**Rationale:** These features improve the experience for everyone and don't require training.

#### Monitor

1. **Technical Metrics**
   - API response times
   - Error rates
   - Database query performance
   - RLS function execution time

2. **User Metrics**
   - Duplicate organization prevention rate
   - Join request creation rate
   - Seat limit hits (should be rare during trial)

3. **Alerts**
   ```
   - P0: API error rate > 1%
   - P0: Response time > 2s
   - P1: Join request approval time > 24h
   - P1: Seat limit blocks > 5/day
   ```

#### Success Criteria

- ✅ <0.1% error rate
- ✅ <500ms avg API response
- ✅ No customer complaints
- ✅ Join requests working smoothly

#### Rollback Triggers

- Error rate >1%
- Performance degradation >20%
- Multiple customer complaints
- Data integrity issues

---

### Phase 2: Email & Billing UI (Week 3)

**Objective:** Activate email notifications and billing visibility

#### Enable Features

```bash
# Configure email provider
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_actual_key_here

# Enable email sending
ENABLE_EMAIL_SENDING=true

# Enable billing UI
ENABLE_BILLING=true
```

#### Rollout to: **ALL USERS** (100%)

#### User Communication

**Email Template:**
```
Subject: Enhanced Team Management & Billing Features

Hi [Name],

We're excited to introduce new team management features:

✨ What's New:
- Email notifications for team invitations
- Clear visibility into your subscription and seat usage
- Streamlined team member onboarding

💡 What This Means:
- Team members now receive email invitations automatically
- You can see exactly how many seats you're using
- Easily upgrade when you need more team members

No action needed - everything is already set up!

Questions? Reply to this email or visit our help center.

Best regards,
The Dental CRM Team
```

#### Monitor

1. **Email Metrics**
   - Delivery rate (target: >99%)
   - Open rate (target: >40%)
   - Click-through rate (target: >20%)
   - Bounce rate (target: <2%)

2. **Billing UI Usage**
   - Views of billing page
   - Plan comparison interactions
   - Upgrade button clicks

#### Success Criteria

- ✅ Email delivery >99%
- ✅ No email complaints
- ✅ Billing UI accessible and functional
- ✅ Upgrade conversions tracked

---

### Phase 3: Multi-Location (Selective) (Week 4)

**Objective:** Enable multi-location for qualified organizations

#### Selection Criteria

Organizations eligible if:
- ✅ Has 2+ physical locations
- ✅ Active paid subscription
- ✅ Super Admin identified and trained
- ✅ Good account standing
- ✅ Opted-in to beta program

#### Enable Feature (Selective)

```bash
# Enable globally, but only specific orgs will use it
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=true
```

**Note:** Feature auto-hides for single-location users, so safe to enable globally.

#### Rollout Strategy

**Week 4:** 5 organizations (~1% of multi-location candidates)
**Week 5:** 25 organizations (~5% of multi-location candidates)
**Week 6:** All qualifying organizations (100%)

#### Onboarding Process

1. **Identify Candidate Organizations**
   ```sql
   -- Find orgs with multiple locations (same name pattern)
   SELECT name, COUNT(*) as location_count
   FROM tenants
   GROUP BY name
   HAVING COUNT(*) > 1
   ORDER BY location_count DESC;
   ```

2. **Personal Outreach**
   - Email Super Admin
   - Schedule 15-min demo call
   - Walk through multi-location setup
   - Answer questions

3. **Assisted Setup**
   - Create dental_group record
   - Link existing locations
   - Configure user access
   - Verify billing consolidation

4. **Follow-up**
   - Check in after 3 days
   - Address any issues
   - Gather feedback

#### Monitor

1. **Performance for Multi-Location Users**
   ```sql
   SELECT * FROM analyze_rls_performance('multi.location.user@example.com');
   -- Should show "Acceptable - Moderate overhead"
   ```

2. **User Satisfaction**
   - NPS score for multi-location users
   - Feature usage (location switching)
   - Support ticket volume

3. **Technical**
   - Query performance (multi-location path)
   - Location switcher usage
   - Access grant/revoke actions

#### Success Criteria

- ✅ <1s query time for multi-location users
- ✅ NPS >8 for multi-location feature
- ✅ <5% support ticket increase
- ✅ Positive user feedback

---

### Phase 4: Full Activation (Week 6)

**Objective:** Enable all features for all users, remove flags

#### Final Configuration

```bash
# All features enabled
NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=true
NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=true
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=true
ENABLE_SEAT_ENFORCEMENT=true
ENABLE_BILLING=true
ENABLE_EMAIL_SENDING=true

# Optional: Enable subdomain routing
NEXT_PUBLIC_ENABLE_SUBDOMAIN_ROUTING=false  # Keep false until DNS configured
```

#### Public Announcement

**Blog Post Title:** "Introducing Multi-Location Support for Growing Dental Groups"

**Social Media:**
- LinkedIn post highlighting enterprise features
- Twitter thread showing before/after
- Email newsletter feature spotlight

**PR Strategy:**
- Press release to dental industry publications
- Case study from beta user
- Product Hunt launch (optional)

#### Monitor

1. **Adoption Metrics**
   - % of eligible orgs using multi-location
   - Average locations per group
   - Seat utilization rate

2. **Business Metrics**
   - Upgrade rate (single to multi-location plans)
   - Average revenue per account (ARPA)
   - Customer lifetime value (LTV)

3. **Technical Health**
   - System stability
   - Performance consistency
   - Error rates remain low

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

If critical issue detected:

```bash
# 1. Disable all new features
NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=false
NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=false
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=false
ENABLE_SEAT_ENFORCEMENT=false
ENABLE_BILLING=false

# 2. Deploy immediately
vercel deploy --prod

# 3. Notify team
# Post in #incidents Slack channel
# Update status page
```

### Partial Rollback

Rollback specific feature:

```bash
# Example: Disable multi-location only
NEXT_PUBLIC_ENABLE_MULTI_LOCATION=false

# Keep other features active
NEXT_PUBLIC_ENABLE_DOMAIN_DISCOVERY=true
NEXT_PUBLIC_ENABLE_JOIN_REQUESTS=true
```

---

## Communication Plan

### Internal Communication

**Stakeholders:**
- Engineering team
- Product team
- Customer success
- Sales team
- Support team

**Channels:**
- Slack #product-updates
- Weekly engineering sync
- Customer success training session
- Sales enablement materials

### External Communication

**Timing:**
- **Pre-launch:** 1 week before (beta users)
- **Launch day:** Announcement email
- **Post-launch:** Follow-up at 1 week, 1 month

**Channels:**
- In-app notifications
- Email newsletters
- Blog posts
- Social media
- Help center updates

---

## Training Materials

### For Admins

1. **Video Tutorial** (5 minutes)
   - How to manage team seats
   - How to approve join requests
   - How to upgrade plans

2. **Help Center Articles**
   - "Understanding Seat-Based Billing"
   - "How to Manage Team Members"
   - "Multi-Location Setup Guide"

3. **Webinar** (30 minutes)
   - Live demo of features
   - Q&A session
   - Best practices

### For End Users

1. **Quick Start Guide** (1 page PDF)
   - How to join your organization
   - How to switch between locations
   - Who to contact for help

2. **In-App Tooltips**
   - Contextual help on first use
   - "Complete your profile" banner
   - "Try multi-location" prompt (for eligible users)

---

## Success Metrics

### Technical KPIs

| Metric | Target | Red Flag |
|--------|--------|----------|
| API Error Rate | <0.1% | >1% |
| Avg Response Time | <500ms | >2s |
| RLS Performance (single) | <10ms | >50ms |
| RLS Performance (multi) | <100ms | >500ms |
| Uptime | >99.9% | <99.5% |

### Product KPIs

| Metric | Target | Red Flag |
|--------|--------|----------|
| Multi-location adoption | >70% of eligible | <30% |
| Join request approval rate | >80% | <50% |
| Seat utilization | 60-80% | <40% or >95% |
| Upgrade conversion | >10% when hitting limit | <5% |
| NPS (multi-location) | >8 | <6 |

### Business KPIs

| Metric | Target | Red Flag |
|--------|--------|----------|
| ARPA increase | +20% | No change |
| Churn rate | <5% | >10% |
| Support tickets | ±10% | +50% |
| Time to onboard | <10 min | >30 min |

---

## Risk Mitigation

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Performance degradation | Low | High | Dual-path architecture, extensive testing |
| Data loss | Very Low | Critical | Database backups, transaction safety |
| User confusion | Medium | Low | Clear documentation, in-app guidance |
| Billing errors | Low | High | Atomic seat operations, extensive testing |
| Email delivery issues | Medium | Medium | Multiple provider support, fallback to console |

### Contingency Plans

**Scenario 1: Users Report Slow Performance**
- Action: Check if multi-location users affected
- Fix: Optimize queries, add indexes
- Timeline: 24 hours

**Scenario 2: Seat Limits Blocking Legitimate Users**
- Action: Temporarily increase limits
- Fix: Review and adjust plan limits
- Timeline: Immediate

**Scenario 3: Join Requests Not Working**
- Action: Disable feature, fallback to invitations
- Fix: Debug and redeploy
- Timeline: 4 hours

---

## Post-Rollout Review

### 1 Week Post-Launch

**Meeting:** Post-mortem/retrospective

**Agenda:**
1. What went well?
2. What could be improved?
3. Unexpected challenges?
4. User feedback summary
5. Action items

### 1 Month Post-Launch

**Report:** Rollout success analysis

**Include:**
- Adoption metrics
- Performance data
- User feedback
- Business impact
- Lessons learned
- Recommendations for future features

---

## Support Escalation

### L1 Support (Customer Success)
- Handle basic questions
- Guide users through setup
- Escalate technical issues

### L2 Support (Engineering On-Call)
- Debug technical issues
- Fix bugs
- Coordinate with team

### L3 Support (CTO/Lead Engineer)
- Critical production issues
- Architecture decisions
- Rollback decisions

**Contact:**
- Slack: #support-escalation
- PagerDuty: Multi-location on-call rotation
- Email: engineering@dentalcrm.com

---

## Conclusion

This rollout playbook ensures a smooth, controlled deployment of multi-location and billing features with minimal risk and maximum user satisfaction.

**Key Success Factors:**
1. ✅ Gradual, phased approach
2. ✅ Feature flags for control
3. ✅ Extensive monitoring
4. ✅ Clear communication
5. ✅ Quick rollback capability
6. ✅ Strong support infrastructure

**Next Steps:**
1. Review this playbook with team
2. Schedule internal testing week
3. Prepare communication materials
4. Set up monitoring dashboards
5. Begin Phase 0

---

**Questions?** Contact: product@dentalcrm.com

