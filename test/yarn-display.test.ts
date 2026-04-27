/**
 * Unit-tests for lib/yarn-display.ts (F4).
 *
 * Dækker acceptkriterierne:
 * AC4 — dedupeYarnNameFromBrand: 8+ cases (præfiks, suffiks, "(by X)", brand med mellemrum,
 *        case-insensitive, no-op, brand=navn, tom)
 * AC5 — gradientFromHexColors: 0/1/2/3/5 hex + ugyldig
 * AC6 — primaryFiberLabel parser
 */

import { describe, it, expect } from 'vitest'
import { dedupeYarnNameFromBrand, gradientFromHexColors, primaryFiberLabel } from '@/lib/yarn-display'

// ── AC4: dedupeYarnNameFromBrand ──────────────────────────────────────────────

describe('dedupeYarnNameFromBrand — præfiks-fjernelse', () => {
  it('fjerner brand som præfiks: "Permin Bella" + "Permin" → "Bella"', () => {
    expect(dedupeYarnNameFromBrand('Permin Bella', 'Permin')).toBe('Bella')
  })

  it('fjerner brand med mellemrum som præfiks: "BC Garn Luxor" + "BC Garn" → "Luxor"', () => {
    expect(dedupeYarnNameFromBrand('BC Garn Luxor', 'BC Garn')).toBe('Luxor')
  })

  it('fjerner "(by Brand)"-suffiks: "Permin Bella (by Permin)" + "Permin" → "Bella"', () => {
    expect(dedupeYarnNameFromBrand('Permin Bella (by Permin)', 'Permin')).toBe('Bella')
  })

  it('fjerner brand som suffiks: "Mochi Plus DMC" + "DMC" → "Mochi Plus"', () => {
    expect(dedupeYarnNameFromBrand('Mochi Plus DMC', 'DMC')).toBe('Mochi Plus')
  })

  it('case-insensitive: "permin BELLA" + "Permin" → "BELLA"', () => {
    expect(dedupeYarnNameFromBrand('permin BELLA', 'Permin')).toBe('BELLA')
  })

  it('no-op: brand ikke i navn: "Bella" + "Permin" → "Bella"', () => {
    expect(dedupeYarnNameFromBrand('Bella', 'Permin')).toBe('Bella')
  })

  it('brand = navn: "Permin" + "Permin" → falder tilbage til ursprungelig', () => {
    // Hvis hele navnet spises fald tilbage til original
    expect(dedupeYarnNameFromBrand('Permin', 'Permin')).toBe('Permin')
  })

  it('tomt navn: "" + "Permin" → ""', () => {
    expect(dedupeYarnNameFromBrand('', 'Permin')).toBe('')
  })

  it('tomt brand: "Bella" + "" → "Bella"', () => {
    expect(dedupeYarnNameFromBrand('Bella', '')).toBe('Bella')
  })

  it('null navn → ""', () => {
    expect(dedupeYarnNameFromBrand(null, 'Permin')).toBe('')
  })

  it('null brand → navn returneres uændret', () => {
    expect(dedupeYarnNameFromBrand('Isager Alpaca', null)).toBe('Isager Alpaca')
  })

  it('case-insensitive "(by brand)" varianter: "(BY Permin)" + "Permin" → ingen suffiks', () => {
    const result = dedupeYarnNameFromBrand('Bella (BY Permin)', 'Permin')
    expect(result).toBe('Bella')
  })

  it('brand med special-tegn (regex-safe): "C. C. Fil" + "C. C. Fil" → falder tilbage', () => {
    expect(dedupeYarnNameFromBrand('C. C. Fil', 'C. C. Fil')).toBe('C. C. Fil')
  })
})

// ── AC5: gradientFromHexColors ────────────────────────────────────────────────

describe('gradientFromHexColors — 0 farver', () => {
  it('tom array → fallback #D0C8BA', () => {
    expect(gradientFromHexColors([])).toBe('#D0C8BA')
  })

  it('null → fallback #D0C8BA', () => {
    expect(gradientFromHexColors(null)).toBe('#D0C8BA')
  })

  it('undefined → fallback #D0C8BA', () => {
    expect(gradientFromHexColors(undefined)).toBe('#D0C8BA')
  })

  it('tom array med gyldig fallbackHex → returnerer fallbackHex', () => {
    expect(gradientFromHexColors([], '#FF0000')).toBe('#FF0000')
  })

  it('tom array med ugyldig fallbackHex → returnerer #D0C8BA', () => {
    expect(gradientFromHexColors([], 'ikke-en-hex')).toBe('#D0C8BA')
  })
})

