/**
 * Tests for MarkYarnsBrugtOpModal.
 * Daekker AC-2 (default behold), AC-3 (multi-projekt-banner), AC-4 (no-yarn-
 * item-banner), AC-5/6 (confirm/cancel), AC-10 (a11y).
 *
 * Opdateret til ny FinalizeDecision union-form:
 *   { kind: 'brugt-op' } | { kind: 'behold'; keepOnStock: number }
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
  it('returnerer null nar der intet er at vise', () => {
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
    // Ny label: "Behold pa lager (helt eller delvist)"
    const beholdRadios = screen.getAllByLabelText(/behold på lager \(helt eller delvist\)/i)
    expect(beholdRadios).toHaveLength(2)
    for (const r of beholdRadios) {
      expect(r).toBeChecked()
    }
  })

  it('AC-1: antal-input vises nar behold er valgt, med default=total og max=total', () => {
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    // Input vises fordi default er behold
    const input = screen.getByLabelText(/antal til lager/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'number')
    expect(input).toHaveAttribute('max', '5')
    expect(input).toHaveValue(5) // default = total
  })

  it('confirm med default behold-decisions sender korrekte objekter til onConfirm', async () => {
    const capturedDecisions = vi.fn()
    const onConfirm = vi.fn(async (decisions: Map<string, FinalizeDecision>) => {
      capturedDecisions([...decisions.values()])
    })
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Min Sweater"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /markér færdig \(intet brugt op\)/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    // Default decision er { kind: 'behold', keepOnStock: 5 } (total=5)
    expect(capturedDecisions).toHaveBeenCalledWith([
      { kind: 'behold', keepOnStock: 5 },
    ])
  })
})

describe('MarkYarnsBrugtOpModal – AC-5 vaelg brugt-op', () => {
  it('skift radio til brugt-op opdaterer knap-tekst og decisions', async () => {
    const capturedDecisions = vi.fn()
    const onConfirm = vi.fn(async (decisions: Map<string, FinalizeDecision>) => {
      capturedDecisions(decisions.get('u1'))
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
    // Ny union-form
    expect(capturedDecisions).toHaveBeenCalledWith({ kind: 'brugt-op' })
  })

  it('"anvend forste valg pa alle" propagerer forste decision til alle linjer', async () => {
    const capturedDecisions = vi.fn()
    const onConfirm = vi.fn(async (decisions: Map<string, FinalizeDecision>) => {
      capturedDecisions({
        u1: decisions.get('u1'),
        u2: decisions.get('u2'),
      })
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
    // Skift forste linje til brugt-op
    const u1Group = screen.getAllByRole('radiogroup')[0]
    await userEvent.click(within(u1Group).getByLabelText(/brugt op — markér som forbrugt/i))
    // Klik "anvend forste valg pa alle"
    await userEvent.click(screen.getByRole('button', { name: /anvend første valg på alle/i }))
    // Bekraeft at u2 nu ogsa er brugt-op (radio er checked)
    const u2Group = screen.getAllByRole('radiogroup')[1]
    expect(within(u2Group).getByLabelText(/brugt op — markér som forbrugt/i)).toBeChecked()

    await userEvent.click(screen.getByRole('button', { name: /^markér garn brugt op$/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(capturedDecisions).toHaveBeenCalledWith({
      u1: { kind: 'brugt-op' },
      u2: { kind: 'brugt-op' },
    })
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
  it('viser titler pa andre aktive projekter', () => {
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

describe('MarkYarnsBrugtOpModal – AC-7: "anvend pa alle" klamper keepOnStock', () => {
  it('AC-7: behold med keepOnStock=4 kopieret til linje med total=2 => klampes til 2', async () => {
    // u1: quantityUsed=4, u2: quantityUsed=2
    // Bruger saetter u1 til behold med keepOnStock=4 (alt)
    // Trykker "anvend forste valg pa alle"
    // u2 skal klampes til keepOnStock=2 (targets total)
    const capturedDecisions = vi.fn()
    const onConfirm = vi.fn(async (decisions: Map<string, FinalizeDecision>) => {
      capturedDecisions(decisions.get('u2'))
    })

    const line1 = {
      source: {
        yarnUsageId: 'u1', yarnItemId: 'yarn-u1',
        yarnName: 'Bella', yarnBrand: 'Permin',
        colorName: 'Koral', colorCode: '88301',
        hex: '#FF7F6A', quantityUsed: 4,
      },
      currentStockQuantity: 4, currentStatus: 'I brug',
    }
    const line2 = {
      source: {
        yarnUsageId: 'u2', yarnItemId: 'yarn-u2',
        yarnName: 'Air', yarnBrand: 'Drops',
        colorName: 'Navy', colorCode: '16',
        hex: '#001F5B', quantityUsed: 2,
      },
      currentStockQuantity: 2, currentStatus: 'I brug',
    }

    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [line1, line2] })}
        projektTitel="Test"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    // Default for u1 er { kind: 'behold', keepOnStock: 4 } (total=4)
    // Anvend pa alle => u2 far keepOnStock=min(2, 4)=2
    await userEvent.click(screen.getByRole('button', { name: /anvend første valg på alle/i }))
    await userEvent.click(screen.getByRole('button', { name: /markér færdig \(intet brugt op\)/i }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(capturedDecisions).toHaveBeenCalledWith({ kind: 'behold', keepOnStock: 2 })
  })
})

describe('MarkYarnsBrugtOpModal – brugtOpCount tael', () => {
  it('brugtOpCount=0 nar alle er behold-full => knaptekst "Markér faerdig (intet brugt op)"', () => {
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Test"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    // Default er behold-full (keepOnStock=total=5) => brugtOpCount=0
    expect(screen.getByRole('button', { name: /markér færdig \(intet brugt op\)/i })).toBeInTheDocument()
  })

  it('brugtOpCount > 0 nar en linje er brugt-op => knaptekst "Markér garn brugt op"', async () => {
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Test"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    await userEvent.click(screen.getByLabelText(/brugt op — markér som forbrugt/i))
    expect(screen.getByRole('button', { name: /^markér garn brugt op$/i })).toBeInTheDocument()
  })

  it('partial behold (keepOnStock < total) taeller som brugt-op i brugtOpCount', async () => {
    render(
      <MarkYarnsBrugtOpModal
        classification={makeClassification({ finalizable: [finalizableLine('u1')] })}
        projektTitel="Test"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    // Reducer antal til lager til 3 (ud af 5) => keepOnStock=3 < total=5 => brugtOpCount=1
    const input = screen.getByLabelText(/antal til lager/i)
    await userEvent.clear(input)
    await userEvent.type(input, '3')
    expect(screen.getByRole('button', { name: /^markér garn brugt op$/i })).toBeInTheDocument()
  })
})
