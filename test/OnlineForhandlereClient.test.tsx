import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// next/navigation er globalt mockat i test/setup.ts men vi overskriver her
// for at kontrollere searchParams pr. test-suite.
// ---------------------------------------------------------------------------

const mockReplace = vi.fn()
// Standard searchParams — tom (ingen active brand)
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/online-forhandlere',
  useParams: () => ({}),
}))

// Import efter mocks
import { OnlineForhandlereClient } from '@/app/online-forhandlere/OnlineForhandlereClient'
import type { Brand, OnlineRetailer } from '@/lib/data/retailers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'brand-1',
    slug: 'some-brand',
    name: 'Some Brand',
    origin: null,
    website: null,
    ...overrides,
  }
}

function makeRetailer(overrides: Partial<OnlineRetailer> = {}): OnlineRetailer {
  return {
    id: 'retailer-1',
    slug: 'garnbutik',
    navn: 'Garnbutik Online',
    url: 'https://garnbutik.dk',
    beskrivelse: null,
    land: 'DK',
    leverer_til_dk: true,
    sidst_tjekket: null,
    brands: [],
    physical_store_count: 0,
    ...overrides,
  }
}

const brandDrops = makeBrand({ id: 'b-drops', slug: 'drops', name: 'Drops' })
const brandIsager = makeBrand({ id: 'b-isager', slug: 'isager', name: 'Isager' })
const brandPermin = makeBrand({ id: 'b-permin', slug: 'permin', name: 'Permin' })

const retailerDrops = makeRetailer({
  id: 'r-drops',
  slug: 'drops-webshop',
  navn: 'Drops Webshop',
  url: 'https://dropsdesign.dk',
  brands: [brandDrops],
  physical_store_count: 0,
})

const retailerIsager = makeRetailer({
  id: 'r-isager',
  slug: 'isager-studio',
  navn: 'Isager Studio',
  url: 'https://isager.dk',
  brands: [brandIsager],
  physical_store_count: 0,
})

const retailerPermin = makeRetailer({
  id: 'r-permin',
  slug: 'permin-shop',
  navn: 'Permin Shop',
  url: 'https://permin.dk',
  brands: [brandPermin],
  physical_store_count: 0,
})

const retailerHybrid = makeRetailer({
  id: 'r-hybrid',
  slug: 'citystoffer',
  navn: 'Citystoffer',
  url: 'https://citystoffer.dk',
  brands: [brandDrops],
  // Har 2 fysiske butikker — skal vise cross-badge
  physical_store_count: 2,
})

// ---------------------------------------------------------------------------
// AC1: Renderer retailers.length antal kort
// ---------------------------------------------------------------------------

describe('AC1 renderer korrekt antal kort', () => {
  it('viser 3 article-kort for 3 retailers', () => {
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops, retailerIsager, retailerPermin]}
        brands={[brandDrops, brandIsager, brandPermin]}
        initialBrand={null}
      />
    )
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('viser 1 article-kort for 1 retailer', () => {
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops]}
        brands={[brandDrops]}
        initialBrand={null}
      />
    )
    expect(screen.getAllByRole('article')).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// AC2: Brand-filter chip aktiverer URL-sync (router.replace)
// ---------------------------------------------------------------------------

describe('AC2 brand-chip-klik synkroniserer URL via router.replace', () => {
  it('klik på Drops-chip kalder router.replace med ?brand=drops', async () => {
    const user = userEvent.setup()
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops, retailerIsager]}
        brands={[brandDrops, brandIsager]}
        initialBrand={null}
      />
    )

    // BrandFilter bruger "Alle mærker" som reset-chip og brand-navne som filter-chips
    const dropsChip = screen.getByRole('button', { name: /^drops$/i })
    await user.click(dropsChip)

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining('brand=drops'),
      expect.objectContaining({ scroll: false }),
    )
  })

  it('klik på "Alle mærker"-chip kalder router.replace uden brand-param', async () => {
    // Start med aktivt brand-filter
    vi.mocked(mockReplace).mockClear()
    const user = userEvent.setup()
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops]}
        brands={[brandDrops]}
        initialBrand="drops"
      />
    )

    const alleChip = screen.getByRole('button', { name: /alle mærker/i })
    await user.click(alleChip)

    // Replace kaldes — qs indeholder ikke 'brand='
    expect(mockReplace).toHaveBeenCalled()
    const callArg = mockReplace.mock.calls[mockReplace.mock.calls.length - 1][0] as string
    expect(callArg).not.toContain('brand=')
  })
})

// ---------------------------------------------------------------------------
// AC3: initialBrand filtrerer retailers ved page-load
// Komponenten synkroniserer activeBrand fra useSearchParams, så vi sætter
// mockSearchParams til at matche initialBrand for at simulere SSR-konsistent
// page-load (URL og prop er i sync som serveren ville levere dem).
// ---------------------------------------------------------------------------

describe('AC3 initialBrand filtrerer ved page-load', () => {
  it('initialBrand="drops" (+ URL params matcher) → kun Drops Webshop vises', () => {
    // Sæt searchParams til at matche initialBrand (simulerer server-render + URL)
    mockSearchParams = new URLSearchParams('brand=drops')
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops, retailerIsager, retailerPermin]}
        brands={[brandDrops, brandIsager, brandPermin]}
        initialBrand="drops"
      />
    )
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(1)
    expect(within(cards[0]).getByRole('heading', { level: 3 })).toHaveTextContent('Drops Webshop')
    // Nulstil til tom
    mockSearchParams = new URLSearchParams()
  })

  it('initialBrand=null → alle retailers vises', () => {
    mockSearchParams = new URLSearchParams()
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops, retailerIsager, retailerPermin]}
        brands={[brandDrops, brandIsager, brandPermin]}
        initialBrand={null}
      />
    )
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// AC4: Cross-badge "📍 Også fysisk →" vises kun ved physical_store_count > 0
// ---------------------------------------------------------------------------

