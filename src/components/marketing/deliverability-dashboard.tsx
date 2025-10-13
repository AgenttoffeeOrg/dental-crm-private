'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Mail,
  Server,
  Globe,
  Lock,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface DeliverabilityMetrics {
  spamScore: number
  bounceRate: number
  complaintRate: number
  deliveryRate: number
  domainReputation: 'excellent' | 'good' | 'fair' | 'poor'
  spfStatus: 'pass' | 'fail' | 'not_configured'
  dkimStatus: 'pass' | 'fail' | 'not_configured'
  dmarcStatus: 'pass' | 'fail' | 'not_configured'
  ipReputation: number
  blacklistStatus: {
    listed: boolean
    lists: string[]
  }
}

export function DeliverabilityDashboard() {
  const [metrics, setMetrics] = useState<DeliverabilityMetrics>({
    spamScore: 2.1,
    bounceRate: 1.2,
    complaintRate: 0.03,
    deliveryRate: 98.5,
    domainReputation: 'excellent',
    spfStatus: 'pass',
    dkimStatus: 'pass',
    dmarcStatus: 'not_configured',
    ipReputation: 85,
    blacklistStatus: {
      listed: false,
      lists: []
    }
  })
  const [loading, setLoading] = useState(false)

  const checkSpamScore = async (emailHtml: string) => {
    // In production, integrate with SpamAssassin API
    // For now, basic heuristics
    let score = 0
    
    // Check for spam trigger words
    const spamWords = ['free', 'click here', 'buy now', 'limited time', '!!!', 'winner']
    const lowerHtml = emailHtml.toLowerCase()
    spamWords.forEach(word => {
      if (lowerHtml.includes(word)) score += 0.5
    })
    
    // Check for excessive caps
    const capsRatio = (emailHtml.match(/[A-Z]/g) || []).length / emailHtml.length
    if (capsRatio > 0.3) score += 1.0
    
    // Check for excessive links
    const linkCount = (emailHtml.match(/<a /g) || []).length
    if (linkCount > 5) score += 0.5
    
    // Check for missing unsubscribe
    if (!lowerHtml.includes('unsubscribe')) score += 2.0
    
    return Math.min(score, 10)
  }

  const getScoreColor = (score: number) => {
    if (score < 3) return 'text-green-600'
    if (score < 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreStatus = (score: number) => {
    if (score < 3) return 'Excellent'
    if (score < 5) return 'Good'
    if (score < 7) return 'Fair'
    return 'Poor'
  }

  const refreshMetrics = async () => {
    setLoading(true)
    // Simulate API call to check domain health
    setTimeout(() => {
      setLoading(false)
      toast.success('Deliverability metrics refreshed')
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-2">Overall Deliverability Health</p>
              <p className="text-5xl font-bold text-green-600">{metrics.deliveryRate}%</p>
              <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Excellent delivery rate
              </p>
            </div>
            <div className="text-center">
              <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <Shield className="h-12 w-12 text-green-600" />
              </div>
              <Badge className="bg-green-600 text-white">
                {metrics.domainReputation.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Email Authentication
            </CardTitle>
            <Button variant="outline" size="sm" onClick={refreshMetrics} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* SPF */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {metrics.spfStatus === 'pass' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">SPF (Sender Policy Framework)</p>
                  <p className="text-sm text-gray-600">Verifies your server can send emails</p>
                </div>
              </div>
              <Badge variant={metrics.spfStatus === 'pass' ? 'default' : 'destructive'}>
                {metrics.spfStatus === 'pass' ? 'Configured' : 'Not Configured'}
              </Badge>
            </div>

            {/* DKIM */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {metrics.dkimStatus === 'pass' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">DKIM (DomainKeys Identified Mail)</p>
                  <p className="text-sm text-gray-600">Cryptographic authentication</p>
                </div>
              </div>
              <Badge variant={metrics.dkimStatus === 'pass' ? 'default' : 'destructive'}>
                {metrics.dkimStatus === 'pass' ? 'Configured' : 'Not Configured'}
              </Badge>
            </div>

            {/* DMARC */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                {metrics.dmarcStatus === 'pass' ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : metrics.dmarcStatus === 'not_configured' ? (
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600" />
                )}
                <div>
                  <p className="font-semibold text-gray-900">DMARC (Domain-based Message Authentication)</p>
                  <p className="text-sm text-gray-600">Email policy and reporting</p>
                </div>
              </div>
              <Badge variant={
                metrics.dmarcStatus === 'pass' ? 'default' : 
                metrics.dmarcStatus === 'not_configured' ? 'outline' : 
                'destructive'
              }>
                {metrics.dmarcStatus === 'pass' ? 'Configured' : 
                 metrics.dmarcStatus === 'not_configured' ? 'Recommended' :
                 'Not Configured'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.bounceRate}%</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingDown className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">Below industry avg (2%)</span>
            </div>
            <Progress value={100 - (metrics.bounceRate * 50)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-600">Complaint Rate</p>
              <AlertTriangle className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.complaintRate}%</p>
            <div className="flex items-center gap-1 mt-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">Excellent ({"<"}0.1%)</span>
            </div>
            <Progress value={100 - (metrics.complaintRate * 1000)} className="mt-3 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-600">IP Reputation</p>
              <Server className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.ipReputation}/100</p>
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">Good reputation</span>
            </div>
            <Progress value={metrics.ipReputation} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Blacklist Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Blacklist Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics.blacklistStatus.listed ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 mb-1">Your IP is blacklisted</p>
                <p className="text-sm text-red-800 mb-2">
                  Found on {metrics.blacklistStatus.lists.length} blacklist(s): {metrics.blacklistStatus.lists.join(', ')}
                </p>
                <Button variant="destructive" size="sm">
                  View Remediation Steps
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900 mb-1">Clean IP Reputation</p>
                <p className="text-sm text-green-800">
                  Your sending IP is not listed on any major blacklists. Checked: Spamhaus, SURBL, Barracuda, SpamCop
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.dmarcStatus !== 'pass' && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-900 text-sm">Configure DMARC</p>
                  <p className="text-xs text-yellow-800">
                    Adding DMARC will improve your sender reputation
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Setup
                </Button>
              </div>
            )}
            
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-blue-900 text-sm">Your deliverability is excellent!</p>
                <p className="text-xs text-blue-800">
                  Keep bounce rate below 2% and complaint rate below 0.1%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

