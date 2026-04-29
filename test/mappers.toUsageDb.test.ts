/**
 * Tests for toUsageDb's defensive brand-prefix-strip på yarn_name.
 *
 * Invariant: yarn_name må aldrig indeholde brand-præfix når yarn_brand er sat.
 * Hvis det slipper igennem fra et call-site, stripper toUsageDb det defensivt
 * via dedupeYarnNameFromBrand. Det dækker ALLE skrive-flows ét sted.
 */

import { describe, it, expect } from 'vitest'
import { toUsageDb } from '@/lib/supabase/mappers'

describe('toUsageDb — yarn_name brand-prefix-strip', () => {
  it('stripper brand-præfix når yarn_name starter med brand+space', () => {
    const result = toUsageDb({
      projectId: 'p1',
      yarnBrand: 'Permin',
      yarnName: 'Permin Hannah',
    })
    expect(result.yarn_name).toBe('Hannah')
    expect(result.yarn_brand).toBe('Permin')
  })

  it('stripper brand med space i navnet (BC Garn)', () => {
    const result = toUsageDb({
      projectId: 'p1',
      yarnBrand: 'BC Garn',
      yarnName: 'BC Garn Luxor',
    })
    expect(result.yarn_name).toBe('Luxor')
    expect(result.yarn_brand).toBe('BC Garn')
  })

  it('case-insensitive strip: yarn_brand="Permin", yarn_name="permin Bella" → "Bella"', () => {
    const result = toUsageDb({
      projectId: 'p1',
      yarnBrand: 'Permin',
      yarnName: 'permin Bella',
    })
    expect(result.yarn_name).toBe('Bella')
  })

  it('no-op når yarn_name ikke har brand-præfix', () => {
    const result = toUsageDb({
      projectId: 'p1',
      yarnBrand: 'Permin',
      yarnName: 'Hannah',
    })
    expect(result.yarn_name).toBe('Hannah')
  })

  it('no-op når yarn_brand er tom', () => {
    const result = toUsageDb({
      projectId: 'p1',
      yarnBrand: '',
      yarnName: 'Permin Hannah',
    })
    expect(result.yarn_name).toBe('Permin Hannah')
  })

  it('no-op når yarn_brand er null', () => {
    const result = toUsageDb({
      projectId: 'p1',
      yarnBrand: null,
      yarnName: 'Hannah',
    })
    expect(result.yarn_name).toBe('Hannah')
  })

  it('null yarn_name → null', () => {
    const result = toUsageDb({
      projectId: 'p1',
      yarnBrand: 'Permin',
      yarnName: null,
    })
    expect(result.yarn_name).toBeNull()
  })

  it('falder tilbage til original når strip ville give tom streng (yarn_name == yarn_brand)', () => {
    // dedupeYarnNameFromBrand returnerer original ved tom resultat — bevares her.
    const result = toUsageDb({
      projectId: 'p1',
      yarnBrand: 'Permin',
      yarnName: 'Permin',
    })
    expect(result.yarn_name).toBe('Permin')
  })

  it('idempotent: 2. kald rammer ingen ændring', () => {
    const first = toUsageDb({
      projectId: 'p1',
      yarnBrand: 'Permin',
      yarnName: 'Permin Hannah',
    })
    const second = toUsageDb({
      projectId: 'p1',
      yarnBrand: 'Permin',
      yarnName: first.yarn_name,
    })
    expect(second.yarn_name).toBe('Hannah')
  })

  it('bevarer øvrige felter uden ændring', () => {
    const result = toUsageDb({
      projectId: 'p1',
      yarnItemId: 'yi-1',
      yarnBrand: 'Permin',
      yarnName: 'Permin Hannah',
      colorName: 'Pink',
      colorCode: '47',
      hex: '#F0A0B0',
      catalogYarnId: 'cy-1',
      catalogColorId: 'cc-1',
      quantityUsed: 2,
      usedFor: 'sweater',
      needleSize: '4.5',
      heldWith: 'silke',
      notes: 'fin',
      usedAt: '2026-04-29',
    })
    expect(result).toMatchObject({
      project_id: 'p1',
      yarn_item_id: 'yi-1',
      yarn_name: 'Hannah',
      yarn_brand: 'Permin',
      color_name: 'Pink',
      color_code: '47',
      hex_color: '#F0A0B0',
      catalog_yarn_id: 'cy-1',
      catalog_color_id: 'cc-1',
      quantity_used: 2,
      used_for: 'sweater',
      needle_size: '4.5',
      held_with: 'silke',
      notes: 'fin',
      used_at: '2026-04-29',
    })
  })
})
