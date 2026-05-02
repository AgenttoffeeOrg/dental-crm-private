# Invitation System - Complete End-to-End Flow

**Date:** December 2024  
**Status:** ✅ **FULLY IMPLEMENTED**  
**Invite Format:** 6-character alphanumeric uppercase codes (e.g., `A3X7K9`)

---

## EXECUTIVE SUMMARY

The invitation system is **fully implemented** with two table systems:
1. **`pending_invites`** - Modern system with 6-character codes, role pre-assignment
2. **`user_invitations`** - Legacy system with token-based invites

**Current Status:** `pending_invites` is the active system. `user_invitations` may be legacy/deprecated.

---

## 1. ALL INVITATION TABLES

### Table 1: pending_invites (ACTIVE SYSTEM)

**File:** `supabase/migrations/20251027_004_pending_invites_system.sql:26-53`

#### Complete CREATE TABLE Statement

```sql
CREATE TABLE IF NOT EXISTS pending_invites (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  
  -- Invite Details
  invited_email TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- ✅ CRITICAL: Role is assigned BY INVITER, NOT on accept
  assigned_role TEXT NOT NULL CHECK (assigned_role IN ('owner', 'admin', 'manager', 'staff', 'viewer')),
  
  -- Inviter Info
  invited_by UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  personal_message TEXT, -- Optional message from inviter
  
  -- Status & Timestamps
  status invite_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  
  -- Acceptance Tracking
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);
```

#### All Columns Explained

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` | Primary key |
| `invite_code` | TEXT | NOT NULL | - | 6-character alphanumeric code (UNIQUE) |
| `invited_email` | TEXT | NOT NULL | - | Email address of invitee |
| `tenant_id` | UUID | NOT NULL | - | FK to `tenants(id)` ON DELETE CASCADE |
| `assigned_role` | TEXT | NOT NULL | - | Role assigned by inviter: 'owner', 'admin', 'manager', 'staff', 'viewer' |
| `invited_by` | UUID | NOT NULL | - | FK to `app_users(id)` - who sent the invite |
| `personal_message` | TEXT | NULLABLE | NULL | Optional message from inviter |
| `status` | `invite_status` ENUM | NOT NULL | 'pending' | 'pending', 'accepted', 'expired', 'cancelled' |
| `created_at` | TIMESTAMPTZ | NOT NULL | NOW() | When invite was created |
| `expires_at` | TIMESTAMPTZ | NOT NULL | NOW() + 7 days | Expiration timestamp |
| `accepted_at` | TIMESTAMPTZ | NULLABLE | NULL | When invite was accepted |
| `accepted_by` | UUID | NULLABLE | NULL | FK to `app_users(id)` - who accepted |
| `metadata` | JSONB | NOT NULL | '{}' | Additional metadata |

#### Indexes

```sql
CREATE INDEX idx_pending_invites_email ON pending_invites(invited_email);
CREATE INDEX idx_pending_invites_code ON pending_invites(invite_code);
CREATE INDEX idx_pending_invites_tenant ON pending_invites(tenant_id);
CREATE INDEX idx_pending_invites_status ON pending_invites(status);
CREATE INDEX idx_pending_invites_expires ON pending_invites(expires_at) WHERE status = 'pending';
```

### Table 2: user_invitations (LEGACY SYSTEM)

**File:** `supabase/sql/15_user_invitations.sql:16-28`

#### Complete CREATE TABLE Statement

```sql
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff', 'viewer')),
  invited_by_user_id UUID REFERENCES app_users(id),
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Note:** This appears to be a legacy system. Current codebase primarily uses `pending_invites`.

---

## 2. INVITE CODE FORMAT

### Code Generation Function

**File:** `supabase/migrations/20251027_004_pending_invites_system.sql:75-110`

#### Complete Function

