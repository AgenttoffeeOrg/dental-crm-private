# 🦷 Dental CRM - Professional Practice Management System

**Version 2 - Stable & Production Ready**

A complete, HubSpot-style CRM built specifically for dental practices with multi-pipeline management, AI-powered insights, and comprehensive patient tracking.

---

## ⚡ **Quick Start**

```bash
npm install
cp env.example .env.local
# Add your Supabase credentials to .env.local
npm run dev
```

Open http://localhost:3001

---

## ✨ **Key Features**

### **🎯 HubSpot-Style Pipeline Management**
- Unified interface with instant pipeline switching
- 6 pre-configured dental templates
- Custom pipeline creation
- Board view (Kanban) + List view (Table)
- Drag & drop deal management

### **👥 Complete Patient Management**
- Comprehensive patient profiles
- Medical history & insurance tracking
- All deals visible across all pipelines
- Activity timeline
- AI-powered insights

### **📊 Deal Tracking**
- Clean creation form with duplicate prevention
- Inline editing
- Treatment tags
- Value tracking
- Stage transitions

### **✅ Smart Task Management**
- Auto-created from AI
- Filter by status, priority, date
- Linked to deals and contacts

### **📝 Intelligent Forms**
- Lead capture with automatic scoring
- Integration with ad platforms
- Auto-create contacts and deals

### **🔌 Integration Hub**
- Facebook Ads, Google Ads, Instagram
- WhatsApp Business
- Email & SMS marketing
- Calendly, scheduling tools

---

## 🏥 **6 Dental Pipeline Templates**

| Template | Icon | Use Case |
|----------|------|----------|
| High-Value Treatment | 💎 | Implants, full mouth work (£5k+) |
| Emergency Treatment | 🚨 | Urgent cases, same-day |
| General Practice | 👥 | Routine care, checkups |
| Orthodontics | 🦷 | Braces, Invisalign |
| Cosmetic Dentistry | ✨ | Veneers, whitening |
| Referral Network | 🤝 | Specialist referrals |

---

## 📚 **Documentation**

### **Getting Started:**
- **START_HERE_GITHUB_SETUP.md** - How to push to GitHub
- **COMPLETE_SYSTEM_SUMMARY.md** - Full feature overview
- **HOW_TO_USE_PIPELINES.md** - Pipeline user guide

### **Version Control:**
- **VERSION_2_SNAPSHOT.md** - Complete system snapshot
- **HOW_TO_RESTORE_VERSION_2.md** - Restore stable version
- **VERSION_2_SAVED.md** - Checkpoint information

### **Sharing:**
- **SHARE_WITH_FRIEND_GUIDE.md** - How to share safely
- **COMMANDS_TO_RUN.md** - Quick command reference

---

## 🛠️ **Setup**

### **1. Prerequisites**
- Node.js 20+
- npm
- Supabase account (free)
- OpenAI API key (optional, for AI features)

### **2. Installation**

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

### **3. Database Setup**

Run SQL migrations in Supabase:
1. Go to Supabase Dashboard → SQL Editor
2. Execute each file in `supabase/sql/` (in order):
   - `01_initial_schema.sql`
   - `02_seed_data.sql`
   - ... through `14_add_pipeline_fields.sql`

### **4. Run the App**

```bash
npm run dev
```

Open http://localhost:3001

---

## 🎯 **First Steps**

1. **Create a Pipeline** - Use "General Practice" template
2. **Add a Contact** - Create your first patient
3. **Create a Deal** - Add a treatment opportunity
4. **Explore Features** - Try Board/List views, click around

---

## 🔒 **Security**

- All secrets in `.env.local` (gitignored)
- Tenant-isolated data
- Row-level security ready
- No hardcoded credentials

---

## 🏗️ **Tech Stack**

- **Framework:** Next.js 15.5.4 (Turbopack)
- **UI:** Tailwind CSS 4, Radix UI
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **AI:** OpenAI (Whisper + GPT-4)
- **Forms:** React Hook Form + Zod
- **State:** React Hooks
- **Drag & Drop:** @dnd-kit

---

## 📊 **Project Statistics**

- **Files:** 174
- **Lines of Code:** 37,760+
- **Components:** 50+
- **Pages:** 8
- **API Routes:** 40+
- **Database Tables:** 12

---

## 🎨 **Features Highlights**

### **Multi-Pipeline System**
Switch between different treatment pipelines instantly:
- High-value treatments
- Emergency cases
- Routine care
- Specialty treatments

### **Patient-Centric Design**
Every deal, task, and activity links back to the patient:
- Click patient names anywhere
- See complete patient history
- Track across all pipelines

### **AI-Powered Insights**
Upload call recordings and get:
- Automatic transcription
- Sentiment analysis
- Lead scoring
- Follow-up task creation
- Treatment recommendations

### **Dual View Modes**
- **Board View:** Kanban-style drag & drop
- **List View:** Sortable table format

---

## 🚀 **Commands**

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Run production build
npm run lint         # Check code quality

# Database
./setup-check.sh     # Verify setup
```

---

## 📖 **Learn More**

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)

---

## 🤝 **Contributing**

This is a private project. For modifications:

1. Create a branch: `git checkout -b feature-name`
2. Make changes
3. Test thoroughly
4. Commit and push

---

## 🆘 **Troubleshooting**

**Port already in use?**
- App will auto-use port 3001

**Supabase errors?**
- Check `.env.local` credentials
- Verify database schema is set up

**Build errors?**
- Clear cache: `rm -rf .next`
- Reinstall: `rm -rf node_modules && npm install`

**Need to reset to stable version?**
```bash
git reset --hard v2-hubspot-pipelines
```

---

## 📦 **Version 2 (Current)**

**Status:** Stable, Production-Ready
**Tag:** `v2-hubspot-pipelines`
**Features:** All working, no errors, complete documentation

---

## 🎉 **What You Get**

- ✅ Complete dental practice CRM
- ✅ HubSpot-style interface
- ✅ Multi-pipeline management
- ✅ Patient tracking
- ✅ AI insights
- ✅ Beautiful, modern UI
- ✅ Mobile responsive
- ✅ Production ready

---

**Built with ❤️ for dental practices**

**Start now:** `npm run dev` → http://localhost:3001 🚀
