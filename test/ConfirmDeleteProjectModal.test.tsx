/**
 * Tests for ConfirmDeleteProjectModal
 * AC-3: viser 3 valg-knapper når projekt har garn-linjer
 * AC-15: Escape-tasten kalder onCancel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// useEscapeKey er reel — vi lader den virke (den lytter direkte på document)
// Vi behøver kun at mocke moduler komponenten importerer men vi ikke har tilgängelige
vi.mock('@/lib/types', () => ({
  PROJECT_STATUS_LABELS: {
    i_gang: 'Igangværende',
    faerdigstrikket: 'Færdigstrikket',
    vil_gerne: 'Vil gerne strikke',
  },
}))

import ConfirmDeleteProjectModal from '@/components/app/ConfirmDeleteProjectModal'

const project = {
  id: 'p1',
  title: 'Min Sweater',
  status: 'i_gang' as const,
}

const yarnLines = [
  {
    id: 'ul-1',
    yarnItemId: 'y1',
    yarnName: 'Hannah',
    yarnBrand: 'Permin',
    colorName: 'Blå',
    colorCode: '88301',
    hex: '#4A90D9',
    quantityUsed: 3,
  },
  {
    id: 'ul-2',
    yarnItemId: null,
    yarnName: 'Drops',
    yarnBrand: 'Drops',
    colorName: 'Rød',
    colorCode: '01',
    hex: '#CC0000',
    quantityUsed: 2,
  },
]

beforeEach(() => vi.clearAllMocks())

describe('ConfirmDeleteProjectModal – 3-valgs dialog', () => {
  it('renderer "Returnér"-, "Slet alt"- og "Annuller"-knapper når projekt har garn', () => {
    render(
      <ConfirmDeleteProjectModal
        project={project}
        yarnLines={yarnLines}
        onCancel={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByRole('button', { name: /returnér garn/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /slet alt/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annuller/i })).toBeInTheDocument()
  })

  it('viser korrekt sum af nøgler', () => {
    render(
      <ConfirmDeleteProjectModal
        project={project}
        yarnLines={yarnLines}
        onCancel={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )

    // Total: 3 + 2 = 5 nøgler
    expect(screen.getByText(/5\s+nøgler/i)).toBeInTheDocument()
  })

  it('klik "Returnér" kalder onConfirm med "return"', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    render(
      <ConfirmDeleteProjectModal
        project={project}
        yarnLines={yarnLines}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    await user.click(screen.getByRole('button', { name: /returnér garn/i }))
    expect(onConfirm).toHaveBeenCalledWith('return')
  })

  it('klik "Slet alt" kalder onConfirm med "delete-all"', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    render(
      <ConfirmDeleteProjectModal
        project={project}
        yarnLines={yarnLines}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    await user.click(screen.getByRole('button', { name: /slet alt/i }))
    expect(onConfirm).toHaveBeenCalledWith('delete-all')
  })

  it('klik "Annuller" kalder onCancel', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <ConfirmDeleteProjectModal
        project={project}
        yarnLines={yarnLines}
        onCancel={onCancel}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )

    await user.click(screen.getByRole('button', { name: /annuller/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disabler alle knapper mens onConfirm kører (AC-15 busy-state)', async () => {
    let resolveConfirm: () => void
    const onConfirm = vi.fn(
      () => new Promise<void>(res => { resolveConfirm = res })
    )

    const user = userEvent.setup()
    render(
      <ConfirmDeleteProjectModal
        project={project}
        yarnLines={yarnLines}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    await user.click(screen.getByRole('button', { name: /returnér garn/i }))

    // While promise is pending all buttons should be disabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /annuller/i })).toBeDisabled()
    })

    resolveConfirm!()
  })
})

describe('ConfirmDeleteProjectModal – Escape-tasten', () => {
  it('Escape kalder onCancel (AC-15)', () => {
    const onCancel = vi.fn()
    render(
      <ConfirmDeleteProjectModal
        project={project}
        yarnLines={yarnLines}
        onCancel={onCancel}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
