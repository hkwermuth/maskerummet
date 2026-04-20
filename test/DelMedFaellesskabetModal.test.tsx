import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mock supabase client + community functions
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: vi.fn(),
  createSupabaseBrowserClient: vi.fn(),
}))

vi.mock('@/lib/community', () => ({
  fetchOwnProfile: vi.fn(() => Promise.resolve(null)),
  shareProject: vi.fn(() => Promise.resolve()),
  unshareProject: vi.fn(() => Promise.resolve()),
}))

import { useSupabase } from '@/lib/supabase/client'
import { fetchOwnProfile, shareProject, unshareProject } from '@/lib/community'
import { DelMedFaellesskabetModal } from '@/components/app/DelMedFaellesskabetModal'

const mockSupabase = {}

const baseProject = {
  id: 'proj-1',
  title: 'Min Trøje',
  is_shared: false,
  project_type: null,
  community_description: null,
  pattern_name: '',
  pattern_designer: '',
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
  vi.mocked(useSupabase).mockReturnValue(mockSupabase as never)
  vi.mocked(fetchOwnProfile).mockResolvedValue(null)
  vi.mocked(shareProject).mockResolvedValue(undefined)
  vi.mocked(unshareProject).mockResolvedValue(undefined)
  defaultProps.onClose.mockReset()
  defaultProps.onShared.mockReset()
  defaultProps.onUnshared.mockReset()
})

// ---------------------------------------------------------------------------
// C1: Required fields + checkbox before "Del projekt" works
// ---------------------------------------------------------------------------

describe('C1 Del projekt requires project_type, pattern_name, pattern_designer, and checkbox', () => {
  it('shows error and does not call shareProject when project_type is missing', async () => {
    const user = userEvent.setup()
    render(<DelMedFaellesskabetModal {...defaultProps} />)

    // Fill pattern_name and designer but skip type
    await user.type(screen.getByPlaceholderText('Fx Sortie'), 'Mina')
    await user.type(screen.getByPlaceholderText('Fx Isager'), 'Lene')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /del projekt/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(vi.mocked(shareProject)).not.toHaveBeenCalled()
  })

  it('shows error and does not call shareProject when pattern_name is missing', async () => {
    const user = userEvent.setup()
    render(<DelMedFaellesskabetModal {...defaultProps} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /projekttype/i }), 'sweater')
    await user.type(screen.getByPlaceholderText('Fx Isager'), 'Lene')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /del projekt/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(vi.mocked(shareProject)).not.toHaveBeenCalled()
  })

  it('shows error and does not call shareProject when pattern_designer is missing', async () => {
    const user = userEvent.setup()
    render(<DelMedFaellesskabetModal {...defaultProps} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /projekttype/i }), 'sweater')
    await user.type(screen.getByPlaceholderText('Fx Sortie'), 'Mina')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /del projekt/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(vi.mocked(shareProject)).not.toHaveBeenCalled()
  })

  it('shows error and does not call shareProject when checkbox is not checked', async () => {
    const user = userEvent.setup()
    render(<DelMedFaellesskabetModal {...defaultProps} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /projekttype/i }), 'sweater')
    await user.type(screen.getByPlaceholderText('Fx Sortie'), 'Mina')
    await user.type(screen.getByPlaceholderText('Fx Isager'), 'Lene')
    // intentionally do NOT check the checkbox
    await user.click(screen.getByRole('button', { name: /del projekt/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
    expect(vi.mocked(shareProject)).not.toHaveBeenCalled()
  })

  it('calls shareProject when all required fields and checkbox are filled', async () => {
    const user = userEvent.setup()
    render(<DelMedFaellesskabetModal {...defaultProps} />)

    await user.selectOptions(screen.getByRole('combobox', { name: /projekttype/i }), 'sweater')
    await user.type(screen.getByPlaceholderText('Fx Sortie'), 'Mina')
    await user.type(screen.getByPlaceholderText('Fx Isager'), 'Lene')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /del projekt/i }))

    await waitFor(() => {
      expect(vi.mocked(shareProject)).toHaveBeenCalledOnce()
    })
  })
})

// ---------------------------------------------------------------------------
// C2: Error message displayed on validation failure
// ---------------------------------------------------------------------------

describe('C2 error message shown when required fields missing', () => {
  it('renders error in role=alert element', async () => {
    const user = userEvent.setup()
    render(<DelMedFaellesskabetModal {...defaultProps} />)
    // Click without filling anything
    await user.click(screen.getByRole('button', { name: /del projekt/i }))

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert.textContent).not.toBe('')
    })
  })
})

// ---------------------------------------------------------------------------
// C3: "Fjern fra fællesskabet" only shown when is_shared is true
// ---------------------------------------------------------------------------

describe('C3 Fjern fra fællesskabet button visibility', () => {
  it('does NOT show "Fjern fra fællesskabet" when is_shared is false', () => {
    render(<DelMedFaellesskabetModal {...defaultProps} project={{ ...baseProject, is_shared: false }} />)
    expect(screen.queryByRole('button', { name: /fjern fra fællesskabet/i })).not.toBeInTheDocument()
  })

  it('shows "Fjern fra fællesskabet" when is_shared is true', () => {
    render(
      <DelMedFaellesskabetModal
        {...defaultProps}
        project={{ ...baseProject, is_shared: true, project_type: 'sweater', pattern_name: 'Mina', pattern_designer: 'Lene' }}
      />,
    )
    expect(screen.getByRole('button', { name: /fjern fra fællesskabet/i })).toBeInTheDocument()
  })

  it('calls unshareProject when "Fjern fra fællesskabet" is clicked', async () => {
    const user = userEvent.setup()
    render(
      <DelMedFaellesskabetModal
        {...defaultProps}
        project={{ ...baseProject, is_shared: true, project_type: 'sweater', pattern_name: 'Mina', pattern_designer: 'Lene' }}
      />,
    )
    await user.click(screen.getByRole('button', { name: /fjern fra fællesskabet/i }))
    await waitFor(() => {
      expect(vi.mocked(unshareProject)).toHaveBeenCalledOnce()
    })
  })
})
