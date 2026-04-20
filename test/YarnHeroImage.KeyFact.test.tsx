/**
 * Tests for YarnHeroImage og KeyFact komponenter.
 * Dækker acceptkriterierne fra feature: "Produktbillede i normal størrelse på garn-detaljeside".
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ── Mock next/image ───────────────────────────────────────────────────────────
// next/image bruger Next.js-specifikke optimeringer der ikke virker i jsdom.
// Vi erstatter den med en simpel <img> der videregiver src og alt.
vi.mock('next/image', () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} data-testid="next-image" {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)} />
  ),
}))

// ── Importer komponenter EFTER mock er sat op ─────────────────────────────────
import { YarnHeroImage } from '@/components/catalog/YarnHeroImage'
import { KeyFact } from '@/components/catalog/KeyFact'
import type { Yarn } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeYarn(overrides: Partial<Yarn> = {}): Yarn {
  return {
    id: 'yarn-1',
    producer: 'DROPS',
    name: 'Merino Extra Fine',
    series: null,
    full_name: 'DROPS Merino Extra Fine',
    fiber_main: '100% Merino Uld',
    thickness_category: null,
    ball_weight_g: null,
    length_per_100g_m: null,
    needle_min_mm: null,
    needle_max_mm: null,
    gauge_stitches_10cm: null,
    gauge_rows_10cm: null,
    gauge_needle_mm: null,
    twist_structure: null,
    ply_count: null,
    spin_type: null,
    finish: null,
    wash_care: null,
    origin_country: null,
    fiber_origin_country: null,
    status: null,
    certifications: null,
    seasonal_suitability: null,
    use_cases: null,
    description: null,
    fibers: null,
    color_count: null,
    hero_image_url: null,
    ...overrides,
  }
}

// ── YarnHeroImage tests ───────────────────────────────────────────────────────

describe('YarnHeroImage', () => {
  it('AC1: Rendrer <img> med korrekt src når hero_image_url er sat', () => {
    const yarn = makeYarn({ hero_image_url: '/garn-eksempler/drops-merino.jpg' })
    render(<YarnHeroImage yarn={yarn} />)

    const img = screen.getByTestId('next-image')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', '/garn-eksempler/drops-merino.jpg')
  })

  it('AC1: alt-tekst på billedet er "{producer} {name}"', () => {
    const yarn = makeYarn({ hero_image_url: '/garn-eksempler/drops-merino.jpg' })
    render(<YarnHeroImage yarn={yarn} />)

    const img = screen.getByAltText('DROPS Merino Extra Fine')
    expect(img).toBeInTheDocument()
  })

  it('AC2: Rendrer placeholder-div (ingen img) når hero_image_url er null', () => {
    const yarn = makeYarn({ hero_image_url: null })
    render(<YarnHeroImage yarn={yarn} />)

    expect(screen.queryByTestId('next-image')).not.toBeInTheDocument()
  })

  it('AC2: Placeholder har role="img"', () => {
    const yarn = makeYarn({ hero_image_url: null })
    render(<YarnHeroImage yarn={yarn} />)

    const placeholder = screen.getByRole('img')
    expect(placeholder).toBeInTheDocument()
  })

  it('AC2: Placeholder-aria-label nævner garnet (producer og name)', () => {
    const yarn = makeYarn({ hero_image_url: null })
    render(<YarnHeroImage yarn={yarn} />)

    const placeholder = screen.getByRole('img')
    const label = placeholder.getAttribute('aria-label') ?? ''
    expect(label).toContain('DROPS')
    expect(label).toContain('Merino Extra Fine')
  })

  it('AC2: Placeholder viser "Billede kommer"-tekst', () => {
    const yarn = makeYarn({ hero_image_url: null })
    render(<YarnHeroImage yarn={yarn} />)

    expect(screen.getByText('Billede kommer')).toBeInTheDocument()
  })
})

// ── KeyFact tests ─────────────────────────────────────────────────────────────

describe('KeyFact', () => {
  it('AC3: Rendrer ingenting når value er null', () => {
    const { container } = render(<KeyFact label="Indhold" value={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('AC3: Rendrer ingenting når value er undefined', () => {
    const { container } = render(<KeyFact label="Indhold" value={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('AC3: Rendrer ingenting når value er tom streng', () => {
    const { container } = render(<KeyFact label="Indhold" value="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('AC4: Rendrer <dt> med label + kolon og <dd> med value', () => {
    render(<KeyFact label="Indhold" value="100% Merino Uld" />)

    const dt = screen.getByText('Indhold:')
    const dd = screen.getByText('100% Merino Uld')

    expect(dt.tagName.toLowerCase()).toBe('dt')
    expect(dd.tagName.toLowerCase()).toBe('dd')
  })

  it('AC4: Rendrer korrekt med et andet label og value', () => {
    render(<KeyFact label="Anbefalede pinde" value="3,5–4 mm" />)

    expect(screen.getByText('Anbefalede pinde:')).toBeInTheDocument()
    expect(screen.getByText('3,5–4 mm')).toBeInTheDocument()
  })
})
