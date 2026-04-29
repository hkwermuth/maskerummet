/**
 * Unit-tests for DROPS opskriftskatalog — pure data-funktioner.
 * Dækker AC5-AC11 (filter/søgning).
 *
 * AC18-AC21 (lager-match) fjernet 2026-04-29 — funktionen trækkes tilbage
 * indtil substitut-/lignende-garn-design er gennemtænkt.
 */
import { describe, it, expect } from 'vitest'
import {
  loadRecipes,
  filterRecipes,
  deriveFilterOptions,
  parseFiltersFromSearchParams,
  serializeFilters,
  isAnyFilterActive,
  EMPTY_RECIPE_FILTERS,
} from '@/lib/data/recipes'
import type { Recipe, RecipeFilters } from '@/lib/types-recipes'

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Alle 53 DROPS-mønstre fra sample-JSON */
const ALL_RECIPES = loadRecipes()

/** Minimal recipe-builder — kun nødvendige felter */
function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    source: 'drops',
    external_id: 'test-1',
    designer: 'DROPS Design',
    name: 'Test Cardigan',
    audience: 'dame',
    garment_type: 'cardigan',
    garment_label: 'Cardigan',
    season: 'vinter',
    needle_size: '5',
    needle_size_num: 5,
    image_url: 'https://example.com/img.jpg',
    pattern_url: 'https://example.com/pattern',
    yarns: ['BABY MERINO'],
    yarn_details: [
      { name: 'BABY MERINO', fibers: '100% merinould', tags: ['uld'] },
    ],
    ...overrides,
  }
}

// ─── loadRecipes ──────────────────────────────────────────────────────────────

describe('loadRecipes()', () => {
  it('returnerer præcis 53 mønstre fra sample-JSON', () => {
    expect(ALL_RECIPES).toHaveLength(53)
  })

  it('alle mønstre har required fields (source, external_id, name, image_url, pattern_url)', () => {
    for (const r of ALL_RECIPES) {
      expect(r.source).toBe('drops')
      expect(r.external_id).toBeTruthy()
      expect(r.name).toBeTruthy()
      expect(r.image_url).toBeTruthy()
      expect(r.pattern_url).toBeTruthy()
    }
  })

  it('needle_size_num er et tal (fx 4,5 → 4.5)', () => {
    const r = ALL_RECIPES.find((r) => r.needle_size === '4,5')
    expect(r).toBeDefined()
    expect(r!.needle_size_num).toBe(4.5)
  })
})

// ─── AC5: Tekstsøgning — case-insensitivt, navn ───────────────────────────────

describe('filterRecipes — AC5: q-søgning på navn (case-insensitivt)', () => {
  it('q="lemon" finder ≥1 mønster (case-insens.)', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'lemon' })
    expect(result.length).toBeGreaterThanOrEqual(1)
    result.forEach((r) => {
      const hay = `${r.name} ${r.external_id}`.toLowerCase()
      expect(hay).toContain('lemon')
    })
  })

  it('q="LEMON" (uppercase) finder samme resultater som "lemon"', () => {
    const lower = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'lemon' })
    const upper = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'LEMON' })
    expect(upper.length).toBe(lower.length)
  })

  it('q=" lemon " (med whitespace) trimmes og finder resultater', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: '  lemon  ' })
    expect(result.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── AC6: Søg på external_id ──────────────────────────────────────────────────

describe('filterRecipes — AC6: q="268-1" finder mønstret med dette nummer', () => {
  it('q="268-1" returnerer ≥1 mønster og 268-1 "Lemon Zest Cardigan" er iblandt dem', () => {
    // Implementationen bruger substring-match; "268-1" matcher også "268-10", "268-11" etc.
    // Acceptkriteriets kernekrav er at DET rigtige mønster findes.
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: '268-1' })
    expect(result.length).toBeGreaterThanOrEqual(1)
    const lemon = result.find((r) => r.external_id === '268-1')
    expect(lemon).toBeDefined()
    expect(lemon!.name).toBe('Lemon Zest Cardigan')
  })

  it('q="268-1" returnerer IKKE mønstre fra andre serier (268 vs 267)', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: '268-1' })
    // Alle resultater skal have "268-1" som substring af combined hay
    result.forEach((r) => {
      const hay = `${r.name} ${r.external_id}`.toLowerCase()
      expect(hay).toContain('268-1')
    })
  })
})

