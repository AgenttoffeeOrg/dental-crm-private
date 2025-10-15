/**
 * Google reCAPTCHA v3 Integration
 * Provides invisible spam protection for forms
 */

export interface RecaptchaVerificationResult {
  success: boolean
  score: number
  action: string
  challenge_ts: string
  hostname: string
  error?: string
}

/**
 * Verify reCAPTCHA token on server-side
 */
export async function verifyRecaptchaToken(
  token: string
): Promise<RecaptchaVerificationResult> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY

  if (!secretKey) {
    console.warn('[reCAPTCHA] Secret key not configured')
    return {
      success: false,
      score: 0,
      action: '',
      challenge_ts: '',
      hostname: '',
      error: 'reCAPTCHA not configured',
    }
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${secretKey}&response=${token}`,
    })

    const result = await response.json()

    return {
      success: result.success || false,
      score: result.score || 0,
      action: result.action || '',
      challenge_ts: result.challenge_ts || '',
      hostname: result.hostname || '',
      error: result['error-codes']?.[0] || undefined,
    }
  } catch (error) {
    console.error('[reCAPTCHA] Verification error:', error)
    return {
      success: false,
      score: 0,
      action: '',
      challenge_ts: '',
      hostname: '',
      error: 'Verification failed',
    }
  }
}

/**
 * Evaluate reCAPTCHA score and determine if submission should be allowed
 */
export function evaluateRecaptchaScore(
  score: number,
  threshold: number = 0.5
): {
  allowed: boolean
  risk: 'low' | 'medium' | 'high'
  message: string
} {
  if (score >= 0.7) {
    return {
      allowed: true,
      risk: 'low',
      message: 'Legitimate user',
    }
  }

  if (score >= threshold) {
    return {
      allowed: true,
      risk: 'medium',
      message: 'Likely legitimate, monitoring',
    }
  }

  return {
    allowed: false,
    risk: 'high',
    message: 'Likely bot or suspicious activity',
  }
}

/**
 * Get reCAPTCHA site key from environment
 */
export function getRecaptchaSiteKey(): string {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''
}

/**
 * Check if reCAPTCHA is configured
 */
export function isRecaptchaConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY &&
    process.env.RECAPTCHA_SECRET_KEY
  )
}