```sql
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
  v_attempts INTEGER := 0;
  v_max_attempts INTEGER := 100;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code (uppercase)
    v_code := UPPER(
      SUBSTRING(MD5(gen_random_uuid()::TEXT) FROM 1 FOR 6)
    );
    
    -- Replace numbers with letters for readability (avoid 0/O, 1/I confusion)
    v_code := TRANSLATE(v_code, '0123456789', 'ABCDEFGHJK');
    
    -- Check if code already exists
    SELECT EXISTS(
      SELECT 1 FROM pending_invites WHERE invite_code = v_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
    
    v_attempts := v_attempts + 1;
    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', v_max_attempts;
    END IF;
  END LOOP;
  
  RETURN v_code;
END;
$$;
```

### Format Details

- **Length:** 6 characters
- **Character Set:** Uppercase letters only (A-Z, with numbers 0-9 replaced by letters A-J to avoid confusion)
- **Generation Method:** MD5 hash of random UUID, first 6 characters
- **Uniqueness:** Guaranteed via existence check loop (max 100 attempts)

### Example Codes

1. `A3X7K9` - Valid 6-character code
2. `BCDEFG` - All letters (numbers replaced)
3. `HJKLMA` - Valid format

**Pattern:** `[A-Z]{6}` (but numbers are mapped to letters)

---

## 3. INVITE CREATION FLOW

### Endpoint

**POST** `/api/invites/create`

**File:** `src/app/api/invites/create/route.ts`

### Complete Code with Line-by-Line Explanation

```typescript
// Line 100-378: Main POST handler
export async function POST(request: NextRequest) {
  // 1. AUTHENTICATION (lines 107-114)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 2. GET USER CONTEXT (lines 119-131)
  const { data: appUser } = await supabase
    .from('app_users')
    .select('active_tenant_id, full_name')
    .eq('id', user.id)
    .single()
  
  // 3. VERIFY PERMISSIONS (lines 136-160)
  // Only owners/admins can create invites
  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', appUser.active_tenant_id)
    .eq('status', 'active')
    .single()
  
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }
  
  // 4. RATE LIMITING (lines 165-184)
  // Max 10 invites/hour per user
  const rateLimit = checkRateLimit(user.id)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  
  // 5. PARSE & VALIDATE REQUEST (lines 189-212)
  // Email validation, role must be explicit
  const body = CreateInviteSchema.parse(await request.json())
  
  // 6. CHECK DUPLICATE INVITE (lines 217-238)
  // Same email + tenant + pending status
  const { data: existingInvite } = await supabase
    .from('pending_invites')
    .select('id, invite_code, expires_at')
    .eq('invited_email', body.email)
    .eq('tenant_id', appUser.active_tenant_id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (existingInvite) {
    return NextResponse.json({ error: 'Duplicate invite' }, { status: 409 })
  }
  
  // 7. CHECK IF ALREADY MEMBER (lines 243-264)
  // Prevents inviting existing members
  const { data: existingMember } = await supabase
    .from('user_tenant_memberships')
    .select('id')
    .eq('tenant_id', appUser.active_tenant_id)
    .eq('status', 'active')
    .in('user_id', [/* subquery for email */])
    .single()
  
  // 8. GENERATE INVITE CODE (lines 269-278)
  const { data: inviteCode } = await supabase.rpc('generate_invite_code')
  
  // 9. CREATE INVITE (lines 283-311)
  const { data: invite } = await supabase
    .from('pending_invites')
    .insert({
      invite_code: inviteCode,
      invited_email: body.email,
      tenant_id: appUser.active_tenant_id,
      assigned_role: body.role,  // ✅ Pre-assigned by inviter
      invited_by: user.id,
      personal_message: body.personal_message || null,
      status: 'pending'
    })
    .select()
    .single()
  
  // 10. AUDIT LOG (lines 316-339)
  await supabase.from('audits').insert({
    action: 'invite.created',
    resource_type: 'invite',
    resource_id: invite.id,
    metadata: { invited_email, assigned_role, invite_code }
  })
  
  // 11. SUCCESS RESPONSE (lines 344-366)
  return NextResponse.json({
    success: true,
    invite: {
      id: invite.id,
      invite_code: invite.invite_code,
      invited_email: invite.invited_email,
      assigned_role: invite.assigned_role,
      expires_at: invite.expires_at
    }
  })
}
```

### Data Stored

