/**
 * Supplerende tests der dækker huller fra Bug 3 + Bug 4 review:
 *
 * GAP A: onlyOnStock-prop på GarnLinjeVælger — filtrerer I-brug-rækker fra
 *         picker, men bevarer den valgte linje selv om den er I-brug.
 *
 * GAP B: findDuplicateLineIndex-logikken (ren funktion, kopieret fra Arkiv.jsx)
 *         inkl. edge-cases: yarnItemId, catalogColorId, brand+name+code.
 *
 * GAP C: mergeDuplicateLines-logikken: skip hvis én linje har qty=0,
 *         confirm-besked inkluderer konkrete antal,
 *         ingen prompt → original returneres.
 *
 * Disse tests duplikerer IKKE allerede dækkede scenarier i
 * yarn-allocate.delta.test.ts / yarn-allocate.test.ts / GarnLinjeVælger.test.tsx.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// ── Mocks (GarnLinjeVælger-afhængigheder) ─────────────────────────────────────

vi.mock('@/lib/catalog', () => ({
  displayYarnName: vi.fn((y: { name: string }) => y?.name ?? ''),
  fetchColorsByIds: vi.fn(() => Promise.resolve(new Map())),
  fetchColorsForYarn: vi.fn(() => Promise.resolve([])),
  searchYarnsFull: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@/lib/data/colorFamilies', () => ({
  detectColorFamily: vi.fn(() => null),
  COLOR_FAMILY_LABELS: [],
  COLOR_FAMILY_DEFAULT_HEX: {},
}))

vi.mock('@/components/app/FarvekategoriCirkler', () => ({
  default: () => <div data-testid="farvekategori-cirkler" />,
}))

vi.mock('@/components/app/AntalStepper', () => ({
  default: ({ value, onChange, ariaLabel }: { value: unknown; onChange: (v: unknown) => void; ariaLabel?: string }) => (
    <div data-testid="antal-stepper">
      <input type="number" value={String(value)} onChange={e => onChange(e.target.value)} aria-label={ariaLabel ?? 'Antal nøgler'} />
    </div>
  ),
}))

vi.mock('@/lib/yarn-display', () => ({
  dedupeYarnNameFromBrand: vi.fn((name: string) => name),
}))

import GarnLinjeVælger from '@/components/app/GarnLinjeVælger'

beforeEach(() => vi.clearAllMocks())

// ── GAP A: onlyOnStock-filtrering ─────────────────────────────────────────────

const mixedItems = [
  { id: 'stash-1', brand: 'Permin', name: 'Bella', colorName: 'Rosa', colorCode: '883174', hex: '#E1A1B0', status: 'På lager', catalogYarnId: null, catalogColorId: null },
  { id: 'inuse-1', brand: 'Permin', name: 'Bella', colorName: 'Koral', colorCode: '88301',  hex: '#FF7F6A', status: 'I brug',    catalogYarnId: null, catalogColorId: null },
  { id: 'done-1',  brand: 'Drops',  name: 'Safran', colorName: 'Navy', colorCode: '16',     hex: '#1B2A4A', status: 'Brugt op',  catalogYarnId: null, catalogColorId: null },
]

const emptyLine = {
  yarnName: '', yarnBrand: '', colorName: '', colorCode: '',
  hex: '#A8C4C4', quantityUsed: '', catalogYarnId: null, catalogColorId: null,
}

function renderVælger(props: Partial<React.ComponentProps<typeof GarnLinjeVælger>> = {}) {
  return render(
    <GarnLinjeVælger
      line={emptyLine}
      onChange={vi.fn()}
      onRemove={vi.fn()}
      status="i_gang"
      userYarnItems={mixedItems}
      catalogSearch={<div data-testid="catalog-search" />}
      onSelectCatalogYarn={vi.fn()}
      catalogColors={[]}
      onSelectCatalogColor={vi.fn()}
      {...props}
    />
  )
}

describe('GAP A – onlyOnStock-filtrering i GarnLinjeVælger (Bug 3)', () => {
  it('onlyOnStock=false (default): alle rækker inkl. I-brug vises i datalist', () => {
    renderVælger({ onlyOnStock: false })
    const datalist = document.querySelector('datalist')
    expect(datalist).not.toBeNull()
    const options = Array.from(datalist!.querySelectorAll('option'))
    // Alle 3 items skal have en option (På lager + I brug + Brugt op er alle inkl.)
    expect(options.length).toBeGreaterThanOrEqual(3)
  })

  it('onlyOnStock=true: I-brug- og Brugt-op-rækker filtreres fra datalist', () => {
    renderVælger({ onlyOnStock: true })
    const datalist = document.querySelector('datalist')
    expect(datalist).not.toBeNull()
    const options = Array.from(datalist!.querySelectorAll('option'))
    // Kun 'stash-1' (På lager) skal være i datalist
    expect(options.length).toBe(1)
    // Option-value matcher det der vises til brugeren — verificer at 'Rosa' (stash-1) er med
    const optionValues = options.map(o => o.value)
    expect(optionValues.some(v => v.includes('Rosa'))).toBe(true)
  })

  it('onlyOnStock=true men line.yarnItemId peger på I-brug-rækken: den bevares i datalist', () => {
    // Komponenten pre-fylder query med den valgte garns label, så datalist filtrerer
    // til netop det valgte garn. Vi verificerer at inuse-1 (I-brug) er inkluderet
    // i filteredYarnItems (ikke filtreret væk) — og dermed vises i datalist.
    renderVælger({
      onlyOnStock: true,
      line: { ...emptyLine, yarnItemId: 'inuse-1', yarnName: 'Bella', yarnBrand: 'Permin', colorName: 'Koral', colorCode: '88301' },
    })
    const datalist = document.querySelector('datalist')
    expect(datalist).not.toBeNull()
    const options = Array.from(datalist!.querySelectorAll('option'))
    // Query er pre-fyldt med inuse-1's label → datalist viser inuse-1 (matchende I-brug-rækken).
    // Mindst 1 option skal vises (inuse-1 er bevaret i filteredYarnItems).
    expect(options.length).toBeGreaterThanOrEqual(1)
    // Option-værdien inkluderer 'Koral' (inuse-1's colorName)
    const optionValues = options.map(o => o.value)
    expect(optionValues.some(v => v.includes('Koral'))).toBe(true)
  })
})

// ── GAP B: findDuplicateLineIndex — ren logik ──────────────────────────────────
// Funktionen er intern i Arkiv.jsx. Vi tester logikken via inline-kopi
// (samme kode, ingen side-effekter) for at undgå at mocke hele Arkiv.

function findDuplicateLineIndex(
  lines: Array<{ yarnItemId?: string | null; catalogColorId?: string | null; yarnBrand?: string | null; colorName?: string | null; colorCode?: string | null }>,
  current: typeof lines[0],
  currentIdx: number,
): number {
  const norm = (s: string | null | undefined) => (s ?? '').toString().trim().toLowerCase()
  if (current.yarnItemId) {
    const idx = lines.findIndex((l, i) => i !== currentIdx && l.yarnItemId === current.yarnItemId)
    if (idx !== -1) return idx
  }
  if (current.catalogColorId) {
    const idx = lines.findIndex((l, i) => i !== currentIdx && l.catalogColorId === current.catalogColorId)
    if (idx !== -1) return idx
  }
  if (current.yarnBrand && current.colorName && current.colorCode) {
    const idx = lines.findIndex((l, i) =>
      i !== currentIdx &&
      norm(l.yarnBrand) === norm(current.yarnBrand) &&
      norm(l.colorName) === norm(current.colorName) &&
      norm(l.colorCode) === norm(current.colorCode)
    )
    if (idx !== -1) return idx
  }
  return -1
}

describe('GAP B – findDuplicateLineIndex (Bug 4)', () => {
  it('finder duplikat via yarnItemId', () => {
    const lines = [
      { yarnItemId: 'y1', yarnBrand: 'A', colorName: 'B', colorCode: '1' },
      { yarnItemId: 'y1', yarnBrand: 'A', colorName: 'B', colorCode: '1' },
    ]
    expect(findDuplicateLineIndex(lines, lines[1], 1)).toBe(0)
  })

  it('finder duplikat via catalogColorId (selvom yarnItemId er forskelligt)', () => {
    const lines = [
      { yarnItemId: null, catalogColorId: 'cat-1', yarnBrand: 'A', colorName: 'B', colorCode: '1' },
      { yarnItemId: null, catalogColorId: 'cat-1', yarnBrand: 'A', colorName: 'B', colorCode: '1' },
    ]
    expect(findDuplicateLineIndex(lines, lines[1], 1)).toBe(0)
  })

  it('finder duplikat via brand+colorName+colorCode (case-insensitive)', () => {
    const lines = [
      { yarnItemId: null, catalogColorId: null, yarnBrand: 'Permin', colorName: 'KORAL', colorCode: '88301' },
      { yarnItemId: null, catalogColorId: null, yarnBrand: 'permin', colorName: 'koral', colorCode: '88301' },
    ]
    expect(findDuplicateLineIndex(lines, lines[1], 1)).toBe(0)
  })

  it('returnerer -1 når ingen duplikat', () => {
    const lines = [
      { yarnItemId: 'y1', catalogColorId: null, yarnBrand: 'A', colorName: 'Rosa', colorCode: '1' },
      { yarnItemId: 'y2', catalogColorId: null, yarnBrand: 'B', colorName: 'Blå',  colorCode: '2' },
    ]
    expect(findDuplicateLineIndex(lines, lines[1], 1)).toBe(-1)
  })

  it('sammenligner ikke linje med sig selv (currentIdx udelukkes)', () => {
    const lines = [
      { yarnItemId: 'y1', yarnBrand: 'A', colorName: 'B', colorCode: '1' },
    ]
    expect(findDuplicateLineIndex(lines, lines[0], 0)).toBe(-1)
  })

  it('matcher ikke brand+name+code når ét felt er tomt', () => {
    const lines = [
      { yarnItemId: null, catalogColorId: null, yarnBrand: 'Permin', colorName: '', colorCode: '88301' },
      { yarnItemId: null, catalogColorId: null, yarnBrand: 'Permin', colorName: '', colorCode: '88301' },
    ]
    // colorName er tom → brand+name+code-blokken springer over → ingen match
    expect(findDuplicateLineIndex(lines, lines[1], 1)).toBe(-1)
  })
})

// ── GAP C: mergeDuplicateLines — confirm-prompt og edge-cases ──────────────────
// Vi tester logikken isoleret fra Arkiv.jsx ved at re-implementere den lille
// pure del. window.confirm mock'es eksplicit.

type Line = { yarnItemId?: string | null; catalogColorId?: string | null; yarnBrand?: string | null; yarnName?: string | null; colorName?: string | null; colorCode?: string | null; quantityUsed?: number | string | null }

function mergeDuplicateLines(lines: Line[], confirmFn: (msg: string) => boolean): Line[] {
  let merged = [...lines]
  let mergeCount = 0
  const declined = new Set<string>()
  function identityKey(l: Line) {
    if (l.yarnItemId)     return `id:${l.yarnItemId}`
    if (l.catalogColorId) return `cat:${l.catalogColorId}`
    const norm = (s: unknown) => (s ?? '').toString().trim().toLowerCase()
    return `bnc:${norm(l.yarnBrand)}|${norm(l.colorName)}|${norm(l.colorCode)}`
  }
  for (let i = 0; i < merged.length; i++) {
    const dupIdx = findDuplicateLineIndex(merged, merged[i], i)
    if (dupIdx === -1) continue
    const keepIdx   = Math.min(i, dupIdx)
    const removeIdx = Math.max(i, dupIdx)
    const a = merged[keepIdx]
    const b = merged[removeIdx]
    const aQty = Number(a.quantityUsed ?? 0) || 0
    const bQty = Number(b.quantityUsed ?? 0) || 0
    if (aQty === 0 || bQty === 0) continue
    const key = identityKey(a)
    if (declined.has(key)) continue
    const label = [a.yarnBrand, a.yarnName].filter(Boolean).join(' · ') || 'samme garn'
    const sum = aQty + bQty
    const ok = confirmFn(`Du har ${label} på 2 linjer (${aQty} ngl + ${bQty} ngl). Læg sammen til én linje med ${sum} ngl?`)
    if (ok) {
      merged = merged
        .map((l, idx) => idx === keepIdx ? { ...l, quantityUsed: sum } : l)
        .filter((_, idx) => idx !== removeIdx)
      mergeCount++
      i = -1
    } else {
      declined.add(key)
    }
  }
  return mergeCount > 0 ? merged : lines
}

describe('GAP C – mergeDuplicateLines (Bug 4)', () => {
  it('ingen duplikater: returnerer original liste uændret uden prompt', () => {
    const confirmFn = vi.fn(() => true)
    const lines = [
      { yarnItemId: 'y1', quantityUsed: 3 },
      { yarnItemId: 'y2', quantityUsed: 2 },
    ]
    const result = mergeDuplicateLines(lines, confirmFn)
    expect(confirmFn).not.toHaveBeenCalled()
    expect(result).toBe(lines) // samme reference
  })

  it('duplikat med qty>0: prompt vises med konkrete antal (3 ngl + 5.5 ngl = 8.5 ngl)', () => {
    const confirmFn = vi.fn(() => false)
    const lines = [
      { yarnItemId: 'y1', yarnBrand: 'Bella', yarnName: 'Koral', quantityUsed: 3 },
      { yarnItemId: 'y1', yarnBrand: 'Bella', yarnName: 'Koral', quantityUsed: 5.5 },
    ]
    mergeDuplicateLines(lines, confirmFn)
    expect(confirmFn).toHaveBeenCalledWith(
      'Du har Bella · Koral på 2 linjer (3 ngl + 5.5 ngl). Læg sammen til én linje med 8.5 ngl?'
    )
  })

  it('bruger bekræfter merge: result har 1 linje med sum-qty, duplikaten fjernet', () => {
    const confirmFn = vi.fn(() => true)
    const lines = [
      { yarnItemId: 'y1', yarnBrand: 'Bella', yarnName: 'Koral', quantityUsed: 3 },
      { yarnItemId: 'y1', yarnBrand: 'Bella', yarnName: 'Koral', quantityUsed: 5.5 },
    ]
    const result = mergeDuplicateLines(lines, confirmFn)
    expect(result).toHaveLength(1)
    expect(result[0].quantityUsed).toBe(8.5)
  })

  it('bruger annullerer merge: original liste returneres (ingen DB-ændringer)', () => {
    const confirmFn = vi.fn(() => false)
    const lines = [
      { yarnItemId: 'y1', quantityUsed: 3 },
      { yarnItemId: 'y1', quantityUsed: 5.5 },
    ]
    const result = mergeDuplicateLines(lines, confirmFn)
    expect(result).toHaveLength(2)
    expect(result[0].quantityUsed).toBe(3)
    expect(result[1].quantityUsed).toBe(5.5)
  })

  it('duplikat men én linje har qty=0: ingen prompt (meningsløs merge)', () => {
    const confirmFn = vi.fn(() => true)
    const lines = [
      { yarnItemId: 'y1', quantityUsed: 3 },
      { yarnItemId: 'y1', quantityUsed: 0 },
    ]
    mergeDuplicateLines(lines, confirmFn)
    expect(confirmFn).not.toHaveBeenCalled()
  })

  it('reviewer-fix: 3 dups af samme garn → cancel viser kun ÉN prompt (ikke gentaget for hver dup-par)', () => {
    let promptCount = 0
    const confirmFn = vi.fn(() => {
      promptCount++
      return false           // bruger annullerer alle prompts
    })
    const lines = [
      { yarnItemId: 'y1', yarnBrand: 'Bella', quantityUsed: 3 },
      { yarnItemId: 'y1', yarnBrand: 'Bella', quantityUsed: 2 },
      { yarnItemId: 'y1', yarnBrand: 'Bella', quantityUsed: 1 },
    ]
    const result = mergeDuplicateLines(lines, confirmFn)
    expect(promptCount).toBe(1)         // kun ÉN prompt for hele identiteten
    expect(result).toBe(lines)          // cancel → original liste
  })

  it('reviewer-fix: cancel-efter-merge bevarer den bekræftede merge', () => {
    // Brugeren har 2 garn der er forskellige duplikater (4 linjer total: A,A,B,B)
    // Bekræft merge for A, annullér for B → result har A merged + B uændret
    let callIdx = 0
    const responses = [true, false]      // ok for first prompt, cancel for second
    const confirmFn = vi.fn(() => responses[callIdx++])
    const lines = [
      { yarnItemId: 'y1', yarnBrand: 'A', quantityUsed: 3 },
      { yarnItemId: 'y1', yarnBrand: 'A', quantityUsed: 2 },
      { yarnItemId: 'y2', yarnBrand: 'B', quantityUsed: 4 },
      { yarnItemId: 'y2', yarnBrand: 'B', quantityUsed: 1 },
    ]
    const result = mergeDuplicateLines(lines, confirmFn)
    // A merged (3+2=5), B beholdt som 2 separate linjer
    expect(result).toHaveLength(3)
    const a = result.find(l => l.yarnBrand === 'A')
    expect(a?.quantityUsed).toBe(5)
    const bs = result.filter(l => l.yarnBrand === 'B')
    expect(bs).toHaveLength(2)
  })
})
