import { describe, it, expect, vi } from 'vitest'
import { markOnboarded, fetchOwnProfile } from '@/lib/community'

// ---------------------------------------------------------------------------
// D1: markOnboarded — upsert med onboarded_at
// ---------------------------------------------------------------------------

describe('D1 markOnboarded — upsert med onboarded_at', () => {
  it('kalder upsert på profiles-tabellen', async () => {
    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }))
    const supabase = {
      from: vi.fn((table: string) => {
        expect(table).toBe('profiles')
        return { upsert: upsertSpy }
      }),
    }

    await markOnboarded(supabase as never, 'user-123')

    expect(upsertSpy).toHaveBeenCalledOnce()
  })

  it('sender id og onboarded_at i upsert-payload', async () => {
    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }))
    const supabase = {
      from: vi.fn(() => ({ upsert: upsertSpy })),
    }

    const before = Date.now()
    await markOnboarded(supabase as never, 'user-456')
    const after = Date.now()

    const [payload, options] = upsertSpy.mock.calls[0]
    expect(payload).toMatchObject({ id: 'user-456' })
    expect(payload).toHaveProperty('onboarded_at')

    // Sikr at onboarded_at er en ISO-streng med korrekt dato
    const ts = new Date(payload.onboarded_at).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)

    expect(options).toMatchObject({ onConflict: 'id' })
  })

  it('sender ikke private data (f.eks. display_name) i upsert', async () => {
    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }))
    const supabase = {
      from: vi.fn(() => ({ upsert: upsertSpy })),
    }

    await markOnboarded(supabase as never, 'user-789')

    const [payload] = upsertSpy.mock.calls[0]
    expect(Object.keys(payload)).toEqual(['id', 'onboarded_at'])
  })

  it('kaster ikke ved supabase-fejl (logger i stedet)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const supabase = {
      from: vi.fn(() => ({
        upsert: vi.fn(() => Promise.resolve({ error: { message: 'DB fejl' } })),
      })),
    }

    await expect(markOnboarded(supabase as never, 'user-000')).resolves.toBeUndefined()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// D2: fetchOwnProfile — returnerer onboarded_at-feltet
// ---------------------------------------------------------------------------

describe('D2 fetchOwnProfile — inkluderer onboarded_at i select', () => {
  function makeProfileSupabase(resolveWith: { data: unknown; error: unknown }) {
    const maybeSingleSpy = vi.fn(() => Promise.resolve(resolveWith))
    const eqSpy = vi.fn(() => ({ maybeSingle: maybeSingleSpy }))
    const selectSpy = vi.fn(() => ({ eq: eqSpy }))
    return {
      supabase: {
        from: vi.fn(() => ({ select: selectSpy })),
      },
      selectSpy,
      eqSpy,
      maybeSingleSpy,
    }
  }

  it('kalder select med onboarded_at-feltet', async () => {
    const { supabase, selectSpy } = makeProfileSupabase({ data: null, error: null })

    await fetchOwnProfile(supabase as never, 'user-123')

    const selectArg: string = selectSpy.mock.calls[0][0]
    expect(selectArg).toContain('onboarded_at')
  })

  it('filtrerer på korrekt userId', async () => {
    const { supabase, eqSpy } = makeProfileSupabase({ data: null, error: null })

    await fetchOwnProfile(supabase as never, 'user-abc')

    expect(eqSpy).toHaveBeenCalledWith('id', 'user-abc')
  })

  it('returnerer data-objektet inklusive onboarded_at', async () => {
    const profileData = {
      id: 'user-123',
      display_name: 'Marie',
      onboarded_at: '2026-03-01T10:00:00Z',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const { supabase } = makeProfileSupabase({ data: profileData, error: null })

    const result = await fetchOwnProfile(supabase as never, 'user-123')

    expect(result).toMatchObject({ onboarded_at: '2026-03-01T10:00:00Z' })
  })

  it('returnerer null ved supabase-fejl', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = makeProfileSupabase({ data: null, error: { message: 'Fejl' } })

    const result = await fetchOwnProfile(supabase as never, 'user-123')

    expect(result).toBeNull()
    consoleSpy.mockRestore()
  })

  it('returnerer null for ikke-eksisterende bruger (maybeSingle returnerer null)', async () => {
    const { supabase } = makeProfileSupabase({ data: null, error: null })

    const result = await fetchOwnProfile(supabase as never, 'ingen-bruger')

    expect(result).toBeNull()
  })
})
