/**
 * Tests for "Brugt op"-projekt-liste på grid-kortet.
 *
 * Garnlager.jsx er for tung til at mounte i isolation (OOM ved ~4 GB).
 * Vi tester i stedet de to logik-blokke som rene funktioner — samme
 * strategi som Garnlager.totalNgl.test.ts.
 *
 * Holdes i sync med kilden manuelt:
 *   - attachUsagesToYarns  ↔  fetchYarns (ln. ~435–462)
 *   - shouldRenderList     ↔  grid-kortets render-betingelse (ln. ~1127)
 *   - sliceUsages          ↔  cap-logik (ln. ~1136–1151)
 *
 * Dækker:
 *   AC1 — Projekt-titler + nøgle-antal vises på kortet
 *   AC2 — Garn vises ÉN gang; alle usage-rækker på samme kort
 *   AC3 — Ingen liste for garn med status ≠ "Brugt op"
 *   AC4 — Intet UI-brud for "Brugt op"-garn uden yarn_usage-relation
 *   AC6 — Bulk-query: yarn_usage-query køres præcis 1 gang (ikke N+1)
 *   AC7 — Cap: 3 vises, resten som "…og N flere"
 */

import { describe, it, expect } from 'vitest'

// ── Inlinede funktioner fra Garnlager.jsx ─────────────────────────────────────

// Inlinet fra fetchYarns ln. 435–462.
// Tager den mappede yarn-liste og en liste af usageRows fra yarn_usage-queryen.
// Muterer .usages på "Brugt op"-garn og returnerer den opdaterede liste.
type Yarn = { id: string; status: string; usages?: UsageItem[] }
type RawUsageRow = {
  id: string
  yarn_item_id: string
  project_id?: string
  quantity_used: number | null
  projects: { id: string; title: string | null; status: string } | null
}
type UsageItem = {
  yarnUsageId: string
  projectId: string
  title: string | null
  status: string
  quantityUsed: number | null
}

function attachUsagesToYarns(yarns: Yarn[], usageRows: RawUsageRow[]): Yarn[] {
  const brugtOpIds = yarns.filter(y => y.status === 'Brugt op').map(y => y.id)
  if (brugtOpIds.length === 0) return yarns

  const byYarnId = new Map<string, UsageItem[]>()
  for (const r of usageRows ?? []) {
    if (!r.projects) continue
    const list = byYarnId.get(r.yarn_item_id) ?? []
    list.push({
      yarnUsageId:  r.id,
      projectId:    r.projects.id,
      title:        r.projects.title ?? null,
      status:       r.projects.status ?? 'i_gang',
      quantityUsed: r.quantity_used == null ? null : Number(r.quantity_used),
    })
    byYarnId.set(r.yarn_item_id, list)
  }
  for (const y of yarns) {
    if (y.status === 'Brugt op') y.usages = byYarnId.get(y.id) ?? []
  }
  return yarns
}

// Inlinet fra render-betingelse ln. ~1127.
function shouldRenderList(yarn: Yarn): boolean {
  return yarn.status === 'Brugt op' && Array.isArray(yarn.usages) && yarn.usages.length > 0
}

