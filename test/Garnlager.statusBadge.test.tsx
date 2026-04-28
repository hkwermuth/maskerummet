/**
 * Mit Garnlager — status-badge på alle kort + default sortering.
 *
 * AC1: Hvert garn-kort viser status-label i top-venstre hjørne for ALLE
 *      4 statusser (På lager, I brug, Brugt op, Ønskeliste).
 * AC2: Default-sortering er status-rækkefølgen: På lager → I brug → Brugt op → Ønskeliste,
 *      derefter alfabetisk på navn.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({ from: mockFrom }),
}))
vi.mock('@/lib/supabase/mappers', () => ({
  toDb: (x: unknown) => x,
  fromDb: (x: unknown) => x,
}))
vi.mock('@/lib/supabase/storage', () => ({ uploadFile: vi.fn() }))
vi.mock('@/lib/catalog', () => ({
  searchYarnsFull: vi.fn().mockResolvedValue([]),
  fetchYarnFullById: vi.fn().mockResolvedValue(null),
  fetchColorsForYarn: vi.fn().mockResolvedValue([]),
  displayYarnName: vi.fn((y) => (y ? y.full_name ?? y.name ?? '' : '')),
  applyCatalogYarnOnlyToForm: vi.fn((yarn, prev) => ({ ...(prev ?? {}), catalogYarnId: yarn.id })),
  applyCatalogYarnColorToForm: vi.fn((yarn, _c, prev) => ({ ...(prev ?? {}), catalogYarnId: yarn.id })),
  metrageFromYarn: vi.fn(() => ''),
  pindstrFromYarn: vi.fn(() => ''),
}))
vi.mock('@/lib/data/colorFamilies', () => ({
  detectColorFamily: vi.fn(() => null),
  COLOR_FAMILY_LABELS: [],
  COLOR_FAMILY_DEFAULT_HEX: {},
  yarnMatchesStashSearch: vi.fn(() => true),
}))
vi.mock('@/lib/export/exportGarnlager', () => ({ exportGarnlager: vi.fn() }))
vi.mock('@/components/app/BarcodeScanner', () => ({ default: () => null }))
vi.mock('@/components/app/BrugNoeglerModal', () => ({ default: () => null }))

const BASE_YARN = {
  id: 'y-base', name: 'Bella', brand: 'Permin',
  colorName: 'Rosa', colorCode: '001', colorCategory: 'rosa',
  fiber: 'Uld', weight: 'dk', pindstr: '4', metrage: 100,
  antal: 5, status: 'På lager', hex: '#E1A1B0', hexColors: [],
  noter: '', barcode: null, imageUrl: null,
  catalogYarnId: null, catalogColorId: null, catalogImageUrl: null,
  brugtTilProjekt: '', brugtOpDato: '',
}

const FAKE_USER = { id: 'user-1', email: 'test@test.dk' }

function mockYarns(yarns: unknown[]) {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'projects') {
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockReturnThis(),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: yarns, error: null }),
    }
  })
}

let Garnlager: React.ComponentType<{ user: unknown; onRequestLogin: () => void }>

beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import('@/components/app/Garnlager.jsx')
  Garnlager = mod.default
})

async function waitForStatsLoaded() {
  await waitFor(() => {
    expect(screen.getByText('Garntyper')).toBeInTheDocument()
  })
}

function getStatusSelect() {
  const selects = document.querySelectorAll('select')
  return Array.from(selects).find(s =>
    Array.from(s.options).some(o => o.value === 'Brugt op'),
  )!
}

describe('AC1 — status-badge vises på ALLE 4 statusser i top-venstre', () => {
  it('"På lager"-status viser badge med tekst "På lager"', async () => {
    mockYarns([{ ...BASE_YARN, status: 'På lager' }])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)
    await waitForStatsLoaded()
    expect(document.querySelector('[data-status-badge="På lager"]')).toBeInTheDocument()
  })

  it('"I brug"-status viser badge med tekst "I brug"', async () => {
    mockYarns([{ ...BASE_YARN, status: 'I brug', name: 'Andet' }])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)
    await waitForStatsLoaded()
    fireEvent.change(getStatusSelect(), { target: { value: 'I brug' } })
    await waitFor(() => {
      expect(document.querySelector('[data-status-badge="I brug"]')).toBeInTheDocument()
    })
  })

  it('"Ønskeliste"-status viser badge med tekst "Ønskeliste"', async () => {
    mockYarns([{ ...BASE_YARN, status: 'Ønskeliste', name: 'Andet' }])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)
    await waitForStatsLoaded()
    fireEvent.change(getStatusSelect(), { target: { value: 'Ønskeliste' } })
    await waitFor(() => {
      expect(document.querySelector('[data-status-badge="Ønskeliste"]')).toBeInTheDocument()
    })
  })

  it('"Brugt op"-status bevarer data-testid="brugt-op-badge"', async () => {
    mockYarns([{ ...BASE_YARN, status: 'Brugt op' }])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)
    await waitForStatsLoaded()
    fireEvent.change(getStatusSelect(), { target: { value: 'Brugt op' } })
    await waitFor(() => {
      const badge = screen.getByTestId('brugt-op-badge')
      expect(badge).toBeInTheDocument()
      expect(badge.textContent).toBe('Brugt op')
    })
  })
})

describe('AC2 — default-sortering: På lager → I brug → Ønskeliste', () => {
  it('rækkefølge i DOM matcher status-rækkefølge (Brugt op skjules som default)', async () => {
    mockYarns([
      { ...BASE_YARN, id: 'y-1', name: 'Zzz', status: 'Ønskeliste' },
      { ...BASE_YARN, id: 'y-2', name: 'Aaa', status: 'I brug' },
      { ...BASE_YARN, id: 'y-3', name: 'Mmm', status: 'På lager' },
    ])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)
    await waitForStatsLoaded()

    await waitFor(() => {
      expect(document.querySelector('[data-status-badge="På lager"]')).toBeInTheDocument()
      expect(document.querySelector('[data-status-badge="I brug"]')).toBeInTheDocument()
      expect(document.querySelector('[data-status-badge="Ønskeliste"]')).toBeInTheDocument()
    })

    const statusBadges = Array.from(document.querySelectorAll('[data-status-badge]'))
    expect(statusBadges.map(s => s.getAttribute('data-status-badge'))).toEqual([
      'På lager', 'I brug', 'Ønskeliste',
    ])
  })
})
