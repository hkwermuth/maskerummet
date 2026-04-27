/**
 * Tests for lib/data/barcodeSuggestions.ts:
 *   - createBarcodeSuggestion
 *   - listPendingBarcodeSuggestions
 *   - approveBarcodeSuggestion
 *   - rejectBarcodeSuggestion
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createBarcodeSuggestion,
  listPendingBarcodeSuggestions,
  approveBarcodeSuggestion,
  rejectBarcodeSuggestion,
} from '@/lib/data/barcodeSuggestions'

// --- Mock-client builder helpers ----------------------------------------------

/** Builder til insert().select().single() kæden. */
function makeInsertBuilder(result: { data: unknown; error: { message: string } | null }) {
  const singleFn = vi.fn().mockResolvedValue(result)
  const selectFn = vi.fn().mockReturnValue({ single: singleFn })
  const insertFn = vi.fn().mockReturnValue({ select: selectFn })
  return { insertFn, selectFn, singleFn }
}

/** Builder til select().eq().order().order() kæden — thenable i sidst led. */
function makeQueryBuilder(result: { data: unknown; error: { message: string } | null }) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: (resolve: (r: typeof result) => unknown) => resolve(result),
  }
  return builder
}

/** Byg en mock-client med auth + from. */
function makeClient({
  user,
  userError,
  fromImpl,
  rpcResult,
}: {
  user?: { id: string } | null
  userError?: boolean
  fromImpl?: (table: string) => any
  rpcResult?: { error: { message: string } | null }
}) {
  const getUser = vi.fn().mockResolvedValue(
    userError
      ? { data: { user: null }, error: { message: 'auth error' } }
      : { data: { user: user ?? null }, error: null }
  )
  const rpc = vi.fn().mockResolvedValue(rpcResult ?? { error: null })
  const from = vi.fn().mockImplementation(fromImpl ?? (() => ({})))
  return { auth: { getUser }, from, rpc }
}

// --- createBarcodeSuggestion --------------------------------------------------

describe('createBarcodeSuggestion', () => {
  afterEach(() => vi.restoreAllMocks())

  it('kaster fejl når bruger ikke er logget ind (user: null)', async () => {
    const client = makeClient({ user: null })
    await expect(
      createBarcodeSuggestion(client as any, { barcode: '1234' })
    ).rejects.toThrow('Du skal være logget ind for at sende et forslag')
  })

  it('kaster fejl når auth.getUser returnerer error', async () => {
    const client = makeClient({ userError: true })
    await expect(
      createBarcodeSuggestion(client as any, { barcode: '1234' })
    ).rejects.toThrow('Du skal være logget ind for at sende et forslag')
  })

  it('happy path: trimmer barcode og sætter user_id og status=new', async () => {
    const { insertFn, selectFn, singleFn } = makeInsertBuilder({
      data: { id: 'sug-1', barcode: '1234', user_id: 'user-42', status: 'new' },
      error: null,
    })
    const client = makeClient({
      user: { id: 'user-42' },
      fromImpl: () => ({ insert: insertFn }),
    })

    const result = await createBarcodeSuggestion(client as any, {
      barcode: ' 1234 ',
      suggested_producer: 'Filcolana',
    })

    // Korrekt payload sendt til insert
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        barcode: '1234',
        user_id: 'user-42',
        status: 'new',
        suggested_producer: 'Filcolana',
      })
    )
    // Manglende optional felter sættes til null
    const insertedPayload = insertFn.mock.calls[0][0]
    expect(insertedPayload.suggested_yarn_id).toBeNull()
    expect(insertedPayload.suggested_color_id).toBeNull()
    expect(insertedPayload.suggested_yarn_name).toBeNull()
    expect(insertedPayload.suggested_color_name).toBeNull()
    expect(insertedPayload.suggested_color_number).toBeNull()
    expect(insertedPayload.banderole_image_url).toBeNull()
    expect(insertedPayload.comment).toBeNull()

    // select + single kaldt i kæden
    expect(selectFn).toHaveBeenCalled()
    expect(singleFn).toHaveBeenCalled()

    // Returnerer data
    expect(result).toMatchObject({ id: 'sug-1', barcode: '1234' })
  })

  it('DB-fejl på insert kaster Error med message', async () => {
    const { insertFn } = makeInsertBuilder({
      data: null,
      error: { message: 'unique_violation' },
    })
    const client = makeClient({
      user: { id: 'user-42' },
      fromImpl: () => ({ insert: insertFn }),
    })

    await expect(
      createBarcodeSuggestion(client as any, { barcode: '1234' })
    ).rejects.toThrow('unique_violation')
  })
})