describe('AC4 cross-badge vises kun for retailers med physical_store_count > 0', () => {
  it('viser cross-badge for Citystoffer (count=2)', () => {
    render(
      <OnlineForhandlereClient
        retailers={[retailerHybrid]}
        brands={[brandDrops]}
        initialBrand={null}
      />
    )
    // Badges text matcher "Også fysisk butik" (teksten i implementationen)
    expect(screen.getByText(/også fysisk butik/i)).toBeInTheDocument()
  })

  it('viser IKKE cross-badge for retailer med count=0', () => {
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops]}
        brands={[brandDrops]}
        initialBrand={null}
      />
    )
    expect(screen.queryByText(/også fysisk butik/i)).not.toBeInTheDocument()
  })

  it('viser badge for hybrid men ikke for ren-webshop i samme liste', () => {
    render(
      <OnlineForhandlereClient
        retailers={[retailerHybrid, retailerIsager]}
        brands={[brandDrops, brandIsager]}
        initialBrand={null}
      />
    )
    // Præcis 1 badge (kun Citystoffer har physical_store_count > 0)
    expect(screen.getAllByText(/også fysisk butik/i)).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// AC5: Cross-badge linker til /find-forhandler?retailer=<slug>
//      Med aktivt brand → ?retailer=<slug>&brand=<brand>
// ---------------------------------------------------------------------------

describe('AC5 cross-badge linker korrekt til /find-forhandler', () => {
  it('link har href=/find-forhandler?retailer=citystoffer (ingen aktivt brand)', () => {
    render(
      <OnlineForhandlereClient
        retailers={[retailerHybrid]}
        brands={[brandDrops]}
        initialBrand={null}
      />
    )
    const badge = screen.getByRole('link', { name: /har også fysisk butik/i })
    expect(badge).toHaveAttribute('href', '/find-forhandler?retailer=citystoffer')
  })

  it('link indeholder aktivt brand i URL når initialBrand er sat', () => {
    // searchParams matcher initialBrand for at undgå useEffect-reset
    mockSearchParams = new URLSearchParams('brand=drops')
    render(
      <OnlineForhandlereClient
        retailers={[retailerHybrid]}
        brands={[brandDrops]}
        initialBrand="drops"
      />
    )
    const badge = screen.getByRole('link', { name: /har også fysisk butik/i })
    const href = badge.getAttribute('href') ?? ''
    expect(href).toContain('retailer=citystoffer')
    expect(href).toContain('brand=drops')
    mockSearchParams = new URLSearchParams()
  })
})

// ---------------------------------------------------------------------------
// AC6: RetailerCard har id="retailer-<slug>" (anchor-target)
// ---------------------------------------------------------------------------

describe('AC6 RetailerCard har id="retailer-<slug>"', () => {
  it('article har id="retailer-drops-webshop"', () => {
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops]}
        brands={[brandDrops]}
        initialBrand={null}
      />
    )
    const article = screen.getByRole('article')
    expect(article).toHaveAttribute('id', 'retailer-drops-webshop')
  })

  it('multiple articles har korrekte ids', () => {
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops, retailerIsager]}
        brands={[brandDrops, brandIsager]}
        initialBrand={null}
      />
    )
    expect(document.getElementById('retailer-drops-webshop')).toBeInTheDocument()
    expect(document.getElementById('retailer-isager-studio')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AC7: Tom state vises hvis filter giver 0 resultater
// ---------------------------------------------------------------------------

describe('AC7 tom-state vises ved 0 resultater efter filter', () => {
  it('viser "Ingen online-forhandlere registreret for" når ingen match', () => {
    // searchParams matcher initialBrand
    mockSearchParams = new URLSearchParams('brand=isager')
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops]}
        brands={[brandDrops, brandIsager]}
        initialBrand="isager"
      />
    )
    expect(screen.getByText(/ingen online-forhandlere registreret for/i)).toBeInTheDocument()
    mockSearchParams = new URLSearchParams()
  })

  it('tom-state indeholder kontakt-link', () => {
    mockSearchParams = new URLSearchParams('brand=isager')
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops]}
        brands={[brandDrops, brandIsager]}
        initialBrand="isager"
      />
    )
    const kontaktLink = screen.getByRole('link', { name: /skriv til os/i })
    expect(kontaktLink).toHaveAttribute('href', 'mailto:kontakt@striq.dk')
    mockSearchParams = new URLSearchParams()
  })

  it('ingen article-kort vises i tom-state', () => {
    mockSearchParams = new URLSearchParams('brand=isager')
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops]}
        brands={[brandDrops, brandIsager]}
        initialBrand="isager"
      />
    )
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    mockSearchParams = new URLSearchParams()
  })
})

// ---------------------------------------------------------------------------
// Ekstra: Renderer H1 og "Besøg webshop"-CTA
// ---------------------------------------------------------------------------

describe('Basis-render: H1 og CTA', () => {
  it('viser H1 "Køb garn online"', () => {
    render(
      <OnlineForhandlereClient
        retailers={[]}
        brands={[]}
        initialBrand={null}
      />
    )
    expect(screen.getByRole('heading', { level: 1, name: /køb garn online/i })).toBeInTheDocument()
  })

  it('"Besøg webshop"-link har target=_blank og rel=noopener', () => {
    render(
      <OnlineForhandlereClient
        retailers={[retailerDrops]}
        brands={[brandDrops]}
        initialBrand={null}
      />
    )
    const link = screen.getByRole('link', { name: /besøg drops webshop.*åbner i nyt vindue/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
