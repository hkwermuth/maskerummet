/**
 * GarnLinjeVælger – FraKatalogTab (fri farve input + farve-pills)
 *
 * AC 23  Når catalogYarnId er sat og catalogColors har items → vises fri-tekst-input (ikke select)
 * AC 24  Skriv "883174 Rosa" → onChange med colorCode='883174' og colorName='Rosa'
 * AC 25  Skriv i feltet med catalogColorId sat → opdatering sender catalogColorId: null
 * AC 26  catalogColors.length > 6 → vis 6 pills + "Vis alle (N)"-toggle. Klik → vis alle. Klik igen → "Vis færre"
 * AC 27  Klik på en pill → onSelectCatalogColor(c) med det rigtige objekt
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Mocks (samme mønster som GarnLinjeVælger.test.tsx) ────────────────────────

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
  default: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: unknown
    onChange: (v: unknown) => void
    ariaLabel?: string
  }) => (
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

import GarnLinjeVælger from '@/components/app/GarnLinjeVælger'
import { fireEvent } from '@testing-library/react'

// ── Hjælpere ──────────────────────────────────────────────────────────────────

function makeLine(overrides = {}) {
  return {
    yarnName: 'Bella',
    yarnBrand: 'Permin',
    colorName: '',
    colorCode: '',
    hex: '#A8C4C4',
    quantityUsed: '',
    catalogYarnId: 'yarn-123',
    catalogColorId: null,
    ...overrides,
  }
}

function makeColors(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `color-${i + 1}`,
    yarn_id: 'yarn-123',
    color_number: `${1000 + i}`,
    color_name: `Farve ${i + 1}`,
    color_family: null,
    hex_code: `#${String(i * 10 + 10).padStart(2, '0')}AABB`,
    status: null,
    image_url: null,
    barcode: null,
  }))
}

function renderKatalogTab(
  lineOverrides = {},
  catalogColors = makeColors(3),
  extraProps = {}
) {
  const onChange = vi.fn()
  const onSelectCatalogColor = vi.fn()
  const result = render(
    <GarnLinjeVælger
      line={makeLine(lineOverrides)}
      onChange={onChange}
      onRemove={vi.fn()}
      status="vil_gerne"
      initialTab="katalog"
      userYarnItems={[]}
      catalogSearch={<div data-testid="catalog-search" />}
      onSelectCatalogYarn={vi.fn()}
      catalogColors={catalogColors}
      onSelectCatalogColor={onSelectCatalogColor}
      {...extraProps}
    />
  )
  return { ...result, onChange, onSelectCatalogColor }
}

beforeEach(() => vi.clearAllMocks())

// ── AC 23 – fri-tekst-input (ikke select) ─────────────────────────────────────

describe('AC23 – FraKatalogTab viser fri-tekst-input når catalogYarnId er sat', () => {
  it('viser input[type=text] til farve (ikke select) ved catalogYarnId', () => {
    renderKatalogTab()
    // Der må ikke være en select til farven
    const selects = document.querySelectorAll('select')
    const placeholderInput = screen.getByPlaceholderText(/fx 883174 eller rosa/i)
    expect(placeholderInput.tagName).toBe('INPUT')
    // Ingen select til farvevalget — garnvægt-select er i Manuelt-tab, ikke her
    expect(selects).toHaveLength(0)
  })

  it('viser IKKE fri-tekst-input når catalogYarnId er null', () => {
    renderKatalogTab({ catalogYarnId: null }, [])
    expect(screen.queryByPlaceholderText(/fx 883174 eller rosa/i)).not.toBeInTheDocument()
  })
})

// ── AC 24 – parseCombinedColorInput via onChange ───────────────────────────────

describe('AC24 – Fri-tekst-input kalder onChange med parsed colorCode og colorName', () => {
  it('"883174 Rosa" → colorCode="883174", colorName="Rosa"', () => {
    const { onChange } = renderKatalogTab()

    const input = screen.getByPlaceholderText(/fx 883174 eller rosa/i)
    // fireEvent.change simulerer fuld input-ændring i stedet for per-keystroke
    fireEvent.change(input, { target: { value: '883174 Rosa' } })

    expect(onChange).toHaveBeenCalledTimes(1)
    const lastCall = onChange.mock.calls[0][0]
    expect(lastCall.colorCode).toBe('883174')
    expect(lastCall.colorName).toBe('Rosa')
  })

  it('"Rosa" → colorCode="", colorName="Rosa"', () => {
    const { onChange } = renderKatalogTab()

    const input = screen.getByPlaceholderText(/fx 883174 eller rosa/i)
    fireEvent.change(input, { target: { value: 'Rosa' } })

    const lastCall = onChange.mock.calls[0][0]
    expect(lastCall.colorName).toBe('Rosa')
    expect(lastCall.colorCode).toBe('')
  })
})

// ── AC 25 – catalogColorId sættes til null ved fritekst-ændring ───────────────

describe('AC25 – Fri-tekst-ændring nulstiller catalogColorId', () => {
  it('sender catalogColorId: null i onChange når der skrives i feltet', () => {
    // Start med en allerede valgt catalogColorId
    const { onChange } = renderKatalogTab({ catalogColorId: 'color-1' })

    const input = screen.getByPlaceholderText(/fx 883174 eller rosa/i)
    fireEvent.change(input, { target: { value: 'X' } })

    const lastCall = onChange.mock.calls[0][0]
    expect(lastCall.catalogColorId).toBeNull()
  })
})

// ── AC 26 – Vis alle / Vis færre toggle ───────────────────────────────────────

describe('AC26 – catalogColors > 6 viser toggle "Vis alle"', () => {
  it('viser kun 6 pills + "Vis alle (N)"-knap når count > 6', () => {
    renderKatalogTab({}, makeColors(10))

    // 6 pills vises
    const pills = screen.getAllByRole('button', { name: /farve \d+/i })
    expect(pills).toHaveLength(6)

    // Toggle-knap med antal
    expect(screen.getByRole('button', { name: /vis alle \(10\)/i })).toBeInTheDocument()
  })

  it('klik "Vis alle" → alle 10 pills vises', async () => {
    const user = userEvent.setup()
    renderKatalogTab({}, makeColors(10))

    await user.click(screen.getByRole('button', { name: /vis alle \(10\)/i }))

    const pills = screen.getAllByRole('button', { name: /farve \d+/i })
    expect(pills).toHaveLength(10)
  })

  it('klik "Vis alle" → knaptekst skifter til "Vis færre"', async () => {
    const user = userEvent.setup()
    renderKatalogTab({}, makeColors(10))

    await user.click(screen.getByRole('button', { name: /vis alle \(10\)/i }))

    expect(screen.getByRole('button', { name: /vis færre/i })).toBeInTheDocument()
  })

  it('klik "Vis færre" igen → tilbage til 6 pills', async () => {
    const user = userEvent.setup()
    renderKatalogTab({}, makeColors(10))

    await user.click(screen.getByRole('button', { name: /vis alle \(10\)/i }))
    await user.click(screen.getByRole('button', { name: /vis færre/i }))

    const pills = screen.getAllByRole('button', { name: /farve \d+/i })
    expect(pills).toHaveLength(6)
    expect(screen.getByRole('button', { name: /vis alle \(10\)/i })).toBeInTheDocument()
  })

  it('viser IKKE toggle-knap når count <= 6', () => {
    renderKatalogTab({}, makeColors(6))

    expect(screen.queryByRole('button', { name: /vis alle/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /vis færre/i })).not.toBeInTheDocument()
  })
})

// ── AC 27 – Klik på pill kalder onSelectCatalogColor ─────────────────────────

describe('AC27 – Klik på pill kalder onSelectCatalogColor med korrekt objekt', () => {
  it('klik på første pill kalder onSelectCatalogColor med color-1', async () => {
    const user = userEvent.setup()
    const colors = makeColors(3)
    const { onSelectCatalogColor } = renderKatalogTab({}, colors)

    // Pill-titler er "Farve 1", "Farve 2" etc.
    const firstPill = screen.getByRole('button', { name: /farve 1/i })
    await user.click(firstPill)

    expect(onSelectCatalogColor).toHaveBeenCalledTimes(1)
    expect(onSelectCatalogColor).toHaveBeenCalledWith(colors[0])
  })

  it('klik på anden pill kalder onSelectCatalogColor med color-2', async () => {
    const user = userEvent.setup()
    const colors = makeColors(3)
    const { onSelectCatalogColor } = renderKatalogTab({}, colors)

    const secondPill = screen.getByRole('button', { name: /farve 2/i })
    await user.click(secondPill)

    expect(onSelectCatalogColor).toHaveBeenCalledWith(colors[1])
  })
})
