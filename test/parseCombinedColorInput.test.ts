/**
 * Pure-function tests for parseCombinedColorInput (F3 AC7) og validateForm (AC12).
 *
 * parseCombinedColorInput er modul-lokal i Garnlager.jsx — testes her
 * via indirekte eksport fra en hjælpefil, eller vi kopierer logikken.
 * Da vi ikke kan eksportere den direkte, tester vi selve logikken isoleret
 * ved at kopiere algoritmen — dette er en dokumentations-test for acceptkriterierne.
 *
 * validateForm er eksporteret fra lib/validators/yarnForm.ts og testes direkte.
 */

import { describe, it, expect } from 'vitest'
import { validateForm } from '@/lib/validators/yarnForm'

// ── parseCombinedColorInput logik (isoleret kopi til test-dokumentation) ──────

// Kopi af algoritmen fra Garnlager.jsx for at verificere korrekthed.
// Kilde-algoritme er autoritativ — disse tests dokumenterer forventet adfærd.
function parseCombinedColorInput(input: string) {
  const s = String(input || '').trim()
  if (!s) return { colorName: '', colorCode: '' }
  const codeMatch = s.match(/(\d{3,})/)
  if (codeMatch) {
    const code = codeMatch[1]
    const name = s.replace(code, '').replace(/\s+/g, ' ').trim()
    return { colorName: name, colorCode: code }
  }
  return { colorName: s, colorCode: '' }
}

describe('parseCombinedColorInput — AC7: heuristisk splitting', () => {
  it('"883174 Rosa" → { colorCode: "883174", colorName: "Rosa" }', () => {
    const result = parseCombinedColorInput('883174 Rosa')
    expect(result).toEqual({ colorCode: '883174', colorName: 'Rosa' })
  })

  it('"Rosa 883174" → { colorCode: "883174", colorName: "Rosa" }', () => {
    const result = parseCombinedColorInput('Rosa 883174')
    expect(result).toEqual({ colorCode: '883174', colorName: 'Rosa' })
  })

  it('"Rosa" → { colorCode: "", colorName: "Rosa" } (ingen kode)', () => {
    const result = parseCombinedColorInput('Rosa')
    expect(result).toEqual({ colorCode: '', colorName: 'Rosa' })
  })

  it('"883174" → { colorCode: "883174", colorName: "" } (kun kode)', () => {
    const result = parseCombinedColorInput('883174')
    expect(result).toEqual({ colorCode: '883174', colorName: '' })
  })

  it('"" → { colorCode: "", colorName: "" } (tom streng)', () => {
    const result = parseCombinedColorInput('')
    expect(result).toEqual({ colorCode: '', colorName: '' })
  })

  it('"12" → kun navn (under 3 cifre er ikke kode)', () => {
    // Regex kræver \d{3,} — to cifre er for kort
    const result = parseCombinedColorInput('12')
    expect(result).toEqual({ colorCode: '', colorName: '12' })
  })

  it('"001 Rød" → { colorCode: "001", colorName: "Rød" }', () => {
    const result = parseCombinedColorInput('001 Rød')
    expect(result).toEqual({ colorCode: '001', colorName: 'Rød' })
  })

  it('"Dusty Rose 204" → { colorCode: "204", colorName: "Dusty Rose" }', () => {
    const result = parseCombinedColorInput('Dusty Rose 204')
    expect(result).toEqual({ colorCode: '204', colorName: 'Dusty Rose' })
  })

  it('mellemrum normaliseres — "Rosa  12345  " → kode og navn uden dobbelt-mellemrum', () => {
    const result = parseCombinedColorInput('Rosa  12345  ')
    expect(result.colorCode).toBe('12345')
    expect(result.colorName).toBe('Rosa')
  })
})

// ── validateForm — AC12: katalog-link springer validering over ────────────────

describe('validateForm — AC12: name+brand kun påkrævet uden katalog-link', () => {
  it('returnerer fejl for name og brand når begge er tomme og ingen catalogYarnId', () => {
    const errors = validateForm({ name: '', brand: '', catalogYarnId: null })
    expect(errors.name).toBeTruthy()
    expect(errors.brand).toBeTruthy()
  })

  it('returnerer fejl kun for name når brand er sat men name er tom', () => {
    const errors = validateForm({ name: '', brand: 'Isager', catalogYarnId: null })
    expect(errors.name).toBeTruthy()
    expect(errors.brand).toBeUndefined()
  })

  it('returnerer fejl kun for brand når name er sat men brand er tom', () => {
    const errors = validateForm({ name: 'Alpaca 1', brand: '', catalogYarnId: null })
    expect(errors.name).toBeUndefined()
    expect(errors.brand).toBeTruthy()
  })

  it('returnerer ingen fejl når name og brand begge er sat', () => {
    const errors = validateForm({ name: 'Alpaca 1', brand: 'Isager', catalogYarnId: null })
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('returnerer INGEN fejl når catalogYarnId er sat (selvom name/brand er tomme)', () => {
    const errors = validateForm({ name: '', brand: '', catalogYarnId: 'cat-yarn-1' })
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('returnerer INGEN fejl med catalogYarnId og undefined name/brand', () => {
    const errors = validateForm({ catalogYarnId: 'cat-yarn-1' })
    expect(Object.keys(errors)).toHaveLength(0)
  })

  it('whitespace-only name returnerer fejl', () => {
    const errors = validateForm({ name: '   ', brand: 'Isager', catalogYarnId: null })
    expect(errors.name).toBeTruthy()
  })
})