// --- listPendingBarcodeSuggestions --------------------------------------------

describe('listPendingBarcodeSuggestions', () => {
  afterEach(() => vi.restoreAllMocks())

  it('kalder eq(status, new) og to order-kald på barcode og created_at', async () => {
    const builder = makeQueryBuilder({ data: [], error: null })
    const client = makeClient({ fromImpl: () => builder })

    await listPendingBarcodeSuggestions(client as any)

    expect(client.from).toHaveBeenCalledWith('barcode_suggestions')
    expect(builder.eq).toHaveBeenCalledWith('status', 'new')
    expect(builder.order).toHaveBeenCalledWith('barcode', { ascending: true })
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('returnerer data-array ved succes', async () => {
    const rows = [{ id: 's1', barcode: '111' }, { id: 's2', barcode: '222' }]
    const builder = makeQueryBuilder({ data: rows, error: null })
    const client = makeClient({ fromImpl: () => builder })

    const result = await listPendingBarcodeSuggestions(client as any)
    expect(result).toEqual(rows)
  })

  it('ved error: returnerer tom array og kalder console.error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const builder = makeQueryBuilder({ data: null, error: { message: 'db fejl' } })
    const client = makeClient({ fromImpl: () => builder })

    const result = await listPendingBarcodeSuggestions(client as any)
    expect(result).toEqual([])
    expect(consoleSpy).toHaveBeenCalled()
  })

  it('data: null returnerer tom array', async () => {
    const builder = makeQueryBuilder({ data: null, error: null })
    const client = makeClient({ fromImpl: () => builder })

    const result = await listPendingBarcodeSuggestions(client as any)
    expect(result).toEqual([])
  })
})

// --- approveBarcodeSuggestion -------------------------------------------------

describe('approveBarcodeSuggestion', () => {
  afterEach(() => vi.restoreAllMocks())

  it('kalder rpc approve_barcode_suggestion med korrekte params', async () => {
    const client = makeClient({ rpcResult: { error: null } })

    await approveBarcodeSuggestion(client as any, 'sug-1', 'color-99')

    expect(client.rpc).toHaveBeenCalledWith('approve_barcode_suggestion', {
      p_suggestion_id: 'sug-1',
      p_color_id: 'color-99',
    })
  })

  it('returnerer void ved succes', async () => {
    const client = makeClient({ rpcResult: { error: null } })
    const result = await approveBarcodeSuggestion(client as any, 'sug-1', 'color-99')
    expect(result).toBeUndefined()
  })

  it('propagerer error som Error(message)', async () => {
    const client = makeClient({ rpcResult: { error: { message: 'ikke tilladt' } } })

    await expect(
      approveBarcodeSuggestion(client as any, 'sug-1', 'color-99')
    ).rejects.toThrow('ikke tilladt')
  })
})

// --- rejectBarcodeSuggestion --------------------------------------------------

describe('rejectBarcodeSuggestion', () => {
  afterEach(() => vi.restoreAllMocks())

  it('kalder rpc reject_barcode_suggestion med korrekte params', async () => {
    const client = makeClient({ rpcResult: { error: null } })

    await rejectBarcodeSuggestion(client as any, 'sug-2')

    expect(client.rpc).toHaveBeenCalledWith('reject_barcode_suggestion', {
      p_suggestion_id: 'sug-2',
    })
  })

  it('returnerer void ved succes', async () => {
    const client = makeClient({ rpcResult: { error: null } })
    const result = await rejectBarcodeSuggestion(client as any, 'sug-2')
    expect(result).toBeUndefined()
  })

  it('propagerer error som Error(message)', async () => {
    const client = makeClient({ rpcResult: { error: { message: 'rpc fejl' } } })

    await expect(
      rejectBarcodeSuggestion(client as any, 'sug-2')
    ).rejects.toThrow('rpc fejl')
  })
})
