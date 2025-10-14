import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useUnsavedChanges(hasChanges: boolean) {
  const router = useRouter()

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  const confirmNavigation = (callback: () => void) => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        callback()
      }
    } else {
      callback()
    }
  }

  return { confirmNavigation }
}


