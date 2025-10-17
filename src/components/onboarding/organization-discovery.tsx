/**
 * Organization Discovery Component
 * 
 * Used during signup to find existing organizations by email or website.
 * Prevents duplicate organizations and enables join request workflow.
 */

'use client'

import { useState, useCallback } from 'react'
import { Search, Building2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Organization {
  id: string
  name: string
  website_url: string | null
  website_host: string | null
  verified_at: string | null
  match_confidence: 'high' | 'medium' | 'low'
}

interface OrganizationDiscoveryProps {
  email?: string
  website?: string
  onOrganizationFound?: (organizations: Organization[]) => void
  onNoOrganizationFound?: () => void
  className?: string
}

export function OrganizationDiscovery({
  email,
  website,
  onOrganizationFound,
  onNoOrganizationFound,
  className = '',
}: OrganizationDiscoveryProps) {
  const [searching, setSearching] = useState(false)
  const [searchedEmail, setSearchedEmail] = useState('')
  const [searchedWebsite, setSearchedWebsite] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [matchType, setMatchType] = useState<'email' | 'website' | 'none'>('none')
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const searchOrganizations = useCallback(async (searchEmail?: string, searchWebsite?: string) => {
    if (!searchEmail && !searchWebsite) {
      setError('Please provide an email or website to search')
      return
    }

    setSearching(true)
    setError(null)
    setHasSearched(false)

    try {
      const response = await fetch('/api/organizations/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: searchEmail,
          website: searchWebsite,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search organizations')
      }

      setOrganizations(data.organizations || [])
      setMatchType(data.matchType || 'none')
      setHasSearched(true)

      if (data.found && data.organizations.length > 0) {
        onOrganizationFound?.(data.organizations)
      } else {
        onNoOrganizationFound?.()
      }
    } catch (err: any) {
      console.error('Organization discovery error:', err)
      setError(err.message || 'Failed to search organizations')
    } finally {
      setSearching(false)
    }
  }, [onOrganizationFound, onNoOrganizationFound])

  // Auto-search on mount if email/website provided
  useState(() => {
    if (email || website) {
      setSearchedEmail(email || '')
      setSearchedWebsite(website || '')
      searchOrganizations(email, website)
    }
  })

  const handleManualSearch = () => {
    searchOrganizations(searchedEmail, searchedWebsite)
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Search className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Find Your Organization
          </h3>
          <p className="text-sm text-gray-600">
            Check if your practice is already registered
          </p>
        </div>
      </div>

      {/* Search Inputs */}
      <div className="space-y-3 mb-4">
        <div>
          <label htmlFor="search-email" className="block text-sm font-medium text-gray-700 mb-1">
            Work Email
          </label>
          <input
            id="search-email"
            type="email"
            value={searchedEmail}
            onChange={(e) => setSearchedEmail(e.target.value)}
            placeholder="you@practice.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={searching}
          />
        </div>

        <div>
          <label htmlFor="search-website" className="block text-sm font-medium text-gray-700 mb-1">
            Practice Website (optional)
          </label>
          <input
            id="search-website"
            type="url"
            value={searchedWebsite}
            onChange={(e) => setSearchedWebsite(e.target.value)}
            placeholder="https://practice.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={searching}
          />
        </div>

        <button
          onClick={handleManualSearch}
          disabled={searching || (!searchedEmail && !searchedWebsite)}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
        >
          {searching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search Organizations
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">Search Failed</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && !searching && (
        <>
          {organizations.length > 0 ? (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-gray-900">
                  Found {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-2">
                {organizations.map((org) => (
                  <OrganizationCard
                    key={org.id}
                    organization={org}
                    matchType={matchType}
                  />
                ))}
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Next step:</strong> Contact your organization administrator to send you an invitation, or request to join.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                No Organizations Found
              </p>
              <p className="text-sm text-gray-600">
                You can create a new organization to get started.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Organization Card Component
 */
interface OrganizationCardProps {
  organization: Organization
  matchType: 'email' | 'website' | 'none'
}

function OrganizationCard({ organization, matchType }: OrganizationCardProps) {
  const confidenceColors = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-gray-100 text-gray-800 border-gray-200',
  }

  const confidenceLabels = {
    high: 'Verified Match',
    medium: 'Likely Match',
    low: 'Possible Match',
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-4 h-4 text-gray-600" />
            <h4 className="font-semibold text-gray-900">{organization.name}</h4>
          </div>
          
          {organization.website_url && (
            <a
              href={organization.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              {organization.website_host || organization.website_url}
            </a>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${confidenceColors[organization.match_confidence]}`}>
              {confidenceLabels[organization.match_confidence]}
            </span>
            
            {organization.verified_at && (
              <span className="flex items-center gap-1 text-xs text-green-700">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>
        </div>

        <button
          className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
          onClick={() => {
            // TODO: Navigate to join request page
            window.location.href = `/join-request?org=${organization.id}`
          }}
        >
          Request to Join
        </button>
      </div>
    </div>
  )
}

