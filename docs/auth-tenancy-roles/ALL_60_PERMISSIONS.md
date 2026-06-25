# 🔑 ALL 60+ PERMISSIONS BUILT FOR YOU!

**Every single permission is toggleable per role!**

---

## 💼 **DEALS (19 Permissions)**

### **Viewing:**
✅ `deals.view_all` - View ALL deals in practice  
✅ `deals.view_team` - View deals owned by team  
✅ `deals.view_own` - View ONLY their own deals  

### **Creating:**
✅ `deals.create` - Create new deals  

### **Editing:**
✅ `deals.edit_all` - Edit ANY deal  
✅ `deals.edit_own` - Edit ONLY their deals  
✅ `deals.edit_title` - Change deal names  
✅ `deals.edit_value` - **Change deal amounts/values** ⭐  
✅ `deals.edit_stage` - Move between pipeline stages  
✅ `deals.edit_tags` - Add/remove treatment tags  

### **Deleting:**
✅ `deals.delete_all` - Delete ANY deal  
✅ `deals.delete_own` - Delete ONLY their deals  

### **Assignment:**
✅ `deals.assign_to_others` - Assign to team members  
✅ `deals.assign_to_self` - Claim unassigned deals  
✅ `deals.unassign` - Remove assignment  

### **Data Operations:**
✅ `deals.export` - Export deal data  
✅ `deals.import` - Import deal data  

### **Advanced:**
✅ `deals.bulk_edit` - Edit multiple at once  
✅ `deals.bulk_delete` - Delete multiple at once  

---

## 👥 **CONTACTS (10 Permissions)**

✅ `contacts.view_all` - View all contacts  
✅ `contacts.create` - Create new contacts  
✅ `contacts.edit_all` - Edit any contact  
✅ `contacts.edit_personal_info` - Edit names, emails, etc.  
✅ `contacts.edit_medical_info` - **Edit medical/dental history** ⭐  
✅ `contacts.delete` - Delete contacts  
✅ `contacts.merge` - Merge duplicate contacts  
✅ `contacts.export` - Export contact data  
✅ `contacts.import` - Import contact data  

---

## 🔄 **PIPELINES (9 Permissions)**

✅ `pipelines.view` - View pipeline boards  
✅ `pipelines.create` - Create new pipelines  
✅ `pipelines.edit` - Edit pipeline details  
✅ `pipelines.edit_stages` - Add/edit/remove stages  
✅ `pipelines.reorder_stages` - Change stage order  
✅ `pipelines.delete` - Delete pipelines  
✅ `pipelines.configure_automation` - **Set automation rules** ⭐  
✅ `pipelines.set_default` - Mark as default pipeline  

---

## ✅ **TASKS (10 Permissions)**

### **Viewing:**
✅ `tasks.view_all` - View ALL tasks  
✅ `tasks.view_assigned` - View ONLY assigned tasks  

### **Creating:**
✅ `tasks.create` - Create new tasks  

### **Editing:**
✅ `tasks.edit_all` - Edit ANY task  
✅ `tasks.edit_own` - Edit ONLY their tasks  

### **Deleting:**
✅ `tasks.delete_all` - Delete ANY task  
✅ `tasks.delete_own` - Delete ONLY their tasks  

### **Assignment:**
✅ `tasks.assign_to_others` - Assign to team  
✅ `tasks.complete` - Mark as complete  

---

## 📞 **ACTIVITIES (5 Permissions)**

✅ `activities.view_all` - View ALL communications  
✅ `activities.view_assigned_deals` - View activities for their deals  
✅ `activities.create` - Log activities (calls, emails, notes)  
✅ `activities.edit` - Edit activity records  
✅ `activities.delete` - Delete activity records  

---

## 👤 **USERS & TEAM (7 Permissions)**

✅ `users.view_all` - See all team members  
✅ `users.invite` - Send team invitations  
✅ `users.edit_profile` - **Edit OTHER users' profiles** ⭐  
✅ `users.edit_own_profile` - Edit their OWN profile  
✅ `users.assign_roles` - Change user roles  
✅ `users.deactivate` - Deactivate team members  
✅ `users.delete` - **Permanently delete users** ⚠️  

