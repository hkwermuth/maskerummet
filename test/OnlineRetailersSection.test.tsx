import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { OnlineRetailersSection } from '@/app/find-forhandler/OnlineRetailersSection'
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
// C1: Render tom — ingen kort, men "Alle"-chip vises
// ---------------------------------------------------------------------------

describe('C1 render med tomme arrays', () => {
  it('viser ingen article-kort når retailers er tom', () => {
    render(<OnlineRetailersSection retailers={[]} brands={[]} />)
    expect(screen.queryAllByRole('article')).toHaveLength(0)
  })

  it('viser "Alle"-chip selv med tomme arrays', () => {
    render(<OnlineRetailersSection retailers={[]} brands={[]} />)
    expect(screen.getByRole('button', { name: /^alle$/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// C2: Render med data — alle kort og chips vises
// ---------------------------------------------------------------------------

describe('C2 render med 3 retailers og 3 brands', () => {
  const brands = [brandDrops, brandPermin, brandIsager]
  const retailers = [retailerDrops, retailerPermin, retailerIsager]

  it('viser 3 article-kort', () => {
    render(<OnlineRetailersSection retailers={retailers} brands={brands} />)
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('viser "Alle"-chip plus en chip per brand', () => {
    render(<OnlineRetailersSection retailers={retailers} brands={brands} />)
    expect(screen.getByRole('button', { name: /^alle$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^drops$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^permin$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^isager$/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// C3: Filter på brand — klik filtrerer, klik igen/Alle nulstiller
// ---------------------------------------------------------------------------

describe('C3 filter på brand-chip', () => {
  const brands = [brandDrops, brandPermin, brandIsager]
  const retailers = [retailerDrops, retailerPermin, retailerIsager]

  it('klik på "Drops" viser kun Drops-retailer', async () => {
    const user = userEvent.setup()
    render(<OnlineRetailersSection retailers={retailers} brands={brands} />)
    await user.click(screen.getByRole('button', { name: /^drops$/i }))
    const cards = screen.getAllByRole('article')
    expect(cards).toHaveLength(1)
    expect(within(cards[0]).getByText('Drops Webshop')).toBeInTheDocument()
  })

  it('klik på "Alle" efter filter viser alle kort igen', async () => {
    const user = userEvent.setup()
    render(<OnlineRetailersSection retailers={retailers} brands={brands} />)
    await user.click(screen.getByRole('button', { name: /^drops$/i }))
    await user.click(screen.getByRole('button', { name: /^alle$/i }))
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })

  it('"Drops"-chip har aria-pressed=true efter klik', async () => {
    const user = userEvent.setup()
    render(<OnlineRetailersSection retailers={retailers} brands={brands} />)
    const dropsChip = screen.getByRole('button', { name: /^drops$/i })
    expect(dropsChip).toHaveAttribute('aria-pressed', 'false')
    await user.click(dropsChip)
    expect(dropsChip).toHaveAttribute('aria-pressed', 'true')
  })

  it('"Alle"-chip har aria-pressed=true som default', () => {
    render(<OnlineRetailersSection retailers={retailers} brands={brands} />)
    expect(screen.getByRole('button', { name: /^alle$/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('"Alle"-chip har aria-pressed=false når brand er aktivt', async () => {
    const user = userEvent.setup()
    render(<OnlineRetailersSection retailers={retailers} brands={brands} />)
    await user.click(screen.getByRole('button', { name: /^drops$/i }))
    expect(screen.getByRole('button', { name: /^alle$/i })).toHaveAttribute('aria-pressed', 'false')
  })
})

// ---------------------------------------------------------------------------
// C4: Tom tilstand pr. brand — viser fejlbesked
// ---------------------------------------------------------------------------

describe('C4 tom tilstand når brand ikke har forhandlere', () => {
  it('viser "Ingen online-forhandlere registreret for ..." når intet match', async () => {
    const user = userEvent.setup()
    // brandFilcolana er i brands-listen men ingen retailers fører den
    render(
      <OnlineRetailersSection
        retailers={[retailerDrops]}
        brands={[brandDrops, brandFilcolana]}
      />
    )
    await user.click(screen.getByRole('button', { name: /^filcolana$/i }))
    expect(
      screen.getByText(/ingen online-forhandlere registreret for/i)
    ).toBeInTheDocument()
    // "Filcolana" optræder to steder: chip-knappen og <strong> i fejlbeskeden
    const matches = screen.getAllByText('Filcolana')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    // Bekræft at mindst ét element er inde i fejlbeskeden (strong)
    const strongEl = matches.find(el => el.tagName.toLowerCase() === 'strong')
    expect(strongEl).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// C5: Ekstern link-attributter på "Besøg webshop"
// ---------------------------------------------------------------------------

describe('C5 "Besøg webshop"-link har korrekte attributter', () => {
  it('har target="_blank"', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} />)
    const link = screen.getByRole('link', { name: /besøg drops webshop.*åbner i nyt vindue/i })
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('har rel="noopener noreferrer"', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} />)
    const link = screen.getByRole('link', { name: /besøg drops webshop.*åbner i nyt vindue/i })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('har aria-label der nævner "åbner i nyt vindue"', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} />)
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
    render(<OnlineRetailersSection retailers={sorted} brands={[]} />)
    const cards = screen.getAllByRole('article')
    const names = cards.map(card => within(card).getByRole('heading').textContent)
    expect(names).toEqual(['Alpha Garn', 'Midt Garn', 'Zara Garn'])
  })
})

// ---------------------------------------------------------------------------
// C7: Featured brands (Drops, Permin, Filcolana) vises først i chip-rækken
// ---------------------------------------------------------------------------

describe('C7 featured brands vises først i chip-rækkefølge', () => {
  it('Drops, Permin, Filcolana-chips kommer før Isager i DOM', () => {
    const brands = [brandIsager, brandFilcolana, brandDrops, brandPermin]
    render(<OnlineRetailersSection retailers={[]} brands={brands} />)
    const chips = screen.getAllByRole('button').filter(
      btn => ['Alle', 'Drops', 'Permin', 'Filcolana', 'Isager'].includes(btn.textContent ?? '')
    )
    const chipLabels = chips.map(c => c.textContent)
    // "Alle" er altid først, derefter Drops, Permin, Filcolana, så Isager
    expect(chipLabels[0]).toBe('Alle')
    expect(chipLabels[1]).toBe('Drops')
    expect(chipLabels[2]).toBe('Permin')
    expect(chipLabels[3]).toBe('Filcolana')
    expect(chipLabels[4]).toBe('Isager')
  })
})

// ---------------------------------------------------------------------------
// C8: Touch target ≥ 44px via minHeight inline style
// ---------------------------------------------------------------------------

describe('C8 touch targets ≥ 44px (minHeight inline style)', () => {
  it('"Alle"-chip har minHeight: 44 via inline style', () => {
    render(<OnlineRetailersSection retailers={[]} brands={[]} />)
    const chip = screen.getByRole('button', { name: /^alle$/i })
    expect(chip).toHaveStyle({ minHeight: '44px' })
  })

  it('"Besøg webshop"-link har minHeight: 44 via inline style', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} />)
    const link = screen.getByRole('link', { name: /åbner i nyt vindue/i })
    expect(link).toHaveStyle({ minHeight: '44px' })
  })
})

// ---------------------------------------------------------------------------
// C9: Brand-tags i kort renderes (og highlightes ved aktivt filter)
// ---------------------------------------------------------------------------

describe('C9 brand-tags renderes i retailer-kort', () => {
  it('brand-tags vises i kortet under filteret', () => {
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} />)
    const card = screen.getAllByRole('article')[0]
    expect(within(card).getByText('Drops')).toBeInTheDocument()
  })

  it('brand-tag renderes stadig når filter er aktivt', async () => {
    const user = userEvent.setup()
    render(<OnlineRetailersSection retailers={[retailerDrops]} brands={[brandDrops]} />)
    await user.click(screen.getByRole('button', { name: /^drops$/i }))
    const card = screen.getAllByRole('article')[0]
    // Tag med brand-navn renderes inde i kortet (der kan være to: chip + tag)
    const tagElements = within(card).getAllByText('Drops')
    expect(tagElements.length).toBeGreaterThanOrEqual(1)
  })
})
