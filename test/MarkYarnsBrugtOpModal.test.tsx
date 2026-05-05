/**
 * Tests for MarkYarnsBrugtOpModal.
 * Dækker AC-2 (default behold), AC-3 (multi-projekt-banner), AC-4 (no-yarn-
 * item-banner), AC-5/6 (confirm/cancel), AC-10 (a11y).
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import MarkYarnsBrugtOpModal from '@/components/app/MarkYarnsBrugtOpModal'
import type { FinalizableClassification, FinalizeDecision } from '@/lib/yarn-finalize'

function makeClassification(overrides: Partial<FinalizableClassification> = {}): FinalizableClassification {
  return {
    finalizable:    [],
    multiProject:   [],
    noYarnItem:     [],
    alreadyBrugtOp: [],
    ...overrides,
  }
}

function finalizableLine(id: string, brand = 'Permin', name = 'Bella', stockQty = 5) {
  return {
    source: {
      yarnUsageId:  id,
      yarnItemId:   `yarn-${id}`,
      yarnName:     name,
      yarnBrand:    brand,
      colorName:    'Koral',
      colorCode:    '88301',
      hex:          '#FF7F6A',
      quantityUsed: 5,
    },
    currentStockQuantity: stockQty,
    currentStatus:        'I brug',
  }
}

describe('MarkYarnsBrugtOpModal – render-paths', () => {
  it('returnerer null når der intet er at vise', () => {
    const { container } = render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification()}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('AC-10: dialog har aria-modal + aria-labelledby, luk-knap har aria-label', () => {
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby')
    expect(screen.getByRole('button', { name: /luk/i })).toBeInTheDocument()
  })
})

describe('MarkYarnsBrugtOpModal – AC-2 default behold', () => {
  it('default-decision er behold for alle finalizable-linjer', () => {
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({
          finalizable: [finalizableLine('u1'), finalizableLine('u2', 'Drops', 'Air')],
        })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    const beholdRadios = screen.getAllByLabelText(/behold på lager/i)
    expect(beholdRadios).toHaveLength(2)
    for (const r of beholdRadios) {
      expect(r).toBeChecked()
    }
  })

  it('confirm med default → onConfirm modtager Map med alle behold (markedBrugtOp = 0)', async () => {
    const user = vi.fn(async (decisions: Map<string, FinalizeDecision>) => {
      expect([...decisions.values()].every(d => d === 'behold')).toBe(true)
    })
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={user}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /markér færdig \(intet brugt op\)/i }))
    expect(user).toHaveBeenCalledTimes(1)
  })
})

describe('MarkYarnsBrugtOpModal – AC-5 vælg brugt-op', () => {
  it('skift radio til brugt-op opdaterer knap-tekst og decisions', async () => {
    const onConfirm = vi.fn(async (decisions: Map<string, FinalizeDecision>) => {
      expect(decisions.get('u1')).toBe('brugt-op')
    })
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )
    await userEvent.click(screen.getByLabelText(/brugt op — markér som forbrugt/i))
    expect(screen.getByRole('button', { name: /^markér garn brugt op$/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^markér garn brugt op$/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('"anvend første valg på alle" propagerer første decision til alle linjer', async () => {
    const onConfirm = vi.fn(async (decisions: Map<string, FinalizeDecision>) => {
      expect(decisions.get('u1')).toBe('brugt-op')
      expect(decisions.get('u2')).toBe('brugt-op')
    })
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({
          finalizable: [finalizableLine('u1'), finalizableLine('u2', 'Drops')],
        })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )
    // Skift første linje til brugt-op
    const u1Group = screen.getAllByRole('radiogroup')[0]
    await userEvent.click(within(u1Group).getByLabelText(/brugt op — markér som forbrugt/i))
    // Klik "anvend første valg på alle"
    await userEvent.click(screen.getByRole('button', { name: /anvend første valg på alle/i }))
    // Bekræft at u2 nu også er brugt-op
    const u2Group = screen.getAllByRole('radiogroup')[1]
    expect(within(u2Group).getByLabelText(/brugt op — markér som forbrugt/i)).toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: /^markér garn brugt op$/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})

describe('MarkYarnsBrugtOpModal – AC-6 cancel', () => {
  it('cancel-knap kalder onCancel uden at kalde onConfirm', async () => {
    const onCancel  = vi.fn()
    const onConfirm = vi.fn()
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Min Sweater"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /annuller/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('luk-knap kalder onCancel', async () => {
    const onCancel  = vi.fn()
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Min Sweater"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /luk/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('MarkYarnsBrugtOpModal – AC-3 multi-projekt-banner', () => {
  it('viser titler på andre aktive projekter', () => {
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({
          multiProject: [{
            source: finalizableLine('u-multi').source,
            otherProjectTitles: ['Sweater A', 'Cardigan B'],
          }],
        })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByText(/kan ikke markeres brugt op/i)).toBeInTheDocument()
    expect(screen.getByText(/Sweater A, Cardigan B/)).toBeInTheDocument()
  })
})

describe('MarkYarnsBrugtOpModal – AC-4 no-yarn-item-banner', () => {
  it('viser info-banner for linjer uden yarn_item_id', () => {
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({
          noYarnItem: [{
            yarnUsageId:  'u-no',
            yarnItemId:   null,
            yarnName:     'Eget garn',
            yarnBrand:    null,
            colorName:    null,
            colorCode:    null,
            hex:          null,
            quantityUsed: 3,
          }],
        })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(screen.getByText(/ikke knyttet til dit lager/i)).toBeInTheDocument()
  })
})

describe('MarkYarnsBrugtOpModal – AC-10 a11y touch-targets', () => {
  it('cancel + confirm-knapper har minHeight 44', () => {
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    const cancel  = screen.getByRole('button', { name: /annuller/i })
    const confirm = screen.getByRole('button', { name: /markér/i })
    expect(cancel.style.minHeight).toBe('44px')
    expect(confirm.style.minHeight).toBe('44px')
  })
})
