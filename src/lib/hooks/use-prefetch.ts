import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function usePrefetch(href: string, enabled: boolean = true) {
  const router = useRouter()

  useEffect(() => {
    if (enabled) {
      router.prefetch(href)
    }
  }, [href, enabled, router])
}

// Prefetch on hover
export function usePrefetchOnHover() {
  const router = useRouter()

  const handleMouseEnter = (href: string) => {
    router.prefetch(href)
  }

  return { handleMouseEnter }
}

