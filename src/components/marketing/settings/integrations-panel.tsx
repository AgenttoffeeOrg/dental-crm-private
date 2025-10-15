'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export function IntegrationsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Third-Party Integrations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Google Analytics Tracking ID</Label>
          <Input placeholder="G-..." />
        </div>
        <div>
          <Label>Facebook Pixel ID</Label>
          <Input placeholder="..." />
        </div>
        <Button>Save Integrations</Button>
      </CardContent>
    </Card>
  )
}

