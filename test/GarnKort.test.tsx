/**
 * GarnKort — ren præsentationskomponent.
 *
 * Acceptkriterier testet:
 * AC-PUR — Pure: kun 2 props (yarn, onEdit), ingen side-effects
 * AC-IMG — bruger-foto vises, katalog-swatch (isCatalogSwatchUrl) vises,
 *           generisk katalog-url vises IKKE
 * AC-BGD — header-baggrund: #F4EFE6 ved bruger-foto, gradient ved hexColors,
 *           solid hex-farve ved ingen foto
 * AC-NAM — brand deduplicated fra garnnavn
 * AC-PIL — farvenavn-pille: colorName | "Multi (N)" ved hexColors≥2 | tomt
 * AC-TAG — weight-chip + fiber-chip rendres; ingen "Katalog"-chip
 * AC-MAN — ✎-ikon ved !catalogYarnId; skjult ved catalogYarnId
 * AC-DET — detaljelinje: "{colorCode} · {antal} ngl · {status}" med ·-separator
 * AC-STA — status-badge vises for alle 4 statusser
 * AC-USD — usages-liste vises ved status="Brugt op" + usages; skjult ellers
 * AC-EDT — klik på kortet kalder onEdit med yarn-objektet
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import GarnKort from '@/components/app/GarnKort'

const BASE: React.ComponentProps<typeof GarnKort>['yarn'] = {
  id: 'y1',
  name: 'Bella',
  brand: 'Permin',
  colorName: 'Rød',
  colorCode: '001',
  fiber: 'Uld',
  weight: 'dk',
  antal: 3,
  status: 'På lager',
  hex: '#C14B3A',
  hexColors: [],
  noter: '',
  imageUrl: null,
  catalogYarnId: null,
  catalogColorId: null,
  catalogImageUrl: null,
  usages: [],
}

// ── AC-EDT: klik kalder onEdit ─────────────────────────────────────────────

describe('GarnKort — AC-EDT: klik kalder onEdit', () => {
  it('klik på kortet kalder onEdit med yarn-objektet', async () => {
    const onEdit = vi.fn()
    const user = userEvent.setup()
    render(<GarnKort yarn={BASE} onEdit={onEdit} />)
    // Klik på brand-teksten (del af kortet)
    await user.click(screen.getByText('Permin'))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onEdit).toHaveBeenCalledWith(BASE)
  })
})

// ── AC-IMG: billedvisning ──────────────────────────────────────────────────

describe('GarnKort — AC-IMG: billedvisning', () => {
  it('bruger-uploadet foto (imageUrl) rendres som <img>', () => {
    render(<GarnKort yarn={{ ...BASE, imageUrl: 'https://example.com/foto.jpg' }} onEdit={vi.fn()} />)
    const img = document.querySelector('img[src="https://example.com/foto.jpg"]')
    expect(img).toBeTruthy()
  })

  it('katalog-swatch (Permin /img/spec/ url) vises som <img>', () => {
    render(<GarnKort
      yarn={{ ...BASE, imageUrl: null, catalogImageUrl: 'https://permin.dk/img/spec/001.jpg' }}
      onEdit={vi.fn()}
    />)
    const img = document.querySelector('img[src="https://permin.dk/img/spec/001.jpg"]')
    expect(img).toBeTruthy()
  })

  it('DROPS shademap-url vises som <img>', () => {
    render(<GarnKort
      yarn={{ ...BASE, imageUrl: null, catalogImageUrl: 'https://images.garnstudio.com/img/shademap/001.jpg' }}
      onEdit={vi.fn()}
    />)
    const img = document.querySelector('img[src*="shademap"]')
    expect(img).toBeTruthy()
  })

  it('generisk katalog-url (ikke swatch) vises IKKE', () => {
    render(<GarnKort
      yarn={{ ...BASE, imageUrl: null, catalogImageUrl: 'https://catalog.example.com/generic-hero.png' }}
      onEdit={vi.fn()}
    />)
    const img = document.querySelector('img[src="https://catalog.example.com/generic-hero.png"]')
    expect(img).toBeNull()
  })

  it('bruger-foto vinder over katalog-swatch', () => {
    render(<GarnKort
      yarn={{
        ...BASE,
        imageUrl: 'https://example.com/foto.jpg',
        catalogImageUrl: 'https://permin.dk/img/spec/001.jpg',
      }}
      onEdit={vi.fn()}
    />)
    expect(document.querySelector('img[src="https://example.com/foto.jpg"]')).toBeTruthy()
    expect(document.querySelector('img[src="https://permin.dk/img/spec/001.jpg"]')).toBeNull()
  })
})

// ── AC-BGD: header-baggrund ────────────────────────────────────────────────

describe('GarnKort — AC-BGD: header-baggrund', () => {
  function getHeader() {
    return document.querySelector('[style*="height: 120px"]') as HTMLElement | null
  }

  it('bruger-foto → baggrund er #F4EFE6', () => {
    render(<GarnKort yarn={{ ...BASE, imageUrl: 'https://example.com/foto.jpg' }} onEdit={vi.fn()} />)
    const bg = getHeader()!.style.background
    const isWarmBeige = bg === '#F4EFE6' || bg === '#f4efe6' || bg.includes('rgb(244, 239, 230)')
    expect(isWarmBeige).toBe(true)
  })

  it('ingen bruger-foto, 2 hexColors → baggrund er linear-gradient', () => {
    render(<GarnKort
      yarn={{ ...BASE, imageUrl: null, hexColors: ['#FF0000', '#0000FF'] }}
      onEdit={vi.fn()}
    />)
    expect(getHeader()!.style.background).toContain('linear-gradient')
  })

  it('ingen foto, 1 hex, ingen hexColors → baggrund er solid farve', () => {
    render(<GarnKort
      yarn={{ ...BASE, imageUrl: null, hex: '#C14B3A', hexColors: [] }}
      onEdit={vi.fn()}
    />)
    const bg = getHeader()!.style.background
    // Ikke en gradient
    expect(bg).not.toContain('linear-gradient')
    // Ikke beige
    const isBeige = bg.includes('#F4EFE6') || bg.includes('rgb(244, 239, 230)')
    expect(isBeige).toBe(false)
  })
})

// ── AC-NAM: brand deduplication ───────────────────────────────────────────

describe('GarnKort — AC-NAM: brand deduplicated fra garnnavn', () => {
  it('"Permin Bella" + brand "Permin" → "Bella" vises', () => {
    render(<GarnKort yarn={{ ...BASE, name: 'Permin Bella', brand: 'Permin' }} onEdit={vi.fn()} />)
    expect(screen.getByText('Bella')).toBeInTheDocument()
  })

  it('"Alpaca 1" + brand "Isager" → "Alpaca 1" vises uændret', () => {
    render(<GarnKort yarn={{ ...BASE, name: 'Alpaca 1', brand: 'Isager' }} onEdit={vi.fn()} />)
    expect(screen.getByText('Alpaca 1')).toBeInTheDocument()
  })
})

// ── AC-PIL: farvenavn-pille ────────────────────────────────────────────────

describe('GarnKort — AC-PIL: farvenavn-pille', () => {
  it('colorName vises som pille-tekst', () => {
    render(<GarnKort yarn={{ ...BASE, colorName: 'Blå', hexColors: [] }} onEdit={vi.fn()} />)
    expect(screen.getByText('Blå')).toBeInTheDocument()
  })

  it('tomt colorName + 2 hexColors → "Multi (2)"', () => {
    render(<GarnKort yarn={{ ...BASE, colorName: '', hexColors: ['#FF0000', '#0000FF'] }} onEdit={vi.fn()} />)
    expect(screen.getByText('Multi (2)')).toBeInTheDocument()
  })

  it('colorName defineret + hexColors≥2 → colorName vises (ikke Multi)', () => {
    render(<GarnKort yarn={{ ...BASE, colorName: 'Rainbow', hexColors: ['#FF0000', '#0000FF'] }} onEdit={vi.fn()} />)
    expect(screen.getByText('Rainbow')).toBeInTheDocument()
    expect(screen.queryByText(/Multi/)).toBeNull()
  })

  it('tomt colorName + 0 hexColors → ingen pille (ingen Multi)', () => {
    render(<GarnKort yarn={{ ...BASE, colorName: '', hexColors: [] }} onEdit={vi.fn()} />)
    expect(screen.queryByText(/Multi/)).toBeNull()
  })
})

// ── AC-TAG: weight- og fiber-chip ─────────────────────────────────────────

describe('GarnKort — AC-TAG: tags', () => {
  it('weight "dk" rendres som chip med tekst "DK"', () => {
    render(<GarnKort yarn={{ ...BASE, weight: 'dk' }} onEdit={vi.fn()} />)
    const spans = screen.getAllByText('DK')
    expect(spans.some(el => el.tagName === 'SPAN')).toBe(true)
  })

  it('fiber "80% Uld, 20% Mohair" → chip med "Uld"', () => {
    render(<GarnKort yarn={{ ...BASE, fiber: '80% Uld, 20% Mohair' }} onEdit={vi.fn()} />)
    // primaryFiberLabel returnerer "Uld" (første token)
    const spans = screen.getAllByText('Uld')
    expect(spans.some(el => el.tagName === 'SPAN')).toBe(true)
  })

  it('ingen "Katalog"-chip uanset catalogYarnId', () => {
    render(<GarnKort yarn={{ ...BASE, catalogYarnId: 'cat-1' }} onEdit={vi.fn()} />)
    expect(screen.queryByText(/katalog/i)).toBeNull()
  })
})

// ── AC-MAN: manuelt-ikon ──────────────────────────────────────────────────

describe('GarnKort — AC-MAN: manuelt-ikon', () => {
  it('✎-ikon vises ved !catalogYarnId', () => {
    render(<GarnKort yarn={{ ...BASE, catalogYarnId: null }} onEdit={vi.fn()} />)
    expect(screen.getByTitle('Manuelt tilføjet')).toBeInTheDocument()
  })

  it('✎-ikon vises IKKE ved catalogYarnId sat', () => {
    render(<GarnKort yarn={{ ...BASE, catalogYarnId: 'cat-1' }} onEdit={vi.fn()} />)
    expect(screen.queryByTitle('Manuelt tilføjet')).toBeNull()
  })

  it('✎-ikon har aria-label', () => {
    render(<GarnKort yarn={{ ...BASE, catalogYarnId: null }} onEdit={vi.fn()} />)
    expect(screen.getByLabelText('Manuelt tilføjet')).toBeInTheDocument()
  })
})

// ── AC-DET: detaljelinje ──────────────────────────────────────────────────

describe('GarnKort — AC-DET: detaljelinje', () => {
  it('"001 · 3 ngl · På lager" vises samlet', () => {
    render(<GarnKort yarn={{ ...BASE, colorCode: '001', antal: 3, status: 'På lager' }} onEdit={vi.fn()} />)
    expect(screen.getByText('001 · 3 ngl · På lager')).toBeInTheDocument()
  })

  it('uden colorCode: "2 ngl · I brug"', () => {
    render(<GarnKort yarn={{ ...BASE, colorCode: '', antal: 2, status: 'I brug' }} onEdit={vi.fn()} />)
    expect(screen.getByText('2 ngl · I brug')).toBeInTheDocument()
  })
})

// ── AC-STA: status-badge ──────────────────────────────────────────────────

describe('GarnKort — AC-STA: status-badge', () => {
  for (const status of ['På lager', 'I brug', 'Brugt op', 'Ønskeliste'] as const) {
    it(`status-badge vises for "${status}"`, () => {
      render(<GarnKort yarn={{ ...BASE, status }} onEdit={vi.fn()} />)
      expect(document.querySelector(`[data-status-badge="${status}"]`)).toBeTruthy()
    })
  }

  it('"Brugt op"-badge har data-testid="brugt-op-badge"', () => {
    render(<GarnKort yarn={{ ...BASE, status: 'Brugt op' }} onEdit={vi.fn()} />)
    expect(screen.getByTestId('brugt-op-badge')).toBeInTheDocument()
  })
})

// ── AC-USD: usages-liste ──────────────────────────────────────────────────

describe('GarnKort — AC-USD: usages-liste ved Brugt op', () => {
  it('vises ved status="Brugt op" + usages', () => {
    render(<GarnKort
      yarn={{
        ...BASE,
        status: 'Brugt op',
        usages: [
          { yarnUsageId: 'u1', title: 'Bluse', quantityUsed: 4 },
          { yarnUsageId: 'u2', title: 'Sokker', quantityUsed: 1 },
        ],
      }}
      onEdit={vi.fn()}
    />)
    const list = screen.getByTestId('brugt-op-projects')
    expect(list).toBeInTheDocument()
    expect(screen.getByText('Bluse')).toBeInTheDocument()
    expect(screen.getByText('Sokker')).toBeInTheDocument()
  })

  it('skjult ved status="Brugt op" men tomme usages', () => {
    render(<GarnKort yarn={{ ...BASE, status: 'Brugt op', usages: [] }} onEdit={vi.fn()} />)
    expect(screen.queryByTestId('brugt-op-projects')).toBeNull()
  })

  it('skjult ved status="På lager" selv med usages', () => {
    render(<GarnKort
      yarn={{ ...BASE, status: 'På lager', usages: [{ yarnUsageId: 'u1', title: 'Bluse', quantityUsed: 1 }] }}
      onEdit={vi.fn()}
    />)
    expect(screen.queryByTestId('brugt-op-projects')).toBeNull()
  })

  it('ved >3 usages: vises kun 3 + "…og N flere"', () => {
    render(<GarnKort
      yarn={{
        ...BASE,
        status: 'Brugt op',
        usages: [
          { yarnUsageId: 'u1', title: 'P1', quantityUsed: 1 },
          { yarnUsageId: 'u2', title: 'P2', quantityUsed: 1 },
          { yarnUsageId: 'u3', title: 'P3', quantityUsed: 1 },
          { yarnUsageId: 'u4', title: 'P4', quantityUsed: 1 },
          { yarnUsageId: 'u5', title: 'P5', quantityUsed: 1 },
        ],
      }}
      onEdit={vi.fn()}
    />)
    expect(screen.getByText('P1')).toBeInTheDocument()
    expect(screen.queryByText('P4')).toBeNull()
    expect(screen.getByText(/og 2 flere/)).toBeInTheDocument()
  })
})
