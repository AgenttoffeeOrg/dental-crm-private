import Link from 'next/link'
import { Home } from 'lucide-react'

// Force dynamic rendering to avoid static generation
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-indigo-600">404</h1>
        <h2 className="text-3xl font-semibold text-gray-900 mt-4">Page Not Found</h2>
        <p className="text-gray-600 mt-2 mb-8">Sorry, we could not find the page you are looking for.</p>
        <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700">
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  )
}

