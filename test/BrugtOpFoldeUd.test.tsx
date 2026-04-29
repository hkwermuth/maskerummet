/**
 * F15 acceptkriterier for BrugtOpFoldeUd-komponenten (3-mode kobling).
 *
 * AC: Renderes med 3 pill-tabs (Intet projekt / Eksisterende / Nyt) + dato + hint.
 * AC: Default mode='none' viser kun dato + hint, ingen projekt-input.
 * AC: Mode='existing' viser <select> med eksisterende projekter.
 * AC: Mode='new' viser titel-input.
 * AC: Bruger F9 src-warning-tokens (bg-striq-src-warning-bg text-striq-src-warning-fg).
 * AC: Dato default = i dag (toISODate(new Date())) når brugtOpDato er tom.
 * AC: errors-prop maps korrekt til {brugtOpProjectId, brugtOpNewTitle}.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import BrugtOpFoldeUd from '@/components/app/BrugtOpFoldeUd.jsx'

const FIXED_DATE = new Date('2026-04-29T12:00:00.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})

afterEach(() => {
  vi.useRealTimers()
})

type Props = React.ComponentProps<typeof BrugtOpFoldeUd>

function renderFoldeUd(overrides: Partial<Props> = {}) {
  const defaults: Props = {
    mode: 'none',
    onChangeMode: vi.fn(),
    selectedProjectId: '',
    onChangeProjectId: vi.fn(),
    newProjectTitle: '',
    onChangeNewProjectTitle: vi.fn(),
    brugtOpDato: '',
    onChangeDato: vi.fn(),
    existingProjects: [],
    errors: {},
  }
  return render(<BrugtOpFoldeUd {...defaults} {...overrides} />)
}

// ── Render ────────────────────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — grundlæggende render', () => {
  it('renderes med data-testid="brugt-op-folde-ud"', () => {
    renderFoldeUd()
    expect(screen.getByTestId('brugt-op-folde-ud')).toBeInTheDocument()
  })

  it('viser tre pill-tabs (none/existing/new)', () => {
    renderFoldeUd()
    expect(screen.getByTestId('brugt-op-mode-none')).toBeInTheDocument()
    expect(screen.getByTestId('brugt-op-mode-existing')).toBeInTheDocument()
    expect(screen.getByTestId('brugt-op-mode-new')).toBeInTheDocument()
  })

  it('dato-input er tilgængeligt (label "Brugt op den")', () => {
    renderFoldeUd()
    expect(screen.getByLabelText('Brugt op den')).toBeInTheDocument()
  })

  it('hint-tekst "Antal nøgler sættes til 0" vises', () => {
    renderFoldeUd()
    expect(screen.getByText(/antal nøgler sættes til 0/i)).toBeInTheDocument()
  })
})

// ── F9 src-warning tokens ─────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — F9 src-warning-tokens', () => {
  it('section har klassen bg-striq-src-warning-bg', () => {
    renderFoldeUd()
    const section = screen.getByTestId('brugt-op-folde-ud')
    expect(section.classList.contains('bg-striq-src-warning-bg')).toBe(true)
  })

  it('section har klassen text-striq-src-warning-fg', () => {
    renderFoldeUd()
    const section = screen.getByTestId('brugt-op-folde-ud')
    expect(section.classList.contains('text-striq-src-warning-fg')).toBe(true)
  })
})

// ── Mode-skift ────────────────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — mode-skift', () => {
  it('mode="none" viser HVERKEN select eller titel-input', () => {
    renderFoldeUd({ mode: 'none' })
    expect(screen.queryByLabelText('Vælg projekt')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Projekttitel')).not.toBeInTheDocument()
  })

  it('mode="existing" viser select med projekt-options', () => {
    renderFoldeUd({
      mode: 'existing',
      existingProjects: [
        { id: 'p1', title: 'Sierraknit Diamond Top' },
        { id: 'p2', title: 'Blå Lettere end du tror' },
      ],
    })
    const select = screen.getByLabelText('Vælg projekt') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select.options.length).toBe(3) // tom + 2 projekter
    expect(select.options[1].textContent).toContain('Sierraknit Diamond Top')
    expect(select.options[2].textContent).toContain('Blå Lettere end du tror')
  })

  it('mode="existing" uden projekter viser hint om at oprette nyt', () => {
    renderFoldeUd({ mode: 'existing', existingProjects: [] })
    expect(screen.getByText(/du har ingen projekter endnu/i)).toBeInTheDocument()
  })

  it('mode="new" viser titel-input', () => {
    renderFoldeUd({ mode: 'new' })
    expect(screen.getByLabelText('Projekttitel')).toBeInTheDocument()
  })

  it('klik på "Eksisterende projekt"-tab kalder onChangeMode("existing")', () => {
    const onChangeMode = vi.fn()
    renderFoldeUd({ onChangeMode })
    fireEvent.click(screen.getByTestId('brugt-op-mode-existing'))
    expect(onChangeMode).toHaveBeenCalledWith('existing')
  })

  it('klik på "Nyt projekt"-tab kalder onChangeMode("new")', () => {
    const onChangeMode = vi.fn()
    renderFoldeUd({ onChangeMode })
    fireEvent.click(screen.getByTestId('brugt-op-mode-new'))
    expect(onChangeMode).toHaveBeenCalledWith('new')
  })

  it('aktiv tab har aria-selected=true', () => {
    renderFoldeUd({ mode: 'new' })
    expect(screen.getByTestId('brugt-op-mode-new')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('brugt-op-mode-none')).toHaveAttribute('aria-selected', 'false')
  })
})

// ── Bruger-interaktion ────────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — bruger-interaktion', () => {
  it('onChangeProjectId kaldes når bruger vælger projekt fra select', () => {
    const onChangeProjectId = vi.fn()
    renderFoldeUd({
      mode: 'existing',
      existingProjects: [{ id: 'p1', title: 'Sierraknit' }],
      onChangeProjectId,
    })
    fireEvent.change(screen.getByLabelText('Vælg projekt'), { target: { value: 'p1' } })
    expect(onChangeProjectId).toHaveBeenCalledWith('p1')
  })

  it('onChangeNewProjectTitle kaldes når bruger skriver titel', () => {
    const onChangeNewProjectTitle = vi.fn()
    renderFoldeUd({ mode: 'new', onChangeNewProjectTitle })
    fireEvent.change(screen.getByLabelText('Projekttitel'), { target: { value: 'Min Bluse' } })
    expect(onChangeNewProjectTitle).toHaveBeenCalledWith('Min Bluse')
  })

  it('onChangeDato kaldes når bruger ændrer dato', () => {
    const onChangeDato = vi.fn()
    renderFoldeUd({ onChangeDato })
    fireEvent.change(screen.getByLabelText('Brugt op den'), { target: { value: '2026-03-15' } })
    expect(onChangeDato).toHaveBeenCalledWith('2026-03-15')
  })
})

// ── Dato-default ──────────────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — dato-default', () => {
  it('når brugtOpDato er tom, vises "i dag" (2026-04-29)', () => {
    renderFoldeUd({ brugtOpDato: '' })
    const datoInput = screen.getByLabelText('Brugt op den') as HTMLInputElement
    expect(datoInput.value).toBe('2026-04-29')
  })

  it('når brugtOpDato er sat, vises den eksplicitte dato', () => {
    renderFoldeUd({ brugtOpDato: '2026-03-15' })
    const datoInput = screen.getByLabelText('Brugt op den') as HTMLInputElement
    expect(datoInput.value).toBe('2026-03-15')
  })
})

// ── Fejlvisning ───────────────────────────────────────────────────────────────

describe('BrugtOpFoldeUd — fejlvisning', () => {
  it('errors.brugtOpProjectId vises som role="alert" i existing-mode', () => {
    renderFoldeUd({ mode: 'existing', errors: { brugtOpProjectId: 'Vælg et projekt' } })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Vælg et projekt')
  })

  it('errors.brugtOpNewTitle vises som role="alert" i new-mode', () => {
    renderFoldeUd({ mode: 'new', errors: { brugtOpNewTitle: 'Skriv en titel' } })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Skriv en titel')
  })

  it('select er aria-invalid=true når projekt-fejl er sat', () => {
    renderFoldeUd({ mode: 'existing', errors: { brugtOpProjectId: 'Fejl' } })
    expect(screen.getByLabelText('Vælg projekt')).toHaveAttribute('aria-invalid', 'true')
  })

  it('titel-input er aria-invalid=true når titel-fejl er sat', () => {
    renderFoldeUd({ mode: 'new', errors: { brugtOpNewTitle: 'Fejl' } })
    expect(screen.getByLabelText('Projekttitel')).toHaveAttribute('aria-invalid', 'true')
  })

  it('mode="none" viser ingen role="alert"', () => {
    renderFoldeUd({ mode: 'none', errors: { brugtOpProjectId: 'X', brugtOpNewTitle: 'Y' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
