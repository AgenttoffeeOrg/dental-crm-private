'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContactsNewRedirect() {
  const router = useRouter()

  useEffect(() => {
    console.log('🚨 BLOCKED: /contacts/new route accessed - redirecting to contacts')
    router.replace('/contacts')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Redirecting...</h1>
        <p className="text-gray-600">Taking you to the contacts page.</p>
      </div>
    </div>
  )
}
