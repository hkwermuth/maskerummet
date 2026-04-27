/**
 * Tests for KatalogInfoblok-komponenten (F2 — Read-only katalog-sektion i Tilføj Garn-formular).
 *
 * Dækker acceptkriterierne:
 * AC1  — grøn read-only KatalogInfoblok renderes med data
 * AC9  — yarn=null → "Henter katalog-data…" vises, ingen <dl>
 * AC10 — yarn_weight via YARN_WEIGHT_LABELS; fallback til thickness_category
 * AC3  — "Fjern katalog-link"-knap kalder onClearLink
 * AC5  — ingen onClearLink prop → ingen knap renderes
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────
// Katalog-hjælpere er pure functions, vi mocker dem med kendte returværdier
// for at holde tests uafhængige af katalogets implementering.

vi.mock('@/lib/catalog', () => ({
  displayYarnName: vi.fn((y) => y?.full_name ?? y?.name ?? ''),
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

// YARN_WEIGHT_LABELS er en simpel Record — vi importerer den direkte.
// Hvis vi mockede lib/yarn-weight ville vi bryde YARN_WEIGHT_LABELS-import i KatalogInfoblok.
// Ingen mock nødvendig; modulet er side-effect-frit.

// ── Fixture ───────────────────────────────────────────────────────────────────

const FULL_YARN = {
  id: 'yarn-1',
  producer: 'Isager',
  name: 'Alpaca 1',
  series: null,
  full_name: 'Isager Alpaca 1',
  fiber_main: 'Alpaka',
  thickness_category: 'fingering',
  yarn_weight: 'fingering',
  ball_weight_g: 50,
  length_per_100g_m: 400,   // → metrage = 200
  needle_min_mm: 2,
  needle_max_mm: 3,
  gauge_needle_mm: 2.5,
  color_count: 30,
}

// ─── Render-hjælper ───────────────────────────────────────────────────────────

async function importKatalogInfoblok() {
  const mod = await import('@/components/app/KatalogInfoblok.jsx')
  return mod.default as React.ComponentType<{ yarn?: unknown; onClearLink?: () => void }>
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('KatalogInfoblok — sektion renderes altid', () => {
  it('renderes med aria-label og data-testid', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    const section = screen.getByRole('region', { name: /information fra garn-kataloget/i })
    expect(section).toBeInTheDocument()
    expect(section).toHaveAttribute('data-testid', 'katalog-infoblok')
  })

  it('viser altid "Fra kataloget"-header', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    expect(screen.getByText('Fra kataloget')).toBeInTheDocument()
  })
})

describe('KatalogInfoblok — AC9: yarn=null viser loading-tekst, ingen dl', () => {
  it('viser "Henter katalog-data…" når yarn er undefined', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={undefined} />)

    expect(screen.getByText('Henter katalog-data…')).toBeInTheDocument()
  })

  it('viser "Henter katalog-data…" når yarn er null', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={null} />)

    expect(screen.getByText('Henter katalog-data…')).toBeInTheDocument()
  })

  it('render IKKE <dl> når yarn er null', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    const { container } = render(<KatalogInfoblok yarn={null} />)

    expect(container.querySelector('dl')).not.toBeInTheDocument()
  })
})

describe('KatalogInfoblok — AC1: viser data-rækker med korrekte labels og værdier', () => {
  it('viser Mærke-rækken med producer', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    expect(screen.getByText('Mærke')).toBeInTheDocument()
    expect(screen.getByText('Isager')).toBeInTheDocument()
  })

  it('viser Garnnavn via displayYarnName', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    expect(screen.getByText('Garnnavn')).toBeInTheDocument()
    expect(screen.getByText('Isager Alpaca 1')).toBeInTheDocument()
  })

  it('viser Fiber-rækken', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    expect(screen.getByText('Fiber')).toBeInTheDocument()
    expect(screen.getByText('Alpaka')).toBeInTheDocument()
  })

  it('viser Ball-vægt med "g"-enhed', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    expect(screen.getByText('Ball-vægt')).toBeInTheDocument()
    expect(screen.getByText('50 g')).toBeInTheDocument()
  })

  it('viser Gauge-pind med "mm"-enhed', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    expect(screen.getByText('Gauge-pind')).toBeInTheDocument()
    expect(screen.getByText('2.5 mm')).toBeInTheDocument()
  })

  it('viser Løbelængde/nøgle beregnet fra ball_weight_g og length_per_100g_m', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    expect(screen.getByText('Løbelængde/nøgle')).toBeInTheDocument()
    expect(screen.getByText('200 m')).toBeInTheDocument()
  })

  it('viser Pindstørrelse som interval', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    expect(screen.getByText('Pindstørrelse')).toBeInTheDocument()
    expect(screen.getByText('2-3')).toBeInTheDocument()
  })
})

describe('KatalogInfoblok — AC10: Vægt-label via YARN_WEIGHT_LABELS', () => {
  it('viser "Fingering" for yarn_weight="fingering"', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, yarn_weight: 'fingering', thickness_category: null }} />)

    expect(screen.getByText('Vægt')).toBeInTheDocument()
    expect(screen.getByText('Fingering')).toBeInTheDocument()
  })

  it('viser "Lace" for yarn_weight="lace"', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, yarn_weight: 'lace', thickness_category: null }} />)

    expect(screen.getByText('Lace')).toBeInTheDocument()
  })

  it('viser "DK" for yarn_weight="dk"', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, yarn_weight: 'dk', thickness_category: null }} />)

    expect(screen.getByText('DK')).toBeInTheDocument()
  })

  it('AC10-fallback: viser thickness_category når yarn_weight er null', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, yarn_weight: null, thickness_category: 'lace' }} />)

    expect(screen.getByText('Vægt')).toBeInTheDocument()
    expect(screen.getByText('lace')).toBeInTheDocument()
  })

  it('AC10-fallback: viser thickness_category "dk" som fri-tekst når yarn_weight mangler', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, yarn_weight: null, thickness_category: 'dk' }} />)

    expect(screen.getByText('dk')).toBeInTheDocument()
  })
})

describe('KatalogInfoblok — filtrering af tomme felter', () => {
  it('skjuler Gauge-pind-rækken når gauge_needle_mm er null', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, gauge_needle_mm: null }} />)

    // Gauge-pind vises kun når værdien er ikke-null (pindstrFromYarn returnerer interval)
    // I dette tilfælde er needle_min_mm + needle_max_mm sat, så Pindstørrelse vises.
    // Gauge-pind-label (for den separate gauge_needle_mm-celle) må ikke vises.
    expect(screen.queryByText('Gauge-pind')).not.toBeInTheDocument()
  })

  it('skjuler Ball-vægt-rækken når ball_weight_g er null', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, ball_weight_g: null }} />)

    expect(screen.queryByText('Ball-vægt')).not.toBeInTheDocument()
  })

  it('skjuler Mærke-rækken når producer er null/tom', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, producer: null }} />)

    expect(screen.queryByText('Mærke')).not.toBeInTheDocument()
  })

  it('skjuler Fiber-rækken når fiber_main er tom streng', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, fiber_main: '' }} />)

    expect(screen.queryByText('Fiber')).not.toBeInTheDocument()
  })

  it('skjuler Løbelængde-rækken når ball_weight_g og length_per_100g_m mangler', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, ball_weight_g: null, length_per_100g_m: null }} />)

    expect(screen.queryByText('Løbelængde/nøgle')).not.toBeInTheDocument()
  })

  it('skjuler Vægt-rækken når både yarn_weight og thickness_category mangler', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={{ ...FULL_YARN, yarn_weight: null, thickness_category: null }} />)

    expect(screen.queryByText('Vægt')).not.toBeInTheDocument()
  })
})

describe('KatalogInfoblok — AC3: onClearLink / Fjern katalog-link', () => {
  it('viser "Fjern katalog-link"-knap når onClearLink er givet', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    const onClearLink = vi.fn()
    render(<KatalogInfoblok yarn={FULL_YARN} onClearLink={onClearLink} />)

    expect(screen.getByRole('button', { name: /fjern katalog-link/i })).toBeInTheDocument()
  })

  it('kalder onClearLink når "Fjern katalog-link" klikkes', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    const onClearLink = vi.fn()
    render(<KatalogInfoblok yarn={FULL_YARN} onClearLink={onClearLink} />)

    fireEvent.click(screen.getByRole('button', { name: /fjern katalog-link/i }))

    expect(onClearLink).toHaveBeenCalledTimes(1)
  })

  it('AC5: ingen "Fjern katalog-link"-knap når onClearLink IKKE er givet', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={FULL_YARN} />)

    expect(screen.queryByRole('button', { name: /fjern katalog-link/i })).not.toBeInTheDocument()
  })

  it('ingen knap vises heller ikke når yarn=null og onClearLink mangler', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    render(<KatalogInfoblok yarn={null} />)

    expect(screen.queryByRole('button', { name: /fjern katalog-link/i })).not.toBeInTheDocument()
  })

  it('"Fjern katalog-link"-knap vises også ved yarn=null (bruges under loading)', async () => {
    const KatalogInfoblok = await importKatalogInfoblok()
    const onClearLink = vi.fn()
    render(<KatalogInfoblok yarn={null} onClearLink={onClearLink} />)

    expect(screen.getByRole('button', { name: /fjern katalog-link/i })).toBeInTheDocument()
  })
})
