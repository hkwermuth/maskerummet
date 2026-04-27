/**
 * Tests for OCR-hjælpere i lib/ocr.ts.
 *
 * Acceptkriterier dækket:
 * - extractCandidateNumbers udtrækker 2-4 cifrede tal-sekvenser
 * - Dubletter fjernes, rækkefølge bevares
 * - matchCandidatesToColors filtrerer farver til dem hvor color_number
 *   matcher en kandidat, ordnet efter kandidat-rækkefølge
 */

import { describe, it, expect } from 'vitest'
import { extractCandidateNumbers, matchCandidatesToColors } from '@/lib/ocr'

type ColorRow = {
  id: string
  yarn_id: string
  color_number: string | null
  color_name: string | null
  hex_code: string | null
  status: string | null
  barcode: string | null
}

function color(num: string | null, id = num ?? 'x'): ColorRow {
  return {
    id,
    yarn_id: 'yarn-1',
    color_number: num,
    color_name: `Farve ${num ?? '?'}`,
    hex_code: null,
    status: null,
    barcode: null,
  }
}

describe('extractCandidateNumbers', () => {
  it('finder simple 3-cifrede farvenumre', () => {
    // 50g matcher ikke fordi der ikke er word-boundary mellem 0 og g
    expect(extractCandidateNumbers('Filcolana Tilia 286 Sand 50g')).toEqual(['286'])
  })

  it('udtrækker både 2-, 3- og 4-cifrede tal', () => {
    expect(extractCandidateNumbers('Lot 12 art 286 ean 5712345678901')).toContain('12')
    expect(extractCandidateNumbers('Lot 12 art 286 ean 5712345678901')).toContain('286')
    // 13-cifret EAN brydes ikke op til 4 cifre
    expect(extractCandidateNumbers('Lot 12 art 286 ean 5712345678901')).not.toContain('5712')
  })

  it('fjerner dubletter men bevarer første-rækkefølge', () => {
    expect(extractCandidateNumbers('286 286 100 286')).toEqual(['286', '100'])
  })

  it('ignorerer ord uden cifre', () => {
    expect(extractCandidateNumbers('Filcolana Tilia Wool')).toEqual([])
  })

  it('ignorerer 1-cifrede tal', () => {
    expect(extractCandidateNumbers('5g 9m')).toEqual([])
  })

  it('håndterer tom streng', () => {
    expect(extractCandidateNumbers('')).toEqual([])
  })
})

describe('matchCandidatesToColors', () => {
  const colors: ColorRow[] = [
    color('100', 'a'),
    color('286', 'b'),
    color('500', 'c'),
    color(null, 'd'),
    color('50', 'e'),
  ]

  it('returnerer kun farver hvor color_number matcher en kandidat', () => {
    const result = matchCandidatesToColors(['286', '999'], colors)
    expect(result.map((c) => c.id)).toEqual(['b'])
  })

  it('ordner resultatet efter kandidat-rækkefølge', () => {
    const result = matchCandidatesToColors(['500', '100', '286'], colors)
    expect(result.map((c) => c.id)).toEqual(['c', 'a', 'b'])
  })

  it('ignorerer farver med null color_number', () => {
    const result = matchCandidatesToColors(['100', '500'], colors)
    expect(result.find((c) => c.id === 'd')).toBeUndefined()
  })

  it('returnerer tom array når ingen matcher', () => {
    expect(matchCandidatesToColors(['9999'], colors)).toEqual([])
  })

  it('returnerer tom array ved tom kandidat-liste', () => {
    expect(matchCandidatesToColors([], colors)).toEqual([])
  })
})