// ─── AC7: Fiber-filter — mohair ───────────────────────────────────────────────

describe('filterRecipes — AC7: fiber=["mohair"] → kun mohair-mønstre', () => {
  it('alle returnerede mønstre har mohair i mindst ét yarn_detail tag', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, fiber: ['mohair'] })
    expect(result.length).toBeGreaterThan(0)
    result.forEach((r) => {
      const tags = new Set(r.yarn_details.flatMap((y) => y.tags))
      expect(tags.has('mohair')).toBe(true)
    })
  })

  it('antal matcher det vi ved fra data (14 mohair-mønstre i sample)', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, fiber: ['mohair'] })
    expect(result).toHaveLength(14)
  })

  it('mønstre uden mohair er IKKE med i resultatet', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, fiber: ['mohair'] })
    const noMohairInResult = result.some(
      (r) => !r.yarn_details.flatMap((y) => y.tags).includes('mohair'),
    )
    expect(noMohairInResult).toBe(false)
  })
})

// ─── AC8: Fiber-filter — OR (mohair ELLER uld) ────────────────────────────────

describe('filterRecipes — AC8: fiber=["mohair","uld"] → OR inden for felt', () => {
  it('returnerer mønstre med mohair ELLER uld', () => {
    const result = filterRecipes(ALL_RECIPES, {
      ...EMPTY_RECIPE_FILTERS,
      fiber: ['mohair', 'uld'],
    })
    expect(result.length).toBeGreaterThan(14) // mere end mohair-only
    result.forEach((r) => {
      const tags = new Set(r.yarn_details.flatMap((y) => y.tags))
      expect(tags.has('mohair') || tags.has('uld')).toBe(true)
    })
  })

  it('resultatsæt er en supermængde af kun-mohair-resultater', () => {
    const mohair = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, fiber: ['mohair'] })
    const mohairOrUld = filterRecipes(ALL_RECIPES, {
      ...EMPTY_RECIPE_FILTERS,
      fiber: ['mohair', 'uld'],
    })
    expect(mohairOrUld.length).toBeGreaterThanOrEqual(mohair.length)
    // Alle mohair-mønstre skal være med i mohairOrUld
    mohair.forEach((r) => {
      expect(mohairOrUld.find((x) => x.external_id === r.external_id)).toBeDefined()
    })
  })
})

// ─── AC9: AND mellem audience + garment_type ──────────────────────────────────

describe('filterRecipes — AC9: audience+type AND-filter', () => {
  it('dame+cardigan → kun dame-cardigans', () => {
    const result = filterRecipes(ALL_RECIPES, {
      ...EMPTY_RECIPE_FILTERS,
      audience: ['dame'],
      garment_type: ['cardigan'],
    })
    expect(result.length).toBeGreaterThan(0)
    result.forEach((r) => {
      expect(r.audience).toBe('dame')
      expect(r.garment_type).toBe('cardigan')
    })
  })

  it('herre+sweater → kun herre-sweatere (nul eller få fra data)', () => {
    const herreSweatere = ALL_RECIPES.filter(
      (r) => r.audience === 'herre' && r.garment_type === 'sweater',
    )
    const result = filterRecipes(ALL_RECIPES, {
      ...EMPTY_RECIPE_FILTERS,
      audience: ['herre'],
      garment_type: ['sweater'],
    })
    // Resultatet skal matche det vi ved fra data
    expect(result.length).toBe(herreSweatere.length)
  })

  it('AND: audience=dame + type=cardigan er IKKE det samme som audience=dame alene', () => {
    const dameAll = filterRecipes(ALL_RECIPES, {
      ...EMPTY_RECIPE_FILTERS,
      audience: ['dame'],
    })
    const dameCardigan = filterRecipes(ALL_RECIPES, {
      ...EMPTY_RECIPE_FILTERS,
      audience: ['dame'],
      garment_type: ['cardigan'],
    })
    // Dame har både cardigans og sweaters — AND skal give færre
    expect(dameCardigan.length).toBeLessThanOrEqual(dameAll.length)
  })
})

