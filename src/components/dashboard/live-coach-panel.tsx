'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Brain, Headphones, Loader2, Sparkles } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'

interface PersonaProfileRow {
  contact_id: string
  persona_tags: string[]
  dominant_trait?: string | null
  anxiety_level?: number | null
  trust_score?: number | null
  decision_style?: string | null
  updated_at: string
  contacts: {
    full_name: string
    primary_phone?: string | null
  } | null
}

interface ScriptRecommendation {
  scriptVersionId: string
  title: string
  triggerLabel: string
  personaTags: string[]
  successRate: number
  usageCount: number
  toneDescriptor?: string | null
  score: number
  marketingHook?: string | null
}

export function LiveCoachPanel() {
  const { appUser } = useAuth()
  const [profiles, setProfiles] = useState<PersonaProfileRow[]>([])
  const [recommendations, setRecommendations] = useState<ScriptRecommendation[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [loadingScripts, setLoadingScripts] = useState(true)

  useEffect(() => {
    if (!appUser?.tenant_id) {
      setLoadingProfiles(false)
      setLoadingScripts(false)
      return
    }

    const supabase = createClient()

    const loadProfiles = async () => {
      setLoadingProfiles(true)
      try {
        const { data } = await supabase
          .from('contact_psych_profiles')
          .select(
            `
              contact_id,
              persona_tags,
              dominant_trait,
              anxiety_level,
              trust_score,
              decision_style,
              updated_at,
              contacts:contacts!inner(full_name, primary_phone)
            `
          )
          .eq('tenant_id', appUser.tenant_id)
          .order('updated_at', { ascending: false })
          .limit(5)

        setProfiles((data as PersonaProfileRow[]) || [])
      } catch (error) {
        console.error('[LiveCoach] failed to load persona profiles', error)
      } finally {
        setLoadingProfiles(false)
      }
    }

    const loadRecommendations = async () => {
      setLoadingScripts(true)
      try {
        const response = await fetch('/api/scripts/recommendations?limit=3', {
          credentials: 'include',
        })
        if (response.ok) {
          const payload = await response.json()
          setRecommendations(payload.data || [])
        }
      } catch (error) {
        console.error('[LiveCoach] failed to load script recommendations', error)
      } finally {
        setLoadingScripts(false)
      }
    }

    loadProfiles()
    loadRecommendations()
  }, [appUser?.tenant_id])

  return (
    <Card className="shadow-sm border-indigo-100">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Headphones className="h-5 w-5 text-indigo-500" />
            Live Coach Console
          </CardTitle>
          <CardDescription>
            Track patient sentiment, persona signals, and launch the next best scripts without leaving the dashboard.
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/analytics">
            <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
            Open Coach Analytics
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Brain className="h-4 w-4 text-emerald-500" />
                Persona Radar
              </p>
              <p className="text-xs text-gray-500">Latest receptionist interactions with psychological insights.</p>
            </div>
            {loadingProfiles && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
          </header>

          <div className="space-y-3">
            {profiles.length === 0 && !loadingProfiles && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
                Persona insights will appear here once you run the analyzer on a contact.
              </div>
            )}

            {profiles.map((profile) => (
              <article
                key={profile.contact_id}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {profile.contacts?.full_name || 'Unknown contact'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Updated{' '}
                      {formatDistanceToNow(new Date(profile.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-indigo-600">
                    <Link href={`/contacts/${profile.contact_id}`}>Open record</Link>
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile.persona_tags || []).map((tag) => (
                    <Badge key={tag} className="bg-indigo-100 text-indigo-700">
                      {tag}
                    </Badge>
                  ))}
                  {profile.dominant_trait && (
                    <Badge className="bg-emerald-100 text-emerald-700">
                      {profile.dominant_trait}
                    </Badge>
                  )}
                </div>

                <div className="mt-4 grid gap-3">
                  <PersonaMetric
                    label="Trust"
                    value={profile.trust_score ?? 0}
                    accent="emerald"
                  />
                  <PersonaMetric
                    label="Anxiety"
                    value={profile.anxiety_level ?? 0}
                    accent="amber"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Next Best Scripts</p>
              <p className="text-xs text-gray-500">
                AI-ranked playbooks to handle high-intent objections and keep momentum.
              </p>
            </div>
            {loadingScripts && <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />}
          </header>

          <div className="space-y-3">
            {recommendations.length === 0 && !loadingScripts && (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-xs text-gray-500">
                Script recommendations will appear once you log usage data.
              </div>
            )}

            {recommendations.map((rec) => (
              <article
                key={rec.scriptVersionId}
                className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{rec.title}</h3>
                    <p className="text-xs text-gray-500">{rec.triggerLabel}</p>
                  </div>
                  <Badge className="bg-indigo-100 text-indigo-700">
                    {rec.successRate.toFixed(0)}% win rate
                  </Badge>
                </div>

                <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                  {rec.marketingHook || 'Use this script to reinforce trust and move the deal forward.'}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {rec.personaTags.slice(0, 4).map((tag) => (
                    <Badge key={tag} className="bg-purple-100 text-purple-700">
                      {tag}
                    </Badge>
                  ))}
                  {rec.toneDescriptor && (
                    <Badge className="bg-sky-100 text-sky-700 capitalize">
                      {rec.toneDescriptor}
                    </Badge>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>Usage: {rec.usageCount}</span>
                  <span>Coach score: {Math.round(rec.score)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  )
}

const PersonaMetric = ({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'emerald' | 'amber'
}) => {
  const color =
    accent === 'emerald'
      ? 'bg-emerald-500/20 text-emerald-800'
      : 'bg-amber-500/20 text-amber-800'
  const progressColor = accent === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
  const normalized = Math.max(0, Math.min(100, value ?? 0))

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${color}`}>
          {normalized.toFixed(0)}
        </span>
      </div>
      <Progress value={normalized} className={`mt-1 h-2 ${progressColor}`} />
    </div>
  )
}


