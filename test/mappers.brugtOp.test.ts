/**
 * F5-acceptkriterier for toDb / fromDb / markYarnAsBrugtOp — Brugt op-felter.
 *
 * AC: toDb med status='Brugt op' sætter quantity=0 + persisterer brugt_til_projekt + brugt_op_dato.
 * AC: toDb med status≠'Brugt op' sender brugt_til_projekt=null, brugt_op_dato=null.
 * AC: fromDb mapper DB-felterne til camelCase (brugtTilProjekt, brugtOpDato).
 * AC: markYarnAsBrugtOp kalder .update().eq().select().single() korrekt og returnerer rækken.
 */

import { describe, it, expect, vi } from 'vitest'
import { toDb, fromDb, markYarnAsBrugtOp } from '@/lib/supabase/mappers'

const BASE_FORM = {
  name: 'TestGarn',
  brand: 'TestBrand',
  colorName: 'Rød',
  colorCode: '001',
  fiber: 'Uld',
  weight: 'DK',
  metrage: 200,
  antal: 3,
  hex: '#ff0000',
  hexColors: [],
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
  color_category: null,
  fiber: 'Uld',
  yarn_weight: 'DK',
  gauge: '4',
  meters: 200,
  quantity: 3,
  status: 'På lager',
  hex_color: '#ff0000',
  hex_colors: null,
  notes: '',
  barcode: null,
  image_url: null,
  brugt_til_projekt: null,
  brugt_op_dato: null,
  catalog_yarn_id: null,
  catalog_color_id: null,
  catalog_image_url: null,
}

// ── toDb: Brugt op-felter ──────────────────────────────────────────────────────

describe('mappers.toDb — Brugt op-felter', () => {
  it('status="Brugt op" sætter quantity=0 automatisk', () => {
    const result = toDb({ ...BASE_FORM, status: 'Brugt op', antal: 5, brugtTilProjekt: 'Sierraknit', brugtOpDato: '2026-04-27' })
    expect(result.quantity).toBe(0)
  })

  it('status="Brugt op" persisterer brugt_til_projekt', () => {
    const result = toDb({ ...BASE_FORM, status: 'Brugt op', antal: 2, brugtTilProjekt: 'Sierraknit', brugtOpDato: '2026-04-27' })
    expect(result.brugt_til_projekt).toBe('Sierraknit')
  })

  it('status="Brugt op" persisterer brugt_op_dato', () => {
    const result = toDb({ ...BASE_FORM, status: 'Brugt op', antal: 2, brugtTilProjekt: 'Sierraknit', brugtOpDato: '2026-04-27' })
    expect(result.brugt_op_dato).toBe('2026-04-27')
  })

  it('status="Brugt op" med tom brugtTilProjekt sender brugt_til_projekt=null', () => {
    const result = toDb({ ...BASE_FORM, status: 'Brugt op', antal: 1, brugtTilProjekt: '', brugtOpDato: '2026-04-27' })
    expect(result.brugt_til_projekt).toBeNull()
  })

  it('status="Brugt op" med tom brugtOpDato sender brugt_op_dato=null', () => {
    const result = toDb({ ...BASE_FORM, status: 'Brugt op', antal: 1, brugtTilProjekt: 'Projekt X', brugtOpDato: '' })
    expect(result.brugt_op_dato).toBeNull()
  })

  it('status="På lager" sender brugt_til_projekt=null', () => {
    const result = toDb({ ...BASE_FORM, status: 'På lager', antal: 3, brugtTilProjekt: 'Sierraknit', brugtOpDato: '2026-04-27' })
    expect(result.brugt_til_projekt).toBeNull()
  })

  it('status="På lager" sender brugt_op_dato=null', () => {
    const result = toDb({ ...BASE_FORM, status: 'På lager', antal: 3, brugtTilProjekt: 'Sierraknit', brugtOpDato: '2026-04-27' })
    expect(result.brugt_op_dato).toBeNull()
  })

  it('status="I brug" sender brugt_til_projekt=null og brugt_op_dato=null', () => {
    const result = toDb({ ...BASE_FORM, status: 'I brug', antal: 2, brugtTilProjekt: 'Sierraknit', brugtOpDato: '2026-04-27' })
    expect(result.brugt_til_projekt).toBeNull()
    expect(result.brugt_op_dato).toBeNull()
  })

  it('status="På lager" bevarer antal korrekt (ikke 0)', () => {
    const result = toDb({ ...BASE_FORM, status: 'På lager', antal: 4 })
    expect(result.quantity).toBe(4)
  })
})

// ── fromDb: camelCase-mapping ──────────────────────────────────────────────────