---

## 🛡️ **ROLES & PERMISSIONS (5 Permissions)**

✅ `roles.view` - View custom roles  
✅ `roles.create` - Create new roles  
✅ `roles.edit` - Edit role details (name, color, etc.)  
✅ `roles.edit_permissions` - **Change what a role can do** ⭐  
✅ `roles.delete` - Delete custom roles  

---

## ⚙️ **SETTINGS (7 Permissions)**

✅ `settings.view_all` - Access settings page  
✅ `settings.edit_pipeline` - Configure pipeline settings  
✅ `settings.edit_deal` - Configure deal settings  
✅ `settings.edit_contact` - Configure contact settings  
✅ `settings.edit_task` - Configure task settings  
✅ `settings.edit_integrations` - Configure external integrations  
✅ `settings.edit_notifications` - Configure notification settings  

---

## 📊 **ANALYTICS (4 Permissions)**

✅ `analytics.view_own` - View their own performance  
✅ `analytics.view_team` - View team performance  
✅ `analytics.view_all` - View all practice analytics  
✅ `analytics.export` - Export analytics reports  

---

## 🔒 **AUDIT & SECURITY (4 Permissions)**

✅ `audit.view` - View audit trail  
✅ `audit.view_sensitive` - **View admin-only audit logs** ⭐  
✅ `audit.export` - Export audit logs  
✅ `audit.delete` - **Delete audit records** ⚠️ (dangerous!)  

---

## 🎯 **EXAMPLE ROLE CONFIGURATIONS**

### **Treatment Coordinator:**
```
✅ deals.view_all
✅ deals.create
✅ deals.edit_all (except value)
✅ deals.edit_title
✅ deals.edit_stage
✅ deals.edit_tags
✅ contacts.view_all
✅ contacts.edit_personal_info
❌ contacts.edit_medical_info (no access)
✅ tasks.view_all
✅ tasks.create
✅ activities.create
❌ deals.delete_all (no delete)
❌ users.invite (no user management)
```

### **Receptionist:**
```
✅ deals.view_all
✅ deals.create
❌ deals.edit_value (cannot change amounts)
✅ contacts.view_all
✅ contacts.create
✅ contacts.edit_personal_info
❌ contacts.edit_medical_info (no medical access)
✅ tasks.create
✅ activities.create
❌ deals.delete_all (no delete)
❌ pipelines.edit (no pipeline changes)
```

### **Sales Manager:**
```
✅ ALL deal permissions
✅ ALL contact permissions
✅ ALL pipeline permissions
✅ ALL task permissions
✅ users.view_all
✅ users.assign_roles
✅ analytics.view_all
✅ audit.view
❌ users.delete (no deletion)
❌ audit.delete (no log deletion)
```

---

## 🎨 **HOW TO USE:**

1. **Go to Settings → Roles**
2. **Click on a role** (or create new)
3. **Click "Permissions" button**
4. **You'll see 60+ permissions grouped by category**
5. **Toggle ON/OFF for each permission**
6. **Click "Save Changes"**

---

## ✨ **FEATURES:**

✅ **Search permissions** - Type to filter  
✅ **Select All / None per category** - Quick bulk toggle  
✅ **"Own only" badges** - Shows ownership-based permissions  
✅ **Unsaved changes warning** - Never lose your work  
✅ **Permission descriptions** - Explains what each does  
✅ **Permission counts** - "X of Y permissions granted"  

---

## 💪 **YOU HAVE EVERYTHING YOU ASKED FOR!**

**Example questions answered:**
- ✅ "Can they edit deal values?" → `deals.edit_value`
- ✅ "Can they delete deals?" → `deals.delete_all` or `deals.delete_own`
- ✅ "Can they only view deals?" → `deals.view_own` (disable all edits)
- ✅ "Can they change medical info?" → `contacts.edit_medical_info`
- ✅ "Can they configure automation?" → `pipelines.configure_automation`

**Every single action is controlled!** 🎯


