import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Standalone layout for the CRM-hosted booking landing page (/w/[slug]).
 * No app shell — this page is meant to be sent paid-ad traffic and should
 * load fast with no navigation chrome.
 */

export const metadata: Metadata = {
  title: 'Book a consultation',
  robots: {
    index: false,
    follow: false,
  },
}

export default function PublicWidgetLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
