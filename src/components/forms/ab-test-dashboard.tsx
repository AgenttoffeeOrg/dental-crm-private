'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Trophy, Target, Plus } from 'lucide-react'
import type { ABTestResult } from '@/lib/forms/ab-testing'

interface ABTestDashboardProps {
  formId: string
  results: ABTestResult[]
  onCreateVariant?: () => void
  onDeclareWinner?: (variantId: string) => void
}

export function ABTestDashboard({
  formId,
  results,
  onCreateVariant,
  onDeclareWinner,
}: ABTestDashboardProps) {
  const [sortedResults, setSortedResults] = useState<ABTestResult[]>([])

  useEffect(() => {
    // Sort by conversion rate (descending)
    const sorted = [...results].sort((a, b) => b.conversionRate - a.conversionRate)
    setSortedResults(sorted)
  }, [results])

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No A/B Tests Running</h3>
          <p className="text-gray-600 mb-4">
            Create a variant to test different versions of your form and find what converts best
          </p>
          {onCreateVariant && (
            <Button onClick={onCreateVariant}>
              <Plus className="h-4 w-4 mr-2" />
              Create Variant
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  const hasWinner = results.some(r => r.isWinner)
  const bestPerformer = sortedResults[0]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            A/B Test Results
          </CardTitle>
          {hasWinner && (
            <Badge className="bg-green-600 text-white">
              <Trophy className="h-3 w-3 mr-1" />
              Winner Declared
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Compare variant performance and optimize for conversions
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {sortedResults.map((result, index) => {
          const isBest = index === 0 && !hasWinner
          const isWinner = result.isWinner

          return (
            <div
              key={result.variantId}
              className={`
                border rounded-lg p-4
                ${isWinner ? 'bg-green-50 border-green-300 ring-2 ring-green-200' : 'bg-white'}
                ${isBest && !isWinner ? 'border-blue-300' : ''}
              `}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{result.variantName}</h4>
                    {isWinner && (
                      <Badge className="bg-green-600 text-white">
                        <Trophy className="h-3 w-3 mr-1" />
                        Winner
                      </Badge>
                    )}
                    {isBest && !isWinner && (
                      <Badge variant="outline" className="border-blue-500 text-blue-700">
                        Leading
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {result.views.toLocaleString()} views • {result.submissions.toLocaleString()} conversions
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {result.conversionRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-gray-500">Conversion Rate</p>
                </div>
              </div>

              {/* Conversion Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">Conversion Progress</span>
                  <span className="font-medium">{result.submissions} / {result.views}</span>
                </div>
                <Progress value={result.conversionRate} className="h-2" />
              </div>

              {/* Statistical Significance */}
              {result.statisticalSignificance > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
                  <p className="text-xs text-blue-800">
                    <strong>Statistical Significance:</strong> {result.statisticalSignificance.toFixed(0)}%
                    {result.statisticalSignificance >= 95 && ' - Reliable result! ✓'}
                  </p>
                </div>
              )}

              {/* Actions */}
              {!isWinner && isBest && result.submissions >= 50 && result.statisticalSignificance >= 95 && onDeclareWinner && (
                <Button
                  onClick={() => onDeclareWinner(result.variantId)}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Declare as Winner
                </Button>
              )}
            </div>
          )
        })}

        {/* Comparison Summary */}
        {results.length >= 2 && !hasWinner && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-2 text-sm">Comparison:</h4>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p>
                <strong>{bestPerformer.variantName}</strong> is performing{' '}
                {results.length > 1 && (
                  <>
                    {((bestPerformer.conversionRate / sortedResults[1].conversionRate - 1) * 100).toFixed(1)}%
                    better than the next variant
                  </>
                )}
              </p>
              {bestPerformer.submissions < 50 && (
                <p className="text-xs text-gray-600 mt-2">
                  Need {50 - bestPerformer.submissions} more conversions for statistical confidence
                </p>
              )}
            </div>
          </div>
        )}

        {/* Add Variant Button */}
        {results.length < 4 && !hasWinner && onCreateVariant && (
          <Button onClick={onCreateVariant} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Variant {String.fromCharCode(65 + results.length)}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

