'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ActivityFeedEnterprise } from '@/components/activities/activity-feed-enterprise'
import { ContactProfileDialog } from './contact-profile-dialog'
import { CreateDealDialog } from '@/components/pipeline/create-deal-dialog'
import { CreateActivityDialog } from '@/components/deals/create-activity-dialog'
// Removed modal import - we'll navigate to deal page instead
import { AIAssistantChat } from '@/components/ai/ai-assistant-chat'
import { DealTasks } from '@/components/deals/deal-tasks'
import { EmailComposerPanel } from '@/components/communications/email-composer-panel'
import { SMSComposerPanel } from '@/components/communications/sms-composer-panel'
import { ClickToCallDialer } from '@/components/communications/click-to-call-dialer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Phone, 
  Mail, 
  Calendar,
  MapPin,
  User,
  Building2,
  Star,
  Plus,
  Edit,
  MessageSquare,
  PhoneCall,
  MessageCircle,
  ArrowRight,
  DollarSign,
  Activity as ActivityIcon,
  Brain,
  Sparkles,
  Target,
  TrendingUp,
  Bot,
  Loader2,
  X
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import {
  isDealClosedByStage,
  resolveMostRecentlyActiveOpenDeal,
  type DealForAttachment,
} from '@/lib/deal-resolver'
import {
  Contact,
  Deal,
  DealWithRelations,
  PipelineStage,
  ContactPsychProfile,
  ContactPsychProfileHistory,
} from '@/types/database'
import { toast } from 'sonner'
import { useTenant, useCurrentUser } from '@/lib/hooks/use-tenant'
import { NextBestScriptPanel } from '@/components/scripts/next-best-script-panel'
import { formatDistanceToNow } from 'date-fns'
import { sanitizePhoneNumber } from '@/lib/utils/phone'
import { LearningLoopSummary } from '@/components/contacts/learning-loop-summary'
import { NextBestActionCard } from '@/components/contacts/next-best-action-card'

/**
 * Phase 2b.30.2 — Persona / psych-profile feature is paused.
 *
 * The underlying tables (`contact_psych_profiles`,
 * `contact_psych_profile_history`) don't exist yet, so every contact
 * page render was generating a Postgres 404 in the browser console.
 * Per the 2026-05-22 product discussion, we keep the code (don't
 * delete) but flip it off so the contact page is clean. Flip this
 * to `true` once the table + analyze API are designed and built.
 */
const PSYCH_PROFILE_ENABLED = false

/**
 * Phase 2b.31.1 — Learning Loop signals (sales-script success rates,
 * adoption leaders, revenue leaders) are gated too. The query against
 * `sales_script_metrics` works, but the test tenant + every fresh
 * practice has zero data, so the panel renders three "Need more data"
 * placeholder boxes that make the page look unfinished. Pause until
 * the sales-script system has organic data to surface.
 */
const LEARNING_LOOP_ENABLED = false

interface ContactDetailViewProps {
  contactId: string
}

