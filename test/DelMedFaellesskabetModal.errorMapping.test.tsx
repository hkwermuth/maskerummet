/**
 * DelMedFaellesskabetModal – error-mapping test
 *
 * AC 7  Postgres error code 23514 / constraint name
 *        "projects_shared_requires_faerdig" is mapped to a Danish
 *        user-friendly message.
 *
 * AC 8  SubstitutionsSection rename: heading is "Mulige alternativer",
 *        button is "+ Foreslå alternativ".
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks – same pattern as existing DelMedFaellesskabetModal.test.tsx
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: vi.fn(),
  createSupabaseBrowserClient: vi.fn(),
}))

vi.mock('@/lib/community', () => ({
  fetchOwnProfile: vi.fn(() => Promise.resolve(null)),
  shareProject: vi.fn(),
  unshareProject: vi.fn(),
}))

// SubstitutionsSection uses createSupabaseBrowserClient directly, so we mock
// it to return a minimal supabase-like object.
const mockSupabaseForSection = {
  auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }),
}

import { useSupabase, createSupabaseBrowserClient } from '@/lib/supabase/client'
import { fetchOwnProfile, shareProject } from '@/lib/community'
import { DelMedFaellesskabetModal } from '@/components/app/DelMedFaellesskabetModal'
import { SubstitutionsSection } from '@/components/catalog/substitutions/SubstitutionsSection'

const mockSupabase = {}

const baseProject = {
  id: 'proj-1',
  title: 'Min Trøje',
  is_shared: false,
  project_type: null,
  community_description: null,
  pattern_name: '',
  pattern_designer: '',
  status: 'faerdigstrikket',
}

const baseUser = { id: 'user-1' }

const defaultProps = {
  project: baseProject,
  user: baseUser,
  onClose: vi.fn(),
  onShared: vi.fn(),
  onUnshared: vi.fn(),
}

beforeEach(() => {
  // mockReset rydder også Once-køer (mockRejectedValueOnce), så en uudkonsumeret
  // queue fra én test ikke lækker til næste.
  vi.mocked(shareProject).mockReset()
  vi.mocked(useSupabase).mockReturnValue(mockSupabase as never)
  vi.mocked(createSupabaseBrowserClient).mockReturnValue(mockSupabaseForSection as never)
  vi.mocked(fetchOwnProfile).mockResolvedValue(null)
  defaultProps.onClose.mockReset()
  defaultProps.onShared.mockReset()
  defaultProps.onUnshared.mockReset()
})

// ---------------------------------------------------------------------------
// AC 7 – Error mapping for Postgres 23514 / projects_shared_requires_faerdig
// ---------------------------------------------------------------------------

describe('AC7 – DelMedFaellesskabetModal maps Postgres 23514 to Danish error', () => {
  async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.selectOptions(screen.getByRole('combobox', { name: /projekttype/i }), 'sweater')
    await user.type(screen.getByPlaceholderText('Fx Sortie'), 'Mina')
    await user.type(screen.getByPlaceholderText('Fx Isager'), 'Lene')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /del projekt/i }))
  }

  it('shows Danish message when shareProject rejects with code 23514', async () => {
    const user = userEvent.setup()
    vi.mocked(shareProject).mockRejectedValueOnce(
      Object.assign(new Error('new row violates check constraint'), { code: '23514' })
    )

    render(<DelMedFaellesskabetModal {...defaultProps} />)
    await fillAndSubmit(user)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Projektet skal være markeret som færdigstrikket før det kan deles.'
      )
    })
  })

  it('shows Danish message when shareProject rejects with constraint name in message', async () => {
    const user = userEvent.setup()
    vi.mocked(shareProject).mockRejectedValueOnce(
      new Error('violates check constraint "projects_shared_requires_faerdig"')
    )

    render(<DelMedFaellesskabetModal {...defaultProps} />)
    await fillAndSubmit(user)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Projektet skal være markeret som færdigstrikket før det kan deles.'
      )
    })
  })

  it('shows a generic error for other errors', async () => {
    const user = userEvent.setup()
    vi.mocked(shareProject).mockRejectedValueOnce(new Error('network timeout'))

    render(<DelMedFaellesskabetModal {...defaultProps} />)
    await fillAndSubmit(user)

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert.textContent).toMatch(/kunne ikke dele/i)
      // Should NOT show the specific 23514 message for generic errors
      expect(alert.textContent).not.toMatch(/færdigstrikket/)
    })
  })
})

// ---------------------------------------------------------------------------
// AC 8 – SubstitutionsSection renamed strings
// ---------------------------------------------------------------------------

describe('AC8 – SubstitutionsSection uses renamed strings', () => {
  it('heading is "Mulige alternativer" (not "Mulige substitutter")', async () => {
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(mockSupabaseForSection as never)

    render(<SubstitutionsSection yarnId="yarn-1" substitutions={[]} />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /mulige alternativer/i })).toBeInTheDocument()
    })

    expect(screen.queryByText(/mulige substitutter/i)).not.toBeInTheDocument()
  })

  it('button label is "+ Foreslå alternativ" (not "+ Foreslå substitut")', async () => {
    vi.mocked(createSupabaseBrowserClient).mockReturnValue(mockSupabaseForSection as never)

    render(<SubstitutionsSection yarnId="yarn-1" substitutions={[]} />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /\+ foreslå alternativ/i })
      ).toBeInTheDocument()
    })

    expect(screen.queryByText(/\+ foreslå substitut/i)).not.toBeInTheDocument()
  })
})
