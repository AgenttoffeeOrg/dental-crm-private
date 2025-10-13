'use client'

import { WifiOff } from 'lucide-react'

export default function Offline() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <WifiOff className="h-24 w-24 mx-auto mb-6 text-gray-400" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">You are offline</h1>
        <p className="text-gray-600 mb-6">Please check your internet connection</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry Connection
        </button>
      </div>
    </div>
  )
}

