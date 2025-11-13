/**
 * Task Mutation Hook - Enterprise Task API Client
 * 
 * Provides consistent API calls for task CRUD operations with proper
 * error handling, location inheritance, and tenant validation.
 * 
 * All task mutations MUST go through this hook to ensure:
 * - Location inheritance from contact/deal
 * - Tenant scoping
 * - Assignee validation
 * - Proper error handling
 */

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { TaskCreateInput, TaskUpdateInput } from '@/schemas/task.schema'

export interface UseTaskMutationOptions {
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export interface UseTaskMutationResult {
  createTask: (data: TaskCreateInput) => Promise<{ task?: any; error?: Error }>
  updateTask: (id: string, data: TaskUpdateInput) => Promise<{ task?: any; error?: Error }>
  deleteTask: (id: string) => Promise<{ success?: boolean; error?: Error }>
  completeTask: (id: string) => Promise<{ task?: any; error?: Error }>
  bulkComplete: (ids: string[]) => Promise<{ success?: boolean; error?: Error }>
  bulkReassign: (ids: string[], assigneeUserId: string | null) => Promise<{ success?: boolean; error?: Error }>
  bulkReschedule: (ids: string[], dueAt: string) => Promise<{ success?: boolean; error?: Error }>
  bulkDelete: (ids: string[]) => Promise<{ success?: boolean; error?: Error }>
  isLoading: boolean
}

export function useTaskMutation(options: UseTaskMutationOptions = {}): UseTaskMutationResult {
  const [isLoading, setIsLoading] = useState(false)

  const createTask = async (data: TaskCreateInput) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        const error = new Error(result.error || 'Failed to create task')
        toast.error(error.message)
        options.onError?.(error)
        return { error }
      }

      toast.success('Task created successfully')
      options.onSuccess?.()
      return { task: result.task }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to create task')
      toast.error(err.message)
      options.onError?.(err)
      return { error: err }
    } finally {
      setIsLoading(false)
    }
  }

  const updateTask = async (id: string, data: TaskUpdateInput) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        const error = new Error(result.error || 'Failed to update task')
        toast.error(error.message)
        options.onError?.(error)
        return { error }
      }

      toast.success('Task updated')
      options.onSuccess?.()
      return { task: result.task }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to update task')
      toast.error(err.message)
      options.onError?.(err)
      return { error: err }
    } finally {
      setIsLoading(false)
    }
  }

  const deleteTask = async (id: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        const error = new Error(result.error || 'Failed to delete task')
        toast.error(error.message)
        options.onError?.(error)
        return { error }
      }

      toast.success('Task deleted')
      options.onSuccess?.()
      return { success: true }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to delete task')
      toast.error(err.message)
      options.onError?.(err)
      return { error: err }
    } finally {
      setIsLoading(false)
    }
  }

  const completeTask = async (id: string) => {
    return updateTask(id, { status: 'done' })
  }

  const bulkComplete = async (ids: string[]) => {
    setIsLoading(true)
    try {
      const promises = ids.map(id => updateTask(id, { status: 'done' }))
      const results = await Promise.all(promises)
      const errors = results.filter(r => r.error)

      if (errors.length > 0) {
        const error = new Error(`Failed to complete ${errors.length} task(s)`)
        toast.error(error.message)
        return { error }
      }

      toast.success(`${ids.length} task(s) completed`)
      options.onSuccess?.()
      return { success: true }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to complete tasks')
      toast.error(err.message)
      return { error: err }
    } finally {
      setIsLoading(false)
    }
  }

  const bulkReassign = async (ids: string[], assigneeUserId: string | null) => {
    setIsLoading(true)
    try {
      const promises = ids.map(id => updateTask(id, { assignee_user_id: assigneeUserId }))
      const results = await Promise.all(promises)
      const errors = results.filter(r => r.error)

      if (errors.length > 0) {
        const error = new Error(`Failed to reassign ${errors.length} task(s)`)
        toast.error(error.message)
        return { error }
      }

      toast.success(`${ids.length} task(s) reassigned`)
      options.onSuccess?.()
      return { success: true }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to reassign tasks')
      toast.error(err.message)
      return { error: err }
    } finally {
      setIsLoading(false)
    }
  }

  const bulkReschedule = async (ids: string[], dueAt: string) => {
    setIsLoading(true)
    try {
      const promises = ids.map(id => updateTask(id, { due_at: dueAt }))
      const results = await Promise.all(promises)
      const errors = results.filter(r => r.error)

      if (errors.length > 0) {
        const error = new Error(`Failed to reschedule ${errors.length} task(s)`)
        toast.error(error.message)
        return { error }
      }

      toast.success(`${ids.length} task(s) rescheduled`)
      options.onSuccess?.()
      return { success: true }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to reschedule tasks')
      toast.error(err.message)
      return { error: err }
    } finally {
      setIsLoading(false)
    }
  }

  const bulkDelete = async (ids: string[]) => {
    setIsLoading(true)
    try {
      const promises = ids.map(id => deleteTask(id))
      const results = await Promise.all(promises)
      const errors = results.filter(r => r.error)

      if (errors.length > 0) {
        const error = new Error(`Failed to delete ${errors.length} task(s)`)
        toast.error(error.message)
        return { error }
      }

      toast.success(`${ids.length} task(s) deleted`)
      options.onSuccess?.()
      return { success: true }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to delete tasks')
      toast.error(err.message)
      return { error: err }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    bulkComplete,
    bulkReassign,
    bulkReschedule,
    bulkDelete,
    isLoading,
  }
}



