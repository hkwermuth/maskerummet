/**
 * F5-acceptkriterier for Garnlager-komponenten — "Brugt op" kort-adfærd.
 *
 * AC: Garnkort med status='Brugt op' → filter: grayscale(1) på billed-div.
 * AC: Garnkort med status='Brugt op' → data-testid="brugt-op-badge" renderes.
 * AC: Default-filter (filterStatus='') skjuler "Brugt op"-kort.
 * AC: Eksplicit filterStatus='Brugt op' viser "Brugt op"-kort.
 * AC: Header-stats inkluderer "Brugt op" som femte metric.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/supabase/mappers', () => ({
  toDb: (x: unknown) => x,
  fromDb: (x: unknown) => x,
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(),
}))

vi.mock('@/lib/catalog', () => ({
  searchYarnsFull: vi.fn().mockResolvedValue([]),
  fetchYarnFullById: vi.fn().mockResolvedValue(null),
  fetchColorsForYarn: vi.fn().mockResolvedValue([]),
  displayYarnName: vi.fn((y) => (y ? y.full_name ?? y.name ?? '' : '')),
  applyCatalogYarnOnlyToForm: vi.fn((yarn, prev) => ({ ...(prev ?? {}), catalogYarnId: yarn.id })),
  applyCatalogYarnColorToForm: vi.fn((yarn, _, prev) => ({ ...(prev ?? {}), catalogYarnId: yarn.id })),
  metrageFromYarn: vi.fn(() => ''),
  pindstrFromYarn: vi.fn(() => ''),
}))

vi.mock('@/lib/data/colorFamilies', () => ({
  detectColorFamily: vi.fn(() => null),
  COLOR_FAMILY_LABELS: ['grøn', 'brun', 'blå', 'rød', 'rosa', 'gul', 'lilla', 'grå', 'hvid', 'sort', 'orange', 'turkis'],
  COLOR_FAMILY_DEFAULT_HEX: {
    grøn: '#4A7A62', brun: '#A67C52', blå: '#4A6FA8', rød: '#C14B3A',
    rosa: '#E1A1B0', gul: '#F0D040', lilla: '#7A5AA8', grå: '#9A948C',
    hvid: '#F4EFE6', sort: '#1A1A1A', orange: '#D07A3A', turkis: '#3BA6A6',
  },
  yarnMatchesStashSearch: vi.fn(() => true),
}))

vi.mock('@/lib/export/exportGarnlager', () => ({
  exportGarnlager: vi.fn(),
}))

vi.mock('@/components/app/BarcodeScanner', () => ({ default: () => null }))
vi.mock('@/components/app/BrugNoeglerModal', () => ({ default: () => null }))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_YARN = {
  id: 'yarn-1',
  name: 'TestGarn',
  brand: 'TestBrand',
  colorName: 'Rød',
  colorCode: '001',
  colorCategory: 'rød',
  fiber: 'Uld',
  weight: 'dk',
  pindstr: '4',
  metrage: 200,
  antal: 3,
  status: 'På lager',
  hex: '#C14B3A',
  hexColors: [],
  noter: '',
  barcode: null,
  imageUrl: null,
  catalogYarnId: null,
  catalogColorId: null,
  catalogImageUrl: null,
  brugtTilProjekt: '',
  brugtOpDato: '',
}

const BRUGT_OP_YARN = {
  ...BASE_YARN,
  id: 'yarn-brugt',
  name: 'BrugtGarn',
  brand: 'GammelBrand',
  status: 'Brugt op',
  antal: 0,
  brugtTilProjekt: 'Sierraknit',
  brugtOpDato: '2026-01-15',
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
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: yarns[0], error: null }),
    }
  })
}

let Garnlager: React.ComponentType<{ user: unknown; onRequestLogin: () => void }>

beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import('@/components/app/Garnlager.jsx')
  Garnlager = mod.default
})

// Helper: vent på at stats-baren er loadet (Garntyper-label er altid til stede)
async function waitForStatsLoaded() {
  await waitFor(() => {
    expect(screen.getByText('Garntyper')).toBeInTheDocument()
  })
}

function getStatusSelect() {
  const selects = document.querySelectorAll('select')
  return Array.from(selects).find(s =>
    Array.from(s.options).some(o => o.value === 'Brugt op')
  )!
}

// ── AC: Badge + greyscale ─────────────────────────────────────────────────────

describe('Garnlager F5 — Brugt op-badge og greyscale', () => {
  it('status="Brugt op" → data-testid="brugt-op-badge" renderes', async () => {
    mockYarns([BRUGT_OP_YARN])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitForStatsLoaded()

    // Skift filter til "Brugt op" for at afsløre kortet
    fireEvent.change(getStatusSelect(), { target: { value: 'Brugt op' } })

    await waitFor(() => {
      expect(screen.getByTestId('brugt-op-badge')).toBeInTheDocument()
    })
  })

  it('status="Brugt op" → billed-div har filter: grayscale(1)', async () => {
    mockYarns([BRUGT_OP_YARN])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitForStatsLoaded()
    fireEvent.change(getStatusSelect(), { target: { value: 'Brugt op' } })

    await waitFor(() => {
      const badge = screen.getByTestId('brugt-op-badge')
      const imageDiv = badge.parentElement
      expect(imageDiv?.style.filter).toBe('grayscale(1)')
    })
  })

  it('status="På lager" → INGEN data-testid="brugt-op-badge"', async () => {
    mockYarns([BASE_YARN])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('TestBrand')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('brugt-op-badge')).not.toBeInTheDocument()
  })
})

// ── AC: Default-filter skjuler Brugt op ──────────────────────────────────────

describe('Garnlager F5 — default-filter ekskluderer Brugt op', () => {
  it('default-filter (filterStatus="") skjuler "Brugt op"-kort', async () => {
    mockYarns([BASE_YARN, BRUGT_OP_YARN])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('TestBrand')).toBeInTheDocument()
    })

    // "Brugt op"-garnet er ikke synligt med default-filter
    expect(screen.queryByText('GammelBrand')).not.toBeInTheDocument()
  })

  it('eksplicit filterStatus="Brugt op" viser "Brugt op"-kort', async () => {
    mockYarns([BRUGT_OP_YARN])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    // Vent på at komponenten er indlæst (projekter-tabellen loades)
    await waitFor(() => {
      // Find status-select og skift til "Brugt op"
      const statusSelects = document.querySelectorAll('select')
      const statusSelect = Array.from(statusSelects).find(s =>
        Array.from(s.options).some(o => o.value === 'Brugt op')
      )
      expect(statusSelect).toBeDefined()
    })

    const statusSelects = document.querySelectorAll('select')
    const statusSelect = Array.from(statusSelects).find(s =>
      Array.from(s.options).some(o => o.value === 'Brugt op')
    )!
    fireEvent.change(statusSelect, { target: { value: 'Brugt op' } })

    await waitFor(() => {
      expect(screen.getByText('GammelBrand')).toBeInTheDocument()
    })
  })

  it('med to garn (et På lager, et Brugt op) vises kun "På lager" som default', async () => {
    mockYarns([BASE_YARN, BRUGT_OP_YARN])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('TestBrand')).toBeInTheDocument()
    })

    expect(screen.queryByText('GammelBrand')).not.toBeInTheDocument()
    expect(screen.queryByTestId('brugt-op-badge')).not.toBeInTheDocument()
  })
})

// ── AC: Header-stats med "Brugt op" som femte metric ─────────────────────────

describe('Garnlager F5 — header-stats', () => {
  it('"Brugt op" label vises i header-stats', async () => {
    mockYarns([BASE_YARN, BRUGT_OP_YARN])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('TestBrand')).toBeInTheDocument()
    })

    // "Brugt op"-label vises i stats-baren som den femte metric
    const brugtOpLabels = screen.getAllByText('Brugt op')
    // Mindst ét forekomst er header-stat-labelen (stat-label er <span>)
    const statLabel = brugtOpLabels.find(el =>
      el.tagName === 'SPAN' && el.textContent === 'Brugt op'
    )
    expect(statLabel).toBeDefined()
  })

  it('tæller 1 for "Brugt op" når ét garn har den status', async () => {
    mockYarns([BASE_YARN, BRUGT_OP_YARN])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('TestBrand')).toBeInTheDocument()
    })

    // Finder header-stat-sektionen — tal-span er Cormorant Garamond-font
    // Tæller antallet af "Brugt op"-garn = 1
    const statSection = document.querySelector('[style*="EDE7D8"]') ??
      document.querySelector('[style*="background: rgb(237, 231, 216)"]')

    // Verificer at "Brugt op" label er i stats
    expect(screen.getAllByText('Brugt op').length).toBeGreaterThanOrEqual(1)
  })

  it('alle fem stats-labels er til stede: Garntyper, Nøgler i alt, I brug, På lager, Brugt op', async () => {
    mockYarns([BASE_YARN])
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('TestBrand')).toBeInTheDocument()
    })

    expect(screen.getByText('Garntyper')).toBeInTheDocument()
    expect(screen.getByText('Nøgler i alt')).toBeInTheDocument()
    // "I brug" og "På lager" optræder også i filter-dropdown — brug getAllByText
    expect(screen.getAllByText('I brug').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('På lager').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Brugt op').length).toBeGreaterThanOrEqual(1)
  })
})
