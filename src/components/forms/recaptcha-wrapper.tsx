'use client'

import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { useEffect, useState } from 'react'

interface RecaptchaWrapperProps {
  siteKey: string
  children: React.ReactNode
}

export function RecaptchaWrapper({ siteKey, children }: RecaptchaWrapperProps) {
  if (!siteKey) {
    return <>{children}</>
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      {children}
    </GoogleReCaptchaProvider>
  )
}

/**
 * Hook to execute reCAPTCHA and get token
 */
export function useRecaptcha() {
  const { executeRecaptcha } = useGoogleReCaptcha()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (executeRecaptcha) {
      setReady(true)
    }
  }, [executeRecaptcha])

  const getToken = async (action: string = 'submit'): Promise<string | null> => {
    if (!executeRecaptcha) {
      console.warn('[reCAPTCHA] Not ready yet')
      return null
    }

    try {
      const token = await executeRecaptcha(action)
      return token
    } catch (error) {
      console.error('[reCAPTCHA] Error getting token:', error)
      return null
    }
  }

  return {
    ready,
    getToken,
  }
}

