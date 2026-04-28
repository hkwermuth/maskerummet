import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchSharedProjects, shareProject, unshareProject } from '@/lib/community'

// ---------------------------------------------------------------------------
// Supabase mock helpers
// ---------------------------------------------------------------------------

function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'order', 'in', 'update', 'eq', 'upsert', 'maybeSingle']
  methods.forEach(m => {
    chain[m] = vi.fn(() => chain)
  })
  // The last awaited call resolves with data/error
  ;(chain as unknown as Promise<unknown>)[Symbol.iterator] = undefined
  Object.defineProperty(chain, 'then', {
    get() {
      return (resolve: (v: unknown) => unknown) => Promise.resolve(resolveWith).then(resolve)
    },
  })
  return chain
}

// ---------------------------------------------------------------------------
// A1: fetchSharedProjects — field whitelist
// ---------------------------------------------------------------------------

describe('A1 fetchSharedProjects — field whitelist', () => {
  it('queries only whitelisted fields on public_shared_projects', async () => {
    const projectSelectSpy = vi.fn(() => ({
      order: vi.fn(() =>
        Promise.resolve({
          data: [],
          error: null,
        }),
      ),
    }))

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'public_shared_projects') return { select: projectSelectSpy }
        return { select: vi.fn(() => ({ in: vi.fn(() => Promise.resolve({ data: [], error: null })) })) }
      }),
    }

    await fetchSharedProjects(supabase as never)

    expect(projectSelectSpy).toHaveBeenCalledWith(
      'id,title,project_image_urls,community_primary_image_index,project_type,community_description,community_size_shown,pattern_name,pattern_designer,pattern_pdf_thumbnail_url,pattern_cover_url,shared_at,display_name',
    )
    const selectArg: string = projectSelectSpy.mock.calls[0][0]
    expect(selectArg).toContain('community_size_shown')
    expect(selectArg).toContain('community_primary_image_index')
    expect(selectArg).toContain('pattern_pdf_thumbnail_url')
    expect(selectArg).toContain('pattern_cover_url')
    expect(selectArg).not.toContain('notes')
    expect(selectArg).not.toContain('pattern_pdf_url')
    expect(selectArg).not.toContain('needle_size')
    expect(selectArg).not.toContain('held_with')
  })

  it('queries only whitelisted yarn fields on public_shared_project_yarns', async () => {
    const yarnSelectSpy = vi.fn(() => ({
      in: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }))

    const projectData = [
      {
        id: 'proj-1',
        title: 'Blå trøje',
        project_image_urls: [],
        project_type: 'sweater',
        community_description: null,
        pattern_name: 'Mina',
        pattern_designer: 'Lene',
        shared_at: '2026-01-01T00:00:00Z',
        display_name: 'Test bruger',
      },
    ]

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'public_shared_projects') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: projectData, error: null })),
            })),
          }
        }
        if (table === 'public_shared_project_yarns') {
          return { select: yarnSelectSpy }
        }
        return {}
      }),
    }

    await fetchSharedProjects(supabase as never)

    expect(yarnSelectSpy).toHaveBeenCalledWith(
      'id,project_id,yarn_name,yarn_brand,color_name,color_code,hex_color,catalog_yarn_id,catalog_color_id',
    )
    const yarnSelectArg: string = yarnSelectSpy.mock.calls[0][0]
    expect(yarnSelectArg).not.toContain('notes')
  })

  it('merges yarns onto correct projects', async () => {
    const projectData = [
      {
        id: 'proj-1',
        title: 'Blå trøje',
        project_image_urls: [],
        project_type: 'sweater',
        community_description: null,
        pattern_name: 'Mina',
        pattern_designer: 'Lene',
        shared_at: '2026-01-01T00:00:00Z',
        display_name: 'Test bruger',
      },
    ]
    const yarnData = [
      {
        id: 'yarn-1',
        project_id: 'proj-1',
        yarn_name: 'Soft Merino',
        yarn_brand: 'Isager',
        color_name: 'Blue',
        color_code: '47',
        hex_color: null,
        catalog_yarn_id: null,
        catalog_color_id: null,
      },
    ]

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'public_shared_projects') {
          return {
            select: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: projectData, error: null })),
            })),
          }
        }
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: yarnData, error: null })),
          })),
        }
      }),
    }

    const result = await fetchSharedProjects(supabase as never)
    expect(result).toHaveLength(1)
    expect(result[0].yarns).toHaveLength(1)
    expect(result[0].yarns[0].yarn_name).toBe('Soft Merino')
  })

  it('returns empty array when no projects exist', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    }
    const result = await fetchSharedProjects(supabase as never)
    expect(result).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// A2: shareProject — correct fields, no private data
