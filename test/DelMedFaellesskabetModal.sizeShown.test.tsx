/**
 * Tests for DelMedFaellesskabetModal — "Vist i str."-felt og stor F
 *
 * Dækker acceptkriterierne 19-23.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

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
import { shareProject, unshareProject } from '@/lib/community'
import { DelMedFaellesskabetModal } from '@/components/app/DelMedFaellesskabetModal'

const mockSupabase = {}
const baseUser = { id: 'user-1' }

const baseProject = {
  id: 'proj-1',
  title: 'Min Trøje',
  is_shared: false,
  project_type: null,
  community_description: null,
  community_size_shown: null,
  pattern_name: '',
  pattern_designer: '',
}

beforeEach(() => {
  vi.mocked(useSupabase).mockReturnValue(mockSupabase as never)
  vi.mocked(shareProject).mockClear()
  vi.mocked(shareProject).mockResolvedValue(undefined)
  vi.mocked(unshareProject).mockClear()
  vi.mocked(unshareProject).mockResolvedValue(undefined)
})

// ── AC19: Modal viser nyt input-felt "Vist i str. (valgfri)" ─────────────────

describe('AC19 Vist i str. input-felt', () => {
  it('viser et input-felt med placeholder "fx M, 38 eller 98 cm bryst"', () => {
    render(
      <DelMedFaellesskabetModal
        project={baseProject}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )
    expect(screen.getByPlaceholderText('fx M, 38 eller 98 cm bryst')).toBeInTheDocument()
  })

  it('input-feltet har maxLength={50} (reviewer-fix)', () => {
    render(
      <DelMedFaellesskabetModal
        project={baseProject}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )
    const input = screen.getByPlaceholderText('fx M, 38 eller 98 cm bryst') as HTMLInputElement
    expect(input.maxLength).toBe(50)
  })

  it('input-feltet har aria-label="Vist i str." (reviewer-fix)', () => {
    render(
      <DelMedFaellesskabetModal
        project={baseProject}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )
    expect(screen.getByLabelText('Vist i str.')).toBeInTheDocument()
  })
})

// ── AC20: Felt initialiseres fra project.community_size_shown ────────────────

describe('AC20 Vist i str. — initialisering fra project', () => {
  it('tom felt når community_size_shown er null', () => {
    render(
      <DelMedFaellesskabetModal
        project={{ ...baseProject, community_size_shown: null }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )
    const input = screen.getByPlaceholderText('fx M, 38 eller 98 cm bryst') as HTMLInputElement
    expect(input.value).toBe('')
  })

  it('udfyldt felt når community_size_shown har en værdi', () => {
    render(
      <DelMedFaellesskabetModal
        project={{ ...baseProject, is_shared: true, project_type: 'sweater', pattern_name: 'Mina', pattern_designer: 'Lene', community_size_shown: 'M' }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )
    const input = screen.getByPlaceholderText('fx M, 38 eller 98 cm bryst') as HTMLInputElement
    expect(input.value).toBe('M')
  })
})

// ── AC21: Tom værdi sendes som null; udfyldt sendes som tekst ────────────────

describe('AC21 Vist i str. — null vs. tekst i payload', () => {
  it('sender community_size_shown: null når feltet er tomt', async () => {
    const user = userEvent.setup()
    render(
      <DelMedFaellesskabetModal
        project={baseProject}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )

    // Udfyld de påkrævede felter
    await user.selectOptions(screen.getByRole('combobox', { name: /projekttype/i }), 'sweater')
    await user.type(screen.getByPlaceholderText('Fx Sortie'), 'Mina')
    await user.type(screen.getByPlaceholderText('Fx Isager'), 'Lene')
    await user.click(screen.getByRole('checkbox'))
    // Lad "Vist i str." forblive tom
    await user.click(screen.getByRole('button', { name: /del projekt/i }))

    await waitFor(() => {
      expect(vi.mocked(shareProject)).toHaveBeenCalledOnce()
    })

    const payload = vi.mocked(shareProject).mock.calls[0][3]
    expect(payload.community_size_shown).toBeNull()
  })

  it('sender community_size_shown som trimmed streng når feltet er udfyldt', async () => {
    const user = userEvent.setup()
    render(
      <DelMedFaellesskabetModal
        project={baseProject}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )

    await user.selectOptions(screen.getByRole('combobox', { name: /projekttype/i }), 'sweater')
    await user.type(screen.getByPlaceholderText('Fx Sortie'), 'Mina')
    await user.type(screen.getByPlaceholderText('Fx Isager'), 'Lene')
    await user.type(screen.getByPlaceholderText('fx M, 38 eller 98 cm bryst'), '  M  ')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /del projekt/i }))

    await waitFor(() => {
      expect(vi.mocked(shareProject)).toHaveBeenCalledOnce()
    })

    const payload = vi.mocked(shareProject).mock.calls[0][3]
    expect(payload.community_size_shown).toBe('M')
  })
})

// ── AC22: Overskrift viser "Del med Fællesskabet" (stort F) / "Rediger deling" ─

describe('AC22 Modal-overskrift med stort F', () => {
  it('viser "Del med Fællesskabet" (stort F) når projektet ikke er delt', () => {
    render(
      <DelMedFaellesskabetModal
        project={{ ...baseProject, is_shared: false }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )
    expect(screen.getByText('Del med Fællesskabet')).toBeInTheDocument()
  })

  it('viser "Rediger deling" når projektet er delt', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          ...baseProject,
          is_shared: true,
          project_type: 'sweater',
          pattern_name: 'Mina',
          pattern_designer: 'Lene',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )
    expect(screen.getByText('Rediger deling')).toBeInTheDocument()
  })
})

// ── AC23: "Fjern"-knappen viser "Fjern fra Fællesskabet" (stort F) ───────────

describe('AC23 Fjern-knap — "Fjern fra Fællesskabet" med stort F', () => {
  it('viser knapteksten "Fjern fra Fællesskabet" med stort F', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          ...baseProject,
          is_shared: true,
          project_type: 'sweater',
          pattern_name: 'Mina',
          pattern_designer: 'Lene',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />
    )
    // Tjek præcis stavning med stort F
    const btn = screen.getByRole('button', { name: /fjern fra fællesskabet/i })
    expect(btn.textContent).toBe('Fjern fra Fællesskabet')
  })
})
