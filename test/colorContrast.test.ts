/**
 * lib/colorContrast.ts — tests
 *
 * AC 1  relativeLuminance('#000000') ≈ 0
 * AC 2  relativeLuminance('#FFFFFF') ≈ 1
 * AC 3  pickReadableTextColor('#000000') returnerer lys tekst (#FFFCF7)
 * AC 4  pickReadableTextColor('#FFFFFF') returnerer mørk tekst (#1A1410)
 * AC 5  pickReadableTextColor('#3A2A1C') (mørk brun) returnerer lys tekst
 * AC 6  pickReadableTextColor('#D4ADB6') (lys pink) returnerer mørk tekst
 * AC 7  Ugyldig hex crasher ikke
 */

import { describe, it, expect } from 'vitest'
import { relativeLuminance, pickReadableTextColor } from '@/lib/colorContrast'

const DARK_TEXT  = '#1A1410'
const LIGHT_TEXT = '#FFFCF7'

describe('relativeLuminance', () => {
  it('AC1 – sort (#000000) ≈ 0', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 4)
  })

  it('AC2 – hvid (#FFFFFF) ≈ 1', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 4)
  })

  it('returnerer et tal mellem 0 og 1 for mellemfarver', () => {
    const l = relativeLuminance('#808080')
    expect(l).toBeGreaterThan(0)
    expect(l).toBeLessThan(1)
  })
})

describe('pickReadableTextColor', () => {
  it('AC3 – sort baggrund → lys tekst', () => {
    expect(pickReadableTextColor('#000000')).toBe(LIGHT_TEXT)
  })

  it('AC4 – hvid baggrund → mørk tekst', () => {
    expect(pickReadableTextColor('#FFFFFF')).toBe(DARK_TEXT)
  })

  it('AC5 – mørk brun (#3A2A1C) → lys tekst', () => {
    expect(pickReadableTextColor('#3A2A1C')).toBe(LIGHT_TEXT)
  })

  it('AC6 – lys pink (#D4ADB6) → mørk tekst', () => {
    // WCAG contrast-ratio: mørk tekst (#1A1410) vinder mod lys (#FFFCF7) på #D4ADB6
    expect(pickReadableTextColor('#D4ADB6')).toBe(DARK_TEXT)
  })

  it('AC7 – ugyldig hex crasher ikke og returnerer en string', () => {
    expect(() => pickReadableTextColor('not-a-hex')).not.toThrow()
    const result = pickReadableTextColor('not-a-hex')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('AC7 – tom streng crasher ikke', () => {
    expect(() => pickReadableTextColor('')).not.toThrow()
    const result = pickReadableTextColor('')
    expect([DARK_TEXT, LIGHT_TEXT]).toContain(result)
  })

  it('understøtter custom dark/light opts', () => {
    expect(pickReadableTextColor('#000000', { light: '#FFFFFF', dark: '#000000' })).toBe('#FFFFFF')
    expect(pickReadableTextColor('#FFFFFF', { light: '#FFFFFF', dark: '#000000' })).toBe('#000000')
  })
})