describe('mappers.fromDb — brugtTilProjekt og brugtOpDato', () => {
  it('brugt_til_projekt → brugtTilProjekt', () => {
    const result = fromDb({ ...BASE_DB_ROW, brugt_til_projekt: 'Sierraknit' })
    expect(result.brugtTilProjekt).toBe('Sierraknit')
  })

  it('brugt_op_dato → brugtOpDato', () => {
    const result = fromDb({ ...BASE_DB_ROW, brugt_op_dato: '2026-04-27' })
    expect(result.brugtOpDato).toBe('2026-04-27')
  })

  it('null brugt_til_projekt → tom streng (default)', () => {
    const result = fromDb({ ...BASE_DB_ROW, brugt_til_projekt: null })
    expect(result.brugtTilProjekt).toBe('')
  })

  it('null brugt_op_dato → tom streng (default)', () => {
    const result = fromDb({ ...BASE_DB_ROW, brugt_op_dato: null })
    expect(result.brugtOpDato).toBe('')
  })

  it('roundtrip: Brugt op-garn med projekt + dato bevares', () => {
    const dbPayload = toDb({
      ...BASE_FORM,
      status: 'Brugt op',
      antal: 5,
      brugtTilProjekt: 'Diamond Top',
      brugtOpDato: '2026-04-01',
    })
    // Simuler hvad DB returnerer
    const dbRow = {
      ...BASE_DB_ROW,
      status: 'Brugt op',
      quantity: dbPayload.quantity,
      brugt_til_projekt: dbPayload.brugt_til_projekt,
      brugt_op_dato: dbPayload.brugt_op_dato,
    }
    const mapped = fromDb(dbRow)
    expect(mapped.antal).toBe(0)
    expect(mapped.brugtTilProjekt).toBe('Diamond Top')
    expect(mapped.brugtOpDato).toBe('2026-04-01')
    expect(mapped.status).toBe('Brugt op')
  })
})

// ── markYarnAsBrugtOp ─────────────────────────────────────────────────────────

describe('markYarnAsBrugtOp', () => {
  function buildMockSupabase(returnData: unknown) {
    const singleMock = vi.fn().mockResolvedValue({ data: returnData, error: null })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    const fromMock = vi.fn().mockReturnValue({ update: updateMock })
    return { supabase: { from: fromMock }, updateMock, eqMock, selectMock, singleMock }
  }

  it('kalder .from("yarn_items").update().eq().select().single()', async () => {
    const expectedRow = { id: 'yarn-99', status: 'Brugt op', quantity: 0 }
    const { supabase, updateMock, eqMock, selectMock, singleMock } = buildMockSupabase(expectedRow)

    await markYarnAsBrugtOp(supabase, 'yarn-99', 'Sierraknit', '2026-04-27')

    expect(supabase.from).toHaveBeenCalledWith('yarn_items')
    expect(updateMock).toHaveBeenCalledWith({
      status:            'Brugt op',
      quantity:          0,
      brugt_til_projekt: 'Sierraknit',
      brugt_op_dato:     '2026-04-27',
    })
    expect(eqMock).toHaveBeenCalledWith('id', 'yarn-99')
    expect(selectMock).toHaveBeenCalled()
    expect(singleMock).toHaveBeenCalled()
  })

  it('returnerer DB-rækken fra .single()', async () => {
    const expectedRow = { id: 'yarn-99', status: 'Brugt op', quantity: 0, brugt_til_projekt: 'Sierraknit' }
    const { supabase } = buildMockSupabase(expectedRow)

    const result = await markYarnAsBrugtOp(supabase, 'yarn-99', 'Sierraknit', '2026-04-27')

    expect(result).toEqual(expectedRow)
  })

  it('sender brugt_til_projekt=null for tom projekt-streng', async () => {
    const { supabase, updateMock } = buildMockSupabase({})

    await markYarnAsBrugtOp(supabase, 'yarn-1', '', '2026-04-27')

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      brugt_til_projekt: null,
    }))
  })

  it('sender brugt_op_dato=null for tom dato-streng', async () => {
    const { supabase, updateMock } = buildMockSupabase({})

    await markYarnAsBrugtOp(supabase, 'yarn-1', 'Projekt', '')

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      brugt_op_dato: null,
    }))
  })

  it('kaster fejl når Supabase returnerer error', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: null, error: new Error('DB fejl') })
    const selectMock = vi.fn().mockReturnValue({ single: singleMock })
    const eqMock = vi.fn().mockReturnValue({ select: selectMock })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    const fromMock = vi.fn().mockReturnValue({ update: updateMock })
    const supabase = { from: fromMock }

    await expect(markYarnAsBrugtOp(supabase, 'yarn-1', 'Projekt', '2026-04-27')).rejects.toThrow('DB fejl')
  })
})
