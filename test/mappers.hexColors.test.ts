/**
 * Unit-tests for lib/supabase/mappers.ts — hex_colors roundtrip (F4).
 *
 * Dækker acceptkriterium 12:
 * - toDb({hexColors: []}) → hex_colors: null
 * - toDb({hexColors: ['#AA1122','#BB2233']}) → hex_colors: ['#AA1122','#BB2233']
 * - fromDb({hex_colors: null}) → hexColors: []
 * - fromDb({hex_colors: ['#AA1122']}) → hexColors: ['#AA1122']
 */

import { describe, it, expect } from 'vitest'
import { toDb, fromDb } from '@/lib/supabase/mappers'

const BASE_YARN_FORM = {
  name: 'TestGarn',
  brand: 'TestBrand',
  colorName: 'Rød',
  colorCode: '001',
  colorCategory: 'rød',
  fiber: 'Uld',
  weight: 'DK',
  pindstr: '4',
  metrage: 200,
  antal: 3,
  status: 'På lager',
  hex: '#ff0000',
  noter: '',
  barcode: null,
  imageUrl: null,
  catalogYarnId: null,
  catalogColorId: null,
  catalogImageUrl: null,
}

const BASE_DB_ROW = {
  id: 'row-1',
  name: 'TestGarn',
  brand: 'TestBrand',
  color_name: 'Rød',
  color_code: '001',
  color_category: 'rød',
  fiber: 'Uld',
  yarn_weight: 'DK',
  gauge: '4',
  meters: 200,
  quantity: 3,
  status: 'På lager',
  hex_color: '#ff0000',
  notes: '',
  barcode: null,
  image_url: null,
  catalog_yarn_id: null,
  catalog_color_id: null,
  catalog_image_url: null,
}

// ── toDb: hexColors → hex_colors ──────────────────────────────────────────────

describe('mappers.toDb — hex_colors-felt', () => {
  it('tomt array → null (DB-CHECK afviser tomme arrays)', () => {
    const result = toDb({ ...BASE_YARN_FORM, hexColors: [] })
    expect(result.hex_colors).toBeNull()
  })

  it('undefined hexColors → null', () => {
    const { hexColors: _, ...rest } = { ...BASE_YARN_FORM, hexColors: undefined as unknown as string[] }
    const result = toDb({ ...rest })
    expect(result.hex_colors).toBeNull()
  })

  it('1 farve-array → array med 1 element', () => {
    const result = toDb({ ...BASE_YARN_FORM, hexColors: ['#AA1122'] })
    expect(result.hex_colors).toEqual(['#AA1122'])
  })

  it('2 farver → array med 2 elementer', () => {
    const result = toDb({ ...BASE_YARN_FORM, hexColors: ['#AA1122', '#BB2233'] })
    expect(result.hex_colors).toEqual(['#AA1122', '#BB2233'])
  })

  it('5 farver → array med 5 elementer', () => {
    const hex5 = ['#111111', '#222222', '#333333', '#444444', '#555555']
    const result = toDb({ ...BASE_YARN_FORM, hexColors: hex5 })
    expect(result.hex_colors).toEqual(hex5)
  })

  it('toDb bevarer øvrige felter korrekt ved array-konvertering', () => {
    const result = toDb({ ...BASE_YARN_FORM, hexColors: ['#AA1122'] })
    expect(result.name).toBe('TestGarn')
    expect(result.brand).toBe('TestBrand')
    expect(result.hex_color).toBe('#ff0000')
  })
})

// ── fromDb: hex_colors → hexColors ────────────────────────────────────────────

describe('mappers.fromDb — hexColors-felt', () => {
  it('null → []', () => {
    const result = fromDb({ ...BASE_DB_ROW, hex_colors: null })
    expect(result.hexColors).toEqual([])
  })

  it('undefined → []', () => {
    const result = fromDb({ ...BASE_DB_ROW, hex_colors: undefined })
    expect(result.hexColors).toEqual([])
  })

  it('1-element array → samme array', () => {
    const result = fromDb({ ...BASE_DB_ROW, hex_colors: ['#AA1122'] })
    expect(result.hexColors).toEqual(['#AA1122'])
  })

  it('2-element array → samme array', () => {
    const result = fromDb({ ...BASE_DB_ROW, hex_colors: ['#AA1122', '#BB2233'] })
    expect(result.hexColors).toEqual(['#AA1122', '#BB2233'])
  })

  it('5-element array → alle 5 elementer', () => {
    const hex5 = ['#111111', '#222222', '#333333', '#444444', '#555555']
    const result = fromDb({ ...BASE_DB_ROW, hex_colors: hex5 })
    expect(result.hexColors).toEqual(hex5)
  })

  it('fromDb bevarer øvrige felter: id, name, hex', () => {
    const result = fromDb({ ...BASE_DB_ROW, hex_colors: null })
    expect(result.id).toBe('row-1')
    expect(result.name).toBe('TestGarn')
    expect(result.hex).toBe('#ff0000')
  })

  it('string (ikke array) → [] (fejlsikring mod uventede DB-typer)', () => {
    const result = fromDb({ ...BASE_DB_ROW, hex_colors: '#aabbcc' })
    expect(result.hexColors).toEqual([])
  })
})

// ── Roundtrip ─────────────────────────────────────────────────────────────────

describe('mappers roundtrip — toDb → fromDb', () => {
  it('hexColors=[] → toDb → fromDb → []', () => {
    const dbPayload = toDb({ ...BASE_YARN_FORM, hexColors: [] })
    // Simulér hvad DB returnerer ved NULL
    const dbRow = { ...BASE_DB_ROW, hex_colors: dbPayload.hex_colors }
    const result = fromDb(dbRow)
    expect(result.hexColors).toEqual([])
  })

  it('hexColors=["#AA1122","#BB2233"] → toDb → fromDb → ["#AA1122","#BB2233"]', () => {
    const dbPayload = toDb({ ...BASE_YARN_FORM, hexColors: ['#AA1122', '#BB2233'] })
    const dbRow = { ...BASE_DB_ROW, hex_colors: dbPayload.hex_colors }
    const result = fromDb(dbRow)
    expect(result.hexColors).toEqual(['#AA1122', '#BB2233'])
  })
})
