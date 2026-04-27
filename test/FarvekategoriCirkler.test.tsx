/**
 * Tests for FarvekategoriCirkler (F3).
 *
 * Dækker acceptkriterierne:
 * AC4  — renders 12 cirkler, klik sender onChange med colorCategory + hex
 * AC5  — "Valgt: {kategori}" tekst når valgt, "Vælg en farve" når tom
 * AC6  — eksakt-farve-toggle udfolder color-input; ændring opdaterer kun hex
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// COLOR_FAMILY_LABELS and COLOR_FAMILY_DEFAULT_HEX — ikke mockes, de er pure data
// Vi importerer direkte for at validere at komponenten bruger de korrekte 12 labels.

vi.mock('@/lib/data/colorFamilies', async (importOriginal) => {
  const real = await importOriginal() as Record<string, unknown>
  return real
})

async function importFarvekategoriCirkler() {
  const mod = await import('@/components/app/FarvekategoriCirkler.jsx')
  return mod.default as React.ComponentType<{
    colorCategory?: string
    hex?: string
    onChange: (v: { colorCategory: string; hex: string }) => void
    onExactHexChange: (hex: string) => void
  }>
}

// ── AC4: 12 cirkler renderes ──────────────────────────────────────────────────

describe('FarvekategoriCirkler — AC4: 12 cirkler i radiogroup', () => {
  it('renderer en radiogroup med aria-label "Farvekategori"', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    expect(screen.getByRole('radiogroup', { name: /farvekategori/i })).toBeInTheDocument()
  })

  it('renderer præcis 12 radio-cirkler', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    const circles = screen.getAllByRole('radio')
    expect(circles).toHaveLength(12)
  })

  it('alle 12 cirkler har aria-label (ikke blank)', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    const circles = screen.getAllByRole('radio')
    circles.forEach(circle => {
      const label = circle.getAttribute('aria-label')
      expect(label).toBeTruthy()
      expect(label!.length).toBeGreaterThan(0)
    })
  })

  it('klik på "grøn"-cirkel kalder onChange med colorCategory og hex', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    const onChange = vi.fn()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={onChange}
        onExactHexChange={vi.fn()}
      />
    )

    const groenCircle = screen.getByRole('radio', { name: /grøn/i })
    fireEvent.click(groenCircle)

    expect(onChange).toHaveBeenCalledTimes(1)
    const call = onChange.mock.calls[0][0]
    expect(call).toHaveProperty('colorCategory')
    expect(call).toHaveProperty('hex')
    expect(typeof call.hex).toBe('string')
    expect(call.hex.startsWith('#')).toBe(true)
  })

  it('klik på cirkel sender colorCategory der matcher cirklens aria-label', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    const onChange = vi.fn()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={onChange}
        onExactHexChange={vi.fn()}
      />
    )

    const blaaCircle = screen.getByRole('radio', { name: /blå/i })
    fireEvent.click(blaaCircle)

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ colorCategory: 'blå' })
    )
  })
})

// ── AC4: aria-checked ─────────────────────────────────────────────────────────

describe('FarvekategoriCirkler — AC4: aria-checked på valgt cirkel', () => {
  it('ingen cirkel er aria-checked=true når colorCategory er tom', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    const circles = screen.getAllByRole('radio')
    const checkedCircles = circles.filter(c => c.getAttribute('aria-checked') === 'true')
    expect(checkedCircles).toHaveLength(0)
  })

  it('grøn-cirklen er aria-checked=true når colorCategory="grøn"', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory="grøn"
        hex="#4A7A62"
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    const groenCircle = screen.getByRole('radio', { name: /grøn/i })
    expect(groenCircle).toHaveAttribute('aria-checked', 'true')
  })

  it('kun den valgte cirkel er aria-checked=true', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory="rød"
        hex="#C14B3A"
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    const circles = screen.getAllByRole('radio')
    const checkedCircles = circles.filter(c => c.getAttribute('aria-checked') === 'true')
    expect(checkedCircles).toHaveLength(1)
    expect(checkedCircles[0]).toHaveAttribute('aria-label', 'rød')
  })
})

// ── AC5: status-tekst ─────────────────────────────────────────────────────────

describe('FarvekategoriCirkler — AC5: status-tekst', () => {
  it('viser "Vælg en farve" når colorCategory er tom', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    expect(screen.getByText('Vælg en farve')).toBeInTheDocument()
  })

  it('viser "Valgt: Grøn" (capitalized) når colorCategory="grøn"', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory="grøn"
        hex="#4A7A62"
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    expect(screen.getByText('Grøn')).toBeInTheDocument()
    // "Valgt:" tekst er synlig som del af label
    expect(screen.getByText(/valgt:/i)).toBeInTheDocument()
  })

  it('capitalize: første bogstav er stort i valgt-label', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory="brun"
        hex="#A67C52"
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    // "Brun" med stort B
    expect(screen.getByText('Brun')).toBeInTheDocument()
  })

  it('"Vælg en farve" forsvinder når colorCategory sættes', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory="sort"
        hex="#1A1A1A"
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    expect(screen.queryByText('Vælg en farve')).not.toBeInTheDocument()
  })
})

// ── AC6: eksakt-farve-toggle ──────────────────────────────────────────────────

describe('FarvekategoriCirkler — AC6: eksakt-farve-toggle', () => {
  it('color-input er ikke synlig som default', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    expect(screen.queryByLabelText(/vælg eksakt farve/i)).not.toBeInTheDocument()
  })

  it('klik på toggle-knap udfolder color-input', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    const user = userEvent.setup()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    const toggleBtn = screen.getByRole('button', { name: /vælg eksakt farve/i })
    await user.click(toggleBtn)

    expect(screen.getByLabelText(/vælg eksakt farve/i)).toBeInTheDocument()
  })

  it('color-input er type="color"', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    const user = userEvent.setup()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /vælg eksakt farve/i }))

    const colorInput = screen.getByLabelText(/vælg eksakt farve/i)
    expect(colorInput).toHaveAttribute('type', 'color')
  })

  it('ændring i color-input kalder onExactHexChange (IKKE onChange)', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    const onChange = vi.fn()
    const onExactHexChange = vi.fn()
    const user = userEvent.setup()
    render(
      <FarvekategoriCirkler
        colorCategory="grøn"
        hex="#4A7A62"
        onChange={onChange}
        onExactHexChange={onExactHexChange}
      />
    )

    await user.click(screen.getByRole('button', { name: /vælg eksakt farve/i }))
    const colorInput = screen.getByLabelText(/vælg eksakt farve/i)
    fireEvent.change(colorInput, { target: { value: '#ff0000' } })

    expect(onExactHexChange).toHaveBeenCalledWith('#ff0000')
    // onChange skal IKKE kaldes ved eksakt-farve-ændring
    expect(onChange).not.toHaveBeenCalled()
  })

  it('toggle-knap skifter tekst ved åben/lukket tilstand', async () => {
    const FarvekategoriCirkler = await importFarvekategoriCirkler()
    const user = userEvent.setup()
    render(
      <FarvekategoriCirkler
        colorCategory=""
        hex=""
        onChange={vi.fn()}
        onExactHexChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /vælg eksakt farve/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /vælg eksakt farve/i }))

    expect(screen.getByRole('button', { name: /skjul eksakt farve/i })).toBeInTheDocument()
  })
})