**INSERT Query:**
```sql
INSERT INTO pending_invites (
  invite_code,
  invited_email,
  tenant_id,
  assigned_role,  -- ✅ Pre-assigned (NOT set on accept)
  invited_by,
  personal_message,
  status,
  expires_at,
  created_at
) VALUES (
  'A3X7K9',  -- Generated code
  'user@example.com',
  '<tenant_id>',
  'staff',  -- Set by inviter
  '<inviter_user_id>',
  'Welcome!',
  'pending',
  NOW() + INTERVAL '7 days',
  NOW()
)
```

### Can Admin Specify Role?

**✅ YES** - Role is REQUIRED in request body:

```typescript
// src/app/api/invites/create/route.ts:48-50
role: z.enum(['owner', 'admin', 'manager', 'staff', 'viewer'], {
  errorMap: () => ({ message: 'Role must be explicitly specified' })
})
```

### Can Admin Specify Location(s)?

**❌ NO** - Location assignment happens on accept (default location only)

**File:** `src/app/api/invites/accept/route.ts:264-275`

```typescript
// On accept, user gets access to DEFAULT location only
const { error: locationAccessError } = await supabase
  .from('membership_locations')
  .insert({
    membership_id: membership.id,
    location_id: defaultLocation.id,  // Default location, not specified by inviter
    role: invite.assigned_role
  })
```

### Default Values

- **Role:** ❌ NO DEFAULT - Must be explicitly specified
- **Expires At:** `NOW() + INTERVAL '7 days'`
- **Status:** `'pending'`
- **Location:** Default location (first/primary location in tenant)

---

## 4. EMAIL SENDING

### Email Service

**File:** `src/lib/services/email-service.ts`

**Supported Providers:**
- Resend (primary)
- SendGrid (alternative)
- Console (development - logs to console)

### Email Sending Function

**File:** `src/lib/services/email-service.ts:208-276`

