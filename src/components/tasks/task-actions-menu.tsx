'use client'

/**
 * Phase 2b.63 — TaskActionsMenu.
 *
 * Compact 4-action bar used inside the TaskQueuePanel footer + per-
 * row on the /tasks table (wired in 2b.66). Surfaces:
 *
 *   Snooze ▾ · Reschedule · Reassign · Edit
 *
 * Each opens a tiny inline popover with the relevant control. All
 * actions PATCH /api/tasks/[id] and call onChange when done so the
 * parent can refresh.
 *
 * Snooze dropdown chips (per the 2026-05-24 product decision):
 *   - 1 hour
 *   - End of day (today 18:00 tenant-local)
 *   - Tomorrow 9am
 *   - Next week (Monday 09:00)
 *   - Custom… (opens date+time picker)
 *
 * Reschedule = same shape as Snooze "Custom…". Same underlying
 * PATCH (just updates due_at).
 *
 * Reassign opens an operator + group + everyone picker (the latter
 * two require the 2b.59 schema additions for assigned_to_group_id
 * and assigned_to_everyone — already in place).
 *
 * Edit opens an inline form for title / description / priority /
 * task_type.
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, Calendar, UserCircle, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export interface TaskActionsMenuTask {
  id: string
  title: string
  description?: string | null
  due_at?: string | null
  priority?: 'low' | 'normal' | 'high' | 'urgent' | null
  task_type?: string | null
  assignee_user_id?: string | null
  assigned_to_group_id?: string | null
  assigned_to_everyone?: boolean | null
}

interface OperatorOption {
  id: string
  full_name: string
}
interface GroupOption {
  id: string
  name: string
}

interface TaskActionsMenuProps {
  task: TaskActionsMenuTask
  operators?: OperatorOption[]
  groups?: GroupOption[]
  /** Called after any action mutates the task — parent should refresh. */
  onChange?: () => void
  /** Variant: 'queue' = inline bar (TaskQueuePanel footer); 'row' = small icon buttons (table row hover). */
  variant?: 'queue' | 'row'
}

// ---------------------------------------------------------------------------
// Helper: PATCH /api/tasks/[id] with a partial body
// ---------------------------------------------------------------------------

async function patchTask(
  id: string,
  patch: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(patch),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      return { ok: false, error: body?.error ?? body?.message ?? 'patch_failed' }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network_error' }
  }
}

// ---------------------------------------------------------------------------
// Snooze date helpers
// ---------------------------------------------------------------------------

function addHours(hours: number): string {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString()
}

function endOfTodayLocal(): string {
  const d = new Date()
  d.setHours(18, 0, 0, 0) // 6pm
  if (d.getTime() <= Date.now()) {
    // Already past 6pm → snooze to tomorrow 9am instead.
    return tomorrowAt9am()
  }
  return d.toISOString()
}

