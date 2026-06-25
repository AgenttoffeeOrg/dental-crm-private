# 🦷 Dental CRM - Complete Practice Management System

**A modern, HubSpot-style CRM built specifically for dental practices**

---

## 🚀 **What This Is**

A full-featured dental practice management system with:
- 🎯 Multi-pipeline management (HubSpot-style interface)
- 👥 Patient/contact management
- 📊 Deal tracking and conversion
- ✅ Task management
- 📝 Intelligent lead capture forms
- 🔌 Integration hub (Facebook Ads, Google Ads, etc.)
- 📈 Analytics dashboard
- 🤖 AI-powered call analysis

---

## ⚙️ **Tech Stack**

- **Frontend:** Next.js 15.5.4 with Turbopack
- **UI:** React 19, Tailwind CSS 4, Radix UI
- **Backend:** Supabase (PostgreSQL)
- **AI:** OpenAI (Whisper + GPT-4)
- **Forms:** React Hook Form + Zod validation
- **Drag & Drop:** @dnd-kit

---

## 📋 **Prerequisites**

Before you start, you need:

1. **Node.js 20+** - [Download here](https://nodejs.org/)
2. **npm** (comes with Node.js)
3. **Supabase Account** - [Sign up free](https://supabase.com/)
4. **OpenAI API Key** (optional, for AI features) - [Get here](https://platform.openai.com/)

---

## 🛠️ **Setup Instructions**

### **Step 1: Clone the Repository**

```bash
git clone <YOUR_FRIEND_REPO_URL>
cd dental-crm
```

### **Step 2: Install Dependencies**

```bash
npm install
```

### **Step 3: Create Supabase Project**

1. Go to [supabase.com](https://supabase.com/)
2. Click "New Project"
3. Choose organization and name
4. Set a strong database password
5. Wait for project to be ready (~2 minutes)

### **Step 4: Get Your Supabase Credentials**

In your Supabase dashboard:

1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - **Keep secret!**

### **Step 5: Set Up Database Schema**

In Supabase dashboard:

1. Go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open each file in `supabase/sql/` folder (in order):
   - `01_initial_schema.sql`
   - `02_seed_data.sql`
   - `03_lead_management_enhancement.sql`
   - Continue through `14_add_pipeline_fields.sql`
4. Copy contents and execute each one

**Or use Supabase CLI:**
```bash
npm install -g supabase
supabase init
supabase db push
```

### **Step 6: Configure Environment Variables**

Create `.env.local` file:

```bash
cp env.example .env.local
```

Edit `.env.local` with your values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# OpenAI Configuration (optional - for AI features)
OPENAI_API_KEY=sk-...your-openai-key...

# Environment
NODE_ENV=development
```

**⚠️ IMPORTANT:** Never commit `.env.local` to git! It's already in `.gitignore`.

### **Step 7: Run the Application**

```bash
npm run dev
```

Open your browser to: **http://localhost:3001**

---

## 🎯 **First Time Usage**

### **1. Create Your First Pipeline**

1. Navigate to **Pipeline** in sidebar
2. Click pipeline dropdown (top left)
3. Select **"👥 General Practice"** from templates
4. Click "Create from Template"
5. Click "Create Pipeline"

### **2. Create a Contact**

1. Navigate to **Contacts**
2. Click "+ New Contact Profile"
3. Fill in details
4. Save

### **3. Create Your First Deal**

1. Go back to **Pipeline**
2. Click "+ New Deal"
3. Fill in:
   - Deal title
   - Select contact
   - Pipeline auto-selected
   - Add value
4. Click "Create Deal"

### **4. Explore Features**

- Try **Board view** 🎯 (drag & drop)
- Try **List view** 📋 (table format)
- Click **patient names** → See profiles
- Click **deals** → See details
- Create **tasks**, **forms**, check **analytics**

---

## 📚 **Documentation**

Comprehensive guides included:

- **COMPLETE_SYSTEM_SUMMARY.md** - Full feature overview
- **HOW_TO_USE_PIPELINES.md** - Pipeline user guide
- **PIPELINE_SYSTEM_GUIDE.md** - Technical documentation
- **VERSION_2_SNAPSHOT.md** - System architecture

---

## 🏥 **6 Pre-Configured Pipeline Templates**

The system comes with dental-specific pipelines:

1. **💎 High-Value Treatment** - For implants, reconstructions (£5k+)
2. **🚨 Emergency Treatment** - Fast-track urgent cases
3. **👥 General Practice** - Standard routine care (set as default)
4. **🦷 Orthodontics** - Braces, Invisalign, long-term
5. **✨ Cosmetic Dentistry** - Veneers, whitening, makeovers
6. **🤝 Referral Network** - Manage specialist referrals

---

## 🎨 **Key Features**

### **Pipeline Management (HubSpot-Style)**
- Switch between multiple pipelines
- Board view (Kanban) or List view (Table)
- Drag & drop deals between stages
- Create custom pipelines
- Edit stages inline

### **Patient/Contact Management**
- Comprehensive patient profiles
- Medical history, insurance, preferences
- All deals visible (across all pipelines)
- Activity timeline
- Quick actions (call, email, WhatsApp)

### **Deal Tracking**
- Clean creation form
- Duplicate prevention
- Inline editing
- Treatment tags
- Value tracking
- Stage transitions

### **Task Management**
- Auto-created from AI insights
- Filter by status, priority, due date
- Link to deals and contacts
- Bulk operations

### **Forms & Lead Capture**
- Intelligent form builder
- Automatic lead scoring
- Integration with ad platforms
- Auto-create contacts and deals

### **Integrations**
- Facebook Ads, Google Ads, Instagram
- WhatsApp Business
- Email & SMS marketing
- Calendly, scheduling tools
- And more...

### **Analytics**
- Pipeline performance
- Deal value tracking
- Task completion rates
- Stale deal detection

---

## 🔐 **Security Notes**

### **Keep Secret:**
- ❌ `.env.local` file - Never share!
- ❌ Supabase service_role key
- ❌ OpenAI API key
- ❌ Any production credentials

### **Safe to Share:**
- ✅ Code files (all in this repo)
- ✅ Documentation
- ✅ SQL migration files
- ✅ `env.example` (template only)

**The `.gitignore` protects your secrets automatically!**

---

## 🐛 **Troubleshooting**

### **Port 3000 already in use?**
```bash
npm run dev
# Will automatically use port 3001
```

### **Supabase connection errors?**
- Check your `.env.local` file
- Verify Supabase URL and keys
- Ensure database schema is set up

### **TypeScript errors?**
```bash
npm run lint
```

### **Need to reset?**
```bash
git reset --hard v2-hubspot-pipelines
```

---

## 📖 **Development Commands**

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Check setup
./setup-check.sh
```

---

## 🎯 **Project Structure**

```
dental-crm/
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # React components
│   │   ├── pipeline/     # Pipeline system
│   │   ├── deals/        # Deal management
│   │   ├── contacts/     # Contact management
│   │   ├── tasks/        # Task system
│   │   └── ui/           # Reusable UI components
│   ├── lib/              # Utilities & helpers
│   └── types/            # TypeScript types
├── supabase/
│   └── sql/              # Database migrations
├── public/               # Static assets
└── docs/                 # Documentation
```

---

## 🤝 **Contributing**

This is a private project. For your own modifications:

1. Create a branch: `git checkout -b feature-name`
2. Make changes
3. Test thoroughly
4. Commit: `git commit -m "Description"`
5. Push: `git push origin feature-name`

---

## 📞 **Support**

For questions or issues:
1. Check documentation in `/docs`
2. Review guides (COMPLETE_SYSTEM_SUMMARY.md, etc.)
3. Check Supabase logs
4. Review browser console for errors

---

## 🎉 **You're Ready!**

This is a complete, production-ready dental CRM system. Follow the setup steps above and you'll have it running in about 15 minutes!

**Features:**
- ✅ Modern HubSpot-style interface
- ✅ Complete patient management
- ✅ Multi-pipeline deal tracking
- ✅ AI-powered insights
- ✅ Comprehensive integrations
- ✅ Beautiful, responsive UI

**Happy coding! 🚀**

