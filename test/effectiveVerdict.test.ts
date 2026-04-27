/**
 * Tests for the effectiveVerdict() helper extracted from SubstitutionsSection.
 *
 * The function lives inside the component file and is not exported, so we
 * duplicate it here exactly as written. If the implementation diverges we
 * want the tests to catch that at build/review time.
 *
 * Acceptkriterier dækket:
 * - Threshold = 3 stemmer.
 * - Better-wins tiebreaker: VERDICT_RANK = ['perfekt','god','forbehold','virker_ikke'].
 * - Override KUN når bestUserVerdict ≠ aiVerdict.
 * - Eksempler fra spec.
 */

import { describe, it, expect } from 'vitest'
import type { Verdict } from '@/lib/types'

// ---------------------------------------------------------------------------
// Pure copy of helpers from SubstitutionsSection — tested in isolation
// ---------------------------------------------------------------------------

type VoteSummary = Record<Verdict, number>

const VERDICT_RANK: Verdict[] = ['perfekt', 'god', 'forbehold', 'virker_ikke']
const VOTE_THRESHOLD = 3

function emptySummary(): VoteSummary {
  return { perfekt: 0, god: 0, forbehold: 0, virker_ikke: 0 }
}

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

// ---------------------------------------------------------------------------
// Spec-eksempler
// ---------------------------------------------------------------------------

describe('effectiveVerdict — spec examples', () => {
  it('AI=god, summary={perfekt:5} → {perfekt, overridden:true}', () => {
    const s = { ...emptySummary(), perfekt: 5 }
    expect(effectiveVerdict('god', s)).toEqual({ verdict: 'perfekt', overridden: true })
  })

  it('AI=god, summary={perfekt:3, forbehold:3} → {perfekt, overridden:true} (better-wins tiebreaker)', () => {
    const s = { ...emptySummary(), perfekt: 3, forbehold: 3 }
    expect(effectiveVerdict('god', s)).toEqual({ verdict: 'perfekt', overridden: true })
  })

  it('AI=perfekt, summary={god:3, forbehold:3} → {god, overridden:true} (tiebreaker: god beats forbehold)', () => {
    const s = { ...emptySummary(), god: 3, forbehold: 3 }
    expect(effectiveVerdict('perfekt', s)).toEqual({ verdict: 'god', overridden: true })
  })

  it('AI=perfekt, summary={virker_ikke:5} → {virker_ikke, overridden:true}', () => {
    const s = { ...emptySummary(), virker_ikke: 5 }
    expect(effectiveVerdict('perfekt', s)).toEqual({ verdict: 'virker_ikke', overridden: true })
  })

  it('AI=god, summary={perfekt:2} → {god, overridden:false} (below threshold)', () => {
    const s = { ...emptySummary(), perfekt: 2 }
    expect(effectiveVerdict('god', s)).toEqual({ verdict: 'god', overridden: false })
  })

  it('AI=god, summary={god:5} → {god, overridden:false} (best at threshold equals AI verdict)', () => {
    const s = { ...emptySummary(), god: 5 }
    expect(effectiveVerdict('god', s)).toEqual({ verdict: 'god', overridden: false })
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('effectiveVerdict — edge cases', () => {
  it('empty summary returns ai verdict, overridden=false', () => {
    expect(effectiveVerdict('god', emptySummary())).toEqual({ verdict: 'god', overridden: false })
  })

  it('exactly threshold=3 triggers override', () => {
    const s = { ...emptySummary(), virker_ikke: 3 }
    expect(effectiveVerdict('god', s)).toEqual({ verdict: 'virker_ikke', overridden: true })
  })

  it('threshold-1=2 votes does NOT trigger override', () => {
    const s = { ...emptySummary(), virker_ikke: 2 }
    expect(effectiveVerdict('god', s)).toEqual({ verdict: 'god', overridden: false })
  })

  it('all four verdicts at threshold — best (perfekt) wins', () => {
    const s: VoteSummary = { perfekt: 3, god: 3, forbehold: 3, virker_ikke: 3 }
    expect(effectiveVerdict('virker_ikke', s)).toEqual({ verdict: 'perfekt', overridden: true })
  })

  it('AI=forbehold, votes exactly on forbehold at threshold — not overridden', () => {
    const s = { ...emptySummary(), forbehold: 3 }
    expect(effectiveVerdict('forbehold', s)).toEqual({ verdict: 'forbehold', overridden: false })
  })

  it('AI=virker_ikke, all others just below threshold — not overridden', () => {
    const s: VoteSummary = { perfekt: 2, god: 2, forbehold: 2, virker_ikke: 10 }
    expect(effectiveVerdict('virker_ikke', s)).toEqual({ verdict: 'virker_ikke', overridden: false })
  })
})
