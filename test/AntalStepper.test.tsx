/**
 * Tests for AntalStepper (F3 + F11).
 *
 * Dækker acceptkriterierne:
 * AC8  — −/+ med min 0, step 0.5 (default fra F11), komma-input accepteres
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

async function importAntalStepper() {
  const mod = await import('@/components/app/AntalStepper.jsx')
  return mod.default as React.ComponentType<{
    value: number | string
    onChange: (v: number | string) => void
    min?: number
    step?: number
    ariaLabel?: string
  }>
}

// ── Aria ──────────────────────────────────────────────────────────────────────

describe('AntalStepper — aria-attributter', () => {
  it('renderer en group med aria-label "Antal nøgler" (default)', async () => {
    const AntalStepper = await importAntalStepper()
    render(<AntalStepper value={1} onChange={vi.fn()} />)

    expect(screen.getByRole('group', { name: /antal nøgler/i })).toBeInTheDocument()
  })

  it('− knap har aria-label "Mindsk antal nøgler"', async () => {
    const AntalStepper = await importAntalStepper()
    render(<AntalStepper value={1} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: /mindsk antal nøgler/i })).toBeInTheDocument()
  })

  it('+ knap har aria-label (Forøg antal nøgler)', async () => {
    const AntalStepper = await importAntalStepper()
    render(<AntalStepper value={1} onChange={vi.fn()} />)

    // Den knap med + / Forøg
    expect(screen.getByRole('button', { name: /forøg antal nøgler/i })).toBeInTheDocument()
  })
})

// ── AC8: min=0 grænse ────────────────────────────────────────────────────────

describe('AntalStepper — AC8: − stopper ved min=0', () => {
  it('− knap er disabled når value=0 (min=0 default)', async () => {
    const AntalStepper = await importAntalStepper()
    render(<AntalStepper value={0} onChange={vi.fn()} />)

    const decBtn = screen.getByRole('button', { name: /mindsk antal nøgler/i })
    expect(decBtn).toBeDisabled()
  })

  it('− knap er ikke disabled når value=1', async () => {
    const AntalStepper = await importAntalStepper()
    render(<AntalStepper value={1} onChange={vi.fn()} />)

    const decBtn = screen.getByRole('button', { name: /mindsk antal nøgler/i })
    expect(decBtn).not.toBeDisabled()
  })

  it('klik på − kalder onChange med (value - step) men aldrig under min', async () => {
    const AntalStepper = await importAntalStepper()
    const onChange = vi.fn()
    render(<AntalStepper value={0.5} onChange={onChange} />)

    const decBtn = screen.getByRole('button', { name: /mindsk antal nøgler/i })
    fireEvent.click(decBtn)

    // 0.5 - 0.5 = 0 (ikke negativt)
    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('klik på − fra value=1 giver 0.5 (step=0.5 default)', async () => {
    const AntalStepper = await importAntalStepper()
    const onChange = vi.fn()
    render(<AntalStepper value={1} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /mindsk antal nøgler/i }))

    expect(onChange).toHaveBeenCalledWith(0.5)
  })
})

// ── AC8: + inkrement ─────────────────────────────────────────────────────────

describe('AntalStepper — AC8: + inkrementerer med step=0.5 (F11 default)', () => {
  it('klik på + kalder onChange med (value + step)', async () => {
    const AntalStepper = await importAntalStepper()
    const onChange = vi.fn()
    render(<AntalStepper value={1} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /forøg antal nøgler/i }))

    expect(onChange).toHaveBeenCalledWith(1.5)
  })

  it('klik på + fra 0 giver 0.5', async () => {
    const AntalStepper = await importAntalStepper()
    const onChange = vi.fn()
    render(<AntalStepper value={0} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: /forøg antal nøgler/i }))

    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it('+ knap er aldrig disabled', async () => {
    const AntalStepper = await importAntalStepper()
    render(<AntalStepper value={0} onChange={vi.fn()} />)

    const incBtn = screen.getByRole('button', { name: /forøg antal nøgler/i })
    expect(incBtn).not.toBeDisabled()
  })
})

// ── AC8: komma-decimal parsing ────────────────────────────────────────────────

describe('AntalStepper — AC8: komma-decimal accepteres', () => {
  it('input med inputMode="decimal" og lang="da"', async () => {
    const AntalStepper = await importAntalStepper()
    render(<AntalStepper value={1} onChange={vi.fn()} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('inputMode', 'decimal')
    expect(input).toHaveAttribute('lang', 'da')
  })

  it('viser den aktuelle value i input-feltet', async () => {
    const AntalStepper = await importAntalStepper()
    render(<AntalStepper value={3} onChange={vi.fn()} />)

    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('3')
  })

  it('onBlur med komma-decimal "1,5" parser til 1.5 og kalder onChange', async () => {
    const AntalStepper = await importAntalStepper()
    const onChange = vi.fn()
    render(<AntalStepper value="1,5" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    // Simuler blur med komma-decimal direkte i target
    fireEvent.blur(input, { target: { value: '1,5' } })

    expect(onChange).toHaveBeenCalledWith(1.5)
  })

  it('onBlur med negativt tal clamps til min (0)', async () => {
    const AntalStepper = await importAntalStepper()
    const onChange = vi.fn()
    render(<AntalStepper value="-5" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    fireEvent.blur(input, { target: { value: '-5' } })

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('onBlur med ugyldig tekst sætter til min (0)', async () => {
    const AntalStepper = await importAntalStepper()
    const onChange = vi.fn()
    render(<AntalStepper value="abc" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    fireEvent.blur(input, { target: { value: 'abc' } })

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('onChange under typing sender raw string-værdi', async () => {
    const AntalStepper = await importAntalStepper()
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<AntalStepper value="" onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '2')

    // Under typing sendes raw string
    expect(onChange).toHaveBeenCalled()
  })
})

// ── Touch targets ─────────────────────────────────────────────────────────────

describe('AntalStepper — touch-targets ≥ 44px', () => {
  it('− og + knapper har minHeight og minWidth ≥ 44px via inline style', async () => {
    const AntalStepper = await importAntalStepper()
    render(<AntalStepper value={1} onChange={vi.fn()} />)

    const decBtn = screen.getByRole('button', { name: /mindsk antal nøgler/i })
    const incBtn = screen.getByRole('button', { name: /forøg antal nøgler/i })

    // Inline style sættes i komponenten
    expect(decBtn).toHaveStyle({ minWidth: '44px', minHeight: '44px' })
    expect(incBtn).toHaveStyle({ minWidth: '44px', minHeight: '44px' })
  })
})
