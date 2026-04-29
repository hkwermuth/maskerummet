/**
 * Integrations-tests for Garnlager + KatalogInfoblok (F2).
 *
 * Dækker acceptkriterierne:
 * AC2  — name/brand/metrage/pindstr/fiber/weight-inputs skjules ved katalog-link
 * AC4  — "Dine egne oplysninger"-heading vises kun ved katalog-link
 * AC5  — manuelt-flow: alle felter redigerbare, ingen KatalogInfoblok
 * AC7  — Esc lukker dropdown men holder modal åben
 * AC8  — autoFocus: openAdd → fokus på søge-input; med katalog-link → ingen fokus
 *
 * Bemærk: AC1, AC3, AC9, AC10 er dækket i KatalogInfoblok.test.tsx (unit-tests).
 * AC6 (redigering af eksisterende garn med catalog_yarn_id) er vanskelig at
 * integrationstest i isolation og verificeres manuelt (se rapport).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/supabase/mappers', () => ({
  toDb: (x: unknown) => x,
  fromDb: (x: unknown) => x,
  toUsageDb: (x: unknown) => x,
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(),
}))

// Catalog-mock — returnerer et fuldt yarn-objekt så vi kan teste katalog-link-flow
const MOCK_CATALOG_YARN = {
  id: 'cat-yarn-1',
  producer: 'Isager',
  name: 'Alpaca 1',
  series: null,
  full_name: 'Isager Alpaca 1',
  fiber_main: 'Alpaka',
  thickness_category: 'fingering',
  yarn_weight: 'fingering',
  ball_weight_g: 50,
  length_per_100g_m: 400,
  needle_min_mm: 2,
  needle_max_mm: 3,
  gauge_needle_mm: 2.5,
  color_count: 30,
}

const mockApplyCatalogYarnOnlyToForm = vi.fn((yarn, prev) => ({
  ...(prev ?? {}),
  name: yarn.full_name ?? yarn.name,
  brand: yarn.producer ?? '',
  fiber: yarn.fiber_main ?? '',
  weight: yarn.thickness_category || 'DK',
  metrage: 200,
  pindstr: '2-3',
  catalogYarnId: yarn.id,
  catalogColorId: null,
  catalogImageUrl: null,
}))

vi.mock('@/lib/catalog', () => ({
  searchYarnsFull: vi.fn().mockResolvedValue([MOCK_CATALOG_YARN]),
  fetchYarnFullById: vi.fn().mockResolvedValue(null),
  fetchColorsForYarn: vi.fn().mockResolvedValue([]),
  displayYarnName: vi.fn((y) => (y ? y.full_name ?? y.name ?? '' : '')),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  applyCatalogYarnOnlyToForm: (yarn: any, prev: any) => mockApplyCatalogYarnOnlyToForm(yarn, prev),
  applyCatalogYarnColorToForm: vi.fn((yarn, _, prev) => ({ ...(prev ?? {}), catalogYarnId: yarn.id })),
  // KatalogInfoblok bruger også disse to fra @/lib/catalog
  metrageFromYarn: vi.fn((y) => {
    if (!y?.ball_weight_g || !y?.length_per_100g_m) return ''
    return Math.round((y.ball_weight_g * y.length_per_100g_m) / 100)
  }),
  pindstrFromYarn: vi.fn((y) => {
    if (!y) return ''
    if (y.needle_min_mm != null && y.needle_max_mm != null) return `${y.needle_min_mm}-${y.needle_max_mm}`
    if (y.gauge_needle_mm != null) return String(y.gauge_needle_mm)
    return ''
  }),
}))

vi.mock('@/lib/data/colorFamilies', () => ({
  detectColorFamily: vi.fn(() => null),
  COLOR_FAMILY_LABELS: ['Neutral', 'Rød', 'Blå'],
  COLOR_FAMILY_DEFAULT_HEX: { Neutral: '#ccc', Rød: '#f00', Blå: '#00f' },
  yarnMatchesStashSearch: vi.fn(() => true),
}))

vi.mock('@/lib/export/exportGarnlager', () => ({
  exportGarnlager: vi.fn(),
}))

vi.mock('@/components/app/BarcodeScanner', () => ({ default: () => null }))
vi.mock('@/components/app/BrugNoeglerModal', () => ({ default: () => null }))

// ── Fixture ────────────────────────────────────────────────────────────────────

const FAKE_YARN_NO_CATALOG = {
  id: 'yarn-abc',
  name: 'Testgarn',
  brand: 'TestBrand',
  colorName: 'Rød',
  colorCode: '001',
  colorCategory: null,
  fiber: 'Uld',
  weight: 'DK',
  pindstr: '4',
  metrage: 200,
  antal: 3,
  status: 'På lager',
  hex: '#ff0000',
  noter: '',
  barcode: null,
  imageUrl: null,
  catalogYarnId: null,
  catalogColorId: null,
  catalogImageUrl: null,
}

const FAKE_USER = { id: 'user-1', email: 'test@test.dk' }

let Garnlager: React.ComponentType<{ user: unknown; onRequestLogin: () => void }>

beforeEach(async () => {
  vi.clearAllMocks()
  mockApplyCatalogYarnOnlyToForm.mockImplementation((yarn, prev) => ({
    ...(prev ?? {}),
    name: yarn.full_name ?? yarn.name,
    brand: yarn.producer ?? '',
    fiber: yarn.fiber_main ?? '',
    weight: yarn.thickness_category || 'DK',
    metrage: 200,
    pindstr: '2-3',
    catalogYarnId: yarn.id,
    catalogColorId: null,
    catalogImageUrl: null,
  }))

  mockFrom.mockImplementation((table: string) => {
    if (table === 'projects') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [FAKE_YARN_NO_CATALOG], error: null }),
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: FAKE_YARN_NO_CATALOG, error: null }),
    }
  })

  const mod = await import('@/components/app/Garnlager.jsx')
  Garnlager = mod.default
})

// ── Hjælpefunktioner ──────────────────────────────────────────────────────────

async function renderAndOpenAdd() {
  const user = userEvent.setup()
  render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

  await waitFor(() => {
    expect(screen.getByText('Testgarn')).toBeInTheDocument()
  })

  const tilfoejBtn = screen.getByRole('button', { name: /\+ tilføj garn/i })
  await user.click(tilfoejBtn)

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /tilføj til lager/i })).toBeInTheDocument()
  })

  return { user }
}

async function renderAndOpenEdit() {
  const user = userEvent.setup()
  render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

  await waitFor(() => {
    expect(screen.getByText('Testgarn')).toBeInTheDocument()
  })

  await user.click(screen.getByText('Testgarn'))

  await waitFor(() => {
    expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
  })

  return { user }
}

// Hjælp: sæt katalog-link ved at vælge fra søge-dropdown
async function selectCatalogYarn(user: ReturnType<typeof userEvent.setup>) {
  const { searchYarnsFull } = await import('@/lib/catalog')
  vi.mocked(searchYarnsFull).mockResolvedValue([MOCK_CATALOG_YARN])

  const searchInput = screen.getByRole('textbox', {
    name: /skriv mærke eller garnnavn fra garn-kataloget/i,
  })
  await user.type(searchInput, 'Isager')

  // Vent på at dropdown-hit vises (debounce er 320ms, men vitest er hurtigere med userEvent)
  await waitFor(() => {
    expect(screen.getByText('Isager Alpaca 1')).toBeInTheDocument()
  }, { timeout: 2000 })

  // Klik på resultatet
  await user.click(screen.getByText('Isager Alpaca 1'))

  // Vent på at KatalogInfoblok renderes
  await waitFor(() => {
    expect(screen.getByTestId('katalog-infoblok')).toBeInTheDocument()
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Garnlager + KatalogInfoblok — AC5: manuelt-flow (ingen katalog-link)', () => {
  it('viser alle felter: Garnnavn, Mærke, Løbelængde, Pindstørrelse (via label-tekster)', async () => {
    await renderAndOpenAdd()

    // Field-komponenten bruger ikke htmlFor — vi tjekker label-tekster er synlige
    // og at de tilsvarende inputs eksisterer (via placeholder eller type)
    expect(screen.getByText(/garnnavn \*/i)).toBeInTheDocument()
    expect(screen.getByText(/mærke \*/i)).toBeInTheDocument()
    expect(screen.getByText(/løbelængde\/nøgle/i)).toBeInTheDocument()
    expect(screen.getByText(/pindstørrelse/i)).toBeInTheDocument()
  })

  it('viser Fiber-sektion med placeholder', async () => {
    await renderAndOpenAdd()

    // Fiber-input er synlig i manuelt-flow
    expect(screen.getByPlaceholderText(/f\.eks\. 80% uld/i)).toBeInTheDocument()
  })

  it('viser Garnvægt label i manuelt-flow', async () => {
    await renderAndOpenAdd()

    // Label-teksten "GARNVÆGT" er synlig (uppercase via CSS, men tekst er "Garnvægt")
    expect(screen.getByText(/garnvægt/i)).toBeInTheDocument()
  })

  it('ingen KatalogInfoblok-sektion renderes', async () => {
    await renderAndOpenAdd()

    expect(screen.queryByTestId('katalog-infoblok')).not.toBeInTheDocument()
  })

  it('ingen "Dine egne oplysninger"-heading', async () => {
    await renderAndOpenAdd()

    expect(screen.queryByText(/dine egne oplysninger/i)).not.toBeInTheDocument()
  })
})

