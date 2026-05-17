import { describe, it, expect } from 'vitest'
import { heroForSlug, HERO_PALETTE_SIZE } from '@/lib/online-hero'

// ---------------------------------------------------------------------------
// Kendte palette-værdier fra implementationen (bg + fg par).
// Bruges til at verificere at returværdi er en gyldig palette-entry.
// ---------------------------------------------------------------------------
const KNOWN_BG_VALUES = ['#9B6272', '#61846D', '#A8C8D8', '#D9BFC3', '#C5A572']
const KNOWN_FG_VALUES = ['#FFFCF7', '#302218']

// ---------------------------------------------------------------------------
// AC1: Deterministisk — samme slug giver altid samme farver
// ---------------------------------------------------------------------------

describe('AC1 heroForSlug er deterministisk', () => {
  it('drops → samme bg+fg ved gentagne kald', () => {
    const first = heroForSlug('drops')
    const second = heroForSlug('drops')
    const third = heroForSlug('drops')
    expect(first).toEqual(second)
    expect(second).toEqual(third)
  })

  it('citystoffer → stabil returnering over 5 kald', () => {
    const results = Array.from({ length: 5 }, () => heroForSlug('citystoffer'))
    const first = results[0]
    for (const r of results) {
      expect(r).toEqual(first)
    }
  })

  it('long-slug er deterministisk', () => {
    const slug = 'en-meget-lang-slug-der-indeholder-mange-tegn-og-tal-12345'
    expect(heroForSlug(slug)).toEqual(heroForSlug(slug))
  })
})

// ---------------------------------------------------------------------------
// AC2: Forskellige slugs giver ikke alle samme palette-entry
// ---------------------------------------------------------------------------

describe('AC2 forskellige slugs giver varierede farver', () => {
  it('mindst 2 forskellige bg-værdier ud af 4 slugs', () => {
    const slugs = ['drops', 'permin', 'isager', 'filcolana']
    const bgValues = slugs.map(s => heroForSlug(s).bg)
    const uniqueBgs = new Set(bgValues)
    // Med 5 palette-entries og FNV-hash fordeling forventer vi > 1 unik bg
    expect(uniqueBgs.size).toBeGreaterThan(1)
  })

  it.each([
    ['drops', 'isager'],
    ['permin', 'novita'],
    ['drops', 'garnkollektivet'],
    ['isager', 'hobbii'],
  ])('%s og %s har ikke begge samme bg (sandsynlighedstest over paletten)', (a, b) => {
    const heroA = heroForSlug(a)
    const heroB = heroForSlug(b)
    // Vi verificerer at de IKKE er identiske — implementationsdetalje:
    // FNV-hash for disse par er testet manuel at give forskellige indeks.
    // Hvis denne test fejler ved fremtidig palette-ændring: re-verificer parrene.
    expect(heroA).not.toEqual(heroB)
  })
})

// ---------------------------------------------------------------------------
// AC3: Tom slug returnerer gyldig palette-værdi (ingen crash)
// ---------------------------------------------------------------------------

describe('AC3 tom slug håndteres uden crash', () => {
  it('tom streng returnerer et HeroColor-objekt', () => {
    expect(() => heroForSlug('')).not.toThrow()
    const result = heroForSlug('')
    expect(result).toBeDefined()
    expect(typeof result.bg).toBe('string')
    expect(typeof result.fg).toBe('string')
  })

  it('tom slug giver første palette-entry (PALETTE[0])', () => {
    const result = heroForSlug('')
    // Implementationen: if (!slug) return PALETTE[0]
    expect(result.bg).toBe('#9B6272')
    expect(result.fg).toBe('#FFFCF7')
  })
})

// ---------------------------------------------------------------------------
// AC4: Returneret bg + fg er kendte palette-værdier
// ---------------------------------------------------------------------------

describe('AC4 returneret bg+fg matcher paletten', () => {
  const testSlugs = [
    'drops', 'permin', 'isager', 'filcolana', 'citystoffer',
    'strikkeladen', 'garnkollektivet', 'hobbii', 'novita', '',
  ]

  it.each(testSlugs)('heroForSlug("%s").bg er i den kendte palette', (slug) => {
    const { bg } = heroForSlug(slug)
    expect(KNOWN_BG_VALUES).toContain(bg)
  })

  it.each(testSlugs)('heroForSlug("%s").fg er en gyldig forgrunds-farve', (slug) => {
    const { fg } = heroForSlug(slug)
    expect(KNOWN_FG_VALUES).toContain(fg)
  })

  it('HERO_PALETTE_SIZE matcher antal kendte bg-værdier', () => {
    expect(HERO_PALETTE_SIZE).toBe(KNOWN_BG_VALUES.length)
  })

  it('returneret index er inden for palette-rækkevidden', () => {
    // Verificer at FNV-hash % PALETTE.length aldrig giver out-of-bounds
    for (const slug of testSlugs) {
      const { bg } = heroForSlug(slug)
      const idx = KNOWN_BG_VALUES.indexOf(bg)
      expect(idx).toBeGreaterThanOrEqual(0)
      expect(idx).toBeLessThan(HERO_PALETTE_SIZE)
    }
  })
})
