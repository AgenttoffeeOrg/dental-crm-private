'use client'

import { useEffect } from 'react'

export default function TasksNewBlocked() {
  useEffect(() => {
    console.log('🚨 BLOCKED: /tasks/new route accessed - this should not happen!')
    // Force close any modals or redirects
    window.history.replaceState(null, '', '/tasks')
    // Force reload to get back to tasks page
    window.location.href = '/tasks'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h1>
        <p className="text-gray-600">Taking you to the tasks page.</p>
      </div>
    </div>
  )
}