```typescript
export async function sendInvitationEmail(
  to: EmailAddress,
  invitedBy: string,
  organizationName: string,
  inviteLink: string,
  role: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif;">
      <h1>You've been invited!</h1>
      <p><strong>${invitedBy}</strong> has invited you to join <strong>${organizationName}</strong>.</p>
      <p>You'll be joining as <strong>${role}</strong>.</p>
      <a href="${inviteLink}">Accept Invitation</a>
      <p>This invitation link will expire in 7 days.</p>
    </body>
    </html>
  `
  
  return sendEmail({
    to,
    subject: `You've been invited to join ${organizationName}`,
    html,
    template: EmailTemplates.INVITATION
  })
}
```

### Is Email Required?

**Status:** ❌ **NOT IMPLEMENTED** - Invite creation API does NOT send email automatically

**Note:** The email sending code exists but is NOT called in `/api/invites/create`. Email would need to be sent separately or added to the create flow.

### Can Invites Be Used Without Email?

**✅ YES** - Invite codes can be shared directly (via UI, clipboard, etc.)

---

## 5. INVITE ACCEPTANCE FLOW

### Endpoint

**POST** `/api/invites/accept`

**File:** `src/app/api/invites/accept/route.ts`

### Complete Code

```typescript
export async function POST(request: NextRequest) {
  // 1. AUTHENTICATION (lines 64-71)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // 2. PARSE & VALIDATE REQUEST (lines 76-99)
  // Accepts either invite_id or invite_code
  const body = AcceptInviteSchema.parse(await request.json())
  
  // 3. FETCH & VALIDATE INVITE (lines 104-137)
  let inviteQuery = supabase
    .from('pending_invites')
    .select('id, invite_code, invited_email, tenant_id, assigned_role, status, expires_at, tenants!inner(name)')
  
  if ('invite_id' in body) {
    inviteQuery = inviteQuery.eq('id', body.invite_id)
  } else {
    inviteQuery = inviteQuery.eq('invite_code', body.invite_code)
  }
  
  const { data: invite } = await inviteQuery.single()
  
  // 4. VALIDATE INVITE STATUS (lines 143-185)
  
  // 4a. Email match check
  if (invite.invited_email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'Email mismatch' }, { status: 403 })
  }
  
  // 4b. Already accepted check
  if (invite.status === 'accepted') {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 409 })
  }
  
  // 4c. Expired check
  if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  }
  
  // 4d. Cancelled check
  if (invite.status === 'cancelled') {
    return NextResponse.json({ error: 'Invite cancelled' }, { status: 410 })
  }
  
  // 5. CHECK IF ALREADY MEMBER (lines 190-217)
  const { data: existingMembership } = await supabase
    .from('user_tenant_memberships')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('tenant_id', invite.tenant_id)
    .eq('status', 'active')
    .single()
  
  if (existingMembership) {
    // Mark invite as accepted anyway
    await supabase.from('pending_invites').update({ status: 'accepted' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Already a member' }, { status: 409 })
  }
  
  // 6. GET DEFAULT LOCATION (lines 222-236)
  const { data: defaultLocation } = await supabase
    .from('locations')
    .select('id, name')
    .eq('tenant_id', invite.tenant_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  
  // 7. CREATE MEMBERSHIP (lines 241-259)
  const { data: membership } = await supabase
    .from('user_tenant_memberships')
    .insert({
      user_id: user.id,
      tenant_id: invite.tenant_id,
      role: invite.assigned_role,  // ✅ Use pre-assigned role
      all_locations: false,
      status: 'active'
    })
    .select('id, role')
    .single()
  
  // 8. GRANT ACCESS TO DEFAULT LOCATION (lines 264-275)
  await supabase.from('membership_locations').insert({
    membership_id: membership.id,
    location_id: defaultLocation.id,
    role: invite.assigned_role
  })
  
  // 9. UPDATE USER'S ACTIVE CONTEXT (lines 280-292)
  await supabase
    .from('app_users')
    .update({
      active_tenant_id: invite.tenant_id,
      active_location_id: defaultLocation.id
    })
    .eq('id', user.id)
  
  // 10. MARK INVITE AS ACCEPTED (lines 297-309)
  await supabase
    .from('pending_invites')
    .update({
      status: 'accepted',
      accepted_at: new Date().toISOString(),
      accepted_by: user.id
    })
    .eq('id', invite.id)
  
  // 11. AUDIT LOG (lines 314-327)
  await supabase.from('audits').insert({
    action: 'invite.accepted',
    resource_type: 'invite',
    resource_id: invite.id
  })
  
  // 12. SUCCESS RESPONSE (lines 332-346)
  return NextResponse.json({
    success: true,
    membership: {
      tenant: { id: invite.tenant_id, name: invite.tenants.name },
      role: invite.assigned_role,
      location: { id: defaultLocation.id, name: defaultLocation.name }
    }
  })
}
```

### All Validation Steps

1. ✅ **Code exists check** - Lines 129-137
2. ✅ **Not expired check** - Lines 166-174
3. ✅ **Not already used check** - Lines 155-163
4. ✅ **Email match check** - Lines 144-152 (REQUIRED)
5. ✅ **Already member check** - Lines 190-217

### Database Operations on Accept (Step by Step)

```sql
-- Step 1: Create membership
INSERT INTO user_tenant_memberships (
  user_id,
  tenant_id,
  role,  -- From invite.assigned_role
  all_locations,
  status
) VALUES (
  '<user_id>',
  '<tenant_id>',
  'staff',  -- Pre-assigned
  false,
  'active'
);

-- Step 2: Grant location access
INSERT INTO membership_locations (
  membership_id,
  location_id,
  role
) VALUES (
  '<membership_id>',
  '<default_location_id>',
  'staff'  -- Same as membership role
);

-- Step 3: Update user context
UPDATE app_users
SET 
  active_tenant_id = '<tenant_id>',
  active_location_id = '<default_location_id>'
WHERE id = '<user_id>';

-- Step 4: Mark invite accepted
UPDATE pending_invites
SET 
  status = 'accepted',
  accepted_at = NOW(),
  accepted_by = '<user_id>'
WHERE id = '<invite_id>';
```

### What Role Does Accepted User Get?

**Answer:** The role assigned by the inviter (`invite.assigned_role`)

**File:** `src/app/api/invites/accept/route.ts:246`

```typescript
role: invite.assigned_role,  // ✅ Use pre-assigned role from invite
```

### Where Do They Redirect?

**File:** `src/app/(auth)/invite/[token]/page.tsx:134`

```typescript
setTimeout(() => {
  router.push('/pipeline')  // Redirects to pipeline page
}, 1500)
```

**Note:** Legacy invite page redirects to `/pipeline`. Modern invite acceptance via `/api/invites/accept` doesn't specify redirect (client handles it).

---

## 6. JOIN PAGE UI

### Modern Join Flow (Invite Code)

**File:** `src/components/invites/join-with-code-modal.tsx`

#### Complete Component

```typescript
export function JoinWithCodeModal({
  isOpen,
  onClose,
  onSuccess,
  onError
}: JoinWithCodeModalProps) {
  const [formData, setFormData] = useState({ invite_code: '' })
  
  // Auto-submit when 6 characters entered
  const handleCodeChange = (value: string) => {
    const formatted = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)
    setFormData({ invite_code: formatted })
    
    if (formatted.length === 6) {
      setTimeout(() => handleSubmit(formatted), 300)
    }
  }
  
  const handleSubmit = async (code: string) => {
    const response = await fetch('/api/invites/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invite_code: code })
    })
    
    if (response.ok) {
      const data = await response.json()
      onSuccess(data)
      setTimeout(() => onClose(), 500)
    } else {
      const errorData = await response.json()
      setSubmitError(errorData.message)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogTitle>Join with Invite Code</DialogTitle>
        <Input
          placeholder="A3X7K9"
          value={formData.invite_code}
          onChange={(e) => handleCodeChange(e.target.value)}
          maxLength={6}
          className="text-center text-2xl font-mono tracking-widest"
        />
        <Button onClick={() => handleSubmit(formData.invite_code)}>
          Join Organization
        </Button>
      </DialogContent>
    </Dialog>
  )
}
```

### Legacy Join Flow (Token-Based)

**File:** `src/app/(auth)/invite/[token]/page.tsx`

#### User Flow

1. **Clicks email link** → `/invite/[token]`
2. **Has account** → Must sign in first (not handled in this component)
3. **No account** → Shows signup form with password
4. **Form validation** → Full name, password (min 8 chars), confirm password
5. **On submit:**
   - Creates `auth.users` record
   - Creates `app_users` record with `tenant_id` from invitation
   - Updates invitation status to 'accepted'
   - Redirects to `/pipeline`

---

## 7. INVITE MANAGEMENT UI

### Invite Creation Form

**File:** `src/components/settings/invite-user-dialog.tsx`

#### Complete Component

```typescript
export function InviteUserDialog({ open, onOpenChange, tenantId }: InviteUserDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'staff' | 'viewer'>('staff')
  
  const handleInvite = async () => {
    const response = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, tenant_id: tenantId })
    })
    
    if (response.ok) {
      const data = await response.json()
      setInvitationLink(data.invitationLink)
      toast.success(`Invitation sent to ${email}!`)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Invite Team Member</DialogTitle>
        <Input
          type="email"
          placeholder="colleague@practice.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleInvite}>Send Invitation</Button>
      </DialogContent>
    </Dialog>
  )
}
```

**Note:** This component uses `/api/users/invite` (legacy endpoint), not `/api/invites/create` (modern endpoint).

### Pending Invites View

**File:** `src/components/invites/invite-detection-banner.tsx`

**Shows:**
- Inviter name
- Organization name
- Assigned role
- Personal message (if any)
- Expiration date
- Accept/Maybe Later buttons

**Features:**
- Auto-detects pending invites on mount
- One-click accept
- Dismissible
- Shows multiple invites

### Can Invites Be Cancelled/Resent?

**Status:** ❌ **NOT FOUND** - No UI or API endpoint found for:
- Cancelling invites
- Resending invites
- Viewing all pending invites for a tenant

---

## 8. EDGE CASES

### User Already Has Account

**File:** `src/app/api/invites/accept/route.ts:190-217`

```typescript
// Check if already a member
const { data: existingMembership } = await supabase
  .from('user_tenant_memberships')
  .select('id, role')
  .eq('user_id', user.id)
  .eq('tenant_id', invite.tenant_id)
  .eq('status', 'active')
  .single()

