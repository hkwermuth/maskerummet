/**
 * Tests for ReturnYarnConfirmModal
 * AC-8:  auto-merge for by-yarn-item-id (ingen UI)
 * AC-9:  viser dialog for by-catalog-color og by-name-color
 * AC-15: Escape kalder onCancel
 * AC-16: Annuller kalder onCancel
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// useEscapeKey lytter direkte på document — lad den være reel
import ReturnYarnConfirmModal from '@/components/app/ReturnYarnConfirmModal'
import type { ReturnCandidate } from '@/components/app/ReturnYarnConfirmModal'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCandidate(matchKind: 'by-yarn-item-id' | 'by-catalog-color' | 'by-name-color', id = 'usage-1'): ReturnCandidate {
  return {
    source: {
      yarnUsageId: id,
      yarnItemId: matchKind === 'by-yarn-item-id' ? 'yarn-1' : null,
      yarnName: 'Hannah',
      yarnBrand: 'Permin',
      colorName: 'Blå',
      colorCode: '88301',
      hex: '#4A90D9',
      quantityUsed: 2,
      catalogYarnId: null,
      catalogColorId: matchKind === 'by-catalog-color' ? 'cat-1' : null,
    },
    match: {
      yarnItemId: 'yarn-target',
      currentQuantity: 3,
      name: 'Hannah',
      brand: 'Permin',
      colorName: 'Blå',
      colorCode: '88301',
      hex: '#4A90D9',
      status: 'På lager',
      matchKind,
    },
  }
}

beforeEach(() => vi.clearAllMocks())

// ── Auto-merge ────────────────────────────────────────────────────────────────

describe('ReturnYarnConfirmModal – auto-merge (AC-8)', () => {
  it('kalder onConfirm direkte uden UI når alle kandidater er by-yarn-item-id', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onCancel = vi.fn()

    render(
      <ReturnYarnConfirmModal
        candidates={[makeCandidate('by-yarn-item-id')]}
        autoMergeOnYarnItemId={true}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    )

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    const decisions = onConfirm.mock.calls[0][0] as Map<string, string>
    expect(decisions.get('usage-1')).toBe('merge')
  })

  it('renderer ingen synlig dialog ved auto-merge', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    render(
      <ReturnYarnConfirmModal
        candidates={[makeCandidate('by-yarn-item-id')]}
        autoMergeOnYarnItemId={true}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    // No dialog role visible
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

// ── Dialog for by-catalog-color og by-name-color (AC-9) ──────────────────────

describe('ReturnYarnConfirmModal – dialog for by-catalog-color', () => {
  it('viser dialog med radio-knapper', () => {
    render(
      <ReturnYarnConfirmModal
        candidates={[makeCandidate('by-catalog-color')]}
        autoMergeOnYarnItemId={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(/det er det samme garn/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/det er forskellige/i)).toBeInTheDocument()
  })

  it('default-decision er "merge" (radio "læg sammen" er checked)', () => {
    render(
      <ReturnYarnConfirmModal
        candidates={[makeCandidate('by-catalog-color')]}
        autoMergeOnYarnItemId={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )

    const mergeRadio = screen.getByLabelText(/det er det samme garn/i) as HTMLInputElement
    expect(mergeRadio.checked).toBe(true)
  })

  it('onConfirm modtager Map med decision for yarnUsageId', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    render(
      <ReturnYarnConfirmModal
        candidates={[makeCandidate('by-catalog-color', 'usage-cat')]}
        autoMergeOnYarnItemId={true}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    await user.click(screen.getByRole('button', { name: /bekræft/i }))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    const decisions = onConfirm.mock.calls[0][0] as Map<string, string>
    expect(decisions.get('usage-cat')).toBe('merge')
  })
})

describe('ReturnYarnConfirmModal – "Behold første valg for alle"', () => {
  it('propagerer øverste valg til alle kandidater', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn().mockResolvedValue(undefined)

    const candidates = [
      makeCandidate('by-catalog-color', 'usage-1'),
      makeCandidate('by-catalog-color', 'usage-2'),
    ]

    render(
      <ReturnYarnConfirmModal
        candidates={candidates}
        autoMergeOnYarnItemId={true}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    // Change first card to 'separate'
    const separateRadios = screen.getAllByLabelText(/det er forskellige/i)
    await user.click(separateRadios[0])

    // Click "Behold første valg for alle"
    await user.click(screen.getByRole('button', { name: /behold første valg/i }))

    // Confirm
    await user.click(screen.getByRole('button', { name: /bekræft/i }))

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    const decisions = onConfirm.mock.calls[0][0] as Map<string, string>
    expect(decisions.get('usage-1')).toBe('separate')
    expect(decisions.get('usage-2')).toBe('separate')
  })
})

describe('ReturnYarnConfirmModal – Annuller', () => {
  it('klik Annuller kalder onCancel (AC-16)', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <ReturnYarnConfirmModal
        candidates={[makeCandidate('by-catalog-color')]}
        autoMergeOnYarnItemId={true}
        onCancel={onCancel}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )

    await user.click(screen.getByRole('button', { name: /annuller/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Escape kalder onCancel (AC-15)', () => {
    const onCancel = vi.fn()

    render(
      <ReturnYarnConfirmModal
        candidates={[makeCandidate('by-name-color')]}
        autoMergeOnYarnItemId={true}
        onCancel={onCancel}
        onConfirm={vi.fn().mockResolvedValue(undefined)}
      />
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('ReturnYarnConfirmModal – tomme kandidater', () => {
  it('renderer ikke noget når candidates er tomme', () => {
    const { container } = render(
      <ReturnYarnConfirmModal
        candidates={[]}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
