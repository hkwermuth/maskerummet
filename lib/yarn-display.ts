// Display-helpers til garn-kortene på Mit Garnlager (F4).
// - dedupeYarnNameFromBrand: fjerner duplikeret mærke fra navn ("Permin Bella (by Permin)" → "Bella")
// - gradientFromHexColors: bygger CSS-baggrund (solid eller linear-gradient) fra 0-5 hex
// - primaryFiberLabel: første fiber-token før komma ("80% Uld, 20% Mohair" → "Uld")

const FALLBACK_BG = '#D0C8BA'

/**
 * Fjerner mærket fra garnnavn hvis det optræder som præfiks, suffiks eller "(by X)".
 * Case-insensitive. Trimmer whitespace og overflødige separator-tegn.
 *
 * Eksempler:
 *  "Permin Bella (by Permin)" + "Permin"  → "Bella"
 *  "BC Garn Luxor"            + "BC Garn" → "Luxor"
 *  "Bella"                    + "Permin"  → "Bella"  (no-op)
 *  "Permin's Pure Wool"       + "Permin"  → "'s Pure Wool" (apostrof bevares)
 */
export function dedupeYarnNameFromBrand(name: string | null | undefined, brand: string | null | undefined): string {
  const n = (name ?? '').trim()
  const b = (brand ?? '').trim()
  if (!n) return ''
  if (!b) return n

  let result = n

  // 1) Fjern "(by Brand)"-suffiks (case-insensitive)
  const byPattern = new RegExp(`\\s*\\(\\s*by\\s+${escapeRegex(b)}\\s*\\)\\s*$`, 'i')
  result = result.replace(byPattern, '').trim()

  // 2) Fjern brand som præfiks (med ordgrænse — ikke midt i et ord)
  const prefixPattern = new RegExp(`^${escapeRegex(b)}\\b\\s*`, 'i')
  result = result.replace(prefixPattern, '').trim()

  // 3) Fjern brand som suffiks
  const suffixPattern = new RegExp(`\\s+${escapeRegex(b)}\\s*$`, 'i')
  result = result.replace(suffixPattern, '').trim()

  // Hvis vi har spist hele navnet, fald tilbage på det oprindelige (undgå tomme kort).
  if (!result) return n
  return result
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Bygger en visnings-label for et garn ud fra brand + name, uden duplikering.
 * Bruges på Fællesskabets delte projekt-kort hvor data ofte har brand-navnet
 * gentaget i name-feltet ("Drops Drops Air", "Filcolana Filcolana Tilia")
 * eller har et "(X by Brand)"-suffix.
 *
 * Eksempler:
 *  ("Drops",     "Drops Air")                                  → "Drops Air"
 *  ("Filcolana", "Filcolana Tilia")                             → "Filcolana Tilia"
 *  ("Permin",    "Permin Bella Color (Bella Color by Permin)") → "Bella Color by Permin"
 *  ("Permin",    "Permin Bella (by Permin)")                   → "Permin Bella"
 *  ("Permin",    "Bella")                                       → "Permin Bella"
 *  (null,        "Air")                                         → "Air"
 *  ("Drops",     null)                                          → "Drops"
 */
export function yarnDisplayLabel(brand: string | null | undefined, name: string | null | undefined): string {
  const b = (brand ?? '').trim()
  const n = (name ?? '').trim()
  if (!n) return b
  if (!b) return n

  // Specialtilfælde: name ender med "(... by Brand)" og parens-indholdet har en
  // meningsfuld forelement → brug parens-indholdet som visnings-navn.
  const parensMatch = n.match(/\(([^()]+)\)\s*$/)
  if (parensMatch) {
    const inside = parensMatch[1].trim()
    const byPattern = new RegExp(`^(.+?)\\s+by\\s+${escapeRegex(b)}\\s*$`, 'i')
    if (byPattern.test(inside)) return inside
  }

  const deduped = dedupeYarnNameFromBrand(n, b)
  // Hvis det dedupede navn allerede starter med brand som ord, returner det som er.
  // Ellers præfiks brand så vi får "Brand Navn".
  if (new RegExp(`^${escapeRegex(b)}\\b`, 'i').test(deduped)) return deduped
  return `${b} ${deduped}`
}

/**
 * Bygger CSS-baggrund fra et array af hex-farver.
 * - 0 farver eller ugyldig: fallback (eller given fallbackHex)
 * - 1 farve: solid
 * - 2+ farver: linear-gradient(45deg, …)
 *
 * Filtrerer ugyldige hex-værdier fra inden render.
 */
export function gradientFromHexColors(
  hexColors: ReadonlyArray<string> | null | undefined,
  fallbackHex?: string | null,
): string {
  const valid = (hexColors ?? []).filter(isValidHex)
  if (valid.length === 0) {
    const fb = (fallbackHex ?? '').trim()
    return isValidHex(fb) ? fb : FALLBACK_BG
  }
  if (valid.length === 1) return valid[0]
  return `linear-gradient(45deg, ${valid.join(', ')})`
}

function isValidHex(s: string | null | undefined): boolean {
  if (!s) return false
  return /^#[0-9A-Fa-f]{6}$/.test(s.trim())
}

/**
 * Returnerer den primære fiber (første token før komma).
 * "80% Uld, 20% Mohair" → "Uld"
 * "Mohair" → "Mohair"
 * "" / null → ""
 */
export function primaryFiberLabel(fiber: string | null | undefined): string {
  const s = (fiber ?? '').trim()
  if (!s) return ''
  const firstPart = s.split(',')[0].trim()
  // Fjern procent-tal foran ord ("80% Uld" → "Uld")
  const withoutPct = firstPart.replace(/^\s*\d+\s*%\s*/, '').trim()
  return withoutPct || firstPart
}
