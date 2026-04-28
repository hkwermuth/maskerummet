/**
 * GarnvaegtInfoModal – unit-tests
 *
 * AC 5 (F11): GarnvaegtInfoModal er en tilgængelig dialog-komponent der
 * viser internationale garnvægt-betegnelser og kan lukkes på tre måder:
 *   a) klik på "Luk"-knap
 *   b) klik på ✕-knap
 *   c) ESC-tast (via useEscapeKey)
 *   d) backdrop-klik (target === currentTarget)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Vi lader useEscapeKey kalde onEscape ved ESC ved at simulere keydown-event
// direkte på document — ingen mock af hooken selv nødvendig.

// ── Import ────────────────────────────────────────────────────────────────────

import GarnvaegtInfoModal from '@/components/app/GarnvaegtInfoModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderModal(onClose = vi.fn()) {
  return { ...render(<GarnvaegtInfoModal onClose={onClose} />), onClose }
}

beforeEach(() => vi.clearAllMocks())

// ── Tilgængelighed og struktur ────────────────────────────────────────────────

describe('GarnvaegtInfoModal – tilgængelighed og struktur', () => {
  it('render: dialog-rollen er til stede', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('render: aria-modal="true" er sat på dialogen', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('render: aria-labelledby peger på element med "Internationale garnvægt-betegnelser"', () => {
    renderModal()
    const dialog = screen.getByRole('dialog')
    const labelId = dialog.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const titleEl = document.getElementById(labelId!)
    expect(titleEl).not.toBeNull()
    expect(titleEl!.textContent).toContain('Internationale garnvægt-betegnelser')
  })
})

// ── Tabelrækker ───────────────────────────────────────────────────────────────

describe('GarnvaegtInfoModal – garnvægt-tabelrækker', () => {
  const EXPECTED_TYPES = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky']

  EXPECTED_TYPES.forEach(type => {
    it(`tabellen indeholder rækken for "${type}"`, () => {
      renderModal()
      // Søg i tabel-celler (td)
      const cells = document.querySelectorAll('td')
      const texts = Array.from(cells).map(td => td.textContent ?? '')
      expect(texts.some(t => t.includes(type))).toBe(true)
    })
  })
})

// ── Luk-interaktioner ─────────────────────────────────────────────────────────

describe('GarnvaegtInfoModal – luk-mekanismer', () => {
  it('klik på "Luk"-tekst-knap (footer) kalder onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    // Footer-knappen har teksten "Luk" og type="button" — ingen aria-label
    // Vi finder den via tekst-indhold (ikke aria-label der deles med ✕)
    const lukKnapper = screen.getAllByRole('button', { name: /luk/i })
    // Footer-knappen er den SIDSTE (header ✕ kommer først)
    await user.click(lukKnapper[lukKnapper.length - 1])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('klik på ✕-knap (aria-label="Luk", header) kalder onClose', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    // Header-✕-knappen har aria-label="Luk" og indeholder ✕-tegnet
    // Den er den FØRSTE af to knapper der matcher /luk/i
    const lukKnapper = screen.getAllByRole('button', { name: /luk/i })
    await user.click(lukKnapper[0])
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ESC-tast lukker modalen (via useEscapeKey integration)', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('backdrop-klik (target === currentTarget) kalder onClose', () => {
    const onClose = vi.fn()
    render(<GarnvaegtInfoModal onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    // Simuler klik direkte på backdrop (det ydre div med role="dialog")
    // fireEvent.click sætter target === currentTarget kun hvis vi bruger
    // det ydre element som target. Vi simulerer dette ved at dispatche et
    // klik-event med target sat til selve elementet.
    fireEvent.click(dialog, { target: dialog })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
