# DentalCRM - Dental Practice Management System

A modern, AI-powered CRM designed specifically for dental practices. Built with Next.js, Supabase, and TypeScript.

## Features

### Core CRM Functionality
- **Pipeline Management**: Visual Kanban board for managing deals through sales stages
- **Contact Management**: Comprehensive contact profiles with activity history
- **Task Management**: Task inbox with filtering, bulk actions, and priority management
- **Activity Timeline**: Track all interactions (calls, emails, notes, WhatsApp)

### AI-Powered Features
- **Call Analysis**: Upload audio recordings for automatic transcription and analysis
- **Smart Summaries**: AI-generated summaries of call content
- **Treatment Extraction**: Automatic identification of dental treatments mentioned
- **Task Generation**: Auto-create follow-up tasks based on call analysis

### Dental-Specific Features
- **Treatment Tags**: Pre-configured dental treatment categories
- **Pipeline Stages**: Dental practice-optimized sales stages
- **Value Tracking**: Deal value estimation in GBP
- **Source Tracking**: Track lead sources (website, referral, ads, etc.)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: OpenAI (Whisper for transcription, GPT for analysis)
- **Drag & Drop**: @dnd-kit
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: date-fns

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API account

### 1. Clone and Install
```bash
cd dental-crm
npm install
```

### 2. Environment Setup
Copy the environment template:
```bash
cp env.example .env.local
```

Fill in your environment variables:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEFAULT_TENANT_ID=550e8400-e29b-41d4-a716-446655440000
```

### 3. Database Setup

#### Option A: Using Supabase Dashboard
1. Create a new Supabase project
2. Go to SQL Editor in your Supabase dashboard
3. Run the migration files in order:
   - Copy and run `supabase/sql/01_initial_schema.sql`
   - Copy and run `supabase/sql/02_seed_data.sql`

#### Option B: Using Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
supabase init

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push
```

### 4. Storage Setup
Create storage buckets in your Supabase project:
1. Go to Storage in Supabase dashboard
2. Create bucket: `audio` (private)
3. Create bucket: `attachments` (private)

### 5. Authentication Setup
In Supabase dashboard:
1. Go to Authentication > Settings
2. Disable email confirmations for development
3. Add test user or use the demo credentials

### 6. Run Development Server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Demo Credentials
- **Email**: demo@dental.com
- **Password**: demo123

*(Note: You'll need to create this user in your Supabase auth or modify the seed data)*

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── login/             # Authentication page
│   ├── pipeline/          # Kanban board
│   ├── tasks/             # Task inbox
│   └── layout.tsx         # Root layout with auth provider
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components
│   ├── pipeline/          # Pipeline/Kanban components
│   └── tasks/             # Task management components
├── lib/
│   ├── supabase.ts        # Supabase client configuration
│   ├── auth.tsx           # Authentication provider
│   ├── storage.ts         # File storage service
│   ├── ai.ts              # AI/OpenAI integration
│   ├── events.ts          # Event system
│   ├── dates.ts           # Date utilities
│   └── utils.ts           # General utilities
├── types/
│   └── database.ts        # TypeScript type definitions
└── styles/
    └── globals.css        # Global styles
```

## Database Schema

### Core Tables
- `tenants` - Multi-tenant support
- `app_users` - Application users (linked to Supabase auth)
- `contacts` - Customer/patient contacts
- `pipelines` & `pipeline_stages` - Sales pipeline configuration
- `deals` - Sales opportunities
- `tasks` - Task management
- `activities` - Activity timeline (calls, emails, notes)
- `files` - File metadata
- `ai_artifacts` - AI analysis results
- `audits` - Audit trail

### Key Features
- Multi-tenant ready (single tenant for demo)
- Comprehensive indexing for performance
- Automatic timestamps with triggers
- Foreign key relationships for data integrity

## API Integration

### Supabase Edge Functions
The project includes a placeholder for AI processing:
- `processCallActivity` - Handles audio transcription and analysis

### OpenAI Integration
- **Whisper API**: Audio transcription
- **GPT-4**: Call analysis and summarization
- **Structured outputs**: Validated JSON responses

## Development

### Adding New Components
```bash
# Add shadcn/ui components
npx shadcn@latest add [component-name]
```

### Database Changes
1. Update schema in `supabase/sql/`
2. Update TypeScript types in `src/types/database.ts`
3. Run migrations in Supabase

### Event System
Use the built-in event system for loose coupling:
```typescript
import { events } from '@/lib/events'

// Emit events
await events.dealMoved({ dealId, fromStageId, toStageId })

// Listen to events
eventService.on('DEAL.MOVED', (data) => {
  console.log('Deal moved:', data)
})
```

## Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Environment Variables for Production
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
DEFAULT_TENANT_ID=your_tenant_id
```

## Future Enhancements

### Planned Features
- **Contact Detail Pages**: Comprehensive contact profiles
- **Deal Detail Pages**: Activity timeline and file management
- **Audio Upload & AI Processing**: Full AI workflow implementation
- **Settings Pages**: Pipeline, treatments, team management
- **Analytics Dashboard**: KPIs and reporting
- **Email Integration**: Two-way email sync
- **WhatsApp Integration**: Message handling
- **Telephony Webhooks**: Call tracking
- **PMS Integration**: CareStack and other practice management systems

### Architecture Considerations
- **Multi-tenancy**: Ready for multiple practices
- **Scalability**: Optimized queries and indexing
- **Security**: RLS policies for production
- **Extensibility**: Event-driven architecture for integrations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the GitHub issues
2. Review Supabase documentation
3. Check Next.js documentation
4. OpenAI API documentation

---

Built with ❤️ for dental practices seeking modern patient management solutions.