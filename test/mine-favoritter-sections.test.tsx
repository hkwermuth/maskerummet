/**
 * Smoke-tests for FavoriteYarnsSection og FavoriteRecipesSection.
 *
 * AC5 — FavoriteYarnsSection viser slice(0,3) som default
 * AC6 — "Vis alle X"-knap vises kun hvis yarns.length > 3 og toggler showAll
 * AC7 — FavoriteRecipesSection fjerner recipe fra lokal state optimistisk
 * AC8 — /mine-favoritter empty state vises når ingen favoritter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Mock unsaveRecipe og useSupabase ──────────────────────────────────────────

const mockUnsaveRecipe = vi.fn()
vi.mock('@/lib/data/saved-recipes', () => ({
  unsaveRecipe: (...args: unknown[]) => mockUnsaveRecipe(...args),
}))

const mockFrom = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({ from: mockFrom }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

// Stub YarnCard — vi vil ikke teste dens indre, bare at den rendres
vi.mock('@/components/catalog/YarnCard', () => ({
  YarnCard: ({ yarn }: { yarn: { id: string; brand_name?: string; name?: string } }) =>
    React.createElement('div', { 'data-testid': `yarn-card-${yarn.id}` }, yarn.name ?? yarn.id),
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

import type { Yarn } from '@/lib/types'
import type { Recipe } from '@/lib/types-recipes'

function makeYarn(id: string): Yarn {
  return {
    id,
    name: `Garn ${id}`,
    brand_name: 'TestBrand',
    slug: `garn-${id}`,
    // resterende felter som Yarn kræver — sæt til null / tomme defaults
  } as unknown as Yarn
}

const SAMPLE_RECIPE: Recipe = {
  source: 'drops',
  external_id: '268-1',
  designer: 'DROPS Design',
  name: 'Lemon Zest Cardigan',
  audience: 'dame',
  garment_type: 'cardigan',
  garment_label: 'Cardigan',
  season: 'vinter',
  needle_size: '4',
  needle_size_num: 4,
  image_url: 'https://images.garnstudio.com/drops/268/1/1-2.jpg',
  pattern_url: 'https://www.garnstudio.com/pattern.php?id=12575',
  yarns: ['BABY MERINO'],
  yarn_details: [{ name: 'BABY MERINO', fibers: '100% merinould', tags: ['uld'] }],
}

function makeRecipe(externalId: string): Recipe {
  return { ...SAMPLE_RECIPE, external_id: externalId, name: `Opskrift ${externalId}` }
}

// ── FavoriteYarnsSection tests ─────────────────────────────────────────────────

describe('FavoriteYarnsSection', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('AC5 — viser alle 3 kort når yarns.length === 3 (ingen Vis-alle-knap)', async () => {
    const { FavoriteYarnsSection } = await import('@/app/mine-favoritter/FavoriteYarnsSection')
    const yarns = [makeYarn('a'), makeYarn('b'), makeYarn('c')]
    render(<FavoriteYarnsSection yarns={yarns} />)

    expect(screen.getByTestId('yarn-card-a')).toBeInTheDocument()
    expect(screen.getByTestId('yarn-card-b')).toBeInTheDocument()
    expect(screen.getByTestId('yarn-card-c')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /vis alle/i })).toBeNull()
  })

  it('AC5 — viser kun 3 kort som default når yarns.length > 3', async () => {
    const { FavoriteYarnsSection } = await import('@/app/mine-favoritter/FavoriteYarnsSection')
    const yarns = [makeYarn('1'), makeYarn('2'), makeYarn('3'), makeYarn('4'), makeYarn('5')]
    render(<FavoriteYarnsSection yarns={yarns} />)

    expect(screen.getByTestId('yarn-card-1')).toBeInTheDocument()
    expect(screen.getByTestId('yarn-card-3')).toBeInTheDocument()
    expect(screen.queryByTestId('yarn-card-4')).toBeNull()
    expect(screen.queryByTestId('yarn-card-5')).toBeNull()
  })

  it('AC6 — "Vis alle X"-knap vises når yarns.length > 3', async () => {
    const { FavoriteYarnsSection } = await import('@/app/mine-favoritter/FavoriteYarnsSection')
    const yarns = [makeYarn('1'), makeYarn('2'), makeYarn('3'), makeYarn('4')]
    render(<FavoriteYarnsSection yarns={yarns} />)

    const btn = screen.getByRole('button', { name: /vis alle 4/i })
    expect(btn).toBeInTheDocument()
  })

  it('AC6 — klik på "Vis alle" viser samtlige kort', async () => {
    const { FavoriteYarnsSection } = await import('@/app/mine-favoritter/FavoriteYarnsSection')
    const user = userEvent.setup()
    const yarns = [makeYarn('1'), makeYarn('2'), makeYarn('3'), makeYarn('4'), makeYarn('5')]
    render(<FavoriteYarnsSection yarns={yarns} />)

    await user.click(screen.getByRole('button', { name: /vis alle 5/i }))

    expect(screen.getByTestId('yarn-card-4')).toBeInTheDocument()
    expect(screen.getByTestId('yarn-card-5')).toBeInTheDocument()
    // Knap skifter til "Vis færre"
    expect(screen.getByRole('button', { name: /vis færre/i })).toBeInTheDocument()
  })

  it('AC8 — empty state vises ved tom liste', async () => {
    const { FavoriteYarnsSection } = await import('@/app/mine-favoritter/FavoriteYarnsSection')
    render(<FavoriteYarnsSection yarns={[]} />)
    expect(screen.getByText(/ingen garn-favoritter endnu/i)).toBeInTheDocument()
  })
})

// ── FavoriteRecipesSection tests ───────────────────────────────────────────────

describe('FavoriteRecipesSection', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockUnsaveRecipe.mockResolvedValue(undefined)
  })

  it('AC7 — klik på hjerte-knap fjerner recipe optimistisk fra liste', async () => {
    const { FavoriteRecipesSection } = await import('@/app/mine-favoritter/FavoriteRecipesSection')
    const user = userEvent.setup()
    const recipes = [makeRecipe('1'), makeRecipe('2')]
    render(<FavoriteRecipesSection recipes={recipes} userId="user-1" />)

    // Begge opskrifter vises
    expect(screen.getByText('Opskrift 1')).toBeInTheDocument()
    expect(screen.getByText('Opskrift 2')).toBeInTheDocument()

    // Klik på "Fjern Opskrift 1 fra favoritter"-knap
    const removeBtn = screen.getByRole('button', { name: /fjern opskrift 1 fra favoritter/i })
    await user.click(removeBtn)

    // Optimistisk fjernelse — Opskrift 1 er nu væk fra DOM
    await waitFor(() => {
      expect(screen.queryByText('Opskrift 1')).toBeNull()
    })
    // Opskrift 2 er stadig der
    expect(screen.getByText('Opskrift 2')).toBeInTheDocument()
    // unsaveRecipe kaldt
    expect(mockUnsaveRecipe).toHaveBeenCalledOnce()
  })

  it('AC7 — ved fejl revertes liste (opskrift dukker op igen)', async () => {
    const { FavoriteRecipesSection } = await import('@/app/mine-favoritter/FavoriteRecipesSection')
    mockUnsaveRecipe.mockRejectedValueOnce(new Error('Network'))
    const user = userEvent.setup()
    const recipes = [makeRecipe('1')]
    render(<FavoriteRecipesSection recipes={recipes} userId="user-1" />)

    const removeBtn = screen.getByRole('button', { name: /fjern opskrift 1 fra favoritter/i })
    await user.click(removeBtn)

    // Optimistisk: forsvinder kortvarigt, men revertes
    await waitFor(() => {
      expect(screen.getByText('Opskrift 1')).toBeInTheDocument()
    })
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('AC8 — empty state vises ved tom liste', async () => {
    const { FavoriteRecipesSection } = await import('@/app/mine-favoritter/FavoriteRecipesSection')
    render(<FavoriteRecipesSection recipes={[]} userId="user-1" />)
    expect(screen.getByText(/ingen opskrift-favoritter endnu/i)).toBeInTheDocument()
  })
})