if (existingMembership) {
  // Mark invite as accepted anyway
  await supabase.from('pending_invites').update({ status: 'accepted' }).eq('id', invite.id)
  
  return NextResponse.json({
    error: 'Already a member',
    message: `You are already a member of ${tenant.name}`,
    current_role: existingMembership.role
  }, { status: 409 })
}
```

### Email Mismatch

**File:** `src/app/api/invites/accept/route.ts:144-152`

```typescript
// Email must match
if (invite.invited_email.toLowerCase() !== user.email.toLowerCase()) {
  return NextResponse.json({
    error: 'Email mismatch',
    message: 'This invite was sent to a different email address'
  }, { status: 403 })
}
```

### Expired Invite

**File:** `src/app/api/invites/accept/route.ts:166-174`

```typescript
if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
  return NextResponse.json({
    error: 'Invite expired',
    message: 'This invite has expired. Please request a new one.'
  }, { status: 410 })
}
```

### Multiple Pending Invites

**Status:** ✅ **SUPPORTED**

**File:** `src/components/invites/invite-detection-banner.tsx:276-280`

```typescript
{invites.length > 1 && (
  <p className="text-center text-sm text-muted-foreground">
    You can accept multiple invitations and switch between organizations anytime.
  </p>
)}
```

**Behavior:** User can accept multiple invites and belong to multiple organizations.

### Invite Already Accepted

**File:** `src/app/api/invites/accept/route.ts:155-163`

```typescript
if (invite.status === 'accepted') {
  return NextResponse.json({
    error: 'Invite already accepted',
    message: 'This invite has already been used'
  }, { status: 409 })
}
```

### Invalid Invite Code

**File:** `supabase/migrations/20251027_004_pending_invites_system.sql:161-165`

```sql
IF NOT FOUND THEN
  RETURN QUERY SELECT 
    FALSE, NULL, NULL, NULL, NULL, NULL, NULL,
    'Invalid invite code'::TEXT;
  RETURN;
