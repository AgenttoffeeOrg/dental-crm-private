'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Download, Calendar } from 'lucide-react'

export function BillingSubscriptionTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-2xl font-bold">Enterprise Plan</h3>
              <p className="text-gray-600">$299/month • Billed annually</p>
            </div>
            <Badge className="bg-green-100 text-green-800">Active</Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Unlimited users</span>
              <span className="font-semibold">✓</span>
            </div>
            <div className="flex justify-between">
              <span>All integrations</span>
              <span className="font-semibold">✓</span>
            </div>
            <div className="flex justify-between">
              <span>Priority support</span>
              <span className="font-semibold">✓</span>
            </div>
          </div>
          <Button className="w-full mt-4">Manage Subscription</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <CreditCard className="h-8 w-8 text-gray-400" />
            <div className="flex-1">
              <p className="font-semibold">Visa ending in 4242</p>
              <p className="text-sm text-gray-600">Expires 12/2025</p>
            </div>
            <Button variant="outline" size="sm">Update</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['Oct 2025', 'Sep 2025', 'Aug 2025'].map((month) => (
              <div key={month} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <p className="font-medium">{month}</p>
                  <p className="text-sm text-gray-600">$299.00</p>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Invoice
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


