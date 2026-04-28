/**
 * F11 – mappers.ts roundToHalfStep via fromUsageDb
 *
 * AC 14  Eksisterende project med quantity_used = 0.25/0.5/0.75 redigerbart
 *        uden datatab — vises som rundet til nærmeste 0.5 via fromUsageDb.
 */

import { describe, it, expect } from 'vitest'
import { fromUsageDb } from '@/lib/supabase/mappers'

const baseRow = {
  id: 'u1',
  project_id: 'p1',
  yarn_item_id: null,
  yarn_name: 'Bella',
  yarn_brand: 'Permin',
  color_name: 'Rosa',
  color_code: '883174',
  hex_color: '#E1A1B0',
  catalog_yarn_id: null,
  catalog_color_id: null,
  used_for: null,
  needle_size: null,
  held_with: null,
  notes: null,
  project_image_url: null,
  pattern_pdf_url: null,
  used_at: '2024-01-01',
  created_at: '2024-01-01',
}

describe('fromUsageDb – roundToHalfStep (AC14)', () => {
  it('0.25 rundes op til 0.5', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: 0.25 })
    expect(row.quantityUsed).toBe(0.5)
  })

  it('0.75 rundes op til 1.0', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: 0.75 })
    expect(row.quantityUsed).toBe(1.0)
  })

  it('0.5 forbliver 0.5', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: 0.5 })
    expect(row.quantityUsed).toBe(0.5)
  })

  it('1.0 forbliver 1.0', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: 1.0 })
    expect(row.quantityUsed).toBe(1.0)
  })

  it('1.5 forbliver 1.5', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: 1.5 })
    expect(row.quantityUsed).toBe(1.5)
  })

  it('2.25 rundes til 2.5', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: 2.25 })
    expect(row.quantityUsed).toBe(2.5)
  })

  it('null returnerer null', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: null })
    expect(row.quantityUsed).toBeNull()
  })

  it('undefined returnerer null', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: undefined })
    expect(row.quantityUsed).toBeNull()
  })

  it('tom streng "" returnerer null', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: '' })
    expect(row.quantityUsed).toBeNull()
  })

  it('ugyldig streng "abc" returnerer null', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: 'abc' })
    expect(row.quantityUsed).toBeNull()
  })

  it('streng-tal "2.75" rundes til 3.0', () => {
    const row = fromUsageDb({ ...baseRow, quantity_used: '2.75' })
    expect(row.quantityUsed).toBe(3.0)
  })
})
