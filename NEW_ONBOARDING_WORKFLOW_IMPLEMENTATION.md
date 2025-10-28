# 🎯 NEW ONBOARDING WORKFLOW - IMPLEMENTATION PLAN

**Date:** October 27, 2025  
**Status:** READY TO IMPLEMENT  
**Principle:** Quality & Perfection over Speed

---

## 📋 **EXECUTIVE SUMMARY**

### **Problem Statement**
Current auto-tenant creation causes orphaned organizations when users:
1. Sign up solo → auto-creates "User's Practice"
2. Later get invited to real organization
3. End up with unused duplicate organization

### **Solution**
Force explicit organization decision:
- **Create** your own organization
- **Join** an existing organization (via invite)
- **Cannot use app** until one of above is completed

### **User Experience**
- ✅ Free exploration of UI (read-only)
- ✅ Clear CTAs to create/join org
- ✅ Friendly modals (not restrictive)
- ✅ Settings always accessible
- ❌ No data mutations until org exists

---

## 🏗️ **ARCHITECTURE OVERVIEW**

```
┌─────────────────────────────────────────────────────────────┐
│                        SIGN UP                               │
│  User registers with email/password                          │
│  Status: authenticated, active_tenant_id = NULL             │
└───────────────────┬─────────────────────────────────────────┘
                    │
                    ▼
          ┌─────────────────┐
          │ Check Invites?  │
          └────┬────────┬────┘
               │        │
        ┌──────┘        └──────┐
        │                      │
    YES │                   NO │
        ▼                      ▼
  ┌─────────────┐      ┌────────────────┐
  │ Show Banner │      │   Onboarding   │
  │ "Invited to │      │   (5 steps)    │
  │  [Org]"     │      │                │
  └──────┬──────┘      └───────┬────────┘
         │                      │
         ├──> Accept            │
         ├──> Create Own        │
         └──────┬───────────────┘
                │
                ▼
      ┌─────────────────┐
      │ ORG DECISION     │
      │ FORK             │
      └────┬───────┬─────┘
           │       │
    Create │       │ Join
           ▼       ▼
      ┌────────┐ ┌───────────┐
      │ 5-step │ │ Enter Code│
      │ Wizard │ │ OR Accept │
      └────┬───┘ └─────┬─────┘
           │           │
           └─────┬─────┘
                 ▼
         ┌───────────────┐
         │ App Accessible│
         │ (has org)     │
         └───────────────┘
```

---

## 📊 **DATABASE SCHEMA**

### **1. Pending Invites Table**

```sql
-- /supabase/migrations/20251027_004_pending_invites_system.sql

CREATE TABLE IF NOT EXISTS pending_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Invite Details
  invite_code TEXT NOT NULL UNIQUE, -- 6-digit alphanumeric (e.g., "A3X7K9")
  invited_email TEXT NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff', -- Role to assign when accepted
  
  -- Metadata
  invited_by UUID NOT NULL REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 7 days from creation
  
  -- Status Tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES app_users(id),
  
  -- Optional Message
  personal_message TEXT,
  
  -- Indexes
  created_at_idx TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pending_invites_email ON pending_invites(invited_email) WHERE status = 'pending';
CREATE INDEX idx_pending_invites_code ON pending_invites(invite_code) WHERE status = 'pending';
CREATE INDEX idx_pending_invites_tenant ON pending_invites(tenant_id) WHERE status = 'pending';
CREATE INDEX idx_pending_invites_expires ON pending_invites(expires_at) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE pending_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view pending invites for their organization
CREATE POLICY "Admins can view pending invites for their org"
  ON pending_invites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
      AND tenant_id = pending_invites.tenant_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Admins can create invites for their organization
CREATE POLICY "Admins can create invites for their org"
  ON pending_invites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_tenant_memberships
      WHERE user_id = auth.uid()
      AND tenant_id = pending_invites.tenant_id
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Helper Function: Generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code (uppercase)
    code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT COUNT(*) > 0 INTO exists
    FROM pending_invites
    WHERE invite_code = code AND status = 'pending';
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Trigger: Auto-expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE pending_invites
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at < NOW();
  
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_expire_old_invites
AFTER INSERT OR UPDATE ON pending_invites
FOR EACH STATEMENT
EXECUTE FUNCTION expire_old_invites();

COMMENT ON TABLE pending_invites IS 'Stores pending organization invitations sent to email addresses before user sign-up';
COMMENT ON COLUMN pending_invites.invite_code IS 'Unique 6-character code for manual invite acceptance (e.g., A3X7K9)';
COMMENT ON COLUMN pending_invites.expires_at IS 'Invites expire after 7 days by default';
```