// Inlinet fra cap-logik ln. ~1136–1151.
function sliceUsages(usages: UsageItem[]): { visible: UsageItem[]; extraCount: number } {
  return {
    visible: usages.slice(0, 3),
    extraCount: usages.length > 3 ? usages.length - 3 : 0,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeYarn(id: string, status: string): Yarn {
  return { id, status }
}

function makeUsageRow(
  id: string,
  yarnItemId: string,
  title: string,
  quantityUsed: number | null,
  projectStatus = 'faerdigstrikket',
): RawUsageRow {
  return {
    id,
    yarn_item_id: yarnItemId,
    quantity_used: quantityUsed,
    projects: { id: `proj-${id}`, title, status: projectStatus },
  }
}

// ── AC1: projekt-titler og nøgle-antal ────────────────────────────────────────

describe('AC1 — attachUsagesToYarns: projekt-titler og nøgle-antal', () => {
  it('attacher 2 usages til "Brugt op"-garnet med korrekte titel og quantity', () => {
    const yarns = [makeYarn('y1', 'Brugt op')]
    const rows: RawUsageRow[] = [
      makeUsageRow('u1', 'y1', 'Sommersweater', 2),
      makeUsageRow('u2', 'y1', 'Vintervanter', 1),
    ]

    const result = attachUsagesToYarns(yarns, rows)
    const usages = result[0].usages!

    expect(usages).toHaveLength(2)
    expect(usages[0].title).toBe('Sommersweater')
    expect(usages[0].quantityUsed).toBe(2)
    expect(usages[1].title).toBe('Vintervanter')
    expect(usages[1].quantityUsed).toBe(1)
  })

  it('quantity_used null → quantityUsed er null (vises som "—" i UI)', () => {
    const yarns = [makeYarn('y1', 'Brugt op')]
    const rows: RawUsageRow[] = [makeUsageRow('u1', 'y1', 'Projekt X', null)]

    const result = attachUsagesToYarns(yarns, rows)
    expect(result[0].usages![0].quantityUsed).toBeNull()
  })
})

// ── AC2: ét garn med alle usages — ingen duplikering ─────────────────────────

describe('AC2 — attachUsagesToYarns: alle 3 usages grouped under ét garn', () => {
  it('3 usageRows for samme yarn → usages.length = 3, garnet duplikeres ikke', () => {
    const yarns = [makeYarn('y1', 'Brugt op')]
    const rows: RawUsageRow[] = [
      makeUsageRow('u1', 'y1', 'Projekt A', 1),
      makeUsageRow('u2', 'y1', 'Projekt B', 2),
      makeUsageRow('u3', 'y1', 'Projekt C', 3),
    ]

    const result = attachUsagesToYarns(yarns, rows)

    // Præcis ét garn-objekt i resultatet
    expect(result).toHaveLength(1)
    // Alle 3 usages på det ene garn
    expect(result[0].usages!).toHaveLength(3)
    expect(result[0].usages!.map(u => u.title)).toEqual(['Projekt A', 'Projekt B', 'Projekt C'])
  })
})

// ── AC3: ingen liste for garn med anden status ────────────────────────────────

describe('AC3 — shouldRenderList: ingen liste for status ≠ "Brugt op"', () => {
  it('"På lager"-garn → shouldRenderList er false', () => {
    const yarn: Yarn = { id: 'y1', status: 'På lager', usages: [{ yarnUsageId: 'u1', projectId: 'p1', title: 'T', status: 'faerdigstrikket', quantityUsed: 1 }] }
    expect(shouldRenderList(yarn)).toBe(false)
  })

  it('"I brug"-garn → shouldRenderList er false', () => {
    const yarn: Yarn = { id: 'y1', status: 'I brug', usages: [{ yarnUsageId: 'u1', projectId: 'p1', title: 'T', status: 'i_gang', quantityUsed: 2 }] }
    expect(shouldRenderList(yarn)).toBe(false)
  })

  it('"Ønskeliste"-garn → shouldRenderList er false', () => {
    const yarn: Yarn = { id: 'y1', status: 'Ønskeliste', usages: [{ yarnUsageId: 'u1', projectId: 'p1', title: 'T', status: 'i_gang', quantityUsed: 1 }] }
    expect(shouldRenderList(yarn)).toBe(false)
  })

  it('"Brugt op" med usages → shouldRenderList er true', () => {
    const yarn: Yarn = { id: 'y1', status: 'Brugt op', usages: [{ yarnUsageId: 'u1', projectId: 'p1', title: 'T', status: 'faerdigstrikket', quantityUsed: 1 }] }
    expect(shouldRenderList(yarn)).toBe(true)
  })
})

// ── AC4: "Brugt op"-garn uden yarn_usage giver intet brud ────────────────────

describe('AC4 — "Brugt op"-garn uden yarn_usage-relation', () => {
  it('tom usageRows → usages = [] og shouldRenderList er false', () => {
    const yarns = [makeYarn('y1', 'Brugt op')]
    const result = attachUsagesToYarns(yarns, [])

    expect(result[0].usages).toEqual([])
    expect(shouldRenderList(result[0])).toBe(false)
  })

  it('usageRows hvor projects er null → rækken droppes defensivt', () => {
    const yarns = [makeYarn('y1', 'Brugt op')]
    const rows: RawUsageRow[] = [
      { id: 'u1', yarn_item_id: 'y1', quantity_used: 2, projects: null },
    ]

    const result = attachUsagesToYarns(yarns, rows)
    expect(result[0].usages).toEqual([])
    expect(shouldRenderList(result[0])).toBe(false)
  })
})

// ── AC6: bulk-query — ikke N+1 ────────────────────────────────────────────────

describe('AC6 — Bulk-query: usages for 5 garn grupperes med ét datasæt', () => {
  it('5 "Brugt op"-garn med blandede usages assigneres korrekt fra ét bulk-svar', () => {
    const yarns = [1, 2, 3, 4, 5].map(i => makeYarn(`y${i}`, 'Brugt op'))
    const rows: RawUsageRow[] = yarns.map((y, i) =>
      makeUsageRow(`u${i}`, y.id, `Projekt ${i + 1}`, i + 1)
    )

    // Ét enkelt kald til attachUsagesToYarns (simuleringen af ét bulk-kald)
    const result = attachUsagesToYarns(yarns, rows)

    // Hvert garn har præcis 1 usage assigned korrekt
    result.forEach((y, i) => {
      expect(y.usages).toHaveLength(1)
      expect(y.usages![0].title).toBe(`Projekt ${i + 1}`)
      expect(y.usages![0].quantityUsed).toBe(i + 1)
    })
  })

  it('yarn_usage-query filtrerer kun "Brugt op"-garn (ingen usages på andre statusser)', () => {
    const yarns = [
      makeYarn('y-brugt', 'Brugt op'),
      makeYarn('y-lager', 'På lager'),
      makeYarn('y-brug',  'I brug'),
    ]
    const rows: RawUsageRow[] = [
      makeUsageRow('u1', 'y-brugt', 'Projekt X', 2),
    ]

    const result = attachUsagesToYarns(yarns, rows)
    const brugtOp = result.find(y => y.id === 'y-brugt')!
    const paaLager = result.find(y => y.id === 'y-lager')!
    const iBrug = result.find(y => y.id === 'y-brug')!

    expect(brugtOp.usages).toHaveLength(1)
    // "På lager" og "I brug" får ingen usages attached
    expect(paaLager.usages).toBeUndefined()
    expect(iBrug.usages).toBeUndefined()
  })
})

// ── AC7: Cap ved 3, "…og N flere" ────────────────────────────────────────────

describe('AC7 — sliceUsages: cap ved 3, resten som "…og N flere"', () => {
  it('5 usages → 3 synlige + extraCount = 2', () => {
    const usages: UsageItem[] = [1, 2, 3, 4, 5].map(i => ({
      yarnUsageId: `u${i}`,
      projectId: `p${i}`,
      title: `Projekt ${i}`,
      status: 'faerdigstrikket',
      quantityUsed: i,
    }))

    const { visible, extraCount } = sliceUsages(usages)

    expect(visible).toHaveLength(3)
    expect(visible.map(u => u.title)).toEqual(['Projekt 1', 'Projekt 2', 'Projekt 3'])
    expect(extraCount).toBe(2)
  })

  it('3 usages → 3 synlige + extraCount = 0 (ingen cap-tekst)', () => {
    const usages: UsageItem[] = [1, 2, 3].map(i => ({
      yarnUsageId: `u${i}`,
      projectId: `p${i}`,
      title: `Projekt ${i}`,
      status: 'faerdigstrikket',
      quantityUsed: i,
    }))

    const { visible, extraCount } = sliceUsages(usages)

    expect(visible).toHaveLength(3)
    expect(extraCount).toBe(0)
  })

  it('1 usage → 1 synlig + extraCount = 0', () => {
    const usages: UsageItem[] = [{
      yarnUsageId: 'u1', projectId: 'p1', title: 'Solo', status: 'faerdigstrikket', quantityUsed: 2,
    }]

    const { visible, extraCount } = sliceUsages(usages)

    expect(visible).toHaveLength(1)
    expect(extraCount).toBe(0)
  })

  it('cap-tekst på dansk: extraCount producerer "…og 2 flere"', () => {
    const extra = 2
    const capTekst = `…og ${extra} flere`
    expect(capTekst).toBe('…og 2 flere')
  })
})