export function ContactDetailView({ 
  contactId
}: ContactDetailViewProps) {
  const router = useRouter()
  const { tenantId } = useTenant()
  const { userId: currentUserId } = useCurrentUser()
  const [contact, setContact] = useState<Contact | null>(null)
  const [deals, setDeals] = useState<DealWithRelations[]>([])
  const [recommendedOutboundDealId, setRecommendedOutboundDealId] = useState<string | null>(
    null
  )
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createDealDialogOpen, setCreateDealDialogOpen] = useState(false)
  const [createActivityDialogOpen, setCreateActivityDialogOpen] = useState(false)
  // Removed selectedDealId state - we navigate instead of showing modal
  const [showActivityTimeline, setShowActivityTimeline] = useState(false)
  const [showAI, setShowAI] = useState(false)
  // 2b.34.3 — default to the Activity timeline (the iMessage-style
  // feed). Overview is now a minimal summary that lives one tab over.
  const [activeTab, setActiveTab] = useState<string>('activities')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  
  const sanitizedPrimaryPhone = useMemo(
    () => sanitizePhoneNumber(contact?.primary_phone ?? ''),
    [contact?.primary_phone]
  )

  // Communication panels state
  const [emailComposerOpen, setEmailComposerOpen] = useState(false)
  const [smsComposerOpen, setSmsComposerOpen] = useState(false)
  const [callDialerOpen, setCallDialerOpen] = useState(false)
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false)
  const [psychProfile, setPsychProfile] = useState<ContactPsychProfile | null>(null)
  const [psychHistory, setPsychHistory] = useState<ContactPsychProfileHistory[]>([])
  const [analyzingPersona, setAnalyzingPersona] = useState(false)

  const primaryDealId = recommendedOutboundDealId

  const dealsForAttachment: DealForAttachment[] = useMemo(
    () =>
      deals.map((deal) => ({
        id: deal.id,
        title: deal.title,
        updated_at: deal.updated_at,
        last_activity_at: deal.last_activity_at,
        stage: {
          is_won: deal.stage?.is_won ?? false,
          is_lost: deal.stage?.is_lost ?? false,
        },
      })),
    [deals]
  )

  const fetchContactData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Fetch contact details - simplified query
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single()

      if (contactError) {
        console.error('Contact error:', contactError)
        throw contactError
      }
      setContact(contactData)

      // Fetch contact's deals with stage information
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          stage:pipeline_stages(*)
        `)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })

      if (dealsError) {
        console.error('Deals error:', dealsError)
      } else {
        setDeals(dealsData || [])
      }

    } catch (error) {
      console.error('Error fetching contact data:', error)
      toast.error('Failed to load contact details')
    } finally {
      setLoading(false)
    }
  }

  const fetchPsychProfile = async () => {
    try {
      const supabase = createClient()

      const { data: profileData, error: profileError } = await supabase
        .from('contact_psych_profiles')
        .select('*')
        .eq('contact_id', contactId)
        .maybeSingle()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Psych profile error:', profileError)
        throw profileError
      }

      setPsychProfile(profileData ?? null)

      const { data: historyData, error: historyError } = await supabase
        .from('contact_psych_profile_history')
        .select('*')
        .eq('contact_id', contactId)
        .order('recorded_at', { ascending: false })
        .limit(5)

      if (historyError) {
        console.error('Psych history error:', historyError)
      } else {
        setPsychHistory(historyData ?? [])
      }
    } catch (error) {
      console.error('Error fetching psychological profile:', error)
      toast.error('Failed to load persona insights')
    }
  }

  const handleRefreshPersonaInsights = async () => {
    try {
      setAnalyzingPersona(true)
      const response = await fetch('/api/psych-profiles/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactId }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Unable to refresh persona insights')
      }

      await fetchPsychProfile()
      toast.success('Persona insights updated')
    } catch (error) {
      console.error('Failed to refresh persona insights:', error)
      toast.error(
        error instanceof Error ? error.message : 'Failed to refresh persona insights. Try again shortly.'
      )
    } finally {
      setAnalyzingPersona(false)
    }
  }

  useEffect(() => {
    fetchContactData()
    // 2b.30.2: psych profile is paused — skip the fetch so we don't
    // hit the missing table and 404 in the console on every render.
    if (PSYCH_PROFILE_ENABLED) {
      fetchPsychProfile()
    }
  }, [contactId])

  useEffect(() => {
    if (!tenantId || !contactId) return
    const loadRecommendedDeal = async () => {
      const supabase = createClient()
      const recommended = await resolveMostRecentlyActiveOpenDeal({
        tenantId,
        contactId,
        supabase,
      })
      setRecommendedOutboundDealId(recommended?.id ?? null)
    }
    void loadRecommendedDeal()
  }, [tenantId, contactId])

  const getLeadScoreColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800'
    if (score >= 60) return 'bg-orange-100 text-orange-800'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getLeadScoreLabel = (score: number) => {
    if (score >= 80) return 'Hot Lead'
    if (score >= 60) return 'Warm Lead'
    if (score >= 40) return 'Cool Lead'
    return 'Cold Lead'
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  const isDealClosed = (deal: DealWithRelations) => isDealClosedByStage(deal.stage)

  const openDeals = useMemo(
    () => deals.filter((deal) => !isDealClosed(deal)),
    [deals]
  )

  const openPipelineValue = useMemo(
    () => openDeals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0),
    [openDeals]
  )

  const wonPipelineValue = useMemo(
    () =>
      deals
        .filter((deal) => Boolean(deal.stage?.is_won))
        .reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0),
    [deals]
  )

  const lastInteractionTimestamp = useMemo(() => {
    const timestamps: string[] = []
    if (contact?.updated_at) timestamps.push(contact.updated_at)
    deals.forEach((deal) => {
      if (deal.updated_at) timestamps.push(deal.updated_at)
      if ((deal as any).last_activity_at) timestamps.push((deal as any).last_activity_at)
    })
    psychHistory.forEach((entry) => {
      if (entry.recorded_at) timestamps.push(entry.recorded_at)
    })
    if (timestamps.length === 0) return null
    return timestamps.reduce((latest, current) =>
      new Date(current) > new Date(latest) ? current : latest
    )
  }, [contact?.updated_at, deals, psychHistory])

  const lastInteractionLabel = useMemo(() => {
    if (!lastInteractionTimestamp) return 'No activity yet'
    try {
      return formatDistanceToNow(new Date(lastInteractionTimestamp), { addSuffix: true })
    } catch {
      return 'No activity yet'
    }
  }, [lastInteractionTimestamp])

  const personaLabel = useMemo(() => {
    if (!psychProfile?.dominant_trait) return 'Needs insights'
    return psychProfile.dominant_trait.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }, [psychProfile?.dominant_trait])

  const personaUpdatedLabel = useMemo(() => {
    const timestamp = psychProfile?.updated_at || psychHistory[0]?.recorded_at || null
    if (!timestamp) return 'Never analysed'
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return 'Never analysed'
    }
  }, [psychProfile?.updated_at, psychHistory])

  const summaryCards = useMemo(
    () => [
      {
        title: 'Active Deals',
        value: openDeals.length,
        helper: deals.length ? `${deals.length} total` : 'No deals yet',
        icon: Target,
        iconColor: 'text-blue-600',
        iconBg: 'bg-blue-50',
      },
      {
        title: 'Pipeline Value',
        value: formatCurrency(openPipelineValue),
        helper: wonPipelineValue
          ? `Won ${formatCurrency(wonPipelineValue)}`
          : 'No closed deals yet',
        icon: DollarSign,
        iconColor: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
      },
      {
        title: 'Last Engagement',
        value: lastInteractionLabel,
        helper: openDeals.length
          ? `${openDeals.length} in progress`
          : 'No active engagements',
        icon: ActivityIcon,
        iconColor: 'text-purple-600',
        iconBg: 'bg-purple-50',
      },
      // 2b.34.3 — Persona Focus card removed (PSYCH_PROFILE_ENABLED
      // is false; rendering "Needs insights" here was noise). The
      // strip is now Active Deals · Pipeline Value · Last Engagement —
      // three numbers, each shown in exactly one place on the page.
    ],
    [
      openDeals.length,
      deals.length,
      openPipelineValue,
      wonPipelineValue,
      lastInteractionLabel,
      personaLabel,
      personaUpdatedLabel,
      analyzingPersona,
    ]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contact details...</p>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Contact not found</h3>
        <p className="text-gray-600">The contact you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] bg-gray-50 overflow-hidden">
      {/* Left Sidebar - Contact Info */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        {/* Contact Header */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">
                {contact?.full_name || 'Loading...'}
              </h1>
              {contact?.lead_score && contact.lead_score > 0 && (
                <Badge className={`mt-1 ${getLeadScoreColor(contact.lead_score)}`}>
                  <Star className="h-3 w-3 mr-1" />
                  {getLeadScoreLabel(contact.lead_score)} ({contact.lead_score})
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setEditDialogOpen(true)} disabled={!contact}>
              <Edit className="h-4 w-4 mr-1" />
              Edit Profile
            </Button>
            <Button size="sm" variant="outline" onClick={() => setCreateDealDialogOpen(true)} disabled={!contact}>
              <Plus className="h-4 w-4 mr-1" />
              Deal
            </Button>
          </div>
        </div>

        {/* Contact Details */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto pb-24">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading contact details...</p>
            </div>
          ) : contact ? (
            <>
              {/* Basic Info - With Quick Add */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-3">
                  {/* Phone */}
                  <div className="flex items-center justify-between gap-3 group/field">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {sanitizedPrimaryPhone ? (
                        <button
                          onClick={() => setCallDialerOpen(true)}
                          className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer truncate text-left"
                        >
                          {sanitizedPrimaryPhone}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No phone number</span>
                      )}
                    </div>
                    {!sanitizedPrimaryPhone ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-green-600 hover:bg-green-50 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-green-600 hover:bg-green-50 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setCallDialerOpen(true)}
                      >
                        <PhoneCall className="h-3 w-3 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between gap-3 group/field">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {contact.primary_email ? (
                        <button
                          onClick={() => setEmailComposerOpen(true)}
                          className="text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer truncate text-left"
                        >
                          {contact.primary_email}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No email address</span>
                      )}
                    </div>
                    {!contact.primary_email ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-blue-600 hover:bg-blue-50 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-blue-600 hover:bg-blue-50 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setEmailComposerOpen(true)}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Send
                      </Button>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="flex items-center justify-between gap-3 group/field">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {contact.date_of_birth ? (
                        <span className="text-sm text-gray-900">
                          {new Date(contact.date_of_birth).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No date of birth</span>
                      )}
                    </div>
                    {!contact.date_of_birth && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-gray-600 hover:bg-gray-100 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex items-center justify-between gap-3 group/field">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {contact.address ? (
                        <span className="text-sm text-gray-900 truncate">{contact.address}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">No address</span>
                      )}
                    </div>
                    {!contact.address && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-gray-600 hover:bg-gray-100 opacity-0 group-hover/field:opacity-100"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* 2b.30.2 — Persona Insights paused. Code preserved
                  behind the PSYCH_PROFILE_ENABLED flag at the top of
                  this file. Flip the flag back to `true` once the
                  schema + analyze API are ready. */}
              {PSYCH_PROFILE_ENABLED && (
              <div className="rounded-xl border border-blue-100 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-blue-100 px-4 py-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-blue-600" />
                      Persona Insights
                    </h3>
                    <p className="text-xs text-slate-500">
                      AI-guided profile to shape tone, pacing, and follow-up strategy.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1"
                      onClick={() => router.push(`/call-coaching?contactId=${contactId}`)}
                    >
                      <Bot className="h-3.5 w-3.5" />
                      Call Coaching
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs gap-1"
                      onClick={handleRefreshPersonaInsights}
                      disabled={analyzingPersona}
                    >
                      {analyzingPersona ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Updating…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          {psychProfile ? 'Refresh' : 'Generate'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {psychProfile ? (
                  <div className="px-5 py-5 space-y-5 text-sm">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                          Primary Persona
                        </p>
                        <h4 className="text-lg font-semibold text-slate-900">{personaLabel}</h4>
                        <p className="text-xs text-slate-500">
                          Updated {personaUpdatedLabel}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[11px] bg-blue-100 text-blue-700">
                        AI Generated
                      </Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {psychProfile.anxiety_level !== null && psychProfile.anxiety_level !== undefined && (
                        <div className="rounded-lg border border-red-100 bg-red-50/60 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                              Anxiety
                            </span>
                            <span className="text-xs text-red-600 font-medium">
                              {psychProfile.anxiety_level} / 100
                            </span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-red-100 overflow-hidden">
                            <div
                              className="h-full bg-red-500"
                              style={{ width: `${Math.max(0, Math.min(psychProfile.anxiety_level ?? 0, 100))}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs text-red-700">
                            {psychProfile.anxiety_level >= 70
                              ? 'High anxiety — lead with reassurance and allow space for questions.'
                              : psychProfile.anxiety_level >= 45
                              ? 'Moderate anxiety — acknowledge concerns and set clear expectations.'
                              : 'Low anxiety — focus on outcomes and keep momentum.'}
                          </p>
                        </div>
                      )}

                      {psychProfile.trust_score !== null && psychProfile.trust_score !== undefined && (
                        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                              Trust Score
                            </span>
                            <span className="text-xs text-emerald-600 font-medium">
                              {psychProfile.trust_score} / 100
                            </span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-emerald-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${Math.max(0, Math.min(psychProfile.trust_score ?? 0, 100))}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs text-emerald-700">
                            {psychProfile.trust_score >= 70
                              ? 'High trust — you can recommend next steps confidently.'
                              : psychProfile.trust_score >= 45
                              ? 'Building trust — reinforce credibility with social proof.'
                              : 'Low trust — invest time in rapport and validation.'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Communication Style
                        </p>
                        <p className="text-sm text-slate-900 capitalize">
                          {psychProfile.communication_style?.replace(/_/g, ' ') || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(() => {
                            const style = psychProfile.communication_style?.toLowerCase()
                            switch (style) {
                              case 'analytical':
                                return 'Lead with data, comparisons, and clear next steps.'
                              case 'expressive':
                                return 'Use storytelling, energy, and future-focused language.'
                              case 'driver':
                                return 'Be concise, outcome-oriented, and respect their time.'
                              case 'amiable':
                                return 'Prioritize rapport and reassurance before details.'
                              default:
                                return 'Mirror their tone during the conversation to build trust.'
                            }
                          })()}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                          Decision Style
                        </p>
                        <p className="text-sm text-slate-900 capitalize">
                          {psychProfile.decision_style?.replace(/_/g, ' ') || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(() => {
                            const style = psychProfile.decision_style?.toLowerCase()
                            switch (style) {
                              case 'logical':
                                return 'Expect detailed reasoning and comparison before commitment.'
                              case 'collaborative':
                                return 'Invite them into the plan and co-create next steps.'
                              case 'decisive':
                                return 'Provide a confident recommendation and a clear action.'
                              case 'deliberate':
                                return 'Give space for follow-up questions and documentation.'
                              default:
                                return 'Clarify their decision process to keep momentum.'
                            }
                          })()}
                        </p>
                      </div>
                    </div>

                    {Array.isArray(psychProfile.snapshot?.persona_tags) &&
                      psychProfile.snapshot.persona_tags.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                            Persona Tags
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {psychProfile.snapshot.persona_tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-[11px] capitalize">
                                #{tag.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                    {Array.isArray(psychProfile.snapshot?.primary_concerns) &&
                      psychProfile.snapshot.primary_concerns.length > 0 && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                            Primary Concerns
                          </p>
                          <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                            {psychProfile.snapshot.primary_concerns.map((concern: string, idx: number) => (
                              <li key={idx}>{concern}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                    {psychProfile.snapshot?.recommended_approach && (
                      <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4 text-xs text-slate-700">
                        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                          Recommended Approach
                        </p>
                        <p>{psychProfile.snapshot.recommended_approach}</p>
                      </div>
                    )}

                    {psychHistory.length > 0 && (
                      <div className="pt-4 border-t border-blue-100">
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                          Recent AI updates
                        </p>
                        <div className="space-y-2">
                          {psychHistory.slice(0, 3).map((entry) => {
                            const when = entry.recorded_at
                              ? formatDistanceToNow(new Date(entry.recorded_at), { addSuffix: true })
                              : 'Recently'
                            const tags = Array.isArray(entry.snapshot?.persona_tags)
                              ? entry.snapshot.persona_tags.slice(0, 3).map((tag: string) => `#${tag.replace(/_/g, ' ')}`).join(', ')
                              : null

                            return (
                              <div
                                key={entry.id}
                                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-slate-800">
                                    Persona refreshed
                                  </p>
                                  <p className="text-[11px] text-slate-500">
                                    {tags ? `Tags: ${tags}` : 'Insights updated'}
                                  </p>
                                </div>
                                <span className="text-[11px] text-slate-400 whitespace-nowrap">
                                  {when}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-5 py-6 text-sm text-blue-800">
                    <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/60 p-6 text-center">
                      <p className="text-sm font-semibold text-blue-800 mb-2">
                        No persona insights yet
                      </p>
                      <p className="text-xs text-blue-700 max-w-xs mx-auto mb-4">
                        Run the analyzer to understand this patient&apos;s motivations, trust posture, and the tone that resonates best.
                      </p>
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={handleRefreshPersonaInsights}
                        disabled={analyzingPersona}
                      >
                        {analyzingPersona ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Analysing…
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Generate Persona Profile
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* 2b.35.1 — sidebar "All Deals" list removed. With the
                  deal-chip filter row above the activity timeline + the
                  dedicated Deals tab, this third rendering of deals was
                  the last redundancy on the page. The "New Deal" button
                  that lived inside the empty-state CTA is preserved in
                  the Quick Actions section below for the no-deals case. */}

              {/* 2b.35.1 — sidebar "Quick Actions" block removed. The
                  same Call / Email / SMS / Log Activity / New Deal
                  buttons live on the page-level quick-actions row in
                  the right column (below the NBA card). Keeping them
                  here too put quick actions in THREE places (sidebar +
                  page-level + activity-feed composer toggles). The
                  page-level row stays canonical; the activity feed
                  toggles stay because they carry the deal-chip filter
                  context (compose attaches to the active deal). */}
            </>
          ) : (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Contact not found</h3>
              <p className="text-gray-600">The contact you&apos;re looking for doesn&apos;t exist.</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        <div className="border-b border-gray-200 bg-white px-6 py-5 space-y-4">
          {/* 2b.31.2 — Next-Best-Action card sits at the top of the
              right column. Tells the operator what to DO with this
              contact right now rather than just presenting data. */}
          <NextBestActionCard
            contactId={contactId}
            tenantId={tenantId}
            onSendSms={() => {
              if (sanitizedPrimaryPhone) setSmsComposerOpen(true)
              else toast.error('Add a phone number before sending an SMS.')
            }}
            onSendEmail={() => {
              if (contact.primary_email) setEmailComposerOpen(true)
              else toast.error('Add an email address before composing.')
            }}
            onSendWhatsapp={() => setCreateActivityDialogOpen(true)}
            onCreateDeal={() => setCreateDealDialogOpen(true)}
            onViewDeal={(dealId) => router.push(`/deals/${dealId}`)}
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Quick actions
              </p>
              {/* 2b.31.3 — duplicated contact name removed; left
                  sidebar header is the canonical place. */}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (sanitizedPrimaryPhone) {
                    setCallDialerOpen(true)
                  } else {
                    toast.error('Add a phone number before placing a call.')
                  }
                }}
                disabled={!sanitizedPrimaryPhone}
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (contact.primary_email) {
                    setEmailComposerOpen(true)
                  } else {
                    toast.error('Add an email address before composing.')
                  }
                }}
                disabled={!contact.primary_email}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (sanitizedPrimaryPhone) {
                    setSmsComposerOpen(true)
                  } else {
                    toast.error('Add a phone number before sending an SMS.')
                  }
                }}
                disabled={!sanitizedPrimaryPhone}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                SMS
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateActivityDialogOpen(true)}
              >
                <ActivityIcon className="h-4 w-4 mr-2" />
                Log Activity
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCreateDealDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Deal
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.title} className="border border-gray-200 rounded-2xl shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {card.title}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">
                          {card.value}
                        </p>
                        {card.helper && (
                          <p className="text-xs text-gray-500 mt-1">{card.helper}</p>
                        )}
                      </div>
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${card.iconBg}`}
                      >
                        <Icon className={`h-5 w-5 ${card.iconColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {LEARNING_LOOP_ENABLED && (
          <div className="mt-4">
            <LearningLoopSummary
              tenantId={tenantId}
              onOpenCoaching={() => router.push(`/call-coaching?contactId=${contactId}`)}
            />
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-0"
        >
          <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
            {/* 2b.35.1 — Overview tab removed. After the 2b.34.3 cleanup
                the Overview tab contained only the Deal Overview cards,
                which exactly duplicated the Deals tab next door. Two
                tabs now: Activity (default, the operator's main lens)
                and Deals (the canonical per-contact deals view). */}
            <TabsList className="grid w-full grid-cols-2 max-w-xl">
              <TabsTrigger value="activities">Activity</TabsTrigger>
              <TabsTrigger value="deals">Deals ({deals.length})</TabsTrigger>
            </TabsList>
          </div>

          {/* Deals Tab */}
          <TabsContent value="deals" className="mt-0">
            <div className="p-6 bg-gray-50">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Deals</h3>
                <Button size="sm" onClick={() => setCreateDealDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Deal
                </Button>
              </div>
              
              {deals.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {deals.map(deal => {
                    const isWon = deal.stage?.name?.toLowerCase() === 'closed_won'
                    const isLost = deal.stage?.name?.toLowerCase() === 'closed_lost'
                    const isActive = !isWon && !isLost
                    
                    return (
                      <div
                        key={deal.id}
                        onClick={() => router.push(`/deals/${deal.id}`)}
                        className={`p-4 rounded-lg border cursor-pointer group transition-all hover:shadow-md ${
                          isActive ? 'bg-white border-blue-200 hover:border-blue-300' :
                          isWon ? 'bg-green-50 border-green-200 hover:border-green-300' :
                          isLost ? 'bg-red-50 border-red-200 hover:border-red-300' :
                          'bg-gray-50 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className={`font-semibold text-sm mb-1 ${
                              isActive ? 'text-blue-900' :
                              isWon ? 'text-green-900' :
                              isLost ? 'text-red-900' :
                              'text-gray-900'
                            }`}>
                              {deal.title}
                            </h4>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                isActive ? 'border-blue-300 text-blue-700' :
                                isWon ? 'border-green-300 text-green-700' :
                                isLost ? 'border-red-300 text-red-700' :
                                'border-gray-300 text-gray-700'
                              }`}
                            >
                              {deal.stage?.name}
                            </Badge>
                          </div>
                          <ArrowRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isActive ? 'text-blue-400' :
                            isWon ? 'text-green-400' :
                            isLost ? 'text-red-400' :
                            'text-gray-400'
                          }`} />
                        </div>
                        
                        {deal.value_estimate_cents > 0 && (
                          <div className={`text-lg font-bold mb-2 ${
                            isActive ? 'text-blue-700' :
                            isWon ? 'text-green-700' :
                            isLost ? 'text-red-700' :
                            'text-gray-700'
                          }`}>
                            {formatCurrency(deal.value_estimate_cents)}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Created {new Date(deal.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Target className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No deals yet</h4>
                    <p className="text-gray-600 mb-4">Create the first deal for this customer</p>
                    <Button onClick={() => setCreateDealDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Deal
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Activities & Tasks Tab */}
          <TabsContent value="activities" className="mt-0">
            <div className="p-6 bg-gray-50">
              <ActivityFeedEnterprise
                contactId={contactId}
                dealId={recommendedOutboundDealId ?? undefined}
                onActivityCreated={fetchContactData}
                showAllContactActivities={true}
                tenantId={tenantId}
                contactEmail={contact?.primary_email}
                contactPhone={sanitizedPrimaryPhone}
                contactName={contact?.full_name}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs - Only render when contact is loaded */}
      {contact && !loading && (
        <>
          <ContactProfileDialog
            contact={contact}
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onContactUpdated={fetchContactData}
            mode="edit"
          />

          <CreateDealDialog
            open={createDealDialogOpen}
            onOpenChange={setCreateDealDialogOpen}
            onDealCreated={fetchContactData}
            preselectedContactId={contactId}
          />

          {/* Phase 2b.1.b.2: Forward tenantId so the dialog's anon-key
              insert satisfies the activities RLS WITH CHECK (omitted
              tenant_id → null → 42501). The deal-page fix shipped in
              2b.1.b.1 (commit 248ca74); this is the contact-page sibling.
              `preselectedContactId` was a non-existent prop on this dialog
              ("doubly broken") — dropped on the same change. */}
          <CreateActivityDialog
            open={createActivityDialogOpen}
            onOpenChange={setCreateActivityDialogOpen}
            onActivityCreated={fetchContactData}
            contactId={contactId}
            tenantId={tenantId ?? undefined}
          />
        </>
      )}

      {/* NO MORE DEAL DETAIL MODAL - Navigate to /deals/[id] instead */}

      {/* AI Assistant - Toggleable Slider from Right */}
      {aiAssistantOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 z-[60]" 
            onClick={() => setAiAssistantOpen(false)}
          />
          
          {/* AI Sidebar Panel */}
          <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-[70] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">AI Assistant</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setAiAssistantOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* AI Chat Content */}
            <div className="flex-1 overflow-hidden">
              <AIAssistantChat
                context="contact"
                contextId={contactId}
              />
            </div>
          </div>
        </>
      )}

      {/* Floating AI Assistant Button - Premium Design */}
      {!aiAssistantOpen && (
        <Button
          onClick={() => setAiAssistantOpen(true)}
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-2xl bg-gradient-to-br from-brand-navy-600 via-brand-navy-700 to-blue-700 hover:from-brand-navy-700 hover:via-brand-navy-800 hover:to-blue-800 hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] z-50 group border-2 border-white transition-all duration-300"
          size="icon"
        >
          <div className="absolute inset-0 rounded-full bg-white/20 animate-pulse"></div>
          <Bot className="h-7 w-7 text-white group-hover:scale-110 transition-transform relative z-10" />
        </Button>
      )}

      {/* Communication Composer Panels */}
      {contact && (
        <>
          <EmailComposerPanel
            isOpen={emailComposerOpen}
            onClose={() => setEmailComposerOpen(false)}
            to={contact.primary_email}
            contactId={contactId}
            dealId={recommendedOutboundDealId ?? undefined}
            deals={dealsForAttachment}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />

          <SMSComposerPanel
            isOpen={smsComposerOpen}
            onClose={() => setSmsComposerOpen(false)}
        to={sanitizedPrimaryPhone}
            contactId={contactId}
            dealId={recommendedOutboundDealId ?? undefined}
            deals={dealsForAttachment}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />

          <ClickToCallDialer
            isOpen={callDialerOpen}
            onClose={() => setCallDialerOpen(false)}
        phoneNumber={sanitizedPrimaryPhone}
            contactName={contact.full_name}
            contactId={contactId}
            dealId={recommendedOutboundDealId ?? undefined}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />
        </>
      )}
    </div>
  )
}