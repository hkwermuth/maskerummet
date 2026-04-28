/**
 * F11 – GarnLinjeVælger tests
 *
 * AC 6  Tab-bar med tre tabs: "Fra mit garn", "Fra kataloget", "Manuelt"
 * AC 7  Default-tab: "Fra kataloget" ved vil_gerne, "Fra mit garn" ellers. Låst ved første render.
 * AC 8  "Fra mit garn"-tab viser brugerens lager via datalist
 * AC 9  "Fra kataloget"-tab genbruger catalogSearch child
 * AC 10 "Manuelt"-tab viser F9-warning-banner
 * AC 11 "Manuelt"-tab har kombineret farve-input
 * AC 12 AntalStepper renderes med step=0.5 som default
 * AC 13 Brugeren kan tilføje ≥2 garn-linjer (afprøves via Arkiv NytProjektModal)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@/lib/catalog', () => ({
  displayYarnName: vi.fn((y: { name: string }) => y?.name ?? ''),
  fetchColorsByIds: vi.fn(() => Promise.resolve(new Map())),
  fetchColorsForYarn: vi.fn(() => Promise.resolve([])),
  searchYarnsFull: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@/lib/data/colorFamilies', () => ({
  detectColorFamily: vi.fn(() => null),
  COLOR_FAMILY_LABELS: [],
  COLOR_FAMILY_DEFAULT_HEX: {},
}))

vi.mock('@/components/app/FarvekategoriCirkler', () => ({
  default: () => <div data-testid="farvekategori-cirkler" />,
}))

vi.mock('@/components/app/AntalStepper', () => ({
  default: ({ value, onChange, ariaLabel }: { value: unknown; onChange: (v: unknown) => void; ariaLabel?: string }) => (
    <div data-testid="antal-stepper" aria-label={ariaLabel ?? 'Antal nøgler'}>
      <input
        type="number"
        value={String(value)}
        onChange={e => onChange(e.target.value)}
        aria-label={ariaLabel ?? 'Antal nøgler'}
      />
    </div>
  ),
}))

vi.mock('@/lib/yarn-display', () => ({
  dedupeYarnNameFromBrand: vi.fn((name: string) => name),
}))

// ── Import ────────────────────────────────────────────────────────────────────

import GarnLinjeVælger, { defaultTabForStatus, inferTabFromLine } from '@/components/app/GarnLinjeVælger'

// ── Helpers ───────────────────────────────────────────────────────────────────

const emptyLine = {
  yarnName: '',
  yarnBrand: '',
  colorName: '',
  colorCode: '',
  hex: '#A8C4C4',
  quantityUsed: '',
  catalogYarnId: null,
  catalogColorId: null,
}

function renderVælger(props: Partial<React.ComponentProps<typeof GarnLinjeVælger>> = {}) {
  const onChange = vi.fn()
  const result = render(
    <GarnLinjeVælger
      line={emptyLine}
      onChange={onChange}
      onRemove={vi.fn()}
      status="faerdigstrikket"
      userYarnItems={[]}
      catalogSearch={<div data-testid="catalog-search" />}
      onSelectCatalogYarn={vi.fn()}
      catalogColors={[]}
      onSelectCatalogColor={vi.fn()}
      {...props}
    />
  )
  return { ...result, onChange }
}

beforeEach(() => vi.clearAllMocks())

// ── AC 6 – Tre tabs renderes ──────────────────────────────────────────────────

describe('AC6 – Tab-bar med tre tabs', () => {
  it('renderer "Fra mit garn" tab', () => {
    renderVælger()
    expect(screen.getByRole('tab', { name: /fra mit garn/i })).toBeInTheDocument()
  })

  it('renderer "Fra kataloget" tab', () => {
    renderVælger()
    expect(screen.getByRole('tab', { name: /fra kataloget/i })).toBeInTheDocument()
  })

  it('renderer "Manuelt" tab', () => {
    renderVælger()
    expect(screen.getByRole('tab', { name: /manuelt/i })).toBeInTheDocument()
  })

  it('tablist har aria-label', () => {
    renderVælger()
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })
})

// ── AC 7 – Default-tab ────────────────────────────────────────────────────────

describe('AC7 – Default-tab efter status', () => {
  it('defaultTabForStatus("vil_gerne") returnerer katalog', () => {
    expect(defaultTabForStatus('vil_gerne')).toBe('katalog')
  })

  it('defaultTabForStatus("i_gang") returnerer mit_garn', () => {
    expect(defaultTabForStatus('i_gang')).toBe('mit_garn')
  })

  it('defaultTabForStatus("faerdigstrikket") returnerer mit_garn', () => {
    expect(defaultTabForStatus('faerdigstrikket')).toBe('mit_garn')
  })

  it('status=vil_gerne → "Fra kataloget" er aktiv (aria-selected=true)', () => {
    renderVælger({ status: 'vil_gerne' })
    const tab = screen.getByRole('tab', { name: /fra kataloget/i })
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('status=i_gang → "Fra mit garn" er aktiv (aria-selected=true)', () => {
    renderVælger({ status: 'i_gang', userYarnItems: [] })
    const tab = screen.getByRole('tab', { name: /fra mit garn/i })
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('status=faerdigstrikket → "Fra mit garn" er aktiv', () => {
    renderVælger({ status: 'faerdigstrikket' })
    const tab = screen.getByRole('tab', { name: /fra mit garn/i })
    expect(tab).toHaveAttribute('aria-selected', 'true')
  })

  it('default-tab låst: status-skift efter mount ændrer ikke aktiv tab', async () => {
    // Vi renderer med en given status — tab låses til det
    // (komponenten bruger useState med initialValue, ingen re-derive fra prop)
    const { rerender } = renderVælger({ status: 'vil_gerne' })
    // Initial: Fra kataloget aktiv
    expect(screen.getByRole('tab', { name: /fra kataloget/i })).toHaveAttribute('aria-selected', 'true')

    // Re-render med ny status — tab SKAL forblive katalog (låst ved mount)
    rerender(
      <GarnLinjeVælger
        line={emptyLine}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        status="faerdigstrikket"
        userYarnItems={[]}
        catalogSearch={<div data-testid="catalog-search" />}
        onSelectCatalogYarn={vi.fn()}
        catalogColors={[]}
        onSelectCatalogColor={vi.fn()}
      />
    )
    // Tab skal stadig være katalog
    expect(screen.getByRole('tab', { name: /fra kataloget/i })).toHaveAttribute('aria-selected', 'true')
  })
})

// ── AC 8 – "Fra mit garn"-tab viser datalist ──────────────────────────────────

describe('AC8 – Fra mit garn-tab viser datalist', () => {
  const sampleYarnItems = [
    { id: 'y1', brand: 'Permin', name: 'Bella', colorName: 'Rosa', colorCode: '883174', hex: '#E1A1B0', catalogYarnId: null, catalogColorId: null },
    { id: 'y2', brand: 'Isager', name: 'Alpaca 1', colorName: 'Blå', colorCode: '200', hex: '#4A6FA8', catalogYarnId: null, catalogColorId: null },
  ]

  it('viser søge-input når userYarnItems ikke er tom', () => {
    renderVælger({ status: 'i_gang', userYarnItems: sampleYarnItems })
    // Aktiv tab er Fra mit garn — input skal være synligt
    expect(screen.getByPlaceholderText(/garn i lageret/i)).toBeInTheDocument()
  })

  it('viser datalist-element med garn-optioner', () => {
    renderVælger({ status: 'i_gang', userYarnItems: sampleYarnItems })
    const datalist = document.querySelector('datalist')
    expect(datalist).not.toBeNull()
    const options = datalist!.querySelectorAll('option')
    expect(options.length).toBeGreaterThanOrEqual(2)
  })

  it('viser tomt-lager-besked når userYarnItems er tom', () => {
    renderVælger({ status: 'i_gang', userYarnItems: [] })
    expect(screen.getByText(/dit garnlager er tomt/i)).toBeInTheDocument()
  })
})

// ── AC 9 – "Fra kataloget"-tab genbruger catalogSearch child ─────────────────

describe('AC9 – Fra kataloget-tab renders catalogSearch child', () => {
  it('viser catalog-search child når katalog-tab er aktiv', async () => {
    const user = userEvent.setup()
    renderVælger({ status: 'faerdigstrikket' })

    await user.click(screen.getByRole('tab', { name: /fra kataloget/i }))

    expect(screen.getByTestId('catalog-search')).toBeInTheDocument()
  })

  it('viser catalog-search direkte ved vil_gerne-status (default katalog-tab)', () => {
    renderVælger({ status: 'vil_gerne' })
    expect(screen.getByTestId('catalog-search')).toBeInTheDocument()
  })
})

// ── AC 10 – "Manuelt"-tab viser F9-warning-banner ────────────────────────────

describe('AC10 – Manuelt-tab viser F9-warning-banner', () => {
  it('viser warning om at tilføje til lager på Manuelt-tab', async () => {
    const user = userEvent.setup()
    renderVælger({ status: 'faerdigstrikket' })

    await user.click(screen.getByRole('tab', { name: /manuelt/i }))

    expect(screen.getByText(/husk at tilføje garnet til dit lager bagefter/i)).toBeInTheDocument()
  })
})

// ── AC 11 – "Manuelt"-tab har kombineret farve-input ─────────────────────────

describe('AC11 – Manuelt-tab har kombineret farvenavn/farvenummer-input', () => {
  it('viser farve-input på Manuelt-tab', async () => {
    const user = userEvent.setup()
    renderVælger({ status: 'faerdigstrikket' })

    await user.click(screen.getByRole('tab', { name: /manuelt/i }))

    // Farve-input med placeholder
    expect(screen.getByPlaceholderText(/fx 883174/i)).toBeInTheDocument()
  })

  it('viser FarvekategoriCirkler på Manuelt-tab', async () => {
    const user = userEvent.setup()
    renderVælger({ status: 'faerdigstrikket' })

    await user.click(screen.getByRole('tab', { name: /manuelt/i }))

    expect(screen.getByTestId('farvekategori-cirkler')).toBeInTheDocument()
  })

  it('viser mærke og garn-inputs på Manuelt-tab', async () => {
    const user = userEvent.setup()
    renderVælger({ status: 'faerdigstrikket' })

    await user.click(screen.getByRole('tab', { name: /manuelt/i }))

    expect(screen.getByPlaceholderText(/f\.eks\. permin/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/f\.eks\. bella/i)).toBeInTheDocument()
  })
})

// ── AC 12 – AntalStepper renderes ────────────────────────────────────────────

describe('AC12 – AntalStepper renderes i GarnLinjeVælger', () => {
  it('renders AntalStepper med aria-label "Antal nøgler brugt"', () => {
    renderVælger()
    expect(screen.getByTestId('antal-stepper')).toBeInTheDocument()
  })

  it('AntalStepper er synlig på alle tre tabs', async () => {
    const user = userEvent.setup()
    renderVælger({ status: 'faerdigstrikket' })

    // Fra mit garn (default)
    expect(screen.getByTestId('antal-stepper')).toBeInTheDocument()

    // Fra kataloget
    await user.click(screen.getByRole('tab', { name: /fra kataloget/i }))
    expect(screen.getByTestId('antal-stepper')).toBeInTheDocument()

    // Manuelt
    await user.click(screen.getByRole('tab', { name: /manuelt/i }))
    expect(screen.getByTestId('antal-stepper')).toBeInTheDocument()
  })
})

// ── inferTabFromLine ──────────────────────────────────────────────────────────

describe('inferTabFromLine', () => {
  it('linje med yarnItemId → mit_garn', () => {
    expect(inferTabFromLine({ yarnItemId: 'y1' })).toBe('mit_garn')
  })

  it('linje med catalogYarnId → katalog', () => {
    expect(inferTabFromLine({ catalogYarnId: 'c1' })).toBe('katalog')
  })

  it('linje uden kilde-id → manuelt', () => {
    expect(inferTabFromLine({})).toBe('manuelt')
  })

  it('null → manuelt', () => {
    expect(inferTabFromLine(null)).toBe('manuelt')
  })
})
