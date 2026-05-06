'use client'

import { ExternalLink, Mail, Phone, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export interface DedupMatchedContact {
  id: string
  full_name: string | null
  primary_email: string | null
  primary_phone: string | null
  created_at: string
  last_touch_at: string | null
}

interface Props {
  contact: DedupMatchedContact
  selected: boolean
  onSelect: (contactId: string) => void
}

/**
 * Phase 2a.2b — renders one possible-match contact with a radio for "merge
 * into this contact". Click anywhere on the card to select.
 */
export function DedupMatchCard({ contact, selected, onSelect }: Props) {
  const created = safeRelative(contact.created_at)
  const lastTouch = safeRelative(contact.last_touch_at)

  return (
    <button
      type="button"
      onClick={() => onSelect(contact.id)}
      className={`w-full text-left rounded-lg border p-4 transition-all flex gap-3 ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <input
        type="radio"
        checked={selected}
        readOnly
        aria-label={`Merge into ${contact.full_name ?? 'unnamed contact'}`}
        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 text-gray-400 shrink-0" aria-hidden />
            <p className="font-semibold text-gray-900 truncate">
              {contact.full_name?.trim() || 'Unnamed contact'}
            </p>
          </div>
          <a
            href={`/contacts/${contact.id}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 shrink-0"
          >
            Open contact
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </div>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
          <div className="flex items-center gap-2 truncate">
            <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden />
            <span className="truncate">{contact.primary_email ?? '—'}</span>
          </div>
          <div className="flex items-center gap-2 truncate">
            <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" aria-hidden />
            <span className="truncate">{contact.primary_phone ?? '—'}</span>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
          {created && <span>Created {created}</span>}
          {lastTouch && <span>Last activity {lastTouch}</span>}
        </div>
      </div>
    </button>
  )
}

function safeRelative(iso: string | null): string | null {
  if (!iso) return null
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return null
  }
}