// ---------------------------------------------------------------------------

describe('A2 shareProject — correct fields sent, no private data', () => {
  it('calls update with is_shared, shared_at, project_type, community_description, pattern_name, pattern_designer', async () => {
    const updateSpy = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'projects') return { update: updateSpy }
        return { upsert: vi.fn(() => Promise.resolve({ error: null })) }
      }),
    }

    await shareProject(supabase as never, 'proj-123', 'user-456', {
      project_type: 'sweater',
      community_description: 'Min fine trøje',
      community_size_shown: null,
      community_primary_image_index: null,
      pattern_name: 'Mina',
      pattern_designer: 'Lene',
    })

    expect(updateSpy).toHaveBeenCalledOnce()
    const updateArg = updateSpy.mock.calls[0][0]
    expect(updateArg).toMatchObject({
      is_shared: true,
      project_type: 'sweater',
      community_description: 'Min fine trøje',
      community_size_shown: null,
      community_primary_image_index: null,
      pattern_name: 'Mina',
      pattern_designer: 'Lene',
    })
    expect(updateArg).toHaveProperty('shared_at')
    // Critically: no private fields
    expect(updateArg).not.toHaveProperty('notes')
    expect(updateArg).not.toHaveProperty('pattern_pdf_url')
    expect(updateArg).not.toHaveProperty('needle_size')
    expect(updateArg).not.toHaveProperty('held_with')
  })

  it('upserts profile display_name when provided', async () => {
    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }))
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') return { upsert: upsertSpy }
        return { update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) }
      }),
    }

    await shareProject(supabase as never, 'proj-123', 'user-456', {
      project_type: 'hue',
      community_description: null,
      community_size_shown: null,
      community_primary_image_index: null,
      pattern_name: 'Hat',
      pattern_designer: 'Designer',
      display_name: 'Marie L.',
    })

    expect(upsertSpy).toHaveBeenCalledWith(
      { id: 'user-456', display_name: 'Marie L.' },
      { onConflict: 'id' },
    )
  })

  it('does NOT upsert profile when display_name is not in payload', async () => {
    const upsertSpy = vi.fn()
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'profiles') return { upsert: upsertSpy }
        return { update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })) }
      }),
    }

    await shareProject(supabase as never, 'proj-123', 'user-456', {
      project_type: 'hue',
      community_description: null,
      community_size_shown: null,
      community_primary_image_index: null,
      pattern_name: 'Hat',
      pattern_designer: 'Designer',
      // display_name intentionally absent
    })

    expect(upsertSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// A3: unshareProject — only sets is_shared=false
// ---------------------------------------------------------------------------

describe('A3 unshareProject — only sets is_shared=false', () => {
  it('updates only is_shared: false for the given project id', async () => {
    const eqSpy = vi.fn(() => Promise.resolve({ error: null }))
    const updateSpy = vi.fn(() => ({ eq: eqSpy }))
    const supabase = {
      from: vi.fn(() => ({ update: updateSpy })),
    }

    await unshareProject(supabase as never, 'proj-999')

    expect(updateSpy).toHaveBeenCalledWith({ is_shared: false })
    expect(eqSpy).toHaveBeenCalledWith('id', 'proj-999')
    // Only one key in the update object
    const updateArg = updateSpy.mock.calls[0][0]
    expect(Object.keys(updateArg)).toEqual(['is_shared'])
  })
})
