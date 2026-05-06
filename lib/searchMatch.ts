/**
 * Søge-matching der ignorerer diakritiske tegn (é, í, á, ý...) og nordiske
 * specialtegn (æ, ø, å, þ, ð), samt tillader små stavefejl via Levenshtein-distance
 * på ord-niveau. Det betyder fx:
 *   - "Lettlopi"   matcher "Léttlopi"
 *   - "Alafosslop" matcher "Álafosslopi"  (typo + diakritisk)
 *   - "Istex"      matcher "Ístex"
 *   - "hor"        matcher "hør"
 *   - "okologisk"  matcher "oekologisk_bomuld"  (via Levenshtein på ord-niveau)
 */

// Unicode-blok "Combining Diacritical Marks" (U+0300–U+036F) — fjernes efter NFD-decomposering.
const DIACRITIC_RANGE = /[̀-ͯ]/g

export function normalizeForSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(DIACRITIC_RANGE, '')          // fjern kombinerings-diakritika (é→e, í→i, ý→y)
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/å/g, 'a')
    .replace(/þ/g, 'th')
    .replace(/ð/g, 'd')
    .replace(/_/g, ' ')                    // light_fingering → "light fingering"
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Hvor mange tegn-ændringer (insert/delete/substitute) tillades for et ord af denne længde?
 * Korte ord får ingen tolerance — ellers giver "uld" alt for mange falske matches.
 */
function maxEditDistance(wordLen: number): number {
  if (wordLen <= 3) return 0
  if (wordLen <= 6) return 1
  return 2
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  // To-rækket DP — sparer plads, ingen forskel i resultat.
  let prev = new Array(b.length + 1).fill(0)
  let curr = new Array(b.length + 1).fill(0)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    ;[prev, curr] = [curr, prev]
  }
  return prev[b.length]
}

/**
 * Returnerer true hvis hver query-ord matches af et haystack-ord — enten via substring
 * (hurtig sti) eller via Levenshtein-distance under tærsklen for ordlængden.
 */
export function matchesQuery(normalizedQuery: string, normalizedHay: string): boolean {
  if (!normalizedQuery) return true
  // Hurtig sti: hele query-strengen er substring af hay
  if (normalizedHay.includes(normalizedQuery)) return true

  const queryWords = normalizedQuery.split(' ').filter(Boolean)
  const hayWords = normalizedHay.split(' ').filter(Boolean)
  if (queryWords.length === 0) return true
  if (hayWords.length === 0) return false

  return queryWords.every((qw) => {
    const maxEdit = maxEditDistance(qw.length)
    return hayWords.some((hw) => {
      if (hw.includes(qw)) return true
      if (maxEdit === 0) return false
      // Begræns Levenshtein-tjek til ord der er nogenlunde lige lange — ellers spilder vi tid
      if (Math.abs(hw.length - qw.length) > maxEdit) return false
      return levenshtein(qw, hw) <= maxEdit
    })
  })
}
