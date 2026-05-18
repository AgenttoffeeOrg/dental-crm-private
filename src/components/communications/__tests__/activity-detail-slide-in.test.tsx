/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react'
import {
  ActivityDetailSlideIn,
  hasRealAiInsights,
} from '@/components/communications/activity-detail-slide-in'

const mockActivityRow = {
  id: 'a-1',
  type: 'sms',
  direction: 'outbound',
  subject: 'SMS',
  snippet: 'hello',
  occurred_at: new Date().toISOString(),
  metadata: {} as Record<string, unknown>,
}

jest.mock('@/lib/supabase-client', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: table === 'activities_with_integrations' ? mockActivityRow : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}))

jest.mock('@/lib/hooks/use-tenant-context', () => ({
  useTenantContext: () => ({ tenantId: 'tenant-1', userId: 'user-1' }),
}))

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn() } }))

describe('hasRealAiInsights', () => {
  it('returns true when ai_key_points is populated', () => {
    expect(hasRealAiInsights({ ai_key_points: ['Real insight'] })).toBe(true)
  })

  it('returns false when all guard fields are empty', () => {
    expect(hasRealAiInsights({ ai_purpose: 'Follow-up', ai_summary: 'Sent SMS' })).toBe(false)
  })
})

describe('ActivityDetailSlideIn AI Insights visibility', () => {
  const baseProps = {
    isOpen: true,
    onClose: jest.fn(),
    activityId: 'a-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('hides AI Insights when guard fields are empty', async () => {
    mockActivityRow.metadata = { ai_purpose: 'Follow-up' }
    render(<ActivityDetailSlideIn {...baseProps} />)
    expect(await screen.findByText('SMS')).toBeInTheDocument()
    expect(screen.queryByText('AI Insights')).not.toBeInTheDocument()
    expect(screen.queryByText('Patient interested in orthodontic treatment')).not.toBeInTheDocument()
  })

  it('shows AI Insights when ai_key_points is populated', async () => {
    mockActivityRow.metadata = { ai_key_points: ['Confirmed appointment window'] }
    render(<ActivityDetailSlideIn {...baseProps} />)
    expect(await screen.findByText('AI Insights')).toBeInTheDocument()
    expect(screen.getByText('Confirmed appointment window')).toBeInTheDocument()
  })
})
