/**
 * Unit-tests for scripts/_review-xlsx.mjs.
 *
 * Dækker acceptkriterierne for review-roundtrip-helpers:
 * - roundToHalfNeedle: afrunding til nærmeste halve pind
 * - suggestPrimaryNeedle: foreslår primær pind ud fra gauge_needle_mm → midt af interval → null
 * - computeFlags: identificerer datakvalitets-problemer
 * - parseReviewRow: parser bekræftet-kolonnerne fra review-arket
 */

import { describe, it, expect } from 'vitest'
import {
  roundToHalfNeedle,
  suggestPrimaryNeedle,
  computeFlags,
  parseReviewRow,
} from '../scripts/_review-xlsx.mjs'

// ── roundToHalfNeedle ─────────────────────────────────────────────────────────

describe('roundToHalfNeedle', () => {
  it('3.0 → 3.0 (allerede på heltal)', () => {
    expect(roundToHalfNeedle(3.0)).toBe(3.0)
  })

  it('3.7 → 3.5 (Math.round(7.4)/2 = 3.5)', () => {
    expect(roundToHalfNeedle(3.7)).toBe(3.5)
  })

  it('3.8 → 4.0 (Math.round(7.6)/2 = 4.0)', () => {
    expect(roundToHalfNeedle(3.8)).toBe(4.0)
  })

  it('null → null', () => {
    expect(roundToHalfNeedle(null)).toBeNull()
  })

  it('NaN → null', () => {
    expect(roundToHalfNeedle(NaN)).toBeNull()
  })

  it('4.25 → 4.5 (Math.round(8.5)/2 = 4.5 — Math.round runder .5 op for positive)', () => {
    expect(roundToHalfNeedle(4.25)).toBe(4.5)
  })

  it('3.5 → 3.5 (allerede på halv)', () => {
    expect(roundToHalfNeedle(3.5)).toBe(3.5)
  })

  it('4.0 → 4.0 (allerede på heltal)', () => {
    expect(roundToHalfNeedle(4.0)).toBe(4.0)
  })

  it('3.75 → 4.0 (Math.round runder 0.75 op til 1 ved *2)', () => {
    expect(roundToHalfNeedle(3.75)).toBe(4.0)
  })

  it('3.25 → 3.5 (Math.round runder 0.25 til 0.5 ved *2)', () => {
    expect(roundToHalfNeedle(3.25)).toBe(3.5)
  })

  it('5.0 → 5.0', () => {
    expect(roundToHalfNeedle(5.0)).toBe(5.0)
  })

  it('2.8 → 3.0 (afrundet op)', () => {
    expect(roundToHalfNeedle(2.8)).toBe(3.0)
  })
})

// ── suggestPrimaryNeedle ──────────────────────────────────────────────────────

describe('suggestPrimaryNeedle', () => {
  it('gauge_needle_mm sat → returnerer gauge_needle_mm direkte (selv om det ligger uden for interval)', () => {
    expect(suggestPrimaryNeedle({ gauge_needle_mm: 3.5, needle_min_mm: 3, needle_max_mm: 5 })).toBe(3.5)
  })

  it('gauge_needle_mm sat uden for interval → returnerer gauge_needle_mm uanset', () => {
    expect(suggestPrimaryNeedle({ gauge_needle_mm: 3.0, needle_min_mm: 3.5, needle_max_mm: 4 })).toBe(3.0)
  })

  it('kun min+max sat (3.5+5) → midt rundet til 0.5: (3.5+5)/2=4.25 → 4.5', () => {
    expect(suggestPrimaryNeedle({ gauge_needle_mm: null, needle_min_mm: 3.5, needle_max_mm: 5 })).toBe(4.5)
  })

  it('kun min+max sat (2+3) → midt rundet til 0.5: (2+3)/2=2.5 → 2.5', () => {
    expect(suggestPrimaryNeedle({ gauge_needle_mm: null, needle_min_mm: 2, needle_max_mm: 3 })).toBe(2.5)
  })

  it('kun min sat (ingen max) → runder min til nærmeste halve', () => {
    expect(
      suggestPrimaryNeedle({ gauge_needle_mm: null, needle_min_mm: 3.75, needle_max_mm: null }),
    ).toBe(4.0)
  })

  it('alle felter null → null', () => {
    expect(
      suggestPrimaryNeedle({ gauge_needle_mm: null, needle_min_mm: null, needle_max_mm: null }),
    ).toBeNull()
  })

  it('gauge_needle_mm = 4, ingen interval → returnerer 4', () => {
    expect(
      suggestPrimaryNeedle({ gauge_needle_mm: 4, needle_min_mm: null, needle_max_mm: null }),
    ).toBe(4)
  })

  it('gauge_needle_mm = 0 er IKKE null — 0 returneres som 0 (ikke fejl)', () => {
    // gauge_needle_mm != null check: 0 != null er true, så 0 returneres som Number(0)
    expect(suggestPrimaryNeedle({ gauge_needle_mm: 0, needle_min_mm: 3, needle_max_mm: 5 })).toBe(0)
  })

  it('gauge_needle_mm null → midt af interval: { null, min: 3, max: 5 } → 4', () => {
    expect(suggestPrimaryNeedle({ gauge_needle_mm: null, needle_min_mm: 3, needle_max_mm: 5 })).toBe(4)
  })

  it('asymmetrisk interval: { null, min: 2, max: 5 } → midt 3.5', () => {
    expect(suggestPrimaryNeedle({ gauge_needle_mm: null, needle_min_mm: 2, needle_max_mm: 5 })).toBe(3.5)
  })
})

