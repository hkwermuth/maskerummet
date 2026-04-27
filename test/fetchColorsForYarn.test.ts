/**
 * Tests for fetchColorsForYarn — særligt at udgåede farver ekskluderes
 * fra default-kald (offentlig garn-visning), men inkluderes når
 * `includeDiscontinued: true` (lager-redigering, scanner-resultat).
 */

import { describe, it, expect, vi } from 'vitest'
import { fetchColorsForYarn } from '@/lib/catalog'

type Filter = { type: 'eq' | 'order' | 'or'; col?: string; val?: unknown; expr?: string }

function makeMockClient(filters: Filter[]) {
  const builder: any = {
    eq: vi.fn((col: string, val: unknown) => { filters.push({ type: 'eq', col, val }); return builder }),
    or: vi.fn((expr: string) => { filters.push({ type: 'or', expr }); return builder }),
    order: vi.fn((col: string) => { filters.push({ type: 'order', col }); return builder }),
    select: vi.fn(() => builder),
    then: (resolve: (r: { data: unknown[]; error: null }) => unknown) =>
      resolve({ data: [{ id: 'c1' }], error: null }),
  }
  const client: any = {
    from: vi.fn(() => builder),
  }
  return client
}

describe('fetchColorsForYarn', () => {
  it('default ekskluderer udgåede farver via or-filter', async () => {
    const filters: Filter[] = []
    const client = makeMockClient(filters)
    await fetchColorsForYarn(client, 'yarn-1')
    const orFilter = filters.find((f) => f.type === 'or')
    expect(orFilter).toBeDefined()
    expect(orFilter?.expr).toBe('status.is.null,status.neq.udgaaet')
  })

  it('inkluderer alle farver når includeDiscontinued=true', async () => {
    const filters: Filter[] = []
    const client = makeMockClient(filters)
    await fetchColorsForYarn(client, 'yarn-1', { includeDiscontinued: true })
    const orFilter = filters.find((f) => f.type === 'or')
    expect(orFilter).toBeUndefined()
  })

  it('returnerer tom array når yarnId er null', async () => {
    const filters: Filter[] = []
    const client = makeMockClient(filters)
    const result = await fetchColorsForYarn(client, null)
    expect(result).toEqual([])
    // Skal ikke kalde from() når yarnId mangler
    expect(client.from).not.toHaveBeenCalled()
  })
})