describe('gradientFromHexColors — 1 farve (solid)', () => {
  it('1 gyldig hex → returnerer hex direkte', () => {
    expect(gradientFromHexColors(['#A67C52'])).toBe('#A67C52')
  })

  it('1 farve + fallbackHex → bruger hex-farven (ikke fallback)', () => {
    expect(gradientFromHexColors(['#4A7A62'], '#FF0000')).toBe('#4A7A62')
  })
})

describe('gradientFromHexColors — 2+ farver (gradient)', () => {
  it('2 farver → linear-gradient(45deg, ...)', () => {
    const result = gradientFromHexColors(['#FF0000', '#0000FF'])
    expect(result).toBe('linear-gradient(45deg, #FF0000, #0000FF)')
  })

  it('3 farver → linear-gradient med alle tre', () => {
    const result = gradientFromHexColors(['#FF0000', '#00FF00', '#0000FF'])
    expect(result).toContain('linear-gradient(45deg,')
    expect(result).toContain('#FF0000')
    expect(result).toContain('#00FF00')
    expect(result).toContain('#0000FF')
  })

  it('5 farver (maks) → linear-gradient med alle 5', () => {
    const hex5 = ['#111111', '#222222', '#333333', '#444444', '#555555']
    const result = gradientFromHexColors(hex5)
    expect(result).toContain('linear-gradient(45deg,')
    hex5.forEach(h => expect(result).toContain(h))
  })
})

describe('gradientFromHexColors — ugyldig hex filtreres', () => {
  it('kun ugyldige hex → fallback', () => {
    expect(gradientFromHexColors(['ikke-hex', 'heller-ikke'])).toBe('#D0C8BA')
  })

  it('blanding: 1 gyldig + 1 ugyldig → solid med den gyldige', () => {
    expect(gradientFromHexColors(['ugyldig', '#A67C52'])).toBe('#A67C52')
  })

  it('3-cifret hex (#RGB) betragtes som ugyldig (kræver 6 cifre)', () => {
    expect(gradientFromHexColors(['#FFF'])).toBe('#D0C8BA')
  })

  it('hex med bogstaver OK: "#aabbcc" er gyldigt', () => {
    expect(gradientFromHexColors(['#aabbcc'])).toBe('#aabbcc')
  })
})

// ── AC6: primaryFiberLabel ────────────────────────────────────────────────────

describe('primaryFiberLabel — fiber-parsing', () => {
  it('"80% Uld, 20% Mohair" → "Uld"', () => {
    expect(primaryFiberLabel('80% Uld, 20% Mohair')).toBe('Uld')
  })

  it('"Mohair" (enkelt) → "Mohair"', () => {
    expect(primaryFiberLabel('Mohair')).toBe('Mohair')
  })

  it('"" → ""', () => {
    expect(primaryFiberLabel('')).toBe('')
  })

  it('null → ""', () => {
    expect(primaryFiberLabel(null)).toBe('')
  })

  it('undefined → ""', () => {
    expect(primaryFiberLabel(undefined)).toBe('')
  })

  it('kun procent-tal foran: "60% Alpaka, 40% Silke" → "Alpaka"', () => {
    expect(primaryFiberLabel('60% Alpaka, 40% Silke')).toBe('Alpaka')
  })

  it('ingen procent: "Merino, Kashmir" → "Merino"', () => {
    expect(primaryFiberLabel('Merino, Kashmir')).toBe('Merino')
  })

  it('whitespace trimmes: "  Uld  , Mohair" → "Uld"', () => {
    expect(primaryFiberLabel('  Uld  , Mohair')).toBe('Uld')
  })

  it('"100% Bomuld" → "Bomuld"', () => {
    expect(primaryFiberLabel('100% Bomuld')).toBe('Bomuld')
  })
})