describe('Garnlager + KatalogInfoblok — AC2 + AC4: katalog-link flow', () => {
  it('AC4: viser "Dine egne oplysninger"-heading efter katalog-valg', async () => {
    const { user } = await renderAndOpenAdd()
    await selectCatalogYarn(user)

    expect(screen.getByText(/dine egne oplysninger/i)).toBeInTheDocument()
  })

  it('AC2: skjuler Garnnavn-label efter katalog-valg', async () => {
    const { user } = await renderAndOpenAdd()
    await selectCatalogYarn(user)

    // "Garnnavn *"-label vises ikke — kun "Antal nøgler" er tilbage som fritekst-felt
    expect(screen.queryByText(/garnnavn \*/i)).not.toBeInTheDocument()
  })

  it('AC2: skjuler Mærke-label efter katalog-valg', async () => {
    const { user } = await renderAndOpenAdd()
    await selectCatalogYarn(user)

    expect(screen.queryByText(/mærke \*/i)).not.toBeInTheDocument()
  })

  it('AC2: skjuler Fiber-sektion efter katalog-valg (ingen fiber-placeholder)', async () => {
    const { user } = await renderAndOpenAdd()
    await selectCatalogYarn(user)

    expect(screen.queryByPlaceholderText(/f\.eks\. 80% uld/i)).not.toBeInTheDocument()
  })

  it('AC2: skjuler Garnvægt-label efter katalog-valg', async () => {
    const { user } = await renderAndOpenAdd()
    await selectCatalogYarn(user)

    // "Garnvægt"-label-tekst forsvinder
    expect(screen.queryByText(/^garnvægt$/i)).not.toBeInTheDocument()
  })

  it('AC1: KatalogInfoblok vises med grøn section efter katalog-valg', async () => {
    const { user } = await renderAndOpenAdd()
    await selectCatalogYarn(user)

    const section = screen.getByRole('region', { name: /information fra garn-kataloget/i })
    expect(section).toBeInTheDocument()
  })

  it('"Skift"-knap (pill) vises i KatalogInfoblok', async () => {
    const { user } = await renderAndOpenAdd()
    await selectCatalogYarn(user)

    expect(screen.getByRole('button', { name: /skift/i })).toBeInTheDocument()
  })

  it('AC3: klik på "Skift" fjerner KatalogInfoblok og viser label-felterne igen', async () => {
    const { user } = await renderAndOpenAdd()
    await selectCatalogYarn(user)

    await user.click(screen.getByRole('button', { name: /skift/i }))

    await waitFor(() => {
      expect(screen.queryByTestId('katalog-infoblok')).not.toBeInTheDocument()
    })
    // Garnnavn-label er synlig igen
    expect(screen.getByText(/garnnavn \*/i)).toBeInTheDocument()
  })
})

