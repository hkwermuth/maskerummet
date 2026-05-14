/**
 * Tests for YarnFavoriteButton (favorit-garn feature).
 *
 * AC1 — Renderer null for ulogget bruger (ingen user)
 * AC2 — Renderer fyldt hjerte når isFavorite=true indlæses fra DB
 * AC3 — Klik kalder upsert når ikke-favorit / delete når favorit
 * AC4 — aria-pressed afspejler isFavorite-state
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockGetUser = vi.fn()
const mockMaybeSingle = vi.fn()
const mockEqUser = vi.fn()
const mockEqYarn = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()
const mockDeleteEqUser = vi.fn()
const mockDeleteEqYarn = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupNoUser() {
  mockGetUser.mockResolvedValue({ data: { user: null } })
}

function setupUser(isFavorite: boolean) {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
  mockMaybeSingle.mockResolvedValue({ data: isFavorite ? { yarn_id: 'yarn-abc' } : null, error: null })
  mockEqYarn.mockReturnValue({ maybeSingle: mockMaybeSingle })
  mockEqUser.mockReturnValue({ eq: mockEqYarn })
  mockSelect.mockReturnValue({ eq: mockEqUser })

  // upsert chain
  mockUpsert.mockResolvedValue({ error: null })

  // delete chain
  mockDeleteEqYarn.mockResolvedValue({ error: null })
  mockDeleteEqUser.mockReturnValue({ eq: mockDeleteEqYarn })
  mockDelete.mockReturnValue({ eq: mockDeleteEqUser })

  mockFrom.mockReturnValue({
    select: mockSelect,
    upsert: mockUpsert,
    delete: mockDelete,
  })
}

async function renderButton(yarnId = 'yarn-abc') {
  const { YarnFavoriteButton } = await import('@/components/catalog/YarnFavoriteButton')
  return render(<YarnFavoriteButton yarnId={yarnId} />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('YarnFavoriteButton', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('AC1 — renderer null (ingenting) for ulogget bruger', async () => {
    setupNoUser()
    const { container } = await renderButton()

    await waitFor(() => {
      // getUser er resolved — status er nu 'hidden', komponenten returnerer null
      expect(mockGetUser).toHaveBeenCalled()
    })

    // Ingen button i DOM
    expect(container.firstChild).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('AC2 — renderer fyldt hjerte (aria-pressed=true) når isFavorite=true', async () => {
    setupUser(true)
    await renderButton()

    const btn = await screen.findByRole('button', { name: 'Fjern fra favoritter' })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('AC4 — aria-pressed=false og label "Tilføj" når ikke-favorit', async () => {
    setupUser(false)
    await renderButton()

    const btn = await screen.findByRole('button', { name: 'Tilføj til favoritter' })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('AC3a — klik kalder upsert når ikke-favorit', async () => {
    setupUser(false)
    const user = userEvent.setup()
    await renderButton()

    const btn = await screen.findByRole('button', { name: 'Tilføj til favoritter' })
    await user.click(btn)

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledOnce()
    })
    // upsert med korrekte felter
    expect(mockUpsert.mock.calls[0][0]).toMatchObject({ user_id: 'user-1', yarn_id: 'yarn-abc' })
  })

  it('AC3b — klik kalder delete når favorit', async () => {
    setupUser(true)
    const user = userEvent.setup()
    await renderButton()

    const btn = await screen.findByRole('button', { name: 'Fjern fra favoritter' })
    await user.click(btn)

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  it('AC3c — ved fejl revertes state og fejl-tekst vises', async () => {
    setupUser(false)
    // Lad upsert fejle
    mockUpsert.mockResolvedValueOnce({ error: new Error('Network error') })

    const user = userEvent.setup()
    await renderButton()

    const btn = await screen.findByRole('button', { name: 'Tilføj til favoritter' })
    await user.click(btn)

    // State revertes — knappen er nu ikke-favorit igen
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tilføj til favoritter' })).toBeInTheDocument()
    })
    // Fejl-tekst vises
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('alert').textContent).toContain('Kunne ikke gemme favorit')
  })
})
