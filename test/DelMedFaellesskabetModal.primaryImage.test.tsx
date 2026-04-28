/**
 * Tests for DelMedFaellesskabetModal — primær-billede-vælger
 *
 * Dækker acceptkriterier A1-A6.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
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
import { shareProject } from '@/lib/community'
import { DelMedFaellesskabetModal } from '@/components/app/DelMedFaellesskabetModal'

const mockSupabase = {}
const baseUser = { id: 'user-1' }

// Fælles helpers til at udfylde påkrævede felter og indsende formularen
async function fillRequiredAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole('combobox', { name: /projekttype/i }), 'sweater')
  await user.type(screen.getByPlaceholderText('Fx Sortie'), 'Mina')
  await user.type(screen.getByPlaceholderText('Fx Isager'), 'Lene')
  await user.click(screen.getByRole('checkbox'))
  await user.click(screen.getByRole('button', { name: /del projekt/i }))
}

beforeEach(() => {
  vi.mocked(useSupabase).mockReturnValue(mockSupabase as never)
  vi.mocked(shareProject).mockClear()
  vi.mocked(shareProject).mockResolvedValue(undefined)
})

// ---------------------------------------------------------------------------
// AC1: Sektion vises IKKE når < 2 billeder
// ---------------------------------------------------------------------------

describe('AC1 Primær-vælger-sektion skjult ved < 2 billeder', () => {
  it('viser ikke "Hovedbillede på Fællesskabet" når project_image_urls er tom', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: [],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    expect(screen.queryByText('Hovedbillede på Fællesskabet')).not.toBeInTheDocument()
  })

  it('viser ikke "Hovedbillede på Fællesskabet" når project_image_urls har 1 billede', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    expect(screen.queryByText('Hovedbillede på Fællesskabet')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AC2: Sektion vises med én knap pr. billede når >= 2 billeder
// ---------------------------------------------------------------------------

describe('AC2 Primær-vælger-sektion vist ved >= 2 billeder', () => {
  it('viser "Hovedbillede på Fællesskabet" label', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    expect(screen.getByText('Hovedbillede på Fællesskabet')).toBeInTheDocument()
  })

  it('viser én knap pr. billede (2 billeder → 2 knapper)', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    const radiogroup = screen.getByRole('radiogroup', { name: /vælg hovedbillede/i })
    const radios = within(radiogroup).getAllByRole('radio')
    expect(radios).toHaveLength(2)
  })

  it('viser 3 knapper for 3 billeder', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: [
            'https://img.test/a.jpg',
            'https://img.test/b.jpg',
            'https://img.test/c.jpg',
          ],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    const radiogroup = screen.getByRole('radiogroup', { name: /vælg hovedbillede/i })
    expect(within(radiogroup).getAllByRole('radio')).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// AC3: Initial valg fra project.community_primary_image_index med fallback
// ---------------------------------------------------------------------------

describe('AC3 Initial valg af thumbnail', () => {
  it('billede 0 er valgt som standard (null index)', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    const radiogroup = screen.getByRole('radiogroup', { name: /vælg hovedbillede/i })
    const radios = within(radiogroup).getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('billede 1 er valgt når community_primary_image_index = 1', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: 1,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    const radiogroup = screen.getByRole('radiogroup', { name: /vælg hovedbillede/i })
    const radios = within(radiogroup).getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('fallback til 0 når community_primary_image_index er ud af range', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: 99,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    const radiogroup = screen.getByRole('radiogroup', { name: /vælg hovedbillede/i })
    const radios = within(radiogroup).getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
  })
})

// ---------------------------------------------------------------------------
// AC4: Knapper har role="radio" og aria-checked + dansk aria-label
// ---------------------------------------------------------------------------

describe('AC4 Knapper ARIA attributter', () => {
  it('knapper har role="radio"', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBeGreaterThan(0)
    for (const r of radios) {
      expect(r).toHaveAttribute('aria-checked')
    }
  })

  it('knapper har dansk aria-label', () => {
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    // Forventer at labels er på dansk og inkluderer billedenummer
    expect(screen.getByRole('radio', { name: /vælg billede 1 som hovedbillede/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /vælg billede 2 som hovedbillede/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AC5: Klik på thumbnail ændrer aria-checked
// ---------------------------------------------------------------------------

describe('AC5 Klik på thumbnail ændrer valg', () => {
  it('klik på andet billede sætter aria-checked="true" på det', async () => {
    const user = userEvent.setup()
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )
    const radio2 = screen.getByRole('radio', { name: /vælg billede 2 som hovedbillede/i })
    await user.click(radio2)
    expect(radio2).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: /vælg billede 1 som hovedbillede/i })).toHaveAttribute('aria-checked', 'false')
  })
})

// ---------------------------------------------------------------------------
// AC6: community_primary_image_index sendes i shareProject-payload
// ---------------------------------------------------------------------------

describe('AC6 community_primary_image_index i shareProject-payload', () => {
  it('sender valgt primær-index (0) i payload', async () => {
    const user = userEvent.setup()
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )

    await fillRequiredAndSubmit(user)

    await waitFor(() => expect(vi.mocked(shareProject)).toHaveBeenCalledOnce())
    const payload = vi.mocked(shareProject).mock.calls[0][3]
    expect(payload).toHaveProperty('community_primary_image_index', 0)
  })

  it('sender valgt primær-index (1) i payload når bruger klikker andet billede', async () => {
    const user = userEvent.setup()
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )

    // Vælg billede 2
    await user.click(screen.getByRole('radio', { name: /vælg billede 2 som hovedbillede/i }))

    await fillRequiredAndSubmit(user)

    await waitFor(() => expect(vi.mocked(shareProject)).toHaveBeenCalledOnce())
    const payload = vi.mocked(shareProject).mock.calls[0][3]
    expect(payload).toHaveProperty('community_primary_image_index', 1)
  })

  it('sender 0 som primary_image_index når der kun er 1 billede (< 2)', async () => {
    const user = userEvent.setup()
    render(
      <DelMedFaellesskabetModal
        project={{
          id: 'proj-1',
          title: 'Min Trøje',
          is_shared: false,
          project_type: null,
          community_description: null,
          community_size_shown: null,
          community_primary_image_index: null,
          project_image_urls: ['https://img.test/a.jpg'],
          pattern_name: '',
          pattern_designer: '',
        }}
        user={baseUser}
        onClose={vi.fn()}
        onShared={vi.fn()}
        onUnshared={vi.fn()}
      />,
    )

    await fillRequiredAndSubmit(user)

    await waitFor(() => expect(vi.mocked(shareProject)).toHaveBeenCalledOnce())
    const payload = vi.mocked(shareProject).mock.calls[0][3]
    // cleanPrimary = 0 når total < 2
    expect(payload).toHaveProperty('community_primary_image_index', 0)
  })
})

