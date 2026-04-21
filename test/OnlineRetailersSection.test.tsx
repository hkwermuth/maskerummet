import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import React from 'react'

import { OnlineRetailersSection, orderBrands, FilterChip, FEATURED_BRAND_SLUGS } from '@/app/find-forhandler/OnlineRetailersSection'
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
    ...overrides,
  }
}

const brandDrops: Brand = makeBrand({ id: 'b-drops', slug: 'drops', name: 'Drops' })
const brandPermin: Brand = makeBrand({ id: 'b-permin', slug: 'permin', name: 'Permin' })
const brandFilcolana: Brand = makeBrand({ id: 'b-filcolana', slug: 'filcolana', name: 'Filcolana' })
const brandIsager: Brand = makeBrand({ id: 'b-isager', slug: 'isager', name: 'Isager' })

const retailerDrops = makeRetailer({
  id: 'r-drops',
  navn: 'Drops Webshop',
  url: 'https://dropsdesign.dk',
  brands: [brandDrops],
})
const retailerPermin = makeRetailer({
  id: 'r-permin',
  navn: 'Permin Shop',
  url: 'https://permin.dk',
  brands: [brandPermin],
})
const retailerIsager = makeRetailer({
  id: 'r-isager',
  navn: 'Isager Store',
  url: 'https://isager.dk',
  brands: [brandIsager],
})

// ---------------------------------------------------------------------------
// C1: Render tom — ingen kort
// ---------------------------------------------------------------------------

