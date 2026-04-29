/**
 * Tests for yarnDisplayLabel (lib/yarn-display.ts)
 *
 * Dækker acceptkriterierne 1-10.
 */

import { describe, it, expect } from 'vitest'
import { yarnDisplayLabel } from '@/lib/yarn-display'

describe('yarnDisplayLabel — AC1-10', () => {
  // AC1: brand er præfiks i name — returner name as-is
  it('AC1: ("Drops", "Drops Air") → "Drops Air"', () => {
    expect(yarnDisplayLabel('Drops', 'Drops Air')).toBe('Drops Air')
  })

  // AC2: brand er præfiks i name — returner name as-is
  it('AC2: ("Filcolana", "Filcolana Tilia") → "Filcolana Tilia"', () => {
    expect(yarnDisplayLabel('Filcolana', 'Filcolana Tilia')).toBe('Filcolana Tilia')
  })

  // AC3: ny DB-state efter cleanup 2026-04-29 — "Permin Bella Color" uden parens-suffiks
  // returneres as-is (brand er præfiks i name).
  it('AC3: ("Permin", "Permin Bella Color") → "Permin Bella Color"', () => {
    expect(yarnDisplayLabel('Permin', 'Permin Bella Color')).toBe('Permin Bella Color')
  })

  // AC4: name ender med "(by Permin)" — strip "(by Permin)", præfiks brand → "Permin Bella"
  it('AC4: ("Permin", "Permin Bella (by Permin)") → "Permin Bella"', () => {
    expect(yarnDisplayLabel('Permin', 'Permin Bella (by Permin)')).toBe('Permin Bella')
  })

  // AC5: name er "Bella" (intet brand-præfiks) — præfiks brand
  it('AC5: ("Permin", "Bella") → "Permin Bella"', () => {
    expect(yarnDisplayLabel('Permin', 'Bella')).toBe('Permin Bella')
  })

  // AC6: brand er null — returner name
  it('AC6: (null, "Air") → "Air"', () => {
    expect(yarnDisplayLabel(null, 'Air')).toBe('Air')
  })

  // AC7: name er null — returner brand
  it('AC7: ("Drops", null) → "Drops"', () => {
    expect(yarnDisplayLabel('Drops', null)).toBe('Drops')
  })

  // AC8: begge null — returner tom streng
  it('AC8: (null, null) → ""', () => {
    expect(yarnDisplayLabel(null, null)).toBe('')
  })

  // AC9: trimmer whitespace i name
  it('AC9: ("Drops", "  Drops Air  ") → "Drops Air" (trimmer whitespace)', () => {
    expect(yarnDisplayLabel('Drops', '  Drops Air  ')).toBe('Drops Air')
  })

  // AC10: case-insensitive — "(by Permin)" stripper selvom brand er lowercase
  it('AC10: case-insensitive — "(by Permin)" strippes selvom brand har anden case', () => {
    const result = yarnDisplayLabel('permin', 'Permin Bella (by Permin)')
    // "(by Permin)" skal være fjernet; resultatet ender på "Bella"
    expect(result).not.toContain('(by Permin)')
    expect(result.toLowerCase()).toContain('bella')
  })
})
