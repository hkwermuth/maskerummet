/**
 * F11 – lib/colorInput.ts
 *
 * AC 15  parseCombinedColorInput + combineColorDisplay er nu i lib/colorInput.ts
 *        og importeres derfra (ikke fra Garnlager.jsx).
 */

import { describe, it, expect } from 'vitest'
import { parseCombinedColorInput, combineColorDisplay } from '@/lib/colorInput'

describe('parseCombinedColorInput – fra lib/colorInput.ts (AC15)', () => {
  it('"883174 Rosa" → { colorCode: "883174", colorName: "Rosa" }', () => {
    expect(parseCombinedColorInput('883174 Rosa')).toEqual({ colorCode: '883174', colorName: 'Rosa' })
  })

  it('"Rosa 883174" → { colorCode: "883174", colorName: "Rosa" }', () => {
    expect(parseCombinedColorInput('Rosa 883174')).toEqual({ colorCode: '883174', colorName: 'Rosa' })
  })

  it('"Rosa" → kun navn, ingen kode', () => {
    expect(parseCombinedColorInput('Rosa')).toEqual({ colorCode: '', colorName: 'Rosa' })
  })

  it('"883174" → kun kode, intet navn', () => {
    expect(parseCombinedColorInput('883174')).toEqual({ colorCode: '883174', colorName: '' })
  })

  it('"" → begge tomme', () => {
    expect(parseCombinedColorInput('')).toEqual({ colorCode: '', colorName: '' })
  })

  it('null → begge tomme', () => {
    expect(parseCombinedColorInput(null)).toEqual({ colorCode: '', colorName: '' })
  })

  it('undefined → begge tomme', () => {
    expect(parseCombinedColorInput(undefined)).toEqual({ colorCode: '', colorName: '' })
  })

  it('"12" → to cifre er ikke kode (under 3)', () => {
    expect(parseCombinedColorInput('12')).toEqual({ colorCode: '', colorName: '12' })
  })

  it('"001 Rød" → kode "001", navn "Rød"', () => {
    expect(parseCombinedColorInput('001 Rød')).toEqual({ colorCode: '001', colorName: 'Rød' })
  })

  it('mellemrum normaliseres', () => {
    const result = parseCombinedColorInput('Rosa  12345  ')
    expect(result.colorCode).toBe('12345')
    expect(result.colorName).toBe('Rosa')
  })
})

describe('combineColorDisplay – fra lib/colorInput.ts (AC15)', () => {
  it('("883174", "Rosa") → "883174 Rosa"', () => {
    expect(combineColorDisplay('883174', 'Rosa')).toBe('883174 Rosa')
  })

  it('("", "Rosa") → "Rosa"', () => {
    expect(combineColorDisplay('', 'Rosa')).toBe('Rosa')
  })

  it('("883174", "") → "883174"', () => {
    expect(combineColorDisplay('883174', '')).toBe('883174')
  })

  it('(null, "Rosa") → "Rosa"', () => {
    expect(combineColorDisplay(null, 'Rosa')).toBe('Rosa')
  })

  it('(null, null) → ""', () => {
    expect(combineColorDisplay(null, null)).toBe('')
  })

  it('(undefined, undefined) → ""', () => {
    expect(combineColorDisplay(undefined, undefined)).toBe('')
  })

  it('("  ", "Rosa") → "Rosa" (whitespace-only kode ignoreres)', () => {
    expect(combineColorDisplay('  ', 'Rosa')).toBe('Rosa')
  })
})
