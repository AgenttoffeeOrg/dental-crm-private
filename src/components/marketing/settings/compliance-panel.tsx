'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'

export function CompliancePanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>GDPR & CAN-SPAM Compliance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Email Footer Template</Label>
          <Textarea 
            rows={4}
            placeholder="© 2025 Your Practice. All rights reserved.&#10;{{unsubscribe_link}}"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="gdpr" />
          <label htmlFor="gdpr" className="text-sm">Enable GDPR compliance features</label>
        </div>
        <Button>Save Compliance Settings</Button>
      </CardContent>
    </Card>
  )
}

