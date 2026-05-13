/**
 * useGarnFilters — localStorage-persistens med user-namespace og migration.
 *
 * Acceptkriterier:
 * AC-HYD — hook hydrerer state fra user-namespaced key ved mount
 * AC-MIG — migration: gammel global key kopieres til ny user-key og slettes
 * AC-ONE — migration sker kun én gang (gammel key slettes, næste mount bruger ny key)
 * AC-VAL — ugyldige weight/status-værdier fra localStorage ignoreres (validation)
 * AC-PER — filter-ændringer persisteres til user-namespaced key
 * AC-NOI — ingen skrivning før hydrated (undgår SSR-race)
 * AC-NOU — ingen crash og hydrated=true selv uden userId
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGarnFilters } from '@/lib/hooks/useGarnFilters'

const KEY_PREFIX = 'striq.garnlager.filters.v1.'
const LEGACY_KEY = 'striq.garnlager.filters.v1'

// Isoleret in-memory localStorage mock per test
let store: Record<string, string> = {}
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { store = {} },
}

beforeEach(() => {
  store = {}
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// ── AC-HYD: hydrering fra user-key ─────────────────────────────────────────

describe('useGarnFilters — AC-HYD: hydrering fra user-key', () => {
  it('læser q, weight, status, fiber fra user-namespaced key', async () => {
    const userId = 'user-abc'
    store[KEY_PREFIX + userId] = JSON.stringify({ q: 'merino', weight: 'DK', status: 'På lager', fiber: 'Uld' })

    const { result } = renderHook(() => useGarnFilters(userId))
    // Vent på useEffect (hydration)
    await act(async () => {})

    expect(result.current.q).toBe('merino')
    expect(result.current.filterWeight).toBe('DK')
    expect(result.current.filterStatus).toBe('På lager')
    expect(result.current.filterFiber).toBe('Uld')
    expect(result.current.hydrated).toBe(true)
  })

  it('hydrated=true sættes selvom der ingen gemte filtre er', async () => {
    const { result } = renderHook(() => useGarnFilters('user-empty'))
    await act(async () => {})
    expect(result.current.hydrated).toBe(true)
  })
})

// ── AC-MIG: migration fra gammel global key ────────────────────────────────

describe('useGarnFilters — AC-MIG: migration', () => {
  it('gammel global key migreres til user-namespaced key', async () => {
    const userId = 'user-mig'
    const savedFilters = JSON.stringify({ q: 'drops', weight: 'Fingering', status: 'I brug', fiber: 'Mohair' })
    store[LEGACY_KEY] = savedFilters

    const { result } = renderHook(() => useGarnFilters(userId))
    await act(async () => {})

    // Filtre er hydrated fra legacy
    expect(result.current.q).toBe('drops')
    expect(result.current.filterWeight).toBe('Fingering')
    expect(result.current.filterStatus).toBe('I brug')

    // Gammel key er slettet
    expect(store[LEGACY_KEY]).toBeUndefined()

    // Ny user-key er skrevet (migration)
    expect(store[KEY_PREFIX + userId]).toBeDefined()
  })

  it('gammel key slettes efter migration (double-write ikke muligt)', async () => {
    const userId = 'user-migrate-once'
    store[LEGACY_KEY] = JSON.stringify({ q: 'alpaca', weight: 'Lace', status: '', fiber: '' })

    renderHook(() => useGarnFilters(userId))
    await act(async () => {})

    // Legacy key er borte
    expect(store[LEGACY_KEY]).toBeUndefined()
  })
})

// ── AC-ONE: migration sker kun én gang ────────────────────────────────────

describe('useGarnFilters — AC-ONE: migration sker kun én gang', () => {
  it('andet mount (ny user-key eksisterer) læser user-key, gammel key ignoreres', async () => {
    const userId = 'user-once'
    // Sæt BEGGE keys — simulerer tilstand EFTER første migration (legacy stadig sat af fejl)
    store[KEY_PREFIX + userId] = JSON.stringify({ q: 'ny', weight: 'Worsted', status: '', fiber: '' })
    store[LEGACY_KEY] = JSON.stringify({ q: 'gammel', weight: 'Bulky', status: '', fiber: '' })

    const { result } = renderHook(() => useGarnFilters(userId))
    await act(async () => {})

    // Ny key vinder — gammel ignoreres
    expect(result.current.q).toBe('ny')
    expect(result.current.filterWeight).toBe('Worsted')
  })
})

// ── AC-VAL: validation mod WEIGHTS_ALLOW / STATUSES_ALLOW ─────────────────

describe('useGarnFilters — AC-VAL: validation', () => {
  it('ugyldig weight ignoreres (tom filterWeight)', async () => {
    const userId = 'user-val-w'
    store[KEY_PREFIX + userId] = JSON.stringify({ q: '', weight: 'UgyldigVægt', status: '', fiber: '' })

    const { result } = renderHook(() => useGarnFilters(userId))
    await act(async () => {})

    expect(result.current.filterWeight).toBe('')
  })

  it('ugyldig status ignoreres (tom filterStatus)', async () => {
    const userId = 'user-val-s'
    store[KEY_PREFIX + userId] = JSON.stringify({ q: '', weight: '', status: 'FjernedStatus', fiber: '' })

    const { result } = renderHook(() => useGarnFilters(userId))
    await act(async () => {})

    expect(result.current.filterStatus).toBe('')
  })

  it('gyldig weight "Aran" accepteres', async () => {
    const userId = 'user-val-ok'
    store[KEY_PREFIX + userId] = JSON.stringify({ q: '', weight: 'Aran', status: 'Ønskeliste', fiber: '' })

    const { result } = renderHook(() => useGarnFilters(userId))
    await act(async () => {})

    expect(result.current.filterWeight).toBe('Aran')
    expect(result.current.filterStatus).toBe('Ønskeliste')
  })

  it('korrupt JSON → tom state, ingen crash', async () => {
    const userId = 'user-corrupt'
    store[KEY_PREFIX + userId] = 'IKKE_JSON!!{'

    const { result } = renderHook(() => useGarnFilters(userId))
    await act(async () => {})

    expect(result.current.q).toBe('')
    expect(result.current.hydrated).toBe(true)
  })
})

// ── AC-PER: persistens af filter-ændringer ────────────────────────────────

describe('useGarnFilters — AC-PER: persistens', () => {
  it('setQ skriver ny q til localStorage', async () => {
    const userId = 'user-per'
    const { result } = renderHook(() => useGarnFilters(userId))
    await act(async () => {})

    act(() => { result.current.setQ('alpaca') })

    const saved = JSON.parse(store[KEY_PREFIX + userId] ?? '{}')
    expect(saved.q).toBe('alpaca')
  })

  it('setFilterWeight skriver ny weight', async () => {
    const userId = 'user-per-w'
    const { result } = renderHook(() => useGarnFilters(userId))
    await act(async () => {})

    act(() => { result.current.setFilterWeight('Bulky') })

    const saved = JSON.parse(store[KEY_PREFIX + userId] ?? '{}')
    expect(saved.weight).toBe('Bulky')
  })
})

// ── AC-NOU: ingen crash uden userId ───────────────────────────────────────

describe('useGarnFilters — AC-NOU: håndter tom userId', () => {
  it('hydrated=true og tom state ved userId=""', async () => {
    const { result } = renderHook(() => useGarnFilters(''))
    await act(async () => {})

    expect(result.current.hydrated).toBe(true)
    expect(result.current.q).toBe('')
  })
})