// ── computeFlags ──────────────────────────────────────────────────────────────

describe('computeFlags — alle felter korrekte → ingen flags', () => {
  it('komplet garn uden problemer → tom streng', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3.5,
      needle_max_mm: 4.5,
    })
    expect(flags).toBe('')
  })
})

describe('computeFlags — mangler_pind', () => {
  it('gauge_needle_mm null + bredt interval (min≠max) → indeholder "mangler_pind"', () => {
    const flags = computeFlags({
      gauge_needle_mm: null,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).toContain('mangler_pind')
  })

  it('gauge_needle_mm null + entydig pind (min === max) → IKKE "mangler_pind"', () => {
    const flags = computeFlags({
      gauge_needle_mm: null,
      gauge_rows_10cm: 22,
      gauge_stitches_10cm: 17,
      needle_min_mm: 5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).not.toContain('mangler_pind')
  })

  it('gauge_needle_mm sat → IKKE "mangler_pind"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3.5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).not.toContain('mangler_pind')
  })

  it('gauge_needle_mm null + entydig pind med decimal-vs-int (4 vs 4.0) → IKKE "mangler_pind"', () => {
    const flags = computeFlags({
      gauge_needle_mm: null,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 4,
      needle_max_mm: 4.0,
    })
    expect(flags.split(',')).not.toContain('mangler_pind')
  })

  it('gauge_needle_mm null + kun needle_max sat → indeholder "mangler_pind" (ikke entydigt nok)', () => {
    const flags = computeFlags({
      gauge_needle_mm: null,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: null,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).toContain('mangler_pind')
  })

  it('gauge_needle_mm null + alle pind-felter null → indeholder "mangler_pind"', () => {
    const flags = computeFlags({
      gauge_needle_mm: null,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: null,
      needle_max_mm: null,
    })
    expect(flags.split(',')).toContain('mangler_pind')
  })
})

describe('computeFlags — mangler_omg', () => {
  it('gauge_rows_10cm null → indeholder "mangler_omg"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: null,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3.5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).toContain('mangler_omg')
  })

  it('gauge_rows_10cm sat → IKKE "mangler_omg"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3.5,
      needle_max_mm: 4.5,
    })
    expect(flags.split(',')).not.toContain('mangler_omg')
  })
})

describe('computeFlags — mangler_gauge', () => {
  it('gauge_stitches_10cm null → indeholder "mangler_gauge"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: null,
      needle_min_mm: 3.5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).toContain('mangler_gauge')
  })

  it('gauge_stitches_10cm sat → IKKE "mangler_gauge"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3.5,
      needle_max_mm: 4.5,
    })
    expect(flags.split(',')).not.toContain('mangler_gauge')
  })
})

describe('computeFlags — pind_uden_for_interval', () => {
  it('gauge_needle_mm = 3.0 med interval 3.5–4 → indeholder "pind_uden_for_interval"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 3.0,
      gauge_rows_10cm: 25,
      gauge_stitches_10cm: 22,
      needle_min_mm: 3.5,
      needle_max_mm: 4,
    })
    expect(flags.split(',')).toContain('pind_uden_for_interval')
  })

  it('gauge_needle_mm inden for [min, max] → IKKE "pind_uden_for_interval"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 25,
      gauge_stitches_10cm: 22,
      needle_min_mm: 3.5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).not.toContain('pind_uden_for_interval')
  })
})