function tomorrowAt9am(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

function nextMondayAt9am(): string {
  const d = new Date()
  const dayOfWeek = d.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilMonday = ((1 - dayOfWeek + 7) % 7) || 7
  d.setDate(d.getDate() + daysUntilMonday)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TaskActionsMenu({
  task,
  operators = [],
  groups = [],
  onChange,
  variant = 'queue',
}: TaskActionsMenuProps) {
  const [snoozeBusy, setSnoozeBusy] = useState(false)
  const [reschedulePickerValue, setReschedulePickerValue] = useState<string>(
    task.due_at ? task.due_at.slice(0, 16) : ''
  )
  const [rescheduleBusy, setRescheduleBusy] = useState(false)
  const [reassignBusy, setReassignBusy] = useState(false)
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description ?? '',
    priority: (task.priority ?? 'normal') as 'low' | 'normal' | 'high' | 'urgent',
    task_type: task.task_type ?? 'todo',
  })
  const [editBusy, setEditBusy] = useState(false)
  const [customSnoozePickerValue, setCustomSnoozePickerValue] = useState<string>('')

  const buttonSize = variant === 'queue' ? 'sm' : 'sm'
  const labelHidden = variant === 'row'

  const doSnooze = async (iso: string) => {
    setSnoozeBusy(true)
    const res = await patchTask(task.id, { due_at: iso })
    setSnoozeBusy(false)
    if (res.ok) {
      toast.success('Snoozed.')
      onChange?.()
    } else {
      toast.error(`Snooze failed: ${res.error}`)
    }
  }

  const doReschedule = async () => {
    if (!reschedulePickerValue) {
      toast.error('Pick a date + time first.')
      return
    }
    setRescheduleBusy(true)
    const iso = new Date(reschedulePickerValue).toISOString()
    const res = await patchTask(task.id, { due_at: iso })
    setRescheduleBusy(false)
    if (res.ok) {
      toast.success('Rescheduled.')
      onChange?.()
    } else {
      toast.error(`Reschedule failed: ${res.error}`)
    }
  }

  const doReassign = async (
    target:
      | { kind: 'user'; userId: string }
      | { kind: 'group'; groupId: string }
      | { kind: 'everyone' }
  ) => {
    setReassignBusy(true)
    const patch: Record<string, unknown> =
      target.kind === 'user'
        ? {
            assignee_user_id: target.userId,
            assigned_to_group_id: null,
            assigned_to_everyone: false,
          }
        : target.kind === 'group'
        ? {
            assignee_user_id: null,
            assigned_to_group_id: target.groupId,
            assigned_to_everyone: false,
          }
        : {
            assignee_user_id: null,
            assigned_to_group_id: null,
            assigned_to_everyone: true,
          }
    const res = await patchTask(task.id, patch)
    setReassignBusy(false)
    if (res.ok) {
      toast.success('Reassigned.')
      onChange?.()
    } else {
      toast.error(`Reassign failed: ${res.error}`)
    }
  }

  const doEdit = async () => {
    setEditBusy(true)
    const res = await patchTask(task.id, editForm)
    setEditBusy(false)
    if (res.ok) {
      toast.success('Saved.')
      onChange?.()
    } else {
      toast.error(`Edit failed: ${res.error}`)
    }
  }

  return (
    <div
      className={
        variant === 'queue'
          ? 'flex flex-wrap items-center gap-2'
          : 'flex items-center gap-1'
      }
    >
      {/* Snooze ▾ */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size={buttonSize}
            variant="outline"
            disabled={snoozeBusy}
          >
            {snoozeBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Clock className={labelHidden ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 mr-1.5'} />
            )}
            {!labelHidden && <>Snooze ▾</>}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Snooze until</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => void doSnooze(addHours(1))}>
            +1 hour
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void doSnooze(endOfTodayLocal())}>
            End of day (6pm)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void doSnooze(tomorrowAt9am())}>
            Tomorrow 9am
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void doSnooze(nextMondayAt9am())}>
            Next Monday 9am
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 space-y-1.5">
            <Label className="text-xs">Custom date + time</Label>
            <Input
              type="datetime-local"
              value={customSnoozePickerValue}
              onChange={(e) => setCustomSnoozePickerValue(e.target.value)}
              className="h-7 text-xs"
            />
            <Button
              size="sm"
              className="w-full h-7 text-xs"
              disabled={!customSnoozePickerValue}
              onClick={() => {
                if (!customSnoozePickerValue) return
                void doSnooze(new Date(customSnoozePickerValue).toISOString())
              }}
            >
              Snooze to this time
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reschedule */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size={buttonSize} variant="outline" disabled={rescheduleBusy}>
            <Calendar className={labelHidden ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 mr-1.5'} />
            {!labelHidden && 'Reschedule'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 space-y-2">
          <Label className="text-xs">New date + time</Label>
          <Input
            type="datetime-local"
            value={reschedulePickerValue}
            onChange={(e) => setReschedulePickerValue(e.target.value)}
            className="h-8 text-sm"
          />
          <Button
            size="sm"
            className="w-full"
            disabled={!reschedulePickerValue || rescheduleBusy}
            onClick={() => void doReschedule()}
          >
            {rescheduleBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              'Save new date'
            )}
          </Button>
        </PopoverContent>
      </Popover>

      {/* Reassign */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size={buttonSize} variant="outline" disabled={reassignBusy}>
            <UserCircle className={labelHidden ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 mr-1.5'} />
            {!labelHidden && 'Reassign'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => void doReassign({ kind: 'everyone' })}>
            Everyone (shared inbox)
          </DropdownMenuItem>
          {groups.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-gray-500">
                Groups
              </DropdownMenuLabel>
              {groups.map((g) => (
                <DropdownMenuItem
                  key={g.id}
                  onClick={() => void doReassign({ kind: 'group', groupId: g.id })}
                >
                  {g.name}
                </DropdownMenuItem>
              ))}
            </>
          )}
          {operators.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-gray-500">
                People
              </DropdownMenuLabel>
              {operators.map((o) => (
                <DropdownMenuItem
                  key={o.id}
                  onClick={() => void doReassign({ kind: 'user', userId: o.id })}
                >
                  {o.full_name}
                </DropdownMenuItem>
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size={buttonSize} variant="outline" disabled={editBusy}>
            <Pencil className={labelHidden ? 'h-3.5 w-3.5' : 'h-3.5 w-3.5 mr-1.5'} />
            {!labelHidden && 'Edit'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              value={editForm.description}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, description: e.target.value }))
              }
              className="text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Priority</Label>
              <Select
                value={editForm.priority}
                onValueChange={(v) =>
                  setEditForm((p) => ({
                    ...p,
                    priority: v as 'low' | 'normal' | 'high' | 'urgent',
                  }))
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <Select
                value={editForm.task_type}
                onValueChange={(v) => setEditForm((p) => ({ ...p, task_type: v }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">General</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            disabled={editBusy || !editForm.title.trim()}
            onClick={() => void doEdit()}
          >
            {editBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save changes'}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  )
}