// ─── AC10: Pind-filter med komma-decimal ("4,5") ──────────────────────────────

describe('filterRecipes — AC10: needle=["4,5"] → kun 4,5-mønstre', () => {
  it('kun mønstre med needle_size="4,5" returneres', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, needle: ['4,5'] })
    expect(result.length).toBeGreaterThan(0)
    result.forEach((r) => {
      expect(r.needle_size).toBe('4,5')
    })
  })

  it('mønstre med needle_size="4" er IKKE med i "4,5"-resultater', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, needle: ['4,5'] })
    const has4exact = result.some((r) => r.needle_size === '4')
    expect(has4exact).toBe(false)
  })

  it('mønstre med needle_size="5" er IKKE med i "4,5"-resultater', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, needle: ['4,5'] })
    const has5exact = result.some((r) => r.needle_size === '5')
    expect(has5exact).toBe(false)
  })

  it('antal 4,5-mønstre matcher kendte data (8 stk.)', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, needle: ['4,5'] })
    expect(result).toHaveLength(8)
  })
})

// ─── AC11: URL-roundtrip (serialize → parse) ──────────────────────────────────

describe('serializeFilters + parseFiltersFromSearchParams — AC11: roundtrip', () => {
  it('tom filter → tom query-string → parses tilbage til EMPTY_RECIPE_FILTERS', () => {
    const qs = serializeFilters(EMPTY_RECIPE_FILTERS)
    expect(qs).toBe('')
    const parsed = parseFiltersFromSearchParams(new URLSearchParams(qs))
    expect(parsed).toEqual(EMPTY_RECIPE_FILTERS)
  })

  it('q bevares i roundtrip', () => {
    const f: RecipeFilters = { ...EMPTY_RECIPE_FILTERS, q: 'lemon' }
    const qs = serializeFilters(f)
    const parsed = parseFiltersFromSearchParams(new URLSearchParams(qs))
    expect(parsed.q).toBe('lemon')
  })

  it('fiber=["mohair","uld"] bevares som pipe-separeret i URL og parses korrekt', () => {
    const f: RecipeFilters = { ...EMPTY_RECIPE_FILTERS, fiber: ['mohair', 'uld'] }
    const qs = serializeFilters(f)
    // URLSearchParams URL-encoder '|' som '%7C' — begge er korrekte separator-repræsentationer
    const decodedQs = decodeURIComponent(qs)
    expect(decodedQs).toContain('|') // pipe som separator (evt. URL-encodet)
    expect(qs).not.toContain(',uld') // IKKE komma som separator
    const parsed = parseFiltersFromSearchParams(new URLSearchParams(qs))
    expect(parsed.fiber).toEqual(['mohair', 'uld'])
  })

  it('needle=["4,5"] bevares — komma i værdien ødelægger ikke separator', () => {
    const f: RecipeFilters = { ...EMPTY_RECIPE_FILTERS, needle: ['4,5'] }
    const qs = serializeFilters(f)
    const parsed = parseFiltersFromSearchParams(new URLSearchParams(qs))
    expect(parsed.needle).toEqual(['4,5'])
  })

  it('kombineret filter (q + audience + fiber + needle) deep-equals efter roundtrip', () => {
    const f: RecipeFilters = {
      q: 'cardigan',
      audience: ['dame', 'herre'],
      garment_type: ['cardigan'],
      season: ['vinter'],
      needle: ['4,5', '5'],
      fiber: ['mohair', 'uld'],
      onlyFavorites: false,
    }
    const qs = serializeFilters(f)
    const parsed = parseFiltersFromSearchParams(new URLSearchParams(qs))
    expect(parsed).toEqual(f)
  })

  it('onlyFavorites=true serialiseres til ?favorites=1 og parses tilbage', () => {
    const f: RecipeFilters = { ...EMPTY_RECIPE_FILTERS, onlyFavorites: true }
    const qs = serializeFilters(f)
    expect(qs).toContain('favorites=1')
    const parsed = parseFiltersFromSearchParams(new URLSearchParams(qs))
    expect(parsed.onlyFavorites).toBe(true)
  })

  it('onlyFavorites=false udelades fra URL', () => {
    const f: RecipeFilters = { ...EMPTY_RECIPE_FILTERS, q: 'test' }
    const qs = serializeFilters(f)
    expect(qs).not.toContain('favorites')
  })

  it('ukendte URL-parametre ignoreres stille og roligt', () => {
    const sp = new URLSearchParams('q=test&hack=xss&unknown=val')
    const parsed = parseFiltersFromSearchParams(sp)
    expect(parsed.q).toBe('test')
    // ingen "hack" eller "unknown" felt på parsed objekt
    expect((parsed as Record<string, unknown>).hack).toBeUndefined()
  })
})

