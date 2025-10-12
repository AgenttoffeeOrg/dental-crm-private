# ⚙️ SETTINGS - WHAT EVERYTHING DOES!

**All Fixed & Simplified!**

---

## 📱 **6 SIMPLE TABS:**

### **1. 👤 My Profile**
**What it does:** Edit YOUR personal information
- Your name
- Your email  
- Your photo (placeholder)
- Your timezone

**Who sees it:** Only YOU

---

### **2. 👥 Team**
**What it does:** Invite and manage team members
- Invite new users by email
- See list of current team members
- View their roles and basic stats
- Edit team member details (when clicked)

**Who needs it:** Practice owners, managers

---

### **3. 🛡️ Roles**
**What it does:** Create custom roles for your team
- Examples: "Treatment Coordinator", "Receptionist", "Senior Dentist"
- Each role can have custom:
  - Name
  - Icon (emoji)
  - Color
  - Description
  - Admin status
- Edit or delete roles

**Who needs it:** Practice owners setting up multi-user access

**Note:** Permission editing will be available after running database migrations

---

### **4. 🔄 Pipeline Settings**
**What it does:** Customize how YOU view pipelines
- Default view (Board vs List)
- Default pipeline to open
- Card density (Comfortable, Compact, Spacious)
- Default sort order
- Which fields to show on deal cards

**This is YOUR personal display preferences!**

**Examples:**
- "I want to always see Board view"
- "I want compact cards to see more deals"
- "I want to always open High-Value Treatment pipeline"

---

### **5. 💼 Deal Settings**
**What it does:** Set GLOBAL rules for ALL deals in your practice
- Required fields (what info is mandatory)
- Custom fields (add your own fields)
- Field visibility (hide/show based on role)
- Value thresholds (min/max deal amounts)
- Duplicate detection rules
- Auto-archiving rules
- Assignment methods

**This affects EVERYONE in your practice!**

**Examples:**
- "All deals must have a contact"
- "Deal values must be between £100-£50,000"
- "Detect duplicates based on email + name"

---

### **6. 🤖 Smart AI**
**What it does:** Configure automatic deal categorization
- Define high-value treatments (e.g., "Implants", "Invisalign")
- Set keywords to watch for
- Set minimum values for categories
- Choose which pipeline deals go to

**How it works:**
1. You define: "Dental Implants = High-Value if > £3,000"
2. AI analyzes call recordings, notes, emails
3. If it detects "implants" mentioned + deal > £3,000
4. → Automatically moves deal to "High-Value Treatment" pipeline

**Super powerful for automatic organization!**

---

## ❌ **WHAT'S NOT HERE (AND WHY):**

### **Activity Feed**
- Not shown yet (requires database migration)
- Will show: "Who did what, when"
- Example: "Sarah moved Deal X to Stage Y"

### **Analytics**
- Not shown yet (requires database migration)
- Will show: Team performance metrics
- Example: "John closed 12 deals this month"

### **Audit Log**
- Not shown yet (requires database migration)
- Admin-only security logs
- Example: "User changed deal value from £1,000 to £5,000"

### **User Profiles**
- Removed (was confusing/duplicate concept)
- Just use "My Profile" for your own info

### **Permissions Button**
- Removed temporarily until migrations are run
- Will come back after you run the SQL migrations
- Then you'll be able to set 60+ detailed permissions per role!

---

## 🎯 **QUICK GUIDE:**

### **"I want to customize how I see deals"**
→ Go to **🔄 Pipeline Settings**

### **"I want to set rules for all deals"**
→ Go to **💼 Deal Settings**

### **"I want to add a new team member"**
→ Go to **👥 Team** → Invite Team Member

### **"I want to create a role like 'Receptionist'"**
→ Go to **🛡️ Roles** → Create Role

### **"I want deals to auto-organize"**
→ Go to **🤖 Smart AI** → Add treatments

### **"I want to update my name/email"**
→ Go to **👤 My Profile**

---

## 🆚 **PIPELINE SETTINGS vs DEAL SETTINGS:**

### **🔄 Pipeline Settings = YOUR VIEW**
```
How YOU see things (personal preference)
- Board or List view?
- Compact or spacious cards?
- What fields to show on cards?
```

### **💼 Deal Settings = GLOBAL RULES**
```
How deals WORK for EVERYONE (practice-wide rules)
- What fields are required?
- What's the min/max deal value?
- How do we detect duplicates?
```

**Think of it like:**
- Pipeline Settings = Your desk setup (how you organize YOUR workspace)
- Deal Settings = Company policy (rules EVERYONE follows)

---

## ✨ **EXAMPLES IN ACTION:**

### **Scenario 1: New Receptionist**
```
1. Go to 🛡️ Roles → Create Role
   Name: "Receptionist"
   Icon: 📞
   
2. Go to 👥 Team → Invite Team Member
   Email: receptionist@practice.com
   Role: Receptionist
   
3. Done! They get invitation link
```

### **Scenario 2: Auto-Categorize Implants**
```
1. Go to 🤖 Smart AI → Add Treatment
   Name: "Dental Implants"
   Category: "High-Value"
   Keywords: "implant, implants, dental implant"
   Minimum Value: £3,000
   Target Pipeline: "High-Value Treatment"
   
2. Save!

3. Now when you create a deal with "implant" in the notes
   and value > £3,000 → Automatically goes to High-Value Treatment!
```

### **Scenario 3: Require Phone Numbers**
```
1. Go to 💼 Deal Settings → Required Fields tab
   
2. Toggle ON: "Contact Phone"
   
3. Save!

4. Now NO ONE can create a deal without a phone number!
```

---

## 🎊 **REFRESH YOUR APP NOW!**

**Everything is cleaner and clearer:**

1. Press `Cmd+Shift+R` in browser
2. Go to Settings
3. See only **6 clear tabs**
4. Each tab has a **description** explaining what it does
5. No more confusion!

---

## 💡 **WHAT TABS MEAN:**

```
👤 My Profile        → YOUR info
👥 Team              → Add/manage people
🛡️ Roles             → Define what people can do
🔄 Pipeline Settings → How YOU view things
💼 Deal Settings     → How deals WORK for everyone
🤖 Smart AI          → Automatic organization
```

---

**Everything is now CLEAR, SIMPLE, and WORKING!** ✨