describe('C1 render med tomme arrays', () => {
  it('viser ingen article-kort når retailers er tom', () => {
    render(<OnlineRetailersSection retailers={[]} brands={[]} activeBrand={null} />)
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// C2: Render med data — alle kort vises
// ---------------------------------------------------------------------------

describe('C2 render med 3 retailers og 3 brands', () => {
  const brands = [brandDrops, brandPermin, brandIsager]
  const retailers = [retailerDrops, retailerPermin, retailerIsager]

  it('viser 3 article-kort', () => {
    render(<OnlineRetailersSection retailers={retailers} brands={brands} activeBrand={null} />)
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// C3: Filter styret af prop: activeBrand filtrerer korrekt
// ---------------------------------------------------------------------------

describe('C3 filter styret af activeBrand-prop', () => {
  const brands = [brandDrops, brandPermin, brandIsager]
  const retailers = [retailerDrops, retailerPermin, retailerIsager]

  it('activeBrand="drops" viser kun Drops-retailer', () => {
    render(<OnlineRetailersSection retailers={retailers} brands={brands} activeBrand="drops" />)
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(1)
    expect(within(cards[0]).getByText('Drops Webshop')).toBeInTheDocument()
  })

  it('activeBrand=null viser alle retailers', () => {
    render(<OnlineRetailersSection retailers={retailers} brands={brands} activeBrand={null} />)
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('activeBrand="permin" viser kun Permin-retailer', () => {
    render(<OnlineRetailersSection retailers={retailers} brands={brands} activeBrand="permin" />)
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(1)
    expect(within(cards[0]).getByText('Permin Shop')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// C4: Tom tilstand pr. brand — viser fejlbesked
// ---------------------------------------------------------------------------

describe('C4 tom tilstand når brand ikke har forhandlere', () => {
  it('viser "Ingen online-forhandlere registreret for ..." når ingen match via prop', () => {
    // brandFilcolana er i brands-listen men ingen retailers fører den
    render(
      <OnlineRetailersSection
        retailers={[retailerDrops]}
        brands={[brandDrops, brandFilcolana]}
        activeBrand="ukendtbrand"
      />
    )
    expect(
      screen.getByText(/ingen online-forhandlere registreret for/i)
    ).toBeInTheDocument()
  })

  it('viser brand-navn i strong-element i tom-tilstand', () => {
    render(
      <OnlineRetailersSection
        retailers={[retailerDrops]}
        brands={[brandDrops, brandFilcolana]}
        activeBrand="filcolana"
      />
    )
    expect(
      screen.getByText(/ingen online-forhandlere registreret for/i)
    ).toBeInTheDocument()
    // "Filcolana" optræder i <strong> i fejlbeskeden
    const strongElements = document.querySelectorAll('strong')
    const hasFilcolana = Array.from(strongElements).some(el => el.textContent === 'Filcolana')
    expect(hasFilcolana).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// C5: Ekstern link-attributter på "Besøg webshop"
// ---------------------------------------------------------------------------

describe('C5 "Besøg webshop"-link har korrekte attributter', () => {
  it('har target="_blank"', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} activeBrand={null} />)
    const link = screen.getByRole('link', { name: /besøg drops webshop.*åbner i nyt vindue/i })
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('har rel="noopener noreferrer"', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} activeBrand={null} />)
    const link = screen.getByRole('link', { name: /besøg drops webshop.*åbner i nyt vindue/i })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('har aria-label der nævner "åbner i nyt vindue"', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} activeBrand={null} />)
    const link = screen.getByRole('link', { name: /åbner i nyt vindue/i })
    expect(link).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// C6: Alfabetisk sortering
// Sortering sker i data-laget (fetchOnlineRetailers kalder .order('navn')).
// Komponenten bevarer den rækkefølge den modtager — vi verificerer at
// allerede-sorterede data vises i korrekt rækkefølge i DOM'en.
// ---------------------------------------------------------------------------

describe('C6 alfabetisk sortering af retailers i DOM', () => {
  it('viser retailers i den rækkefølge de modtages (allerede sorteret fra data-laget)', () => {
    // Sende alfabetisk sorteret — som fetchOnlineRetailers ville returnere
    const sorted: OnlineRetailer[] = [
      makeRetailer({ id: 'r1', navn: 'Alpha Garn', url: 'https://alpha.dk', brands: [] }),
      makeRetailer({ id: 'r2', navn: 'Midt Garn', url: 'https://midt.dk', brands: [] }),
      makeRetailer({ id: 'r3', navn: 'Zara Garn', url: 'https://zara.dk', brands: [] }),
    ]
    render(<OnlineRetailersSection retailers={sorted} brands={[]} activeBrand={null} />)
    const cards = screen.getAllByRole('article')
    const names = cards.map(card => within(card).getByRole('heading').textContent)
    expect(names).toEqual(['Alpha Garn', 'Midt Garn', 'Zara Garn'])
  })
})

// ---------------------------------------------------------------------------
// C7: safeWebUrl — farlig URL renderer "Webshop-link utilgængeligt"
// ---------------------------------------------------------------------------

describe('C7 safeWebUrl — farlig URL renderer fallback-tekst', () => {
  it('viser "Webshop-link utilgængeligt" når URL er javascript:-protokol', () => {
    // eslint-disable-next-line no-script-url
    const badRetailer = makeRetailer({ url: 'javascript:alert(1)', navn: 'Farlig Shop' })
    render(<OnlineRetailersSection retailers={[badRetailer]} brands={[]} activeBrand={null} />)
    expect(screen.getByText(/webshop-link utilgængeligt/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /besøg/i })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// C8: Touch target ≥ 44px — "Besøg webshop"-linket
// ---------------------------------------------------------------------------

describe('C8 touch targets ≥ 44px (minHeight inline style)', () => {
  it('"Besøg webshop"-link har minHeight: 44 via inline style', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} activeBrand={null} />)
    const link = screen.getByRole('link', { name: /åbner i nyt vindue/i })
    expect(link).toHaveStyle({ minHeight: '44px' })
  })
})

// ---------------------------------------------------------------------------
// C9: Brand-tags i kort renderes (og highlightes ved aktivt filter)
// ---------------------------------------------------------------------------

describe('C9 brand-tags renderes i retailer-kort', () => {
  it('brand-tags vises i kortet under filteret', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} activeBrand={null} />)
    const card = screen.getAllByRole('article')[0]
    expect(within(card).getByText('Drops')).toBeInTheDocument()
  })

  it('brand-tag renderes stadig når activeBrand matcher via prop', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} activeBrand="drops" />)
    const card = screen.getAllByRole('article')[0]
    expect(within(card).getByText('Drops')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// C10: orderBrands og FEATURED_BRAND_SLUGS eksporteres
// ---------------------------------------------------------------------------

describe('C10 eksporterede hjælpere', () => {
  it('orderBrands er eksporteret som funktion', () => {
    expect(typeof orderBrands).toBe('function')
  })

  it('FEATURED_BRAND_SLUGS er eksporteret som array', () => {
    expect(Array.isArray(FEATURED_BRAND_SLUGS)).toBe(true)
  })

  it('FilterChip er eksporteret som funktion', () => {
    expect(typeof FilterChip).toBe('function')
  })

  it('orderBrands placerer Drops, Permin, Filcolana før Isager', () => {
    const brands = [brandIsager, brandFilcolana, brandDrops, brandPermin]
    const ordered: Brand[] = orderBrands(brands)
    const names = ordered.map(b => b.name)
    expect(names[0]).toBe('Drops')
    expect(names[1]).toBe('Permin')
    expect(names[2]).toBe('Filcolana')
    expect(names[3]).toBe('Isager')
  })
})
