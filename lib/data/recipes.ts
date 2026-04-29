import {
  EMPTY_RECIPE_FILTERS,
  type Recipe,
  type RecipeFilterOptions,
  type RecipeFilters,
  type RecipeSource,
  type RecipeYarnDetail,
} from '@/lib/types-recipes'
import sample from '@/content/striq-drops-sample.json'
import { expandSearchQuery } from '@/lib/data/recipe-synonyms'
import { parseSearchQuery } from '@/lib/data/recipe-query'

// URL-multi-separator: pipe i stedet for komma, fordi needle_size kan være '4,5'.
const SEP = '|'

const FILTER_FIELDS = ['audience', 'garment_type', 'season', 'needle', 'fiber'] as const
type FilterField = (typeof FILTER_FIELDS)[number]

type RawDropsPattern = {
  drops_number: string
  name: string
  audience: string
  garment_type: string
  garment_label?: string
  season: string
  needle_size: string
  image_url: string
  pattern_url: string
  yarns?: string[]
  yarn_details?: RecipeYarnDetail[]
}

type RawDropsFile = {
  patterns: RawDropsPattern[]
}

function needleStringToNumber(needle: string): number {
  // '4,5' → 4.5 ; '4' → 4
  const n = parseFloat(needle.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function isValidPattern(p: Partial<RawDropsPattern>): p is RawDropsPattern {
  return (
    typeof p.drops_number === 'string' &&
    typeof p.name === 'string' &&
    typeof p.image_url === 'string' &&
    typeof p.pattern_url === 'string' &&
    typeof p.audience === 'string' &&
    typeof p.garment_type === 'string' &&
    typeof p.season === 'string' &&
    typeof p.needle_size === 'string'
  )
}

function capitalize(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Læs og normalisér mønstre. Kilde-tolerant — drop ufuldstændige rækker frem for at crashe. */
export function loadRecipes(): Recipe[] {
  const file = sample as unknown as RawDropsFile
  const raw = Array.isArray(file?.patterns) ? file.patterns : []
  const recipes: Recipe[] = []
  for (const p of raw) {
    if (!isValidPattern(p)) continue
    recipes.push({
      source: 'drops' as RecipeSource,
      external_id: p.drops_number,
      designer: 'DROPS Design',
      name: p.name,
      audience: p.audience,
      garment_type: p.garment_type,
      garment_label: p.garment_label || capitalize(p.garment_type),
      season: p.season,
      needle_size: p.needle_size,
      needle_size_num: needleStringToNumber(p.needle_size),
      image_url: p.image_url,
      pattern_url: p.pattern_url,
      yarns: Array.isArray(p.yarns) ? p.yarns : [],
      yarn_details: Array.isArray(p.yarn_details) ? p.yarn_details : [],
    })
  }
  return recipes
}

/** Udled filter-options fra det samlede katalog — så fremtidige designere flyder ind automatisk. */
export function deriveFilterOptions(recipes: Recipe[]): RecipeFilterOptions {
  const audience = new Set<string>()
  const garmentType = new Set<string>()
  const garmentLabelFor: Record<string, string> = {}
  const season = new Set<string>()
  const needle = new Set<string>()
  const fiber = new Set<string>()

  for (const r of recipes) {
    if (r.audience) audience.add(r.audience)
    if (r.garment_type) {
      garmentType.add(r.garment_type)
      garmentLabelFor[r.garment_type] = r.garment_label || capitalize(r.garment_type)
    }
    if (r.season) season.add(r.season)
    if (r.needle_size) needle.add(r.needle_size)
    for (const yd of r.yarn_details) {
      for (const t of yd.tags || []) fiber.add(t)
    }
  }

  return {
    audience: [...audience].sort(),
    garment_type: [...garmentType].sort(),
    garment_label_for: garmentLabelFor,
    season: [...season].sort(),
    // Sortér numerisk: 3, 3,5, 4, 4,5, 5, 5,5, 6, 7, 8
    needle: [...needle].sort((a, b) => needleStringToNumber(a) - needleStringToNumber(b)),
    fiber: [...fiber].sort(),
  }
}

/**
 * AND mellem felter, OR inden for samme felt.
 *
 * Søg er Google-agtig:
 *   1. Smart parser udtrækker pind-størrelser fra fri tekst ("pind 3-4" → 3, 3,5, 4)
 *   2. Stopwords filtreres ("i", "med", "på" osv.)
 *   3. Sammensatte ord splittes ("sommerbluse" → "sommer" + "bluse")
 *   4. Synonymer ekspanderes ("kjole" → også "dress")
 *   5. Tokens matches mod cross-field hay: navn + nummer + garment_label/type
 *      + season + audience + fiber-tags
 *   6. AND mellem tokens, OR inden for hver tokens varianter
 *
 * Eksplicit needle-filter (fra dropdown) overskriver inferreret pind fra query —
 * brugerens valg vinder altid.
 *
 * BEMÆRK: `onlyFavorites` håndteres IKKE her — denne funktion er pure data og
 * kender ikke brugerens favorit-set. Caller filtrerer derefter (DropsKatalog.tsx).
 */
export function filterRecipes(recipes: Recipe[], f: RecipeFilters): Recipe[] {
  // 1. Trække struktur ud af tekst-søgningen
  const { remainingQuery, inferredNeedle } = parseSearchQuery(f.q)

  // 2. Eksplicit needle (dropdown) vinder over inferreret (query)
  const effectiveNeedle = f.needle.length > 0 ? f.needle : inferredNeedle

  // 3. Synonym/compound/stopword-expansion på den resterende tekst
  const expandedTokens = expandSearchQuery(remainingQuery)

  return recipes.filter((r) => {
    if (expandedTokens.length > 0) {
      // Cross-field hay: alt brugeren kunne tænkes at søge på
      const fiberTags = r.yarn_details.flatMap((y) => y.tags || []).join(' ')
      const hay = `${r.name} ${r.external_id} ${r.garment_label} ${r.garment_type} ${r.season} ${r.audience} ${fiberTags}`.toLowerCase()
      // AND mellem tokens, OR inden for hver tokens varianter
      const allMatch = expandedTokens.every((variants) =>
        variants.some((v) => hay.includes(v)),
      )
      if (!allMatch) return false
    }
    if (f.audience.length && !f.audience.includes(r.audience)) return false
    if (f.garment_type.length && !f.garment_type.includes(r.garment_type)) return false
    if (f.season.length && !f.season.includes(r.season)) return false
    if (effectiveNeedle.length && !effectiveNeedle.includes(r.needle_size)) return false
    if (f.fiber.length) {
      const tags = new Set<string>()
      for (const yd of r.yarn_details) for (const t of yd.tags) tags.add(t)
      if (!f.fiber.some((t) => tags.has(t))) return false
    }
    return true
  })
}

/** True hvis mindst ét filter er aktivt (bruges til at vise "Nulstil"-knap). */
export function isAnyFilterActive(f: RecipeFilters): boolean {
  if (f.q.trim()) return true
  if (f.onlyFavorites) return true
  return FILTER_FIELDS.some((k) => f[k].length > 0)
}

function readMulti(sp: URLSearchParams, key: string): string[] {
  const raw = sp.get(key)
  if (!raw) return []
  return raw.split(SEP).map((v) => v.trim()).filter(Boolean)
}

/** Læser RecipeFilters fra URLSearchParams. Ukendte felter ignoreres. */
export function parseFiltersFromSearchParams(sp: URLSearchParams): RecipeFilters {
  return {
    q: sp.get('q')?.trim() || '',
    audience: readMulti(sp, 'audience'),
    garment_type: readMulti(sp, 'type'),
    season: readMulti(sp, 'season'),
    needle: readMulti(sp, 'needle'),
    fiber: readMulti(sp, 'fiber'),
    onlyFavorites: sp.get('favorites') === '1',
  }
}

const FIELD_TO_QUERY_KEY: Record<FilterField, string> = {
  audience: 'audience',
  garment_type: 'type',
  season: 'season',
  needle: 'needle',
  fiber: 'fiber',
}

/** Returnerer query-string UDEN ledende '?'. Tomme felter udelades. Stabil key-rækkefølge. */
export function serializeFilters(f: RecipeFilters): string {
  const params = new URLSearchParams()
  if (f.q.trim()) params.set('q', f.q.trim())
  for (const field of FILTER_FIELDS) {
    const values = f[field]
    if (values.length > 0) {
      params.set(FIELD_TO_QUERY_KEY[field], values.join(SEP))
    }
  }
  if (f.onlyFavorites) params.set('favorites', '1')
  return params.toString()
}

export { EMPTY_RECIPE_FILTERS }
