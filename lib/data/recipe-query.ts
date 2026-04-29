// Smart query-parser: trækker strukturerede ledetråde ud af fri tekst-søgning,
// så bruger kan skrive "sommerbluse i alpaka på pind 3-4" og få det ønskede.
//
// Lige nu udtrækker vi kun pind-størrelser. Andre felter (fiber, garment_type, sæson)
// matches via cross-field hay i filterRecipes — så de kan gemmes i tekst-søgningen.

export type ParsedSearchQuery = {
  /** Ren tekst-del der er tilbage efter struktur er udtrukket. */
  remainingQuery: string
  /** Inferreret needle-filter fra patterns som "pind 3", "pind 3-4", "str 4", "4 mm". */
  inferredNeedle: string[]
}

// Match: "pind 3", "pind 3-4", "str 3,5", "pind 3.5", "3 mm", "3,5mm".
// Tillader både "." og "," som decimal-separator (DROPS bruger komma).
// Range-marker er "-" (med eller uden mellemrum: "3-4" eller "3 - 4").
const PATTERNS: RegExp[] = [
  /\b(?:pind|str|størrelse|stoerrelse)\s*(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\b/gi,
  /\b(?:pind|str|størrelse|stoerrelse)\s*(\d+(?:[.,]\d+)?)\b/gi,
  /\b(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*mm\b/gi,
  /\b(\d+(?:[.,]\d+)?)\s*mm\b/gi,
]

function toCanonical(numStr: string): string {
  // 4.5 → '4,5' ; 4 → '4' ; ',5' → null (skip)
  const n = parseFloat(numStr.replace(',', '.'))
  if (!Number.isFinite(n)) return ''
  return n % 1 === 0 ? `${n}` : `${n}`.replace('.', ',')
}

function expandRange(startStr: string, endStr: string): string[] {
  const start = parseFloat(startStr.replace(',', '.'))
  const end = parseFloat(endStr.replace(',', '.'))
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return []
  const out: string[] = []
  // DROPS-konvention: halve trin (3, 3,5, 4, 4,5, 5, 5,5, 6, 7, 8 — store sprung over 6)
  for (let v = start; v <= end + 0.001; v += 0.5) {
    const rounded = Math.round(v * 2) / 2
    out.push(rounded % 1 === 0 ? `${rounded}` : `${rounded}`.replace('.', ','))
  }
  return out
}

/**
 * Parse en søgestreng og udtræk strukturerede filter-ledetråde.
 *
 * Eksempler:
 *   "sommerbluse i alpaka på pind 3-4"
 *     → { remainingQuery: "sommerbluse i alpaka", inferredNeedle: ['3', '3,5', '4'] }
 *
 *   "kabel sweater str 4,5"
 *     → { remainingQuery: "kabel sweater", inferredNeedle: ['4,5'] }
 *
 *   "lemon"
 *     → { remainingQuery: "lemon", inferredNeedle: [] }
 *
 *   "5 mm cardigan"
 *     → { remainingQuery: "cardigan", inferredNeedle: ['5'] }
 */
export function parseSearchQuery(q: string): ParsedSearchQuery {
  if (!q || typeof q !== 'string') {
    return { remainingQuery: '', inferredNeedle: [] }
  }

  let remaining = q
  const allNeedles: string[] = []

  for (const pat of PATTERNS) {
    // Reset regex state for global match
    pat.lastIndex = 0
    const matches = [...remaining.matchAll(pat)]
    for (const m of matches) {
      if (m.length === 3) {
        // range pattern (X-Y)
        allNeedles.push(...expandRange(m[1], m[2]))
      } else if (m.length === 2) {
        const c = toCanonical(m[1])
        if (c) allNeedles.push(c)
      }
      remaining = remaining.replace(m[0], ' ')
    }
  }

  // Dedup + bevarel sortering numerisk
  const unique = [...new Set(allNeedles)].sort((a, b) => {
    const na = parseFloat(a.replace(',', '.'))
    const nb = parseFloat(b.replace(',', '.'))
    return na - nb
  })

  return {
    remainingQuery: remaining.replace(/\s+/g, ' ').trim(),
    inferredNeedle: unique,
  }
}