---

## 🔌 **API ENDPOINTS**

### **1. Check Pending Invite**

**File:** `src/app/api/invites/check-pending/route.ts`

```typescript
/**
 * POST /api/invites/check-pending
 * Check if an email has any pending invitations
 * 
 * Body: { email: string }
 * Returns: { has_invite: boolean, invites: Invite[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    // Query pending invites
    const { data: invites, error } = await supabase
      .from('pending_invites')
      .select(`
        id,
        invite_code,
        tenant_id,
        role,
        invited_by,
        created_at,
        expires_at,
        personal_message,
        tenants (
          id,
          name
        ),
        app_users!invited_by (
          id,
          full_name
        )
      `)
      .eq('invited_email', email.toLowerCase())
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[API] Error checking pending invites:', error)
      return NextResponse.json(
        { error: 'Failed to check invites' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      has_invite: invites.length > 0,
      invites: invites || [],
    })
  } catch (error: any) {
    console.error('[API] Unexpected error in check-pending:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### **2. Accept Invite**

**File:** `src/app/api/invites/accept/route.ts`

```typescript
/**
 * POST /api/invites/accept
 * Accept a pending invitation
 * 
 * Body: { invite_id: string } OR { invite_code: string }
 * Returns: { success: boolean, tenant_id: string, membership_id: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { invite_id, invite_code } = body
    
    if (!invite_id && !invite_code) {
      return NextResponse.json(
        { error: 'Either invite_id or invite_code is required' },
        { status: 400 }
      )
    }
    
    // Fetch invite
    let query = supabase
      .from('pending_invites')
      .select('*')
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (invite_id) {
      query = query.eq('id', invite_id)
    } else {
      query = query.eq('invite_code', invite_code.toUpperCase())
    }
    
    const { data: invite, error: inviteError } = await query
    
    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 404 }
      )
    }
    
    // Get app_user
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id, email')
      .eq('id', user.id)
      .single()
    
    if (appUserError || !appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Verify email matches (case-insensitive)
    if (appUser.email.toLowerCase() !== invite.invited_email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invite is for a different email address' },
        { status: 403 }
      )
    }
    
    // Check if user already has membership
    const { data: existing } = await supabase
      .from('user_tenant_memberships')
      .select('id')
      .eq('user_id', user.id)
      .eq('tenant_id', invite.tenant_id)
      .single()
    
    if (existing) {
      return NextResponse.json(
        { error: 'You are already a member of this organization' },
        { status: 400 }
      )
    }
    
    // Create membership
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .insert({
        user_id: user.id,
        tenant_id: invite.tenant_id,
        role: invite.role,
        all_locations: true, // Default: access to all locations
        status: 'active',
      })
      .select()
      .single()
    
    if (membershipError) {
      console.error('[API] Error creating membership:', membershipError)
      return NextResponse.json(
        { error: 'Failed to create membership' },
        { status: 500 }
      )
    }
    
    // Get default location for this tenant
    const { data: defaultLocation } = await supabase
      .from('locations')
      .select('id')
      .eq('tenant_id', invite.tenant_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    
    // Update app_users with new active context
    await supabase
      .from('app_users')
      .update({
        active_tenant_id: invite.tenant_id,
        active_location_id: defaultLocation?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    
    // Mark invite as accepted
    await supabase
      .from('pending_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invite.id)
    
    // Audit log
    await supabase.from('audits').insert({
      user_id: user.id,
      tenant_id: invite.tenant_id,
      action: 'user.invite_accepted',
      resource_type: 'membership',
      resource_id: membership.id,
      metadata: {
        invite_id: invite.id,
        invite_code: invite.invite_code,
        invited_by: invite.invited_by,
        role: invite.role,
      },
      severity: 'info',
    })
    
    return NextResponse.json({
      success: true,
      tenant_id: invite.tenant_id,
      membership_id: membership.id,
      message: 'Successfully joined organization',
    })
  } catch (error: any) {
    console.error('[API] Unexpected error in accept:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### **3. Create Organization**

**File:** `src/app/api/orgs/create/route.ts`

```typescript
/**
 * POST /api/orgs/create
 * Create a new organization for the current user
 * 
 * Body: { name: string, location_name?: string }
 * Returns: { success: boolean, tenant_id: string, location_id: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { name, location_name = 'Main Office' } = await request.json()
    
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }
    
    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: name.trim(),
        is_multi_location: false,
      })
      .select()
      .single()
    
    if (tenantError) {
      console.error('[API] Error creating tenant:', tenantError)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }
    
    // Create default location
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .insert({
        tenant_id: tenant.id,
        name: location_name.trim(),
      })
      .select()
      .single()
    
    if (locationError) {
      console.error('[API] Error creating location:', locationError)
      // Rollback tenant
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json(
        { error: 'Failed to create location' },
        { status: 500 }
      )
    }
    
    // Create membership (owner role)
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
        role: 'owner',
        all_locations: true,
        status: 'active',
      })
      .select()
      .single()
    
    if (membershipError) {
      console.error('[API] Error creating membership:', membershipError)
      // Rollback
      await supabase.from('locations').delete().eq('id', location.id)
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json(
        { error: 'Failed to create membership' },
        { status: 500 }
      )
    }
    
    // Update app_users with active context
    await supabase
      .from('app_users')
      .update({
        active_tenant_id: tenant.id,
        active_location_id: location.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    
    // Audit log
    await supabase.from('audits').insert({
      user_id: user.id,
      tenant_id: tenant.id,
      action: 'tenant.created',
      resource_type: 'tenant',
      resource_id: tenant.id,
      metadata: {
        tenant_name: tenant.name,
        location_name: location.name,
      },
      severity: 'info',
    })
    
    return NextResponse.json({
      success: true,
      tenant_id: tenant.id,
      location_id: location.id,
      message: 'Organization created successfully',
    })
  } catch (error: any) {
    console.error('[API] Unexpected error in create:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 🎨 **UI COMPONENTS**

### **1. Invite Detection Banner**

**File:** `src/components/onboarding/invite-detection-banner.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Building2, Mail, X } from 'lucide-react'

interface PendingInvite {
  id: string
  invite_code: string
  tenant_id: string
  role: string
  tenants: { name: string }
  app_users: { full_name: string }
  created_at: string
  personal_message?: string
}

export function InviteDetectionBanner() {
  const { user, appUser } = useAuth()
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)
  
  useEffect(() => {
    const checkInvites = async () => {
      if (!user?.email || appUser?.active_tenant_id) {
        setLoading(false)
        return
      }
      
      try {
        const response = await fetch('/api/invites/check-pending', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setInvites(data.invites || [])
        }
      } catch (error) {
        console.error('Error checking invites:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkInvites()
  }, [user, appUser])
  
  const handleAccept = async (inviteId: string) => {
    setAccepting(inviteId)
    
    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_id: inviteId }),
      })
      
      if (response.ok) {
        // Redirect to dashboard (org is now active)
        window.location.href = '/dashboard'
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to accept invite')
      }
    } catch (error) {
      console.error('Error accepting invite:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setAccepting(null)
    }
  }
  
  if (loading || invites.length === 0 || dismissed || appUser?.active_tenant_id) {
    return null
  }
  
  return (
    <div className="mb-6">
      {invites.map(invite => (
        <Alert key={invite.id} className="bg-blue-50 border-blue-200">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                You've been invited to join an organization!
              </h3>
              <p className="text-sm text-blue-700 mb-2">
                <strong>{invite.app_users.full_name}</strong> invited you to join{' '}
                <strong>{invite.tenants.name}</strong> as a <strong>{invite.role}</strong>.
              </p>
              {invite.personal_message && (
                <p className="text-sm text-blue-600 italic mb-3 pl-3 border-l-2 border-blue-300">
                  "{invite.personal_message}"
                </p>
              )}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleAccept(invite.id)}
                  disabled={accepting === invite.id}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {accepting === invite.id ? 'Accepting...' : 'Accept Invitation'}
                </Button>
                <button
                  onClick={() => setDismissed(true)}
                  className="text-sm text-blue-700 hover:text-blue-900 underline"
                >
                  Create my own organization instead
                </button>
              </div>
            </div>
            
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 p-1 rounded hover:bg-blue-100 transition-colors text-blue-600"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </Alert>
      ))}
    </div>
  )
}
```

### **2. Create Organization Modal**

**File:** `src/components/onboarding/create-org-modal.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, MapPin } from 'lucide-react'

interface CreateOrgModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOrgModal({ isOpen, onClose }: CreateOrgModalProps) {
  const [name, setName] = useState('')
  const [locationName, setLocationName] = useState('Main Office')
  const [creating, setCreating] = useState(false)
  
  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter an organization name')
      return
    }
    
    setCreating(true)
    
    try {
      const response = await fetch('/api/orgs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location_name: locationName }),
      })
      
      if (response.ok) {
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create organization')
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setCreating(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-6 h-6 text-blue-600" />
            Create Your Organization
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Set up your organization to start managing contacts, deals, and more.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name *</Label>
            <Input
              id="org-name"
              placeholder="e.g., Acme Dental Practice"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={creating}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location-name">Primary Location Name</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="location-name"
                placeholder="e.g., Main Office"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                disabled={creating}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleCreate}
              disabled={creating || !name.trim()}
              className="flex-1"
            >
              {creating ? 'Creating...' : 'Create Organization'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={creating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### **3. Join with Code Modal**

**File:** `src/components/onboarding/join-with-code-modal.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Key } from 'lucide-react'

interface JoinWithCodeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function JoinWithCodeModal({ isOpen, onClose }: JoinWithCodeModalProps) {
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  
  const handleJoin = async () => {
    if (!code.trim() || code.length !== 6) {
      alert('Please enter a 6-character invite code')
      return
    }
    
    setJoining(true)
    
    try {
      const response = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code.toUpperCase() }),
      })
      
      if (response.ok) {
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        const error = await response.json()
        alert(error.error || 'Invalid or expired invite code')
      }
    } catch (error) {
      console.error('Error joining with code:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setJoining(false)
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Key className="w-6 h-6 text-green-600" />
            Join with Invite Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Enter the 6-character invite code you received from your organization.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code *</Label>
            <Input
              id="invite-code"
              placeholder="A3X7K9"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase().slice(0, 6))}
              disabled={joining}
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest"
            />
          </div>
          
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleJoin}
              disabled={joining || code.length !== 6}
              className="flex-1"
            >
              {joining ? 'Joining...' : 'Join Organization'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              disabled={joining}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

---

## 🚧 **NAVIGATION BLOCKING**

### **Middleware Approach**

**File:** `src/middleware.ts` (update existing)

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const ALLOWED_WITHOUT_ORG = [
  '/sign-in',
  '/sign-up',
  '/onboarding',
  '/settings', // Allow settings access
  '/api',
  '/_next',
  '/favicon.ico',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (ALLOWED_WITHOUT_ORG.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Check if user has active_tenant_id
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // Redirect to sign-in
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
  
  // Check active_tenant_id
  const { data: appUser } = await supabase
    .from('app_users')
    .select('active_tenant_id')
    .eq('id', user.id)
    .single()
  
  if (!appUser?.active_tenant_id) {
    // Redirect to onboarding (org creation flow)
    return NextResponse.redirect(new URL('/onboarding?step=org-decision', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Phase 1: Database** ⏳
- [ ] Create migration file `20251027_004_pending_invites_system.sql`
- [ ] Test `generate_invite_code()` function
- [ ] Test `expire_old_invites()` trigger
- [ ] Verify RLS policies

### **Phase 2: API Endpoints** ⏳
- [ ] Implement `/api/invites/check-pending`
- [ ] Implement `/api/invites/accept`
- [ ] Implement `/api/orgs/create`
- [ ] Add error handling & validation
- [ ] Add audit logging

### **Phase 3: UI Components** ⏳
- [ ] Create `InviteDetectionBanner`
- [ ] Create `CreateOrgModal`
- [ ] Create `JoinWithCodeModal`
- [ ] Update `/onboarding` page
- [ ] Add to Settings → Organizations

### **Phase 4: Navigation** ⏳
- [ ] Update middleware for org checking
- [ ] Test redirect flows
- [ ] Ensure Settings always accessible

### **Phase 5: Cleanup** ⏳
- [ ] Remove auto-tenant trigger from migration `20251027_003`
- [ ] Guide 2 orphaned users through flow
- [ ] Update documentation

---

## 🎯 **SUCCESS CRITERIA**

1. ✅ **No Auto-Created Tenants:** Users sign up without tenant
2. ✅ **Invite Detection:** Pending invites shown on sign-up
3. ✅ **Explicit Choice:** Users MUST create or join org
4. ✅ **Friendly UX:** No harsh restrictions, clear CTAs
5. ✅ **Settings Access:** Always accessible for profile/org creation
6. ✅ **Zero Orphaned Orgs:** No unused auto-created organizations

---

**Ready to implement with surgical precision! 🎉**

