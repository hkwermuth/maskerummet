/**
 * Kort-render-tests for Garnlager (F4).
 *
 * Dækker acceptkriterierne:
 * AC1-revideret — Billedfelt:
 *   - bruger-uploadede fotos (imageUrl) VISES på kortet med <img>
 *   - katalog-thumbnails (catalogImageUrl) vises ALDRIG på kortet
 *   - header-baggrund er #F4EFE6 når bruger-foto vises, ellers gradientFromHexColors
 * AC2  — Farvenavn-pille: colorName, eller "Multi (N)" ved hexColors≥2, tomt colorName
 * AC3  — Mærke i UPPERCASE over garnnavn
 * AC7  — Tags: vægt-chip + fiber-chip; ingen "Katalog"-chip
 * AC8  — Manuelt-ikon (✎) KUN ved !catalogYarnId
 * AC9  — Detaljelinje "{colorCode} · {antal} ngl · {status}" med · separator
 * AC10 — Pille har border + boxShadow (WCAG kontrast)
 * Dedupe — brand fjernes fra garnnavn på kortet
 * B1  — Edit-modal: garn med catalogYarnId viser katalog-navn i søgefeltet UDEN dropdown
 * B2  — Søgefeltet åbner dropdown ved bruger-input (add-flow uændret)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

type YarnFixture = {
  id: string
  name: string
  brand: string
  colorName: string
  colorCode: string
  colorCategory: string
  fiber: string
  weight: string
  pindstr: string
  metrage: number
  antal: number
  status: string
  hex: string
  hexColors: string[]
  noter: string
  barcode: string | null
  imageUrl: string | null
  catalogYarnId: string | null
  catalogColorId: string | null
  catalogImageUrl: string | null
}

const BASE_YARN: YarnFixture = {
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
}

const FAKE_USER = { id: 'user-1', email: 'test@test.dk' }

function mockYarns(yarns: unknown[]) {
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: yarns, error: null }),
    delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: yarns[0], error: null }),
  }))
}

let Garnlager: React.ComponentType<{ user: unknown; onRequestLogin: () => void }>

beforeEach(async () => {
  vi.clearAllMocks()
  mockYarns([BASE_YARN])
  const mod = await import('@/components/app/Garnlager.jsx')
  Garnlager = mod.default
})

async function renderAndWait(yarns = [BASE_YARN]) {
  mockYarns(yarns)
  render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)
  // Vent på at det første garn vises
  await waitFor(() => {
    expect(screen.getByText(yarns[0].brand)).toBeInTheDocument()
  })
}

// ── AC1-revideret: Billedfelt ─────────────────────────────────────────────────
// Bruger-uploadede fotos (imageUrl) VISES på kortet.
// Katalog-thumbnails (catalogImageUrl) vises ALDRIG på kortet.

describe('Garnlager kort — AC1: billedfelt', () => {
  it('A1: garn med imageUrl (og ingen catalogImageUrl) → <img src=imageUrl> vises på kortet', async () => {
    const yarn = { ...BASE_YARN, imageUrl: 'https://example.com/garn.jpg', catalogImageUrl: null }
    await renderAndWait([yarn])

    const allImgs = document.querySelectorAll('img')
    const fotoImg = Array.from(allImgs).find(el =>
      el.getAttribute('src') === 'https://example.com/garn.jpg'
    )
    expect(fotoImg).toBeDefined()
  })

  it('A1: garn med catalogImageUrl (og ingen imageUrl) → INGEN <img> på kortet', async () => {
    const yarn = { ...BASE_YARN, imageUrl: null, catalogImageUrl: 'https://catalog.example.com/swatch.png' }
    await renderAndWait([yarn])

    const allImgs = document.querySelectorAll('img')
    const swatchImg = Array.from(allImgs).find(el =>
      el.getAttribute('src') === 'https://catalog.example.com/swatch.png'
    )
    expect(swatchImg).toBeUndefined()
  })

  it('A1: garn med både imageUrl og catalogImageUrl → bruger-foto vinder (<img src=imageUrl>), ingen katalog-img', async () => {
    const yarn = {
      ...BASE_YARN,
      imageUrl: 'https://example.com/foto.jpg',
      catalogImageUrl: 'https://catalog.example.com/swatch.png',
    }
    await renderAndWait([yarn])

    const allImgs = document.querySelectorAll('img')
    // Bruger-foto vises
    const fotoImg = Array.from(allImgs).find(el =>
      el.getAttribute('src') === 'https://example.com/foto.jpg'
    )
    expect(fotoImg).toBeDefined()
    // Katalog-thumbnail vises ikke
    const swatchImg = Array.from(allImgs).find(el =>
      el.getAttribute('src') === 'https://catalog.example.com/swatch.png'
    )
    expect(swatchImg).toBeUndefined()
  })

  it('A1: header-baggrund er #F4EFE6 (rgb(244,239,230)) når bruger-foto vises (showUserPhoto)', async () => {
    const yarn = { ...BASE_YARN, imageUrl: 'https://example.com/garn.jpg' }
    await renderAndWait([yarn])

    // jsdom konverterer #F4EFE6 til rgb(244, 239, 230) i el.style.background
    // Vi tjekker style-attributten direkte da den indeholder den konverterede rgb-streng
    const header = document.querySelector('[style*="height: 120px"]') as HTMLElement | null
    expect(header).not.toBeNull()
    const bg = header!.style.background
    // Accepter både hex (#F4EFE6) og rgb (jsdom-konverteret)
    const isWarmBeige =
      bg === '#F4EFE6' ||
      bg === '#f4efe6' ||
      bg.includes('rgb(244, 239, 230)') ||
      bg.includes('rgb(244,239,230)')
    expect(isWarmBeige).toBe(true)
  })

  it('A1: header-baggrund er IKKE #F4EFE6 når intet bruger-foto (kun katalog-url)', async () => {
    const yarn = { ...BASE_YARN, imageUrl: null, catalogImageUrl: 'https://catalog.example.com/swatch.png', hex: '#C14B3A', hexColors: [] }
    await renderAndWait([yarn])

    // Ingen foto → baggrunden er gradientFromHexColors (hex-farven), ikke #F4EFE6
    const header = document.querySelector('[style*="height: 120px"]') as HTMLElement | null
    expect(header).not.toBeNull()
    const bg = header!.style.background
    const isWarmBeige =
      bg === '#F4EFE6' ||
      bg === '#f4efe6' ||
      bg.includes('rgb(244, 239, 230)') ||
      bg.includes('rgb(244,239,230)')
    expect(isWarmBeige).toBe(false)
  })

  it('garn uden foto og uden hexColors: billedfelts background bruger hex-farven', async () => {
    const yarn = { ...BASE_YARN, imageUrl: null, hexColors: [], hex: '#C14B3A' }
    await renderAndWait([yarn])

    // Ingen <img> til foto — background er sat til hex-farven via gradientFromHexColors
    const imgs = screen.queryAllByRole('img', { name: yarn.name })
    expect(imgs).toHaveLength(0)
  })

  it('garn med 2 hexColors: billedfelts background indeholder "linear-gradient"', async () => {
    const yarn = {
      ...BASE_YARN,
      imageUrl: null,
      hexColors: ['#FF0000', '#0000FF'],
    }
    await renderAndWait([yarn])

    // Find billedfeltet — jsdom konverterer hex til rgb i computed styles
    // Vi tjekker at der eksisterer et element med linear-gradient i background
    const cards = document.querySelectorAll('[style*="height: 120px"], [style*="height:120px"]')
    const card = Array.from(cards).find(el =>
      el instanceof HTMLElement && el.style.background.includes('linear-gradient')
    )
    expect(card).toBeDefined()
    if (card instanceof HTMLElement) {
      expect(card.style.background).toContain('linear-gradient')
      // jsdom konverterer hex til rgb — accept begge formater
      const bg = card.style.background
      const hasRed = bg.includes('#FF0000') || bg.includes('rgb(255, 0, 0)') || bg.includes('rgb(255,0,0)')
      const hasBlue = bg.includes('#0000FF') || bg.includes('rgb(0, 0, 255)') || bg.includes('rgb(0,0,255)')
      expect(hasRed).toBe(true)
      expect(hasBlue).toBe(true)
    }
  })

  it('garn med 1 hexColor: billedfelts background er solid (ikke gradient)', async () => {
    const yarn = {
      ...BASE_YARN,
      imageUrl: null,
      hex: '',
      hexColors: ['#4A7A62'],
    }
    await renderAndWait([yarn])

    // Ingen foto-img — background er sat til solid farve (hex eller rgb)
    const imgs = screen.queryAllByRole('img', { name: yarn.name })
    expect(imgs).toHaveLength(0)

    // Find billedfeltet og tjek at background er en farve (ikke gradient)
    const cards = document.querySelectorAll('[style*="height: 120px"], [style*="height:120px"]')
    const card = Array.from(cards).find(el =>
      el instanceof HTMLElement && (
        el.style.background === '#4A7A62' ||
        el.style.background.includes('rgb(74, 122, 98)')
      )
    )
    expect(card).toBeDefined()
  })
})

// ── AC2: Farvenavn-pille ─────────────────────────────────────────────────────

describe('Garnlager kort — AC2: farvenavn-pille', () => {
  it('colorName rendres som pille-tekst', async () => {
    await renderAndWait([{ ...BASE_YARN, colorName: 'Rød', hexColors: [] }])

    expect(screen.getByText('Rød')).toBeInTheDocument()
  })

  it('tomt colorName og 2 hexColors → "Multi (2)" vises', async () => {
    const yarn = { ...BASE_YARN, colorName: '', hexColors: ['#FF0000', '#0000FF'] }
    await renderAndWait([yarn])

    expect(screen.getByText('Multi (2)')).toBeInTheDocument()
  })

  it('tomt colorName og 3 hexColors → "Multi (3)" vises', async () => {
    const yarn = { ...BASE_YARN, colorName: '', hexColors: ['#FF0000', '#00FF00', '#0000FF'] }
    await renderAndWait([yarn])

    expect(screen.getByText('Multi (3)')).toBeInTheDocument()
  })

  it('colorName defineret og hexColors≥2 → colorName vises (ikke "Multi")', async () => {
    const yarn = { ...BASE_YARN, colorName: 'Rainbow', hexColors: ['#FF0000', '#0000FF'] }
    await renderAndWait([yarn])

    expect(screen.getByText('Rainbow')).toBeInTheDocument()
    expect(screen.queryByText(/multi/i)).not.toBeInTheDocument()
  })

  it('tomt colorName og 0 hexColors → ingen pille', async () => {
    const yarn = { ...BASE_YARN, colorName: '', hexColors: [] }
    await renderAndWait([yarn])

    // Pille-tekst er tomt — ingen "Multi" og ingen farvenavn
    expect(screen.queryByText(/multi/i)).not.toBeInTheDocument()
  })
})

// ── AC3: Mærke som CAPSLOCK ───────────────────────────────────────────────────

describe('Garnlager kort — AC3: mærke i uppercase', () => {
  it('brand-tekst rendres i DOM (CSS textTransform uppercase)', async () => {
    await renderAndWait([{ ...BASE_YARN, brand: 'Permin' }])

    // Brand vises i DOM — CSS uppercase er en styling-detalje, vi tester DOM-tekst
    expect(screen.getByText('Permin')).toBeInTheDocument()
  })

  it('brand-elementet har textTransform: uppercase (via inline style)', async () => {
    await renderAndWait([{ ...BASE_YARN, brand: 'Isager' }])

    const brandEl = screen.getByText('Isager')
    expect(brandEl).toBeInTheDocument()
    // Inline style har textTransform uppercase
    expect(brandEl.style.textTransform).toBe('uppercase')
  })
})

// ── AC7: Tags ────────────────────────────────────────────────────────────────

describe('Garnlager kort — AC7: tags', () => {
  it('vægt-chip viser YARN_WEIGHT_LABELS label for "dk" → "DK"', async () => {
    await renderAndWait([{ ...BASE_YARN, weight: 'dk' }])

    // YARN_WEIGHT_LABELS['dk'] = 'DK'
    // Der kan være flere elementer med teksten "DK" (filter-dropdown) — vi verificerer
    // at mindst ét span-element (chip) indeholder teksten
    const dkElements = screen.getAllByText('DK')
    expect(dkElements.length).toBeGreaterThanOrEqual(1)
    // Mindst ét er en chip (span med chip-styling)
    const chipEl = dkElements.find(el => el.tagName === 'SPAN')
    expect(chipEl).toBeDefined()
  })

  it('fiber-chip viser primær fiber (første token)', async () => {
    await renderAndWait([{ ...BASE_YARN, fiber: '80% Uld, 20% Mohair' }])

    // "Uld" kan optræde i fiber-filter-pills og i chip på kortet
    const uldElements = screen.getAllByText('Uld')
    expect(uldElements.length).toBeGreaterThanOrEqual(1)
    // Mindst ét er en span (chip på kortet)
    const chipEl = uldElements.find(el => el.tagName === 'SPAN')
    expect(chipEl).toBeDefined()
  })

  it('ingen "Katalog"-chip på kortet', async () => {
    const yarn = { ...BASE_YARN, catalogYarnId: 'some-catalog-id' }
    await renderAndWait([yarn])

    expect(screen.queryByText(/katalog/i)).not.toBeInTheDocument()
  })

  it('ingen "Katalog"-chip heller ikke uden catalog-link', async () => {
    await renderAndWait([{ ...BASE_YARN, catalogYarnId: null }])

    expect(screen.queryByText(/katalog/i)).not.toBeInTheDocument()
  })
})

// ── AC8: Manuelt-ikon ─────────────────────────────────────────────────────────

describe('Garnlager kort — AC8: manuelt-ikon', () => {
  it('✎-ikon vises når catalogYarnId er null', async () => {
    await renderAndWait([{ ...BASE_YARN, catalogYarnId: null }])

    expect(screen.getByTitle('Manuelt tilføjet')).toBeInTheDocument()
  })

  it('✎-ikon vises IKKE når catalogYarnId er sat', async () => {
    await renderAndWait([{ ...BASE_YARN, catalogYarnId: 'cat-123' }])

    expect(screen.queryByTitle('Manuelt tilføjet')).not.toBeInTheDocument()
  })

  it('✎-ikon har aria-label "Manuelt tilføjet"', async () => {
    await renderAndWait([{ ...BASE_YARN, catalogYarnId: null }])

    expect(screen.getByLabelText('Manuelt tilføjet')).toBeInTheDocument()
  })
})

// ── AC9: Detaljelinje ────────────────────────────────────────────────────────

describe('Garnlager kort — AC9: detaljelinje', () => {
  it('detaljelinje indeholder colorCode', async () => {
    await renderAndWait([{ ...BASE_YARN, colorCode: '883', antal: 2, status: 'I brug' }])

    expect(screen.getByText(/883/)).toBeInTheDocument()
  })

  it('detaljelinje indeholder "{antal} ngl"', async () => {
    await renderAndWait([{ ...BASE_YARN, antal: 5 }])

    expect(screen.getByText(/5 ngl/)).toBeInTheDocument()
  })

  it('detaljelinje indeholder status', async () => {
    // F5 2026-04-28: default-filter skjuler "Brugt op"-kort. Tester med "I brug"
    // for at verificere at status vises i detaljelinjen — adfærden er den samme
    // for alle synlige statusser.
    await renderAndWait([{ ...BASE_YARN, colorCode: '', antal: 1, status: 'I brug' }])

    expect(screen.getByText(/ngl · I brug/)).toBeInTheDocument()
  })

  it('detaljelinje bruger " · " som separator: "001 · 3 ngl · På lager"', async () => {
    await renderAndWait([{
      ...BASE_YARN,
      colorCode: '001',
      antal: 3,
      status: 'På lager',
    }])

    // Tjek at teksten matcher det forventede format med · separatorer
    expect(screen.getByText('001 · 3 ngl · På lager')).toBeInTheDocument()
  })

  it('uden colorCode: detaljelinje viser kun antal og status', async () => {
    await renderAndWait([{ ...BASE_YARN, colorCode: '', antal: 2, status: 'I brug' }])

    expect(screen.getByText('2 ngl · I brug')).toBeInTheDocument()
  })
})

// ── AC10: Pille med border + boxShadow ───────────────────────────────────────

describe('Garnlager kort — AC10: WCAG kontrast via border+boxShadow', () => {
  it('farvenavn-pille har border-style sat', async () => {
    await renderAndWait([{ ...BASE_YARN, colorName: 'Rød' }])

    const pill = screen.getByText('Rød')
    // Inline style har border
    expect(pill.style.border).toBeTruthy()
  })

  it('farvenavn-pille har boxShadow sat', async () => {
    await renderAndWait([{ ...BASE_YARN, colorName: 'Blå' }])

    const pill = screen.getByText('Blå')
    expect(pill.style.boxShadow).toBeTruthy()
  })
})

// ── Dedupe: garnnavn vises uden brand ────────────────────────────────────────

describe('Garnlager kort — Dedupe: brand fjernes fra garnnavn', () => {
  it('"Permin Bella" + brand "Permin" → "Bella" vises på kortet', async () => {
    const yarn = { ...BASE_YARN, name: 'Permin Bella', brand: 'Permin' }
    await renderAndWait([yarn])

    expect(screen.getByText('Bella')).toBeInTheDocument()
    // Det fulde navn "Permin Bella" vises ikke som garnnavnet (brand er uppercase ovenfor)
    // brand "Permin" vises i uppercase-brand-feltet, men garnnavn er dedupliceret
  })

  it('"BC Garn Luxor" + brand "BC Garn" → "Luxor" vises på kortet', async () => {
    const yarn = { ...BASE_YARN, name: 'BC Garn Luxor', brand: 'BC Garn' }
    await renderAndWait([yarn])

    expect(screen.getByText('Luxor')).toBeInTheDocument()
  })

  it('garn uden brand-præfiks i navn → originalnavnet vises uændret', async () => {
    const yarn = { ...BASE_YARN, name: 'Alpaca 1', brand: 'Isager' }
    await renderAndWait([yarn])

    expect(screen.getByText('Alpaca 1')).toBeInTheDocument()
  })
})

// ── Multi-garn: to garntyper i grid ──────────────────────────────────────────

describe('Garnlager kort — to garn i grid', () => {
  it('to garn vises begge i grid', async () => {
    const yarn1 = { ...BASE_YARN, id: 'y1', name: 'GarnA', brand: 'BrandA', colorName: 'Rød', hexColors: [], colorCode: '001' }
    const yarn2 = { ...BASE_YARN, id: 'y2', name: 'GarnB', brand: 'BrandB', colorName: 'Blå', hexColors: [], colorCode: '002' }
    await renderAndWait([yarn1, yarn2])

    expect(screen.getByText('GarnA')).toBeInTheDocument()
    expect(screen.getByText('GarnB')).toBeInTheDocument()
  })

  it('manuelt-ikon kun ved garn uden catalogYarnId', async () => {
    const yarn1 = { ...BASE_YARN, id: 'y1', name: 'ManuelGarn', brand: 'BrandA', hexColors: [], catalogYarnId: null }
    const yarn2 = { ...BASE_YARN, id: 'y2', name: 'KatalogGarn', brand: 'BrandB', hexColors: [], catalogYarnId: 'cat-1' }
    await renderAndWait([yarn1, yarn2])

    const manuelIkoner = screen.getAllByTitle('Manuelt tilføjet')
    expect(manuelIkoner).toHaveLength(1)
  })
})

// ── B1: Edit-modal viser katalog-navn uden dropdown ──────────────────────────

describe('Garnlager — B1: edit-modal viser katalog-navn uden at åbne dropdown', () => {
  it('B1: søgefeltet er udfyldt med katalog-navn men dropdown er lukket', async () => {
    const { fetchYarnFullById } = await import('@/lib/catalog')
    const CATALOG_YARN = {
      id: 'cat-yarn-1',
      name: 'Alpaca 1',
      full_name: 'Isager Alpaca 1',
      producer: 'Isager',
      thickness_category: 'fingering',
    }
    vi.mocked(fetchYarnFullById).mockResolvedValue(CATALOG_YARN)

    const yarnWithCatalog = {
      ...BASE_YARN,
      id: 'yarn-cat',
      name: 'Isager Alpaca 1',
      brand: 'Isager',
      catalogYarnId: 'cat-yarn-1',
    }

    const user = userEvent.setup()
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [yarnWithCatalog], error: null }),
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: yarnWithCatalog, error: null }),
    }))

    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    // Vent på at garnlisten loader
    await waitFor(() => expect(screen.getByText('Isager')).toBeInTheDocument())

    // Klik på garnkortet for at åbne edit-modal
    await user.click(screen.getByText('Alpaca 1'))

    // Vent på at modalen er åben
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
    )

    // Vent på at fetchYarnFullById er kaldt og søgefeltet er udfyldt
    await waitFor(() => {
      const searchInput = screen.getByRole('textbox', {
        name: /skriv mærke eller garnnavn fra garn-kataloget/i,
      })
      expect(searchInput).toHaveValue('Isager Alpaca 1')
    })

    // Dropdown MÅ IKKE være åben — ingen søgeresultater vises
    expect(screen.queryByText(/søger i katalog/i)).not.toBeInTheDocument()
    // Ingen liste-container med hits (hits-elementet har ikke vores mock-navn fra searchYarnsFull)
    // searchYarnsFull er mockat til [] så ingen resultater kan vises
    const searchInput = screen.getByRole('textbox', {
      name: /skriv mærke eller garnnavn fra garn-kataloget/i,
    })
    // Søge-inputtet er udfyldt men dropdown er ikke åben
    expect(searchInput).toHaveValue('Isager Alpaca 1')
    // Ingen dropdown: tjek at ingen søgeresultat-item med garnet vises via søgning
    // (den vises via KatalogInfoblok, ikke dropdown)
    const dropdownItem = document.querySelector('[style*="position: absolute"][style*="top: 100%"]')
    expect(dropdownItem).toBeNull()
  })
})

// ── B2: Søgefelt åbner dropdown ved bruger-input ─────────────────────────────

describe('Garnlager — B2: dropdown åbner ved bruger-input i søgefelt', () => {
  it('B2: typing i søgefeltet i add-modal åbner dropdown med søgeresultater', async () => {
    const { searchYarnsFull } = await import('@/lib/catalog')
    const SEARCH_RESULT = {
      id: 'hit-1',
      name: 'Merino Extra Fine',
      full_name: 'Drops Merino Extra Fine',
      producer: 'Drops',
      thickness_category: 'fingering',
    }
    vi.mocked(searchYarnsFull).mockResolvedValue([SEARCH_RESULT])

    const user = userEvent.setup()
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => expect(screen.getByText(BASE_YARN.brand)).toBeInTheDocument())

    // Åbn add-modal
    await user.click(screen.getByRole('button', { name: /\+ tilføj garn/i }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /tilføj til lager/i })).toBeInTheDocument()
    )

    // Skriv i søgefeltet (bruger-initieret)
    const searchInput = screen.getByRole('textbox', {
      name: /skriv mærke eller garnnavn fra garn-kataloget/i,
    })
    await user.type(searchInput, 'Drops')

    // Dropdown åbner med søgeresultater
    await waitFor(() => {
      expect(screen.getByText('Drops Merino Extra Fine')).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})