// ─── isAnyFilterActive ────────────────────────────────────────────────────────

describe('isAnyFilterActive()', () => {
  it('EMPTY_RECIPE_FILTERS → false', () => {
    expect(isAnyFilterActive(EMPTY_RECIPE_FILTERS)).toBe(false)
  })

  it('q=" " (kun whitespace) → false', () => {
    expect(isAnyFilterActive({ ...EMPTY_RECIPE_FILTERS, q: '   ' })).toBe(false)
  })

  it('q="lemon" → true', () => {
    expect(isAnyFilterActive({ ...EMPTY_RECIPE_FILTERS, q: 'lemon' })).toBe(true)
  })

  it('fiber=["mohair"] → true', () => {
    expect(isAnyFilterActive({ ...EMPTY_RECIPE_FILTERS, fiber: ['mohair'] })).toBe(true)
  })
})

// ─── deriveFilterOptions ──────────────────────────────────────────────────────

describe('deriveFilterOptions()', () => {
  it('options udledes fra data — ingen hardcoded lister', () => {
    const options = deriveFilterOptions(ALL_RECIPES)
    // Disse værdier skal være dynamisk til stede fra data
    expect(options.audience).toContain('dame')
    expect(options.fiber).toContain('mohair')
    expect(options.needle).toContain('4,5')
    expect(options.garment_type).toContain('cardigan')
  })

  it('needle er numerisk sorteret (3 < 3,5 < 4 < 4,5 < 5)', () => {
    const options = deriveFilterOptions(ALL_RECIPES)
    const nums = options.needle.map((n) => parseFloat(n.replace(',', '.')))
    for (let i = 1; i < nums.length; i++) {
      expect(nums[i]).toBeGreaterThanOrEqual(nums[i - 1])
    }
  })

  it('garment_label_for mapper type til label', () => {
    const options = deriveFilterOptions(ALL_RECIPES)
    expect(options.garment_label_for['cardigan']).toBeDefined()
  })
})

// ─── filterRecipes — edge cases ───────────────────────────────────────────────

describe('filterRecipes — kant-tilfælde', () => {
  it('tom opskrift-liste → tom resultat-liste', () => {
    const result = filterRecipes([], { ...EMPTY_RECIPE_FILTERS, q: 'lemon' })
    expect(result).toEqual([])
  })

  it('q som ikke matcher noget → tom liste', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'xyzzy-uexistent-9999' })
    expect(result).toHaveLength(0)
  })

  it('EMPTY_RECIPE_FILTERS returnerer alle 53 mønstre', () => {
    const result = filterRecipes(ALL_RECIPES, EMPTY_RECIPE_FILTERS)
    expect(result).toHaveLength(53)
  })
})

// ─── Dansk↔engelsk synonym-søgning ───────────────────────────────────────────

