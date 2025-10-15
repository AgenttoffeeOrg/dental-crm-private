/**
 * Settings Deep Linking Hook
 * 
 * Support subsection deep linking with anchor scrolling
 * 
 * URLs: /settings?tab=integrations&section=twilio
 * 
 * Features:
 * - Parse section from URL
 * - Scroll to section anchor
 * - Update URL on section navigation
 * - Highlight section temporarily
 * 
 * Usage:
 * ```typescript
 * // In settings tab component:
 * const { currentSection, scrollToSection } = useSettingsDeepLink()
 * 
 * // Add section ID to elements:
 * <div id="section-twilio" data-section="twilio">
 *   <h4>Twilio Configuration</h4>
 * </div>
 * ```
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export function useSettingsDeepLink() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentSection, setCurrentSection] = useState<string | null>(null)
  
  // Parse section from URL
  useEffect(() => {
    const section = searchParams.get('section')
    if (section) {
      setCurrentSection(section)
      
      // Scroll to section after a brief delay (allow DOM to render)
      setTimeout(() => {
        scrollToSection(section)
      }, 100)
    }
  }, [searchParams])
  
  /**
   * Scroll to a section by ID
   */
  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(`section-${sectionId}`)
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      
      // Highlight section temporarily
      element.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2')
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2')
      }, 2000)
    }
  }, [])
  
  /**
   * Navigate to a subsection
   */
  const navigateToSection = useCallback((tab: string, section: string) => {
    const url = `/settings?tab=${tab}&section=${section}`
    router.push(url)
  }, [router])
  
  /**
   * Update section in URL without full navigation
   */
  const updateSectionInUrl = useCallback((section: string) => {
    if (typeof window === 'undefined') return
    
    const url = new URL(window.location.href)
    url.searchParams.set('section', section)
    window.history.replaceState({}, '', url.toString())
    
    setCurrentSection(section)
  }, [])
  
  return {
    currentSection,
    scrollToSection,
    navigateToSection,
    updateSectionInUrl,
  }
}

/**
 * Section Anchor Component
 * 
 * Wrapper for settings sections to enable deep linking
 */
interface SectionAnchorProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function SectionAnchor({ id, children, className }: SectionAnchorProps) {
  return (
    <div
      id={`section-${id}`}
      data-section={id}
      className={`scroll-mt-6 transition-all duration-200 ${className || ''}`}
    >
      {children}
    </div>
  )
}