describe('computeFlags — ekstrem_gauge', () => {
  it('gauge_stitches_10cm = 41 (> 40) → indeholder "ekstrem_gauge"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 41,
      needle_min_mm: 3.5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).toContain('ekstrem_gauge')
  })

  it('gauge_stitches_10cm = 7 (< 8) → indeholder "ekstrem_gauge"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 10,
      gauge_stitches_10cm: 7,
      needle_min_mm: 3.5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).toContain('ekstrem_gauge')
  })

  it('gauge_stitches_10cm = 8 (boundary, IKKE < 8) → IKKE "ekstrem_gauge"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 10,
      gauge_stitches_10cm: 8,
      needle_min_mm: 3.5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).not.toContain('ekstrem_gauge')
  })

  it('gauge_stitches_10cm = 40 (boundary, IKKE > 40) → IKKE "ekstrem_gauge"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 40,
      needle_min_mm: 3.5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).not.toContain('ekstrem_gauge')
  })

  it('gauge_stitches_10cm = 20 (normalt) → IKKE "ekstrem_gauge"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3.5,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).not.toContain('ekstrem_gauge')
  })
})

describe('computeFlags — bred_pind', () => {
  it('needle_max - needle_min = 1.5 (grænse ≥ 1.5) → indeholder "bred_pind"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3,
      needle_max_mm: 4.5,
    })
    expect(flags.split(',')).toContain('bred_pind')
  })

  it('needle_max - needle_min = 1.0 (< 1.5) → IKKE "bred_pind"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3.5,
      needle_max_mm: 4.5,
    })
    expect(flags.split(',')).not.toContain('bred_pind')
  })

  it('needle_max - needle_min = 2 (> 1.5) → indeholder "bred_pind"', () => {
    const flags = computeFlags({
      gauge_needle_mm: 4,
      gauge_rows_10cm: 28,
      gauge_stitches_10cm: 20,
      needle_min_mm: 3,
      needle_max_mm: 5,
    })
    expect(flags.split(',')).toContain('bred_pind')
  })
})

// ── parseReviewRow ────────────────────────────────────────────────────────────

describe('parseReviewRow — ugyldig: manglende id', () => {
  it('tom id-streng → status "ugyldig", id: null', () => {
    const result = parseReviewRow({
      id: '',
      bekræftet_primær_pind: '4',
      bekræftet_gauge_st: '20',
      bekræftet_gauge_omg: '28',
    })
    expect(result.status).toBe('ugyldig')
    expect(result.id).toBeNull()
  })

  it('ingen id-felt → status "ugyldig"', () => {
    const result = parseReviewRow({
      bekræftet_primær_pind: '4',
    })
    expect(result.status).toBe('ugyldig')
  })
})

describe('parseReviewRow — status "tom"', () => {
  it('alle tre bekræftet-felter tomme → status "tom"', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '',
      bekræftet_gauge_st: '',
      bekræftet_gauge_omg: '',
    })
    expect(result.status).toBe('tom')
    expect(result.payload).toBeNull()
  })

  it('undefined bekræftet-felter og ingen gauge-kolonner → status "tom"', () => {
    const result = parseReviewRow({ id: 'abc-123' })
    expect(result.status).toBe('tom')
  })
})

describe('parseReviewRow — bekræftet_*-kolonner', () => {
  it('alle tre bekræftet_* udfyldt → status "komplet", payload med alle tre felter', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '4',
      bekræftet_gauge_st: '20',
      bekræftet_gauge_omg: '28',
    })
    expect(result.status).toBe('komplet')
    expect(result.id).toBe('abc-123')
    expect(result.payload).toEqual({
      gauge_needle_mm: 4,
      gauge_stitches_10cm: 20,
      gauge_rows_10cm: 28,
    })
  })

  it('decimale pind-værdier (3.5) → komplet med numerisk payload', () => {
    const result = parseReviewRow({
      id: 'xyz-456',
      bekræftet_primær_pind: '3.5',
      bekræftet_gauge_st: '22',
      bekræftet_gauge_omg: '30',
    })
    expect(result.status).toBe('komplet')
    expect(result.payload?.gauge_needle_mm).toBe(3.5)
  })
})

describe('parseReviewRow — direkte gauge-kolonner (ingen bekræftet_*)', () => {
  it('gauge_needle_mm, gauge_stitches_10cm, gauge_rows_10cm alle sat → status "komplet"', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      gauge_needle_mm: '4',
      gauge_stitches_10cm: '20',
      gauge_rows_10cm: '28',
    })
    expect(result.status).toBe('komplet')
    expect(result.payload).toEqual({
      gauge_needle_mm: 4,
      gauge_stitches_10cm: 20,
      gauge_rows_10cm: 28,
    })
  })

  it('direkte kolonner → samme payload som bekræftet_*-kolonner', () => {
    const viaBekræftet = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '3.5',
      bekræftet_gauge_st: '22',
      bekræftet_gauge_omg: '30',
    })
    const viaDirekte = parseReviewRow({
      id: 'abc-123',
      gauge_needle_mm: '3.5',
      gauge_stitches_10cm: '22',
      gauge_rows_10cm: '30',
    })
    expect(viaDirekte.status).toBe('komplet')
    expect(viaDirekte.payload).toEqual(viaBekræftet.payload)
  })
})