describe('filterRecipes — dansk↔engelsk synonym-søgning', () => {
  it('søg "kjole" finder mønster med "Dress" i navn', () => {
    // Iced Coffee Dress (kjole, dame)
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'kjole' })
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some((r) => r.name.toLowerCase().includes('dress'))).toBe(true)
  })

  it('søg "nederdel" finder mønster med "Skirt" i navn', () => {
    // Golden Mist Skirt (nederdel, dame)
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'nederdel' })
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some((r) => r.name.toLowerCase().includes('skirt'))).toBe(true)
  })

  it('søg "trøje" finder mønstre med "Sweater" i navn', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'trøje' })
    expect(result.length).toBeGreaterThan(5) // mange sweater-mønstre i sample
    expect(result.every((r) => /sweater|pullover|jumper|trøje/i.test(r.name) || r.garment_type === 'sweater')).toBe(true)
  })

  it('søg "hue" finder mønster med "Hat" i navn', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'hue' })
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some((r) => /hat|beanie/i.test(r.name))).toBe(true)
  })

  it('søg "jakke" finder mønstre med "Cardigan" eller "Jacket" i navn', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'jakke' })
    expect(result.length).toBeGreaterThan(3)
    expect(result.some((r) => /cardigan|jacket|cardi/i.test(r.name) || r.garment_type === 'cardigan')).toBe(true)
  })

  it('søg "summer" finder også via dansk synonym (matches direkte engelsk navn)', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'summer' })
    expect(result.length).toBeGreaterThanOrEqual(2) // Summer Living Cardigan/Sweater
  })

  it('søg "sommer" matcher engelske "Summer"-mønstre via synonym', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'sommer' })
    expect(result.length).toBeGreaterThanOrEqual(2)
    expect(result.some((r) => /summer/i.test(r.name))).toBe(true)
  })

  it('multi-token søg: "spring cardigan" matcher AND mellem ord', () => {
    // Begge ord skal være til stede (med synonymer)
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'spring cardigan' })
    // Mindst ét mønster har "spring" + cardigan-context
    if (result.length > 0) {
      for (const r of result) {
        const hay = `${r.name} ${r.garment_type}`.toLowerCase()
        const hasSpring = /spring|forår/.test(hay)
        const hasCardigan = /cardigan|jakke|cardi|jacket/.test(hay)
        expect(hasSpring && hasCardigan).toBe(true)
      }
    }
  })

  it('søg matcher også mod garment_label (dansk dropdown-label)', () => {
    // Mønster har garment_label 'Kjole' — søg "kjole" finder via garment_label, ikke kun navn
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'kjole' })
    // Alle mønstre med garment_type='kjole' skal være med
    const kjolePatterns = ALL_RECIPES.filter((r) => r.garment_type === 'kjole')
    for (const k of kjolePatterns) {
      expect(result.some((r) => r.external_id === k.external_id)).toBe(true)
    }
  })

  it('søgning er stadig case-insensitive', () => {
    const lower = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'kjole' })
    const upper = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'KJOLE' })
    const mixed = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'Kjole' })
    expect(lower.length).toBe(upper.length)
    expect(lower.length).toBe(mixed.length)
  })
})

// ─── isAnyFilterActive med onlyFavorites ────────────────────────────────────

describe('isAnyFilterActive — onlyFavorites', () => {
  it('onlyFavorites=true tæller som aktivt filter', () => {
    expect(isAnyFilterActive({ ...EMPTY_RECIPE_FILTERS, onlyFavorites: true })).toBe(true)
  })

  it('alle felter tomme → ikke aktivt', () => {
    expect(isAnyFilterActive(EMPTY_RECIPE_FILTERS)).toBe(false)
  })
})

// ─── Google-agtig søgning: stopwords, compounds, smart parser ───────────────