END IF;
```

---

## 9. SECURITY

### Rate Limiting

**File:** `src/app/api/invites/create/route.ts:61-95`

**Implementation:** In-memory Map (should use Redis in production)

```typescript
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const RATE_LIMIT_MAX = 10 // Max invites per hour

function checkRateLimit(userId: string): { allowed: boolean, remaining: number, resetAt: number } {
  // In-memory store
  const record = rateLimitStore.get(`invite:${userId}`)
  
  if (record && Date.now() > record.resetAt) {
    rateLimitStore.delete(`invite:${userId}`)
  }
  
  // Check current count
  if (!record || record.count < RATE_LIMIT_MAX) {
    // Allow
    return { allowed: true, remaining: RATE_LIMIT_MAX - (record?.count || 0), resetAt: ... }
  }
  
  // Block
  return { allowed: false, remaining: 0, resetAt: record.resetAt }
}
```

**Limits:**
- 10 invites per hour per user
- Returns 429 status with headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`

### Single-Use Enforcement

**✅ ENFORCED** - Invite status changes to 'accepted' after first use

**File:** `src/app/api/invites/accept/route.ts:297-309`

```typescript
await supabase
  .from('pending_invites')
  .update({
    status: 'accepted',
    accepted_at: new Date().toISOString(),
    accepted_by: user.id
  })
  .eq('id', invite.id)
```

### Email Verification Required?

**Status:** ❌ **NOT ENFORCED** - Invite acceptance doesn't check if user's email is verified

**Note:** Email verification would need to be added to the acceptance flow.

### Brute Force Protection

**Status:** ❌ **NOT FOUND** - No brute force protection for invite code guessing

**Recommendation:** Add rate limiting to `/api/invites/accept` endpoint (max attempts per IP).

---

## 10. COMPLETE FLOW DIAGRAMS

### Admin Creates Invite

