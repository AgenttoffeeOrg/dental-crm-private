/**
 * @jest-environment jsdom
 *
 * Phase 2b.11.5b — ChangeDealAffordance component tests.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChangeDealAffordance } from '../change-deal-affordance'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const CONTACT = '44444444-4444-4444-4444-444444444444'

const openStage = { is_won: false, is_lost: false }
const wonStage = { is_won: true, is_lost: false }

const deals = [
  { id: 'd-open-1', title: 'Open Alpha', stage: openStage, updated_at: '2026-05-01' },
  { id: 'd-open-2', title: 'Open Beta', stage: openStage, updated_at: '2026-05-10' },
  { id: 'd-closed', title: 'Closed Won', stage: wonStage, updated_at: '2026-06-01' },
]

jest.mock('@/lib/supabase-client', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch as typeof fetch

beforeEach(() => {
  jest.clearAllMocks()
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ activity: { deal_id: 'd-open-2' } }),
  })
})

describe('ChangeDealAffordance', () => {
  it('renders nothing when contact has zero deals', () => {
    const { container } = render(
      <ChangeDealAffordance
        mode="preview"
        contactId={CONTACT}
        tenantId={TENANT}
        deals={[]}
        currentDealId={null}
        currentDealTitle={null}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders Deal title chip when currentDealId is set', () => {
    render(
      <ChangeDealAffordance
        mode="preview"
        contactId={CONTACT}
        tenantId={TENANT}
        deals={deals}
        currentDealId="d-open-1"
        currentDealTitle="Open Alpha"
      />
    )
    expect(screen.getByText(/Deal: Open Alpha/)).toBeInTheDocument()
  })

  it('shows open deals group, closed deals muted, and Detach', async () => {
    const user = userEvent.setup()
    render(
      <ChangeDealAffordance
        mode="preview"
        contactId={CONTACT}
        tenantId={TENANT}
        deals={deals}
        currentDealId="d-open-1"
        currentDealTitle="Open Alpha"
        activityTimestamps={new Map()}
      />
    )
    await user.click(screen.getByRole('button', { name: /Change/i }))
    expect(await screen.findByText('Open deals')).toBeInTheDocument()
    expect(screen.getByText('Closed deals')).toBeInTheDocument()
    expect(screen.getByTestId('deal-option-detach')).toBeInTheDocument()
    expect(screen.getByTestId('deal-option-d-open-2')).toBeInTheDocument()
    expect(screen.getByTestId('deal-option-d-closed')).toBeInTheDocument()
  })

  it('preview mode: selecting a deal calls onChange without PATCH', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <ChangeDealAffordance
        mode="preview"
        contactId={CONTACT}
        tenantId={TENANT}
        deals={deals}
        currentDealId="d-open-1"
        currentDealTitle="Open Alpha"
        onChange={onChange}
        activityTimestamps={new Map()}
      />
    )
    await user.click(screen.getByRole('button', { name: /Change/i }))
    await user.click(await screen.findByTestId('deal-option-d-open-2'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onChange).toHaveBeenCalledWith('d-open-2')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('patch mode: confirm triggers PATCH and onChange', async () => {
    const user = userEvent.setup()
    const onChange = jest.fn()
    render(
      <ChangeDealAffordance
        mode="patch"
        activityId="act-1"
        contactId={CONTACT}
        tenantId={TENANT}
        deals={deals}
        currentDealId="d-open-1"
        currentDealTitle="Open Alpha"
        onChange={onChange}
        activityTimestamps={new Map()}
      />
    )
    await user.click(screen.getByRole('button', { name: /Change/i }))
    await user.click(await screen.findByTestId('deal-option-d-open-2'))
    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/activities/act-1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ deal_id: 'd-open-2' }),
        })
      )
    })
    expect(onChange).toHaveBeenCalledWith('d-open-2')
  })
})
