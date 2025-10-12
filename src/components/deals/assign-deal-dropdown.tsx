'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { UserCheck, UserX } from 'lucide-react'
import { logDealAssigned } from '@/lib/auto-audit'
import type { AppUser } from '@/types/database'

interface AssignDealDropdownProps {
  dealId: string
  currentOwnerId?: string | null
  tenantId: string
  onAssigned?: () => void
  size?: 'sm' | 'default'
}

export function AssignDealDropdown({ 
  dealId, 
  currentOwnerId, 
  tenantId, 
  onAssigned,
  size = 'default'
}: AssignDealDropdownProps) {
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadUsers()
  }, [tenantId])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('id, full_name, email, role')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('full_name')

      if (error) throw error

      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleAssign = async (userId: string | null) => {
    setLoading(true)

    try {
      // Get current deal data for audit
      const { data: currentDeal } = await supabase
        .from('deals')
        .select('title')
        .eq('id', dealId)
        .single()

      const { error } = await supabase
        .from('deals')
        .update({ 
          owner_user_id: userId,
          updated_at: new Date().toISOString()
        })
        .eq('id', dealId)

      if (error) throw error

      const assignedUser = users.find(u => u.id === userId)
      
      if (userId && assignedUser) {
        toast.success(`Deal assigned to ${assignedUser.full_name}`)
        
        // Log to audit trail
        await logDealAssigned(
          currentOwnerId || 'system', // Current user (TODO: get from auth)
          tenantId,
          dealId,
          currentDeal?.title || 'Unknown Deal',
          assignedUser.full_name,
          userId
        )
      } else {
        toast.success('Deal unassigned')
      }

      if (onAssigned) onAssigned()

      // TODO: Send notification to assigned user

    } catch (error) {
      console.error('Error assigning deal:', error)
      toast.error('Failed to assign deal')
    } finally {
      setLoading(false)
    }
  }

  const currentUser = users.find(u => u.id === currentOwnerId)

  return (
    <Select
      value={currentOwnerId || 'unassigned'}
      onValueChange={(value) => handleAssign(value === 'unassigned' ? null : value)}
      disabled={loading}
    >
      <SelectTrigger className={size === 'sm' ? 'h-8 text-xs' : ''}>
        <div className="flex items-center gap-2">
          {currentUser ? (
            <>
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-purple-100 text-purple-700">
                  {currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <SelectValue />
            </>
          ) : (
            <>
              <UserX className="h-4 w-4 text-gray-400" />
              <span className="text-gray-500">Unassigned</span>
            </>
          )}
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Assign To</SelectLabel>
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-gray-400" />
              <span>Unassigned</span>
            </div>
          </SelectItem>
        </SelectGroup>

        {users.length > 0 && (
          <SelectGroup>
            <SelectLabel>Team Members</SelectLabel>
            {users.map(user => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-purple-100 text-purple-700">
                      {user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.full_name}</span>
                    <span className="text-xs text-gray-500">{user.role}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  )
}