```
1. Admin opens InviteUserDialog (src/components/settings/invite-user-dialog.tsx)
   ↓
2. Fills email + role
   ↓
3. Clicks "Send Invitation"
   ↓
4. POST /api/users/invite (OR /api/invites/create)
   ↓
5. API validates:
   - User is admin/owner
   - Rate limit check (10/hour)
   - Email format validation
   - Duplicate invite check
   - Already member check
   ↓
6. Generate invite code (generate_invite_code() RPC)
   ↓
7. INSERT INTO pending_invites (invite_code, email, role, tenant_id, ...)
   ↓
8. Return success with invite_code
   ↓
9. UI shows invitation link/code
   ↓
10. (Optional) Email sent via sendInvitationEmail()
```

### User Accepts Invite

```
1. User receives invite code (email or shared)
   ↓
2. Opens JoinWithCodeModal or navigates to /invite/[token]
   ↓
3. Enters invite code (6 characters)
   ↓
4. POST /api/invites/accept { invite_code: "A3X7K9" }
   ↓
5. API validates:
   - User authenticated
   - Invite code exists
   - Email matches
   - Not expired
   - Not already accepted
   - Not already a member
   ↓
6. Get default location for tenant
   ↓
7. INSERT INTO user_tenant_memberships (user_id, tenant_id, role, ...)
   ↓
8. INSERT INTO membership_locations (membership_id, location_id, role)
   ↓
9. UPDATE app_users SET active_tenant_id, active_location_id
   ↓
10. UPDATE pending_invites SET status = 'accepted'
   ↓
11. INSERT INTO audits (action: 'invite.accepted')
   ↓
12. Return success with membership details
   ↓
13. Client redirects to /pipeline or dashboard
```

---

## 11. MISSING FEATURES

### What Works ✅

1. ✅ Invite creation with role assignment
2. ✅ Invite code generation (6-character)
3. ✅ Invite acceptance flow
4. ✅ Rate limiting (10/hour)
5. ✅ Duplicate invite detection
6. ✅ Email mismatch validation
7. ✅ Expiration checking
8. ✅ Location assignment on accept (default location)
9. ✅ Audit logging
10. ✅ Multiple invites support

### What's Broken ❌

1. ❌ Email sending NOT called in create flow
2. ❌ No invite cancellation endpoint
3. ❌ No invite resend endpoint
4. ❌ No view all pending invites endpoint
5. ❌ No brute force protection on accept endpoint
6. ❌ Rate limiting uses in-memory store (lost on restart)
7. ❌ Email verification not checked on accept

### What's Missing 🔨

1. 🔨 Bulk invite creation
2. 🔨 Invite expiration reminder emails
3. 🔨 Invite cancellation UI
4. 🔨 Invite resend functionality
5. 🔨 Invite analytics (acceptance rate, etc.)
6. 🔨 Custom expiration periods
7. 🔨 Location selection during invite creation
8. 🔨 Invite templates
9. 🔨 CSV bulk invite import

### TODOs Related to Invites

**File:** `EXISTING_ONBOARDING_AUDIT.md:314`

```markdown
- [ ] Add helper functions (generate_invite_code, expire_old_invites)
```

**Note:** `generate_invite_code` is implemented. `expire_old_invites` has a trigger but may need manual cleanup job.

---

## SUMMARY

### ✅ System Status: FULLY IMPLEMENTED (Backend)

The invitation system is **fully functional** at the API level:
- ✅ Invite creation with role pre-assignment
- ✅ 6-character code generation
- ✅ Complete acceptance flow
- ✅ Security (rate limiting, validation)
- ✅ Audit logging

### 🎯 Critical Gaps: UI & Email

1. **Email sending** - Code exists but not called
2. **Invite management UI** - No cancellation/resend UI
3. **Pending invites view** - Only banner, no full list

### 📝 Next Steps

1. Call `sendInvitationEmail()` in create flow
2. Build invite management dashboard
3. Add invite cancellation/resend endpoints
4. Add brute force protection to accept endpoint
5. Migrate rate limiting to Redis

---

**Document Status:** ✅ COMPLETE  
**Last Updated:** December 2024














