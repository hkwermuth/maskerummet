/**
 * Tests for FlereFarverVælger (F4).
 *
 * Dækker acceptkriterium 11:
 * - Renders empty (ingen chips, "+ Tilføj farve"-knap synlig)
 * - Klik "+ Tilføj farve" åbner picker
 * - Klik på cirkel i picker kalder onChange med hex
 * - Klik X på chip fjerner farve
 * - Ved 5 farver: knap viser "Maks 5 farver" og er disabled
 * - Klik Annullér i picker lukker uden at tilføje
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// FarvekategoriCirkler mockes med en simpel mock der afspejler den nødvendige
// adfærd (farve-cirkel klik sender onChange med {hex}).
vi.mock('@/lib/data/colorFamilies', () => ({
  detectColorFamily: vi.fn(() => null),
  COLOR_FAMILY_LABELS: ['grøn', 'brun', 'blå', 'rød', 'rosa', 'gul', 'lilla', 'grå', 'hvid', 'sort', 'orange', 'turkis'],
  COLOR_FAMILY_DEFAULT_HEX: {
    grøn: '#4A7A62', brun: '#A67C52', blå: '#4A6FA8', rød: '#C14B3A',
    rosa: '#E1A1B0', gul: '#F0D040', lilla: '#7A5AA8', grå: '#9A948C',
    hvid: '#F4EFE6', sort: '#1A1A1A', orange: '#D07A3A', turkis: '#3BA6A6',
  },
  yarnMatchesStashSearch: vi.fn(() => true),
}))

async function importFlereFarverVælger() {
  const mod = await import('@/components/app/FlereFarverVælger.jsx')
  return mod.default as React.ComponentType<{
    hexColors: string[]
    onChange: (colors: string[]) => void
  }>
}

// ── Tom tilstand ──────────────────────────────────────────────────────────────

describe('FlereFarverVælger — tom tilstand', () => {
  it('renders uden chips når hexColors er tomt array', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    expect(screen.queryByRole('list', { name: /tilføjede farver/i })).not.toBeInTheDocument()
  })

  it('viser "+ Tilføj farve"-knap som default', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /\+ tilføj farve/i })).toBeInTheDocument()
  })

  it('picker er ikke åben som default', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    expect(screen.queryByText(/vælg farve at tilføje/i)).not.toBeInTheDocument()
  })

  it('informations-tekst om multi-farve vises', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    expect(screen.getByText(/multi-farve garn/i)).toBeInTheDocument()
  })
})

// ── Picker åbnes ─────────────────────────────────────────────────────────────

describe('FlereFarverVælger — åbn picker', () => {
  it('klik på "+ Tilføj farve" åbner picker', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))

    expect(screen.getByText(/vælg farve at tilføje/i)).toBeInTheDocument()
  })

  it('efter åbn: "+ Tilføj farve"-knap er skjult (erstattet af picker)', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))

    expect(screen.queryByRole('button', { name: /\+ tilføj farve/i })).not.toBeInTheDocument()
  })

  it('picker indeholder en radiogroup med farve-cirkler', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))

    expect(screen.getByRole('radiogroup', { name: /farvekategori/i })).toBeInTheDocument()
  })

  it('picker indeholder "Annullér"-knap', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))

    expect(screen.getByRole('button', { name: /annullér/i })).toBeInTheDocument()
  })
})

// ── Tilføj farve via cirkel ───────────────────────────────────────────────────

describe('FlereFarverVælger — tilføj farve', () => {
  it('klik på farve-cirkel i picker kalder onChange med ny hex', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FlereFarverVælger hexColors={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))

    // Klik på "grøn"-cirklen
    const groenCircle = screen.getByRole('radio', { name: /grøn/i })
    fireEvent.click(groenCircle)

    expect(onChange).toHaveBeenCalledTimes(1)
    const calledWith = onChange.mock.calls[0][0]
    expect(Array.isArray(calledWith)).toBe(true)
    expect(calledWith).toContain('#4A7A62')
  })

  it('picker lukker efter tilføjelse af farve', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FlereFarverVælger hexColors={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))
    fireEvent.click(screen.getByRole('radio', { name: /grøn/i }))

    expect(screen.queryByText(/vælg farve at tilføje/i)).not.toBeInTheDocument()
  })

  it('eksisterende farver bevares ved tilføjelse', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FlereFarverVælger hexColors={['#FF0000']} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))
    fireEvent.click(screen.getByRole('radio', { name: /grøn/i }))

    const calledWith = onChange.mock.calls[0][0]
    expect(calledWith).toContain('#FF0000')
    expect(calledWith).toContain('#4A7A62')
    expect(calledWith).toHaveLength(2)
  })
})

// ── Annullér ──────────────────────────────────────────────────────────────────

describe('FlereFarverVælger — Annullér', () => {
  it('klik på Annullér lukker picker', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))
    expect(screen.getByText(/vælg farve at tilføje/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /annullér/i }))

    expect(screen.queryByText(/vælg farve at tilføje/i)).not.toBeInTheDocument()
  })

  it('Annullér kalder IKKE onChange', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<FlereFarverVælger hexColors={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))
    await user.click(screen.getByRole('button', { name: /annullér/i }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('Annullér viser "+ Tilføj farve"-knap igen', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    render(<FlereFarverVælger hexColors={[]} onChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /\+ tilføj farve/i }))
    await user.click(screen.getByRole('button', { name: /annullér/i }))

    expect(screen.getByRole('button', { name: /\+ tilføj farve/i })).toBeInTheDocument()
  })
})

// ── Chips og fjern-knapper ────────────────────────────────────────────────────

describe('FlereFarverVælger — chips', () => {
  it('1 farve → 1 chip i listen', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={['#FF0000']} onChange={vi.fn()} />)

    const list = screen.getByRole('list', { name: /tilføjede farver/i })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(1)
  })

  it('3 farver → 3 chips i listen', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(
      <FlereFarverVælger
        hexColors={['#FF0000', '#00FF00', '#0000FF']}
        onChange={vi.fn()}
      />
    )

    const list = screen.getByRole('list', { name: /tilføjede farver/i })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(3)
  })

  it('chip viser "Farve 1", "Farve 2" etc.', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(
      <FlereFarverVælger
        hexColors={['#FF0000', '#00FF00']}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText('Farve 1')).toBeInTheDocument()
    expect(screen.getByText('Farve 2')).toBeInTheDocument()
  })

  it('X-knap på chip har aria-label "Fjern farve N"', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={['#FF0000', '#00FF00']} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /fjern farve 1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fjern farve 2/i })).toBeInTheDocument()
  })

  it('klik X på første chip kalder onChange uden den fjernede farve', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <FlereFarverVælger
        hexColors={['#FF0000', '#00FF00', '#0000FF']}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /fjern farve 1/i }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const calledWith = onChange.mock.calls[0][0]
    expect(calledWith).not.toContain('#FF0000')
    expect(calledWith).toContain('#00FF00')
    expect(calledWith).toContain('#0000FF')
  })

  it('klik X på midterste chip bevarer farver 1 og 3', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <FlereFarverVælger
        hexColors={['#FF0000', '#00FF00', '#0000FF']}
        onChange={onChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /fjern farve 2/i }))

    const calledWith = onChange.mock.calls[0][0]
    expect(calledWith).toContain('#FF0000')
    expect(calledWith).not.toContain('#00FF00')
    expect(calledWith).toContain('#0000FF')
    expect(calledWith).toHaveLength(2)
  })
})

// ── Maks 5 farver ────────────────────────────────────────────────────────────

describe('FlereFarverVælger — maks 5 farver', () => {
  const FIVE_COLORS = ['#111111', '#222222', '#333333', '#444444', '#555555']

  it('ved 5 farver: knap viser "Maks 5 farver"', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={FIVE_COLORS} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /maks 5 farver/i })).toBeInTheDocument()
  })

  it('ved 5 farver: knap er disabled', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={FIVE_COLORS} onChange={vi.fn()} />)

    const btn = screen.getByRole('button', { name: /maks 5 farver/i })
    expect(btn).toBeDisabled()
  })

  it('ved 5 farver: klik på disabled knap åbner IKKE picker', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={FIVE_COLORS} onChange={vi.fn()} />)

    // Disabled knap kan ikke klikkes via userEvent, men vi verificerer at picker ikke åbner
    const btn = screen.getByRole('button', { name: /maks 5 farver/i })
    expect(btn).toBeDisabled()
    expect(screen.queryByText(/vælg farve at tilføje/i)).not.toBeInTheDocument()
  })

  it('ved 5 farver: 5 chips vises', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    render(<FlereFarverVælger hexColors={FIVE_COLORS} onChange={vi.fn()} />)

    const list = screen.getByRole('list', { name: /tilføjede farver/i })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(5)
  })

  it('ved 4 farver: knap viser "+ Tilføj farve" (ikke disabled)', async () => {
    const FlereFarverVælger = await importFlereFarverVælger()
    const four = FIVE_COLORS.slice(0, 4)
    render(<FlereFarverVælger hexColors={four} onChange={vi.fn()} />)

    const btn = screen.getByRole('button', { name: /\+ tilføj farve/i })
    expect(btn).not.toBeDisabled()
  })
})
