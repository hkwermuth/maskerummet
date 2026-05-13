/**
 * Pure form-helpers brugt af projekt-modaler (DetailModal + NytProjektModal i Arkiv.jsx).
 * Ingen React-hooks. Bruges fra handlers (save, setLine, etc.), ikke fra render.
 */

const IMAGES_BUCKET = 'yarn-images'
const PATTERNS_BUCKET = 'patterns'
const KNOWN_BUCKETS: readonly string[] = [IMAGES_BUCKET, PATTERNS_BUCKET]

export function safeExt(name: string | null | undefined, fallback = 'bin'): string {
  const m = (name || '').match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : fallback
}

export function makeImagePath(userId: string, projectId: string): (ext: string) => string {
  // Stabile UUID-baserede paths så reorder ikke kræver rename i Storage.
  const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return (ext: string) => `${userId}/projects/${projectId}/${uuid}.${ext}`
}

export interface YarnLineIdentity {
  yarnItemId?: string | null
  catalogColorId?: string | null
  yarnBrand?: string | null
  colorName?: string | null
  colorCode?: string | null
  yarnName?: string | null
  quantityUsed?: number | string | null
}

// Find evt. eksisterende linje i samme projekt der matcher det nye garn
// (samme yarn_item_id, eller samme catalog_color_id, eller samme
// brand+colorName+colorCode case-insensitive). Bruges til dup-merge-prompt
// når brugeren tilføjer et garn der allerede findes på projektet.
export function findDuplicateLineIndex<T extends YarnLineIdentity>(
  lines: T[],
  current: T,
  currentIdx: number,
): number {
  const norm = (s: unknown): string => (s ?? '').toString().trim().toLowerCase()
  if (current.yarnItemId) {
    const idx = lines.findIndex((l, i) => i !== currentIdx && l.yarnItemId === current.yarnItemId)
    if (idx !== -1) return idx
  }
  if (current.catalogColorId) {
    const idx = lines.findIndex((l, i) => i !== currentIdx && l.catalogColorId === current.catalogColorId)
    if (idx !== -1) return idx
  }
  if (current.yarnBrand && current.colorName && current.colorCode) {
    const idx = lines.findIndex((l, i) =>
      i !== currentIdx &&
      norm(l.yarnBrand) === norm(current.yarnBrand) &&
      norm(l.colorName) === norm(current.colorName) &&
      norm(l.colorCode) === norm(current.colorCode),
    )
    if (idx !== -1) return idx
  }
  return -1
}

// True hvis patch indeholder mindst ét felt der ændrer linjens identitet —
// dvs. det er først nu vi skal trigger dup-detection.
export function patchTouchesIdentity(patch: Partial<YarnLineIdentity>): boolean {
  return (
    'yarnItemId'     in patch ||
    'catalogColorId' in patch ||
    'yarnBrand'      in patch ||
    'colorName'      in patch ||
    'colorCode'      in patch
  )
}

// Vi gemmer URL'er i DB; storage.remove kræver path. Vi parser path ud af
// signed/public URL'er ved at finde "/<bucket>/" og tage resten frem til "?".
export function pathFromUrl(
  url: string | null | undefined,
  buckets: readonly string[] = KNOWN_BUCKETS,
): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    // Format: .../object/{public|sign}/<bucket>/<path...>
    const idx = parts.findIndex(p => buckets.includes(p))
    if (idx === -1) return null
    return parts.slice(idx + 1).join('/')
  } catch {
    return null
  }
}

// Merge yarn-lines med samme identitet ved at spørge brugeren én gang per
// duplikat-par. Bevarer linjen med lavere index (UI-rækkefølge) og lægger
// quantity sammen. Skip prompt hvis ÉN af linjerne har qty=0 (tom). Hvis
// brugeren siger nej, tilføjes identiteten til en `declined`-set så samme
// par ikke spørges igen.
//
// Returnerer merged-array hvis mindst én bekræftelse skete; ellers returneres
// det oprindelige array uændret. Cancels på efterfølgende dup-par bevarer
// tidligere bekræftede merges (bevidst — bruger sagde ja én gang).
export function mergeDuplicateLines<T extends YarnLineIdentity>(lines: T[]): T[] {
  if (typeof window === 'undefined') return lines
  let merged = [...lines]
  let mergeCount = 0
  const declined = new Set<string>()
  function identityKey(l: YarnLineIdentity): string {
    if (l.yarnItemId)     return `id:${l.yarnItemId}`
    if (l.catalogColorId) return `cat:${l.catalogColorId}`
    const norm = (s: unknown): string => (s ?? '').toString().trim().toLowerCase()
    return `bnc:${norm(l.yarnBrand)}|${norm(l.colorName)}|${norm(l.colorCode)}`
  }
  for (let i = 0; i < merged.length; i++) {
    const dupIdx = findDuplicateLineIndex(merged, merged[i], i)
    if (dupIdx === -1) continue
    // Behold altid linjen med LAVERE index, fjern den med højere — så prompten
    // viser ngl i samme rækkefølge som linjerne i UI'et (først → anden).
    const keepIdx   = Math.min(i, dupIdx)
    const removeIdx = Math.max(i, dupIdx)
    const a = merged[keepIdx]
    const b = merged[removeIdx]
    const aQty = Number(a.quantityUsed ?? 0) || 0
    const bQty = Number(b.quantityUsed ?? 0) || 0
    // Skip prompt hvis ÉN af linjerne er tom (qty=0).
    if (aQty === 0 || bQty === 0) continue
    const key = identityKey(a)
    if (declined.has(key)) continue
    const label = [a.yarnBrand, a.yarnName].filter(Boolean).join(' · ') || 'samme garn'
    const sum = aQty + bQty
    const ok = window.confirm(
      `Du har ${label} på 2 linjer (${aQty} ngl + ${bQty} ngl). Læg sammen til én linje med ${sum} ngl?`,
    )
    if (ok) {
      merged = merged
        .map((l, idx) => idx === keepIdx ? { ...l, quantityUsed: sum } : l)
        .filter((_, idx) => idx !== removeIdx)
      mergeCount++
      i = -1
    } else {
      declined.add(key)
    }
  }
  return mergeCount > 0 ? merged : lines
}
