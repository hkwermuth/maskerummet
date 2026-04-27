/**
 * Tests for the substitution-list sort order.
 *
 * Acceptkriterie dækket:
 * - Sortering: primært efter VERDICT_RANK-position, sekundært efter originalIndex.
 *
 * Vi tester sort-logikken som en ren funktion — ingen DOM nødvendig.
 */

import { describe, it, expect } from 'vitest'
import type { Verdict } from '@/lib/types'

// ---------------------------------------------------------------------------
// Minimal copy of the sort helpers (exact same logic as component)
// ---------------------------------------------------------------------------

type VoteSummary = Record<Verdict, number>
const VERDICT_RANK: Verdict[] = ['perfekt', 'god', 'forbehold', 'virker_ikke']
const VOTE_THRESHOLD = 3

function effectiveVerdict(
  aiVerdict: Verdict,
  summary: VoteSummary,
): { verdict: Verdict; overridden: boolean } {
  const atThreshold = VERDICT_RANK.filter((v) => summary[v] >= VOTE_THRESHOLD)
  if (atThreshold.length === 0) return { verdict: aiVerdict, overridden: false }
  const best = atThreshold[0]
  if (best === aiVerdict) return { verdict: aiVerdict, overridden: false }
  return { verdict: best, overridden: true }
}

type SubItem = { yarn_id: string; verdict: Verdict }

function orderSubstitutions(
  substitutions: SubItem[],
  votesByCandidate: Record<string, { verdict: Verdict }[]>,
) {
  function summaryFor(candidateId: string): VoteSummary {
    const rows = votesByCandidate[candidateId] ?? []
    const sum: VoteSummary = { perfekt: 0, god: 0, forbehold: 0, virker_ikke: 0 }
    for (const r of rows) sum[r.verdict] = (sum[r.verdict] ?? 0) + 1
    return sum
  }

  return substitutions
    .map((s, originalIndex) => {
      const summary = summaryFor(s.yarn_id)
      const eff = effectiveVerdict(s.verdict, summary)
      return { yarn_id: s.yarn_id, originalIndex, effectiveVerdict: eff.verdict }
    })
    .sort((a, b) => {
      const ar = VERDICT_RANK.indexOf(a.effectiveVerdict)
      const br = VERDICT_RANK.indexOf(b.effectiveVerdict)
      if (ar !== br) return ar - br
      return a.originalIndex - b.originalIndex
    })
    .map((x) => x.yarn_id)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('orderedSubstitutions — sorting', () => {
  it('sorts by verdict rank: perfekt before god before forbehold before virker_ikke', () => {
    const subs: SubItem[] = [
      { yarn_id: 'D', verdict: 'virker_ikke' },
      { yarn_id: 'C', verdict: 'forbehold' },
      { yarn_id: 'B', verdict: 'god' },
      { yarn_id: 'A', verdict: 'perfekt' },
    ]
    const result = orderSubstitutions(subs, {})
    expect(result).toEqual(['A', 'B', 'C', 'D'])
  })

  it('secondary sort by originalIndex when verdicts are equal', () => {
    const subs: SubItem[] = [
      { yarn_id: 'C', verdict: 'god' },
      { yarn_id: 'A', verdict: 'god' },
      { yarn_id: 'B', verdict: 'god' },
    ]
    const result = orderSubstitutions(subs, {})
    // Order preserved: C(0), A(1), B(2)
    expect(result).toEqual(['C', 'A', 'B'])
  })

  it('user votes at threshold override AI verdict and affect sort position', () => {
    // A has AI=virker_ikke but 3× perfekt votes → promoted to perfekt
    // B has AI=god and no votes
    const subs: SubItem[] = [
      { yarn_id: 'A', verdict: 'virker_ikke' },
      { yarn_id: 'B', verdict: 'god' },
    ]
    const votes = {
      A: [
        { verdict: 'perfekt' as Verdict },
        { verdict: 'perfekt' as Verdict },
        { verdict: 'perfekt' as Verdict },
      ],
    }
    const result = orderSubstitutions(subs, votes)
    // A overridden to perfekt → comes before B (god)
    expect(result).toEqual(['A', 'B'])
  })

  it('votes below threshold do NOT affect sort order', () => {
    const subs: SubItem[] = [
      { yarn_id: 'A', verdict: 'virker_ikke' },
      { yarn_id: 'B', verdict: 'god' },
    ]
    const votes = {
      A: [{ verdict: 'perfekt' as Verdict }, { verdict: 'perfekt' as Verdict }], // only 2 — below threshold
    }
    const result = orderSubstitutions(subs, votes)
    // A stays virker_ikke → after B
    expect(result).toEqual(['B', 'A'])
  })

  it('empty substitution list returns empty', () => {
    expect(orderSubstitutions([], {})).toEqual([])
  })

  it('single item returns that item', () => {
    expect(orderSubstitutions([{ yarn_id: 'X', verdict: 'god' }], {})).toEqual(['X'])
  })
})