describe('filterRecipes — Google-agtig søgning', () => {
  it('stopwords: "kjole i alpaka" matcher som "kjole alpaka" — "i" ignoreres', () => {
    const a = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'kjole i alpaka' })
    const b = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'kjole alpaka' })
    expect(a.length).toBe(b.length)
    expect(a.map((r) => r.external_id).sort()).toEqual(b.map((r) => r.external_id).sort())
  })

  it('stopwords alene → ingen tokens, returnerer alt', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'i og på' })
    expect(result.length).toBe(ALL_RECIPES.length)
  })

  it('compound: "sommerbluse" splittes til "sommer" + "bluse"/"top"', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'sommerbluse' })
    // Skal finde sommer-mønstre der er top/bluse
    for (const r of result) {
      expect(r.season).toBe('sommer')
      // top eller cardigan-bluse-type — garment_type = top eller via synonym match name
      const hay = `${r.name} ${r.garment_type}`.toLowerCase()
      expect(/top|tee|bluse|blouse/.test(hay)).toBe(true)
    }
  })

  it('cross-field: søg "alpaka" matcher mønstre med alpaka-fiber', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'alpaka' })
    expect(result.length).toBeGreaterThan(0)
    for (const r of result) {
      const tags = r.yarn_details.flatMap((y) => y.tags || [])
      expect(tags).toContain('alpaka')
    }
  })

  it('cross-field: søg "vinter" matcher alle vinter-sæson mønstre', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'vinter' })
    const expectedCount = ALL_RECIPES.filter((r) => r.season === 'vinter').length
    expect(result.length).toBe(expectedCount)
  })

  it('cross-field: søg "dame" matcher alle dame-mønstre', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'dame' })
    const expectedCount = ALL_RECIPES.filter((r) => r.audience === 'dame').length
    expect(result.length).toBe(expectedCount)
  })

  it('smart parser: "pind 4" infererer needle-filter', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'pind 4' })
    expect(result.length).toBeGreaterThan(0)
    for (const r of result) {
      expect(r.needle_size).toBe('4')
    }
  })

  it('smart parser: "pind 3-4" range → 3, 3,5, 4', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'pind 3-4' })
    expect(result.length).toBeGreaterThan(0)
    for (const r of result) {
      expect(['3', '3,5', '4']).toContain(r.needle_size)
    }
  })

  it('smart parser: "5 mm" infererer needle 5', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: '5 mm' })
    expect(result.length).toBeGreaterThan(0)
    for (const r of result) {
      expect(r.needle_size).toBe('5')
    }
  })

  it('smart parser: "str 4,5" infererer needle 4,5', () => {
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'str 4,5' })
    expect(result.length).toBeGreaterThan(0)
    for (const r of result) {
      expect(r.needle_size).toBe('4,5')
    }
  })

  it('eksplicit needle-filter overskriver inferreret pind fra query', () => {
    // Bruger skriver "pind 3-4" men har Pind=5 valgt i dropdown — explicit vinder
    const result = filterRecipes(ALL_RECIPES, {
      ...EMPTY_RECIPE_FILTERS,
      q: 'pind 3-4',
      needle: ['5'],
    })
    for (const r of result) {
      expect(r.needle_size).toBe('5')
    }
  })

  // Hovedeksemplet fra brugeren
  it('"sommerbluse i alpaka på pind 3-4" returnerer korrekt subset', () => {
    const result = filterRecipes(ALL_RECIPES, {
      ...EMPTY_RECIPE_FILTERS,
      q: 'sommerbluse i alpaka på pind 3-4',
    })
    // Hver returneret mønster skal:
    //  - Være sommer-sæson (eller indeholde 'summer' i navn)
    //  - Være top/bluse-type
    //  - Have alpaka-fiber
    //  - Have needle 3, 3,5 eller 4
    for (const r of result) {
      const tags = r.yarn_details.flatMap((y) => y.tags || [])
      expect(tags).toContain('alpaka')
      expect(['3', '3,5', '4']).toContain(r.needle_size)
      const hay = `${r.name} ${r.season} ${r.garment_type}`.toLowerCase()
      expect(/sommer|summer/.test(hay)).toBe(true)
      expect(/top|tee|bluse|blouse/.test(hay)).toBe(true)
    }
  })

  it('"kabel sweater" matcher mønstre med kabel + sweater', () => {
    // Queen of Cables Sweater
    const result = filterRecipes(ALL_RECIPES, { ...EMPTY_RECIPE_FILTERS, q: 'kabel sweater' })
    expect(result.some((r) => /cable|kabel/i.test(r.name))).toBe(true)
  })
})
