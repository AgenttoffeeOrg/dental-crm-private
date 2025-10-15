'use client'

/**
 * A/B Testing Dashboard Modal
 * Manage and view A/B test results for forms
 * 
 * Features:
 * - Create test variants
 * - View test results
 * - Automatic winner selection
 * - Statistical significance
 */

import { X, Plus, TrendingUp, Users, Eye, Target } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { MarketingForm } from '@/hooks/use-marketing-forms'

interface ABTestingDashboardModalProps {
  open: boolean
  onClose: () => void
  form: MarketingForm
}

export function ABTestingDashboardModal({
  open,
  onClose,
  form,
}: ABTestingDashboardModalProps) {
  // Mock data for demonstration
  const mockTests = [
    {
      id: '1',
      name: 'Button Color Test',
      status: 'running',
      startDate: '2025-01-10',
      variants: [
        {
          id: 'a',
          name: 'Blue Button (Control)',
          views: 1250,
          submissions: 125,
          conversionRate: 10.0,
          isControl: true,
        },
        {
          id: 'b',
          name: 'Green Button',
          views: 1230,
          submissions: 147,
          conversionRate: 11.95,
          isControl: false,
        },
      ],
    },
    {
      id: '2',
      name: 'Form Length Test',
      status: 'completed',
      startDate: '2024-12-15',
      endDate: '2025-01-05',
      winner: 'a',
      variants: [
        {
          id: 'a',
          name: 'Short Form (5 fields)',
          views: 2100,
          submissions: 315,
          conversionRate: 15.0,
          isControl: true,
        },
        {
          id: 'b',
          name: 'Long Form (10 fields)',
          views: 2050,
          submissions: 246,
          conversionRate: 12.0,
          isControl: false,
        },
      ],
    },
  ]

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-4 bottom-4 md:inset-x-20 md:top-20 md:bottom-20 bg-white rounded-lg shadow-2xl z-[60] flex flex-col max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">A/B Testing Dashboard</h2>
            <p className="text-sm text-gray-600 mt-1">{form.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert('Create test feature coming soon!')}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Test
            </Button>
            <Button onClick={onClose} variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mockTests.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
                  <Target className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No A/B tests yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first A/B test to optimize your form's conversion rate
                </p>
                <Button onClick={() => alert('Create test feature coming soon!')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Test
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {mockTests.map((test) => (
                <Card key={test.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{test.name}</h3>
                        {test.status === 'running' ? (
                          <Badge className="bg-blue-500">Running</Badge>
                        ) : test.status === 'completed' ? (
                          <Badge className="bg-green-500">Completed</Badge>
                        ) : (
                          <Badge variant="outline">Draft</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        Started: {test.startDate}
                        {test.endDate && ` • Ended: ${test.endDate}`}
                      </p>
                    </div>
                    {test.winner && (
                      <Badge className="bg-yellow-500">
                        <Target className="h-3 w-3 mr-1" />
                        Winner Declared
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {test.variants.map((variant) => (
                      <Card
                        key={variant.id}
                        className={`p-4 ${
                          test.winner === variant.id ? 'border-2 border-yellow-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{variant.name}</h4>
                          {variant.isControl && (
                            <Badge variant="outline" className="text-xs">Control</Badge>
                          )}
                          {test.winner === variant.id && (
                            <Badge className="bg-yellow-500 text-xs">Winner</Badge>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600 flex items-center gap-1">
                                <Eye className="h-3 w-3" />
                                Views
                              </span>
                              <span className="font-semibold">{variant.views.toLocaleString()}</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600 flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                Submissions
                              </span>
                              <span className="font-semibold">{variant.submissions.toLocaleString()}</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                Conversion Rate
                              </span>
                              <span className="font-semibold text-lg">
                                {variant.conversionRate.toFixed(2)}%
                              </span>
                            </div>
                            <Progress value={variant.conversionRate * 5} className="h-2" />
                          </div>

                          {!variant.isControl && test.status === 'running' && (
                            <div className="pt-2 border-t">
                              <p className="text-xs text-gray-600">
                                {variant.conversionRate > test.variants[0].conversionRate ? (
                                  <span className="text-green-600 font-semibold">
                                    +{(variant.conversionRate - test.variants[0].conversionRate).toFixed(2)}% better
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-semibold">
                                    {(variant.conversionRate - test.variants[0].conversionRate).toFixed(2)}% worse
                                  </span>
                                )}
                                {' '}than control
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {test.status === 'running' && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          Test is running. Statistical significance will be determined automatically.
                        </p>
                        <Button variant="outline" size="sm">
                          Stop Test
                        </Button>
                      </div>
                    </div>
                  )}

                  {test.winner && (
                    <div className="mt-4 pt-4 border-t bg-yellow-50 -m-6 p-6 rounded-b-lg">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-yellow-600" />
                        <p className="font-semibold text-yellow-900">
                          {test.variants.find(v => v.id === test.winner)?.name} won with{' '}
                          {test.variants.find(v => v.id === test.winner)?.conversionRate.toFixed(2)}% conversion rate
                        </p>
                      </div>
                      <p className="text-sm text-yellow-800 mt-2">
                        This variant will now be used for all visitors.
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-6">
              <div>
                <span className="font-semibold">{mockTests.filter(t => t.status === 'running').length}</span> Running
              </div>
              <div>
                <span className="font-semibold">{mockTests.filter(t => t.status === 'completed').length}</span> Completed
              </div>
            </div>
            <Button variant="outline" size="sm">
              Export Results
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

