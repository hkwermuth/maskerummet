import { useEffect, useState } from 'react'

// User-namespaced persistens af brugerens filter-valg på Garnlager.
// Tidligere brugte vi én global key — det lod filtre lække mellem brugere
// på samme browser (fx delt iPad). Migration: ved første mount kopieres
// gammel global key ind under user-namespacet og slettes derefter.
const KEY_PREFIX = 'striq.garnlager.filters.v1.'
const LEGACY_KEY = 'striq.garnlager.filters.v1'

// Disse holdes synkroniseret med Garnlager.jsx's UI-options. Vi kunne
// importere fra et delt modul, men holder dem her som validerings-allow-list
// for at undgå at stale gemte filtre (fjernet enum-værdi) ender med at filtrere
// alt væk.
const WEIGHTS_ALLOW = new Set(['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky'])
const STATUSES_ALLOW = new Set(['På lager', 'I brug', 'Brugt op', 'Ønskeliste'])

export interface UseGarnFiltersResult {
  q: string
  setQ: (v: string) => void
  filterWeight: string
  setFilterWeight: (v: string) => void
  filterStatus: string
  setFilterStatus: (v: string) => void
  filterFiber: string
  setFilterFiber: (v: string) => void
  hydrated: boolean
}

function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeRaw(key: string, raw: string): void {
  try {
    window.localStorage.setItem(key, raw)
  } catch {
    // localStorage fuldt op / privat-tilstand → drop persistens, ikke fatalt
  }
}

function removeRaw(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignor
  }
}

export function useGarnFilters(userId: string): UseGarnFiltersResult {
  const [q, setQ] = useState('')
  const [filterWeight, setFilterWeight] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFiber, setFilterFiber] = useState('')
  // Sat til true efter første hydrering fra localStorage, så vi undgår at
  // overskrive gemte filtre med tom-state under SSR/initial-render.
  const [hydrated, setHydrated] = useState(false)

  // ── Hydrér + migrér én gang per (userId) ────────────────────────────────────
  useEffect(() => {
    if (!userId) {
      setHydrated(true)
      return
    }
    const userKey = KEY_PREFIX + userId

    // Prøv ny user-namespaced key først.
    let raw = readRaw(userKey)

    // Fallback: prøv gammel global key. Hvis hit → migrér til ny key + slet
    // gammel. Migration kører kun én gang fordi gammel key bliver fjernet
    // bagefter (næste mount finder kun ny key).
    if (!raw) {
      const legacy = readRaw(LEGACY_KEY)
      if (legacy) {
        raw = legacy
        writeRaw(userKey, legacy)
        removeRaw(LEGACY_KEY)
      }
    }

    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (typeof parsed?.q === 'string') setQ(parsed.q)
        if (WEIGHTS_ALLOW.has(parsed?.weight)) setFilterWeight(parsed.weight)
        if (STATUSES_ALLOW.has(parsed?.status)) setFilterStatus(parsed.status)
        if (typeof parsed?.fiber === 'string') setFilterFiber(parsed.fiber)
      } catch {
        // korrupt JSON → bare fortsæt med tom state
      }
    }
    setHydrated(true)
  }, [userId])

  // ── Persistér når filtre ændres (efter hydrering) ──────────────────────────
  useEffect(() => {
    if (!hydrated || !userId) return
    writeRaw(
      KEY_PREFIX + userId,
      JSON.stringify({ q, weight: filterWeight, status: filterStatus, fiber: filterFiber }),
    )
  }, [hydrated, userId, q, filterWeight, filterStatus, filterFiber])

  return {
    q,
    setQ,
    filterWeight,
    setFilterWeight,
    filterStatus,
    setFilterStatus,
    filterFiber,
    setFilterFiber,
    hydrated,
  }
}
