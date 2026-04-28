/**
 * Tests for community.ts — shareProject med community_size_shown
 * og fetchSharedProjects select-streng.
 *
 * Dækker acceptkriterierne 16-18.
 */

import { describe, it, expect, vi } from 'vitest'
import { shareProject, fetchSharedProjects } from '@/lib/community'
import type { SharePayload } from '@/lib/community'

// ── AC16: SharePayload kræver community_size_shown (ikke optional) ───────────

describe('AC16 SharePayload — community_size_shown er påkrævet', () => {
  it('payload med community_size_shown: null kompilerer og er gyldigt', () => {
    const payload: SharePayload = {
      project_type: 'sweater',
      community_description: null,
      community_size_shown: null,
      pattern_name: 'Mina',
      pattern_designer: 'Lene',
    }
    expect(payload.community_size_shown).toBeNull()
  })

  it('payload med community_size_shown: "M" er gyldigt', () => {
    const payload: SharePayload = {
      project_type: 'sweater',
      community_description: null,
      community_size_shown: 'M',
      pattern_name: 'Mina',
      pattern_designer: 'Lene',
    }
    expect(payload.community_size_shown).toBe('M')
  })
})

// ── AC17: shareProject sender community_size_shown i projects.update() ───────

describe('AC17 shareProject — community_size_shown i update-kald', () => {
  function makeSupabase(updateSpy: ReturnType<typeof vi.fn>) {
    return {
      from: vi.fn((table: string) => {
        if (table === 'projects') return { update: updateSpy }
        return { upsert: vi.fn(() => Promise.resolve({ error: null })) }
      }),
    }
  }

  it('sender community_size_shown: null i update', async () => {
    const updateSpy = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    const supabase = makeSupabase(updateSpy)

    await shareProject(supabase as never, 'proj-1', 'user-1', {
      project_type: 'sweater',
      community_description: null,
      community_size_shown: null,
      pattern_name: 'Mina',
      pattern_designer: 'Lene',
    })

    const updateArg = updateSpy.mock.calls[0][0]
    expect(updateArg).toHaveProperty('community_size_shown', null)
  })

  it('sender community_size_shown: "M" i update', async () => {
    const updateSpy = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    const supabase = makeSupabase(updateSpy)

    await shareProject(supabase as never, 'proj-1', 'user-1', {
      project_type: 'sweater',
      community_description: null,
      community_size_shown: 'M',
      pattern_name: 'Mina',
      pattern_designer: 'Lene',
    })

    const updateArg = updateSpy.mock.calls[0][0]
    expect(updateArg).toHaveProperty('community_size_shown', 'M')
  })

  it('sender community_size_shown: "98 cm bryst" i update', async () => {
    const updateSpy = vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) }))
    const supabase = makeSupabase(updateSpy)

    await shareProject(supabase as never, 'proj-1', 'user-1', {
      project_type: 'cardigan',
      community_description: 'Min fine cardigan',
      community_size_shown: '98 cm bryst',
      pattern_name: 'Oslo',
      pattern_designer: 'Arne & Carlos',
    })

    const updateArg = updateSpy.mock.calls[0][0]
    expect(updateArg).toHaveProperty('community_size_shown', '98 cm bryst')
  })
})

// ── AC18: fetchSharedProjects select inkluderer community_size_shown ─────────

describe('AC18 fetchSharedProjects — community_size_shown i select', () => {
  it('select-strengen på public_shared_projects inkluderer community_size_shown', async () => {
    const projectSelectSpy = vi.fn(() => ({
      order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    }))

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'public_shared_projects') return { select: projectSelectSpy }
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        }
      }),
    }

    await fetchSharedProjects(supabase as never)

    const selectArg: string = projectSelectSpy.mock.calls[0][0]
    expect(selectArg).toContain('community_size_shown')
  })
})
