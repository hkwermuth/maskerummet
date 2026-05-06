/**
 * Bug 5 (2026-05-05): "Nøgler i alt"-totalsum ekskluderer Brugt op-rækker.
 *
 * Garnlager.jsx beregner totalNgl som (se Garnlager.jsx ~ln. 793-797):
 *   yarns.filter(y => y.status !== 'Brugt op').reduce((s, y) => s + Number(y.antal || 0), 0)
 *
 * Logikken testes her som ren funktion — Garnlager.jsx er for tung til
 * at mounte i isolation (OOM ved ~4 GB). Testerne holder definitionen i
 * sync med kilden manuelt — se en-til-en kopi nedenfor.
 *
 * AC-4 (indirekte): Garnlager-listen og -statsbar inkluderer Brugt op-rækker
 * korrekt — totalNgl ekskluderer dem så lagerbeholdningen ikke oppustes af
 * historisk forbrug.
 */

import { describe, it, expect } from 'vitest'

// Inlinet fra Garnlager.jsx ln. 763-765 — holdes i sync manuelt
function totalNgl(yarns: { status: string; antal: number | null | undefined }[]) {
  return yarns
    .filter(y => y.status !== 'Brugt op')
    .reduce((s, y) => s + Number(y.antal || 0), 0)
}

describe('Garnlager.totalNgl — Bug 5: Brugt op ekskluderes fra lagersum', () => {
  it('Bug 5: Brugt op-garn med antal>0 tæller ikke med', () => {
    // Pre-Bug-5 var Brugt op altid quantity=0, så det var ligegyldigt.
    // Post-Bug-5 bevarer Brugt op antal — men totalNgl skal stadig ekskludere dem.
    const yarns = [
      { status: 'På lager', antal: 3 },
      { status: 'Brugt op', antal: 5 },
    ]
    expect(totalNgl(yarns)).toBe(3) // kun "På lager" tæller med
  })

  it('Bug 5: kun Brugt op-garn → totalNgl = 0', () => {
    const yarns = [
      { status: 'Brugt op', antal: 4 },
      { status: 'Brugt op', antal: 2 },
    ]
    expect(totalNgl(yarns)).toBe(0)
  })

  it('I brug-garn tæller med (stadig lagerbeholdning)', () => {
    const yarns = [
      { status: 'I brug',   antal: 2 },
      { status: 'Brugt op', antal: 10 },
    ]
    expect(totalNgl(yarns)).toBe(2)
  })

  it('mixed: På lager + I brug summeres; Brugt op (multiple) ekskluderes', () => {
    const yarns = [
      { status: 'På lager', antal: 3 },
      { status: 'I brug',   antal: 2 },
      { status: 'Brugt op', antal: 5 },
      { status: 'Brugt op', antal: 1 },
    ]
    expect(totalNgl(yarns)).toBe(5) // 3 + 2 = 5
  })

  it('null/undefined antal behandles som 0 (defensivt)', () => {
    const yarns = [
      { status: 'På lager', antal: null },
      { status: 'På lager', antal: undefined },
      { status: 'Brugt op', antal: 3 },
    ]
    expect(totalNgl(yarns)).toBe(0)
  })

  it('tom liste → 0', () => {
    expect(totalNgl([])).toBe(0)
  })
})
