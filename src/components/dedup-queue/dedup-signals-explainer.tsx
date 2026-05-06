'use client'

import { AlertCircle } from 'lucide-react'

export interface DedupSignals {
  email_match?: boolean
  phone_match?: boolean
  channel_identifier_match?: boolean
  multiple_email_matches?: boolean
  conflict_reason?: string | null
  internal_error?: boolean
  [key: string]: unknown
}

interface Props {
  signals: DedupSignals
}

/**
 * Phase 2a.2b — translates `match_signals` into plain English for practice
 * managers. Pure presentation; no interaction.
 */
export function DedupSignalsExplainer({ signals }: Props) {
  const reasons: string[] = []

  if (signals.phone_match && signals.conflict_reason === 'phone_matches_different_email') {
    reasons.push('Same phone number, but a different email address.')
  } else if (signals.phone_match) {
    reasons.push('Same phone number as an existing contact.')
  }

  if (signals.multiple_email_matches) {
    reasons.push('Multiple existing contacts already use this email address.')
  } else if (signals.email_match && signals.conflict_reason === 'email_matches_different_phone') {
    reasons.push('Same email address, but a different phone number.')
  }

  if (signals.channel_identifier_match) {
    reasons.push('Same WhatsApp / Instagram / Messenger ID as an existing contact.')
  }

  if (signals.internal_error) {
    reasons.push('An internal error occurred during matching — please review carefully.')
  }

  if (reasons.length === 0) {
    reasons.push('Multiple weak signals matched. Review and decide.')
  }

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-700 mt-0.5 shrink-0" aria-hidden />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-yellow-900">Why this was flagged</p>
          <ul className="text-sm text-yellow-900 space-y-1 list-disc pl-5">
            {reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