describe('parseReviewRow — mixed mode (bekræftet vinder, direkte som fallback)', () => {
  it('bekræftet_primær_pind sat, gauge_stitches_10cm sat direkte (bekræftet_gauge_st tom) → begge bruges', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '4',
      bekræftet_gauge_st: '',
      bekræftet_gauge_omg: '',
      gauge_stitches_10cm: '20',
      gauge_rows_10cm: '',
    })
    // Kun pind (fra bekræftet) og st (fra direkte) er sat → 2/3 → partial
    expect(result.status).toBe('partial')
    expect(result.payload).toEqual({
      gauge_needle_mm: 4,
      gauge_stitches_10cm: 20,
    })
  })

  it('bekræftet_primær_pind vinder over gauge_needle_mm direkte', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '5',
      gauge_needle_mm: '3.5',
      bekræftet_gauge_st: '20',
      gauge_stitches_10cm: '22',
      bekræftet_gauge_omg: '28',
      gauge_rows_10cm: '30',
    })
    expect(result.status).toBe('komplet')
    // bekræftet_* vinder
    expect(result.payload?.gauge_needle_mm).toBe(5)
    expect(result.payload?.gauge_stitches_10cm).toBe(20)
    expect(result.payload?.gauge_rows_10cm).toBe(28)
  })
})

describe('parseReviewRow — status "partial" (kun nogle felter udfyldt)', () => {
  it('kun pind sat (st og omg tomme i begge) → status "partial", payload kun med gauge_needle_mm', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '4',
      bekræftet_gauge_st: '',
      bekræftet_gauge_omg: '',
    })
    expect(result.status).toBe('partial')
    expect(result.payload).toEqual({ gauge_needle_mm: 4 })
  })

  it('2/3 felter udfyldt → status "partial" med payload for de udfyldte', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '4',
      bekræftet_gauge_st: '20',
      bekræftet_gauge_omg: '',
    })
    expect(result.status).toBe('partial')
    expect(result.payload).toEqual({
      gauge_needle_mm: 4,
      gauge_stitches_10cm: 20,
    })
  })
})

describe('parseReviewRow — ugyldig pind', () => {
  it('pind = -1 (≤ 0) → status "ugyldig"', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '-1',
      bekræftet_gauge_st: '20',
      bekræftet_gauge_omg: '28',
    })
    expect(result.status).toBe('ugyldig')
    expect(result.payload).toBeNull()
  })

  it('pind = 0 (≤ 0) → status "ugyldig"', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '0',
      bekræftet_gauge_st: '20',
      bekræftet_gauge_omg: '28',
    })
    expect(result.status).toBe('ugyldig')
    expect(result.payload).toBeNull()
  })

  it('pind = 50 (> 25) → status "ugyldig"', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '50',
      bekræftet_gauge_st: '20',
      bekræftet_gauge_omg: '28',
    })
    expect(result.status).toBe('ugyldig')
  })

  it('pind = 26 (> 25) → status "ugyldig"', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '26',
      bekræftet_gauge_st: '20',
      bekræftet_gauge_omg: '28',
    })
    expect(result.status).toBe('ugyldig')
  })

  it('pind ikke-numerisk ("abc") → status "ugyldig"', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: 'abc',
      bekræftet_gauge_st: '20',
      bekræftet_gauge_omg: '28',
    })
    expect(result.status).toBe('ugyldig')
  })
})

describe('parseReviewRow — ugyldig stitches', () => {
  it('stitches = 200 (> 100) → status "ugyldig"', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '4',
      bekræftet_gauge_st: '200',
      bekræftet_gauge_omg: '28',
    })
    expect(result.status).toBe('ugyldig')
    expect(result.payload).toBeNull()
  })

  it('stitches = "abc" → status "ugyldig"', () => {
    const result = parseReviewRow({
      id: 'abc-123',
      bekræftet_primær_pind: '4',
      bekræftet_gauge_st: 'abc',
      bekræftet_gauge_omg: '28',
    })
    expect(result.status).toBe('ugyldig')
    expect(result.payload).toBeNull()
  })
})
