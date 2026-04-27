/**
 * Tests for resolveBarcodeToCatalog i lib/catalog.ts.
 *
 * Funktionen opløser en stregkode til { yarn, color } via:
 *   1. client.from('colors').select(...).eq('barcode', raw).maybeSingle()
 *   2. fetchYarnFullById(client, colorRow.yarn_id)
 *      → client.from('yarns_full').select(...).eq('id', yarnId).maybeSingle()
 *
 * Vi bruger en mock-client der svarer forskelligt baseret på tabelnavn,
 * så begge kald besvares korrekt uden at refaktorere produktionskoden.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { resolveBarcodeToCatalog } from '@/lib/catalog'

// --- Helpers ------------------------------------------------------------------

const fakeColor = {
  id: 'color-1',
  yarn_id: 'yarn-1',
  color_number: '286',
  color_name: 'Sand',
  hex_code: '#c2b280',
  barcode: '5712345678901',
  image_url: null,
}

const fakeYarn = {
  id: 'yarn-1',
  producer: 'Filcolana',
  name: 'Tilia',
  full_name: 'Filcolana Tilia',
  fiber_main: 'Bomuld',
  thickness_category: 'Fingering',
  ball_weight_g: 50,
  length_per_100g_m: 200,
  needle_min_mm: 3,
  needle_max_mm: 3.5,
  gauge_needle_mm: null,
  color_count: 30,
}

type TableResult = { data: unknown; error: { message: string } | null }

/**
 * Byg en mock-client der svarer forskelligt på 'colors' og 'yarns_full'.
 * - colorsResult  → hvad maybeSingle() på colors-tabellen resolver til
 * - yarnsResult   → hvad maybeSingle() på yarns_full-tabellen resolver til
 *
 * Vi gemmer det sidst-sete eq()-kald per tabel så tests kan verificere
 * parametrene.
 */
function makeClient({
  colorsResult,
  yarnsResult,
}: {
  colorsResult: TableResult
  yarnsResult?: TableResult
}) {
  const eqCalls: { table: string; col: string; val: unknown }[] = []

  function makeBuilder(table: string, result: TableResult) {
    const builder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn((col: string, val: unknown) => {
        eqCalls.push({ table, col, val })
        return builder
      }),
      maybeSingle: vi.fn().mockResolvedValue(result),
    }
    return builder
  }

  const colorsBuilder = makeBuilder('colors', colorsResult)
  const yarnsBuilder = makeBuilder('yarns_full', yarnsResult ?? { data: null, error: null })

  const fromSpy = vi.fn((table: string) => {
    if (table === 'yarns_full') return yarnsBuilder
    return colorsBuilder
  })

  return { from: fromSpy, _eqCalls: eqCalls, _colorsBuilder: colorsBuilder, _yarnsBuilder: yarnsBuilder }
}

// --- Tests --------------------------------------------------------------------

describe('resolveBarcodeToCatalog', () => {
  afterEach(() => vi.restoreAllMocks())

  it('tom string returnerer null og kalder ikke client.from', async () => {
    const client = makeClient({ colorsResult: { data: null, error: null } })
    const result = await resolveBarcodeToCatalog(client as any, '')
    expect(result).toBeNull()
    expect(client.from).not.toHaveBeenCalled()
  })

  it('whitespace-only string returnerer null og kalder ikke client.from', async () => {
    const client = makeClient({ colorsResult: { data: null, error: null } })
    const result = await resolveBarcodeToCatalog(client as any, '   ')
    expect(result).toBeNull()
    expect(client.from).not.toHaveBeenCalled()
  })

  it('trimmer input og sender trimmet barcode til eq-query', async () => {
    const client = makeClient({
      colorsResult: { data: fakeColor, error: null },
      yarnsResult: { data: fakeYarn, error: null },
    })
    await resolveBarcodeToCatalog(client as any, '  5712345678901  ')
    const colorEq = client._eqCalls.find((c) => c.table === 'colors')
    expect(colorEq).toBeDefined()
    expect(colorEq?.col).toBe('barcode')
    expect(colorEq?.val).toBe('5712345678901')
  })

  it('DB-fejl på colors-lookup → returnerer null og kalder console.error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = makeClient({ colorsResult: { data: null, error: { message: 'connection error' } } })
    const result = await resolveBarcodeToCatalog(client as any, '5712345678901')
    expect(result).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    // yarns_full skal ikke spørges
    expect(client.from).not.toHaveBeenCalledWith('yarns_full')
  })

  it('ingen color-row fundet → returnerer null og forespørger ikke yarns_full', async () => {
    const client = makeClient({ colorsResult: { data: null, error: null } })
    const result = await resolveBarcodeToCatalog(client as any, '5712345678901')
    expect(result).toBeNull()
    expect(client.from).not.toHaveBeenCalledWith('yarns_full')
  })

  it('color findes men garn ikke findes → returnerer null', async () => {
    const client = makeClient({
      colorsResult: { data: fakeColor, error: null },
      yarnsResult: { data: null, error: null },
    })
    const result = await resolveBarcodeToCatalog(client as any, '5712345678901')
    expect(result).toBeNull()
    // yarns_full skal have været forespurgt med korrekt yarn_id
    const yarnEq = client._eqCalls.find((c) => c.table === 'yarns_full')
    expect(yarnEq?.val).toBe(fakeColor.yarn_id)
  })

  it('happy path → returnerer { yarn, color }', async () => {
    const client = makeClient({
      colorsResult: { data: fakeColor, error: null },
      yarnsResult: { data: fakeYarn, error: null },
    })
    const result = await resolveBarcodeToCatalog(client as any, '5712345678901')
    expect(result).toEqual({ yarn: fakeYarn, color: fakeColor })
  })
})
