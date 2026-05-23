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
} from '@/types/database'
import { toast } from 'sonner'
import { useTenant, useCurrentUser } from '@/lib/hooks/use-tenant'
import { formatDistanceToNow } from 'date-fns'
import { sanitizePhoneNumber } from '@/lib/utils/phone'
import { NextBestActionCard } from '@/components/contacts/next-best-action-card'
import { ContactKpiStrip } from '@/components/contacts/contact-kpi-strip'

// 2b.37 — Layout shell strip. Removed:
//   - PSYCH_PROFILE_ENABLED feature flag + the entire Persona Insights
//     UI block (anxiety / trust sliders / communication style / etc.)
//     The schema (`contact_psych_profiles`, `contact_psych_profile_history`)
//     was paused in 2b.30.2 and is being permanently replaced by the
//     lighter persona summary blurb shipping in phase 2b.40.
//   - LEARNING_LOOP_ENABLED feature flag + the LearningLoopSummary mount.
//     Sales-script metrics will live elsewhere if needed; not on the
//     contact page.
//   - The 3-card KPI summary strip (Active Deals · Pipeline Value · Last
//     Engagement). Replaced by the one-line top KPI strip in 2b.38.
//   - Activity/Deals tab structure. Replaced by the WhatsApp-style chat
//     timeline in 2b.41 (currently a "Chat layout TK" placeholder).
//   - ContactPsychProfile / ContactPsychProfileHistory type imports,
//     LearningLoopSummary + NextBestScriptPanel imports, the Brain icon.
//
// Kept for later phases:
//   - NextBestActionCard mount (removed in 2b.48).
//   - Quick-actions row in the right column (moves to sidebar in 2b.39).
//   - Contact-fields sidebar + Edit-Profile dialog (Edit-Profile
//     converts to a slide-over in 2b.47).

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

  // 2b.37 — fetchPsychProfile + handleRefreshPersonaInsights removed
  // entirely. The contact_psych_profiles + contact_psych_profile_history
  // tables were paused in 2b.30.2 and are being permanently replaced by
  // the lighter persona summary blurb shipping in phase 2b.40 (its own
  // schema, its own helper). Don't revive the old schema.

  useEffect(() => {
    fetchContactData()
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

  // 2b.37 — isDealClosed / openDeals / openPipelineValue / wonPipelineValue
  // useMemos removed. They only existed to feed the now-removed summaryCards.
  // Phase 2b.38 will re-derive deal counts and LTV from `deals` directly
  // inside the new top KPI strip component.

  // 2b.37 — lastInteractionTimestamp / lastInteractionLabel /
  // personaLabel / personaUpdatedLabel / summaryCards useMemos removed.
  // The summary KPI strip they fed has been gutted; phase 2b.38 will
  // rebuild the one-line deal-counts + LTV strip with its own minimal
  // derivations from `deals`. Persona metadata is no longer surfaced
  // on the page until 2b.40 ships the new persona summary block.

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
          {/* 2b.38 — top KPI strip. One line: deal counts (open / closed)
              + LTV split (£open + £won + £lost). Replaces the 3-card grid
              that was removed in 2b.37. Closed-lost contributes to LTV
              by design — it's still revenue that flowed through this
              contact's relationship history. Open / closed split is by
              the stage's is_won / is_lost flags (locked principle #9). */}
          <ContactKpiStrip deals={deals} />

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

        </div>

        {/* 2b.37 — placeholder for the WhatsApp-style chat layout that
            phases 2b.41–2b.46 will build in. The old Activity/Deals tabs
            + the inbox-style activity feed have been removed. During the
            intermediate phases the chat area is intentionally blank so
            each layout piece can ship in isolation behind a visible
            "TK" marker. */}
        <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
          <div className="text-center text-gray-400 text-sm">
            <p className="font-medium text-gray-500 mb-1">Chat layout TK</p>
            <p>Phases 2b.41–2b.46 will build the WhatsApp-style timeline here.</p>
          </div>
        </div>

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