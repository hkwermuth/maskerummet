/**
 * F5-acceptkriterier for BrugtOpFoldeUd-komponenten.
 *
 * AC: Renderes med projekt-input + dato-input + hint "Antal nøgler sættes til 0".
 * AC: Bruger F9 src-warning-tokens (bg-striq-src-warning-bg text-striq-src-warning-fg).
 * AC: Dato default = i dag (toISODate(new Date())) når brugtOpDato er tom.
 * AC: error vises i en role="alert"-blok.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Fastfryser "i dag" til en kendt dato så tests er deterministiske
const FIXED_DATE = new Date('2026-04-27T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})

afterEach(() => {
  vi.useRealTimers()
})

async function importBrugtOpFoldeUd() {
  // Ryd cache så vi altid får en frisk import
  const mod = await import('@/components/app/BrugtOpFoldeUd.jsx')
  return mod.default as React.ComponentType<{
    brugtTilProjekt: string
    brugtOpDato: string
    onChangeProjekt: (v: string) => void
    onChangeDato: (v: string) => void
    existingProjects?: { id: string; title: string }[]
    error?: string
  }>
}

function renderFoldeUd(props: {
  brugtTilProjekt?: string
  brugtOpDato?: string
  onChangeProjekt?: (v: string) => void
  onChangeDato?: (v: string) => void
  existingProjects?: { id: string; title: string }[]
  error?: string
}, Component: React.ComponentType<Parameters<typeof renderFoldeUd>[0]>) {
  const defaults = {
    brugtTilProjekt: '',
    brugtOpDato: '',
    onChangeProjekt: vi.fn(),
    onChangeDato: vi.fn(),
  }
  return render(<Component {...defaults} {...props} />)
}

// ── Render ────────────────────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — grundlæggende render', () => {
  it('renderes med data-testid="brugt-op-folde-ud"', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({}, BrugtOpFoldeUd)

    expect(screen.getByTestId('brugt-op-folde-ud')).toBeInTheDocument()
  })

  it('projekt-input er tilgængeligt (label "Projekt")', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({}, BrugtOpFoldeUd)

    expect(screen.getByLabelText('Projekt')).toBeInTheDocument()
  })

  it('dato-input er tilgængeligt (label "Brugt op den")', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({}, BrugtOpFoldeUd)

    expect(screen.getByLabelText('Brugt op den')).toBeInTheDocument()
  })

  it('hint-tekst "Antal nøgler sættes til 0" vises', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({}, BrugtOpFoldeUd)

    expect(screen.getByText(/antal nøgler sættes til 0/i)).toBeInTheDocument()
  })
})

// ── F9 src-warning tokens ─────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — F9 src-warning-tokens', () => {
  it('section-element har klassen bg-striq-src-warning-bg', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({}, BrugtOpFoldeUd)

    const section = screen.getByTestId('brugt-op-folde-ud')
    expect(section.classList.contains('bg-striq-src-warning-bg')).toBe(true)
  })

  it('section-element har klassen text-striq-src-warning-fg', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({}, BrugtOpFoldeUd)

    const section = screen.getByTestId('brugt-op-folde-ud')
    expect(section.classList.contains('text-striq-src-warning-fg')).toBe(true)
  })
})

// ── Dato-default ──────────────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — dato-default', () => {
  it('når brugtOpDato er tom, vises "i dag" (2026-04-27) i dato-feltet', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({ brugtOpDato: '' }, BrugtOpFoldeUd)

    const datoInput = screen.getByLabelText('Brugt op den') as HTMLInputElement
    expect(datoInput.value).toBe('2026-04-27')
  })

  it('når brugtOpDato er sat, vises den eksplicitte dato', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({ brugtOpDato: '2026-03-15' }, BrugtOpFoldeUd)

    const datoInput = screen.getByLabelText('Brugt op den') as HTMLInputElement
    expect(datoInput.value).toBe('2026-03-15')
  })
})

// ── Error / aria-alert ────────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — fejlvisning', () => {
  it('ingen error → ingen role="alert" i DOM', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({ error: undefined }, BrugtOpFoldeUd)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('error-prop → role="alert"-element renderes med fejlteksten', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({ error: 'Vælg et projekt' }, BrugtOpFoldeUd)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert.textContent).toContain('Vælg et projekt')
  })

  it('projekt-input er aria-invalid=true når error er sat', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({ error: 'Fejl' }, BrugtOpFoldeUd)

    const input = screen.getByLabelText('Projekt')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('projekt-input er aria-required=true', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    renderFoldeUd({}, BrugtOpFoldeUd)

    const input = screen.getByLabelText('Projekt')
    expect(input).toHaveAttribute('aria-required', 'true')
  })
})

// ── Bruger-interaktion ────────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — bruger-interaktion', () => {
  it('onChangeProjekt kaldes når bruger skriver i projekt-feltet', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    const onChangeProjekt = vi.fn()
    render(
      <BrugtOpFoldeUd
        brugtTilProjekt=""
        brugtOpDato=""
        onChangeProjekt={onChangeProjekt}
        onChangeDato={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('Projekt'), { target: { value: 'Sierraknit' } })

    expect(onChangeProjekt).toHaveBeenCalledWith('Sierraknit')
  })

  it('eksistingProjects med indhold renderer datalist', async () => {
    const BrugtOpFoldeUd = await importBrugtOpFoldeUd()
    render(
      <BrugtOpFoldeUd
        brugtTilProjekt=""
        brugtOpDato=""
        onChangeProjekt={vi.fn()}
        onChangeDato={vi.fn()}
        existingProjects={[{ id: 'p1', title: 'Sierraknit Diamond Top' }]}
      />
    )

    // datalist-option renderes med projekt-titlen
    const options = document.querySelectorAll('datalist option')
    expect(options.length).toBeGreaterThanOrEqual(1)
    expect((options[0] as HTMLOptionElement).value).toBe('Sierraknit Diamond Top')
  })
})
