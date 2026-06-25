# 📚 Dental CRM - Complete Documentation

## Table of Contents
1. [Getting Started](#getting-started)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Development](#development)
5. [Deployment](#deployment)
6. [Testing](#testing)
7. [Security](#security)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Supabase account

### Installation
```bash
npm install
cp .env.example .env.local
# Add your Supabase credentials
npm run dev
```

## Architecture

### Tech Stack
- **Frontend:** Next.js 15, React 19, TypeScript
- **UI:** Tailwind CSS 4, Radix UI, shadcn/ui
- **Backend:** Supabase (PostgreSQL)
- **State:** React hooks, Context API
- **Validation:** Zod
- **Testing:** Jest, React Testing Library

### Project Structure
```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   ├── ui/          # Reusable UI components
│   ├── forms/       # Form components
│   └── layouts/     # Layout components
├── lib/             # Utilities and helpers
│   ├── hooks/       # Custom React hooks
│   ├── schemas/     # Zod validation schemas
│   └── utils/       # Utility functions
└── types/           # TypeScript types
```

## Features

### Complete Settings System
- 23 configuration tabs
- User management
- Role-based access control
- Integration settings
- Branding customization

### CRM Core
- Contacts management
- Deal pipeline
- Task management
- Activity tracking
- AI assistant

### Marketing Module
- Campaign management
- Email/SMS/WhatsApp
- Audience segmentation
- Social media integration
- Analytics

### Analytics
- Executive dashboard
- CRM analytics
- Marketing analytics
- Cohort analysis
- Predictive insights

## Development

### Key Hooks
- `useTenant()` - Access current tenant
- `useCurrentUser()` - Access current user
- `useFormValidation()` - Form validation with Zod
- `useAutoSave()` - Auto-save functionality
- `useKeyboardShortcuts()` - Keyboard shortcuts

### Creating New Features
1. Create component in appropriate directory
2. Add Zod schema if forms involved
3. Add tests
4. Update documentation

## Deployment

### Supabase Setup
1. Create project
2. Run migrations in order
3. Set up environment variables
4. Configure authentication

### Vercel Deployment
```bash
vercel deploy --prod
```

## Testing

### Run Tests
```bash
npm test                 # Run all tests
npm test -- --watch     # Watch mode
npm test -- --coverage  # Coverage report
```

### Test Structure
- Unit tests for utilities
- Component tests for UI
- Integration tests for flows

## Security

### Best Practices
- Input sanitization
- XSS protection
- CSRF tokens
- Rate limiting
- SQL injection prevention

### Environment Variables
Never commit:
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- API keys

## Support
For issues, see GitHub issues or contact support.

## License
Proprietary - All rights reserved