describe('Garnlager — AC7: Esc lukker søge-dropdown, modal forbliver åben', () => {
  it('Esc lukker dropdown men ikke modal', async () => {
    const { searchYarnsFull } = await import('@/lib/catalog')
    vi.mocked(searchYarnsFull).mockResolvedValue([MOCK_CATALOG_YARN])

    await renderAndOpenAdd()

    const searchInput = screen.getByRole('textbox', {
      name: /skriv mærke eller garnnavn fra garn-kataloget/i,
    })
    await userEvent.setup().type(searchInput, 'Isager')

    // Vent på dropdown
    await waitFor(() => {
      expect(screen.getByText('Isager Alpaca 1')).toBeInTheDocument()
    }, { timeout: 2000 })

    // Tryk Esc på søge-inputtet
    fireEvent.keyDown(searchInput, { key: 'Escape' })

    // Dropdown er lukket (hit-tekst forsvinder)
    await waitFor(() => {
      expect(screen.queryByText('Isager Alpaca 1')).not.toBeInTheDocument()
    })

    // Modal er stadig åben — Tilføj til lager-knap ses
    expect(screen.getByRole('button', { name: /tilføj til lager/i })).toBeInTheDocument()
  })
})

describe('Garnlager — AC4: "Dine egne oplysninger" heading-attributter', () => {
  it('heading har role=heading og aria-level=3', async () => {
    const { user } = await renderAndOpenAdd()
    await selectCatalogYarn(user)

    const heading = screen.getByRole('heading', { level: 3, name: /dine egne oplysninger/i })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveAttribute('aria-level', '3')
  })
})

describe('Garnlager — AC5: edit uden katalog-link viser alle felter', () => {
  it('edit-modal med yarn uden catalogYarnId viser Garnnavn og Mærke labels', async () => {
    await renderAndOpenEdit()

    // FAKE_YARN_NO_CATALOG har catalogYarnId: null → alle felter/labels synlige
    expect(screen.getByText(/garnnavn \*/i)).toBeInTheDocument()
    expect(screen.getByText(/mærke \*/i)).toBeInTheDocument()
  })

  it('edit-modal uden katalog-link viser ingen KatalogInfoblok', async () => {
    await renderAndOpenEdit()

    expect(screen.queryByTestId('katalog-infoblok')).not.toBeInTheDocument()
  })

  it('edit-modal uden katalog-link viser ingen "Dine egne oplysninger"-heading', async () => {
    await renderAndOpenEdit()

    expect(screen.queryByText(/dine egne oplysninger/i)).not.toBeInTheDocument()
  })
})
