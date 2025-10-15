'use client'

/**
 * Shareable Dashboard Links
 * 
 * Create public/private links to share dashboards externally
 * 
 * Features:
 * - Generate unique share link
 * - Public (anyone with link) or Private (require login)
 * - Password protection (optional)
 * - Email whitelist (optional)
 * - Expiration date
 * - View tracking
 * - Revoke access
 */

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Share2, Copy, Link2, Eye, Trash2, Lock, Globe, Calendar, Check } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'

interface SharedLink {
  id: string
  title: string
  dashboard: string
  shareToken: string
  isPublic: boolean
  requireLogin: boolean
  hasPassword: boolean
  allowedEmails: string[]
  expiresAt?: string
  viewCount: number
  lastAccessed?: string
  createdAt: string
}

export function ShareableDashboardLinks({ 
  dashboard, 
  tenantId 
}: { 
  dashboard: string
  tenantId?: string 
}) {
  const [links, setLinks] = useState<SharedLink[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newLink, setNewLink] = useState({
    title: '',
    isPublic: false,
    requireLogin: true,
    password: '',
    allowedEmails: '',
    expiresAt: '',
  })
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  
  const handleCreateLink = async () => {
    if (!newLink.title.trim()) {
      toast.error('Please enter a title')
      return
    }
    
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()
      
      if (!appUser) return
      
      // Generate unique share token
      const shareToken = generateShareToken()
      
      // Hash password if provided
      let passwordHash = null
      if (newLink.password) {
        // In production, use bcrypt
        passwordHash = await hashPassword(newLink.password)
      }
      
      const { error } = await supabase
        .from('analytics_shared_dashboards')
        .insert({
          tenant_id: appUser.tenant_id,
          created_by: user.id,
          dashboard_type: dashboard,
          title: newLink.title,
          share_token: shareToken,
          is_public: newLink.isPublic,
          require_login: newLink.requireLogin,
          password_hash: passwordHash,
          allowed_emails: newLink.allowedEmails ? newLink.allowedEmails.split(',').map(e => e.trim()) : null,
          expires_at: newLink.expiresAt || null,
        })
      
      if (error) {
        toast.error('Failed to create share link')
        console.error(error)
        return
      }
      
      toast.success('Share link created successfully')
      setShowCreateDialog(false)
      resetForm()
      loadLinks()
    } catch (error) {
      console.error('[Shareable Links] Error creating link:', error)
      toast.error('Failed to create link')
    }
  }
  
  const loadLinks = async () => {
    try {
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id, full_name')
        .eq('id', user.id)
        .single()
      
      if (!appUser) return
      
      const { data } = await supabase
        .from('analytics_shared_dashboards')
        .select('*, app_users!created_by(full_name)')
        .eq('tenant_id', appUser.tenant_id)
        .eq('dashboard_type', dashboard)
        .order('created_at', { ascending: false })
      
      if (data) {
        const formattedLinks: SharedLink[] = data.map((link: any) => ({
          id: link.id,
          title: link.title,
          dashboard: link.dashboard_type,
          shareToken: link.share_token,
          isPublic: link.is_public,
          requireLogin: link.require_login,
          hasPassword: !!link.password_hash,
          allowedEmails: link.allowed_emails || [],
          expiresAt: link.expires_at,
          viewCount: link.view_count || 0,
          lastAccessed: link.last_accessed_at,
          createdAt: link.created_at,
        }))
        
        setLinks(formattedLinks)
      }
    } catch (error) {
      console.error('[Shareable Links] Error loading links:', error)
    }
  }
  
  const copyLink = (token: string) => {
    const url = `${window.location.origin}/analytics/shared/${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopiedToken(null), 2000)
  }
  
  const deleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to revoke this share link?')) return
    
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('analytics_shared_dashboards')
        .delete()
        .eq('id', linkId)
      
      if (error) {
        toast.error('Failed to delete link')
        return
      }
      
      toast.success('Share link revoked')
      loadLinks()
    } catch (error) {
      console.error('[Shareable Links] Error deleting link:', error)
    }
  }
  
  const resetForm = () => {
    setNewLink({
      title: '',
      isPublic: false,
      requireLogin: true,
      password: '',
      allowedEmails: '',
      expiresAt: '',
    })
  }
  
  const generateShareToken = () => {
    return Array.from({ length: 32 }, () =>
      Math.random().toString(36).charAt(2)
    ).join('')
  }
  
  const hashPassword = async (password: string): Promise<string> => {
    // Simple hash for demo - use bcrypt in production
    return btoa(password)
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Share this dashboard with external stakeholders</p>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Create Share Link
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Shareable Link</DialogTitle>
              <DialogDescription>
                Generate a link to share this dashboard externally
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <Label>Link Title</Label>
                <Input
                  placeholder="e.g., Board Report Q1 2025"
                  value={newLink.title}
                  onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Public Access</Label>
                  <p className="text-xs text-gray-600">Anyone with link can view (no login)</p>
                </div>
                <Switch
                  checked={newLink.isPublic}
                  onCheckedChange={(checked) => setNewLink({ ...newLink, isPublic: checked })}
                />
              </div>
              
              {!newLink.isPublic && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Login</Label>
                      <p className="text-xs text-gray-600">Users must be logged in</p>
                    </div>
                    <Switch
                      checked={newLink.requireLogin}
                      onCheckedChange={(checked) => setNewLink({ ...newLink, requireLogin: checked })}
                    />
                  </div>
                  
                  <div>
                    <Label>Password Protection (Optional)</Label>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={newLink.password}
                      onChange={(e) => setNewLink({ ...newLink, password: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label>Allowed Emails (Optional, comma-separated)</Label>
                    <Input
                      placeholder="user1@example.com, user2@example.com"
                      value={newLink.allowedEmails}
                      onChange={(e) => setNewLink({ ...newLink, allowedEmails: e.target.value })}
                    />
                  </div>
                </>
              )}
              
              <div>
                <Label>Expiration Date (Optional)</Label>
                <Input
                  type="date"
                  value={newLink.expiresAt}
                  onChange={(e) => setNewLink({ ...newLink, expiresAt: e.target.value })}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateLink}>
                  Generate Link
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Active Links */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => (
            <Card key={link.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {link.isPublic ? (
                      <Globe className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-600" />
                    )}
                    <h4 className="font-semibold text-sm">{link.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {link.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <Eye className="h-3 w-3" />
                    <span>{link.viewCount} views</span>
                    {link.expiresAt && (
                      <>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>Expires {new Date(link.expiresAt).toLocaleDateString()}</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Input
                      value={`${window.location.origin}/analytics/shared/${link.shareToken}`}
                      readOnly
                      className="text-xs h-8"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyLink(link.shareToken)}
                    >
                      {copiedToken === link.shareToken ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteLink(link.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

