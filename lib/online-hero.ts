// Procedural farve-hero til online forhandler-kort.
// Sluggen hashes til en kurateret STRIQ-palette så hver webshop får en
// deterministisk men varieret farveblok øverst på kortet — uden DB-felt.

const PALETTE = [
  { bg: '#9B6272', fg: '#FFFCF7' }, // mauve
  { bg: '#61846D', fg: '#FFFCF7' }, // sage
  { bg: '#A8C8D8', fg: '#302218' }, // dueblå
  { bg: '#D9BFC3', fg: '#302218' }, // rosa
  { bg: '#C5A572', fg: '#302218' }, // ocher
] as const

export type HeroColor = { bg: string; fg: string }

// FNV-1a 32-bit hash — lille, deterministisk, ingen krypto-krav.
function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h >>> 0
}

export function heroForSlug(slug: string): HeroColor {
  if (!slug) return PALETTE[0]
  const idx = fnv1a(slug) % PALETTE.length
  return PALETTE[idx]
}

export const HERO_PALETTE_SIZE = PALETTE.length
