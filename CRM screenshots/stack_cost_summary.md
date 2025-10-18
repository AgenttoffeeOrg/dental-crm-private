# Tech Stack & Cost Summary

**Generated:** 2025-10-18T21:57:59.053Z

## Technology Stack

### By Category

#### AI

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| OpenAI Whisper API | Audio transcription (call recordings) | $0.006/min | 100 calls/mo @ 5min = $3 |
| OpenAI GPT-4o Mini | Call analysis, categorization | $0.15/$0.60 per 1M tokens | ~$5-10/mo moderate usage |
| OpenAI GPT-4 Turbo | AI assistant, email drafting | $10/$30 per 1M tokens | ~$15-25/mo moderate usage |

#### Communications

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| Resend (Email) | Transactional emails (welcome, invites) | Free-$20/mo | Free: 3k/mo, Paid: 50k emails |
| Twilio SMS | SMS messaging | $0.0079/msg + $1-15/mo number | 500 msgs/mo = ~$5 |
| Twilio WhatsApp | WhatsApp Business messaging | $0.005-0.09/msg | 50 msgs/mo = ~$3 |
| Twilio Voice | Phone calls with recording | $0.013/min outbound | 100 min/mo = ~$1.30 |

#### DevOps

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| GitHub Actions | CI/CD pipelines | Free | 2,000 minutes/month |
| Railway Auto-Deploy | Automatic deployments from Git | Included | Part of Railway hosting |

#### Front-end

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| Next.js 15.5.4 | Full-stack React framework, SSR/SSG | Free | MIT license |
| React 19.1.0 | UI library | Free | MIT license |
| TypeScript ^5 | Type safety | Free | Apache 2.0 |
| Tailwind CSS 4.0 | Utility-first CSS framework | Free | MIT license |
| Radix UI (16 components) | Accessible UI primitives | Free | MIT license |

#### Infrastructure

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| Railway.app (Hosting) | Application hosting, containers, cron jobs | $5-20/mo | Scales with usage |
| Supabase PostgreSQL 15 | Primary database, auth, storage, realtime | Free-$25/mo | Free: 500MB, Pro: $25/mo for 8GB |
| Redis/Upstash | Caching, rate limiting, session storage | Free-$10/mo | Free tier: 10k commands/day |
| Domain + SSL | Custom domain, HTTPS certificate | $10/year | SSL via Let's Encrypt (free) |

#### Integrations

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| PMS Webhook Adapters | Dentrix, Open Dental, Eaglesoft, etc. | Free | Uses existing PMS APIs |

#### Marketing

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| Google APIs (My Business, Analytics) | Marketing audit, business listings | Free | Quota limits apply |
| BrightLocal API (Optional) | Local SEO audits | $49-299/mo | Optional feature |
| SEMrush API (Optional) | SEO analytics, keyword research | $119.95+/mo | Optional feature |
| reCAPTCHA v3 | Form spam protection | Free | Google service |

#### Monitoring

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| Sentry | Error tracking, performance monitoring | Free-$26/mo | Free: 5k events, Team: 50k events |
| UptimeRobot | Uptime monitoring, status page | Free | 50 monitors, 5-min intervals |
| Pino Logger | Structured logging | Free | MIT license |

#### Payments

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| Stripe | Subscription billing, payments | 2.9% + $0.30/transaction | No fixed monthly fee |

#### Testing

| Component | Purpose | Cost (est.) | Notes |
|-----------|---------|-------------|-------|
| Jest + Testing Library | Unit & integration testing | Free | MIT license |
| Playwright | End-to-end browser testing | Free | Apache 2.0 |
| Lighthouse CI | Performance auditing | Free | Apache 2.0 |

## Monthly Cost Estimates

### MVP (Free Tier): $16/month

- **Railway Starter:** $5
- **Supabase Free:** $0
- **OpenAI Light Usage:** $10
- **Domain:** $1

### Production (Recommended): $132/month

- **Railway Pro:** $20
- **Supabase Pro:** $25
- **Resend:** $20
- **OpenAI Moderate:** $25
- **Redis/Upstash:** $5
- **Twilio (SMS+Voice+WhatsApp):** $10
- **Sentry Team:** $26
- **Domain:** $1

### Enterprise (Full Features): $630/month

- **Railway Pro:** $20
- **Supabase Team:** $100
- **Resend/SendGrid:** $90
- **OpenAI Heavy:** $100
- **Redis Pro:** $20
- **Twilio (High Volume):** $50
- **BrightLocal:** $49
- **SEMrush:** $120
- **Sentry Business:** $80
- **Domain:** $1

## Per-User Cost (Production Tier)

Assuming 100 active users:
- **Fixed costs:** $132/month
- **Variable costs:** ~$50/month (AI, SMS, email overages)
- **Total:** $182/month
- **Per user:** $1.82/month

## Scaling Considerations

| Users | Tier | Estimated Cost |
|-------|------|----------------|
| 0-100 | MVP | $16/mo |
| 100-500 | Production | $132/mo |
| 500-2000 | Production+ | $200-300/mo |
| 2000-10k | Enterprise | $630+/mo |
| 10k+ | Custom | $1000+/mo |

## License Compliance

All core dependencies use commercial-friendly licenses:
- MIT License (majority)
- Apache 2.0
- BSD-3-Clause

✅ No GPL dependencies (no viral licensing)
✅ Safe for commercial SaaS deployment
✅ No vendor lock-in on core stack
