// Typer for opskriftskataloget. Kilde-uafhængigt design — start med DROPS,
// udvid med Sandnes/Filcolana/Permin/STRIQ-egne uden refactor.

export type RecipeSource = 'drops' | (string & {})

export type RecipeYarnDetail = {
  /** Uppercase nøgle, fx 'BABY MERINO', 'KID-SILK' — bruges også i recipe.yarns[] */
  name: string
  /** Fri tekst, fx '100% merinould' eller '75% mohair, 25% silke' */
  fibers: string
  /** Lowercase tags, fx ['mohair', 'silke'] — bruges i fiber-filter */
  tags: string[]
}

export type Recipe = {
  source: RecipeSource
  /** Stabil ID inden for source. For DROPS: '268-1' (drops_number). */
  external_id: string
  /** Fx 'DROPS Design'. Vises som credit. */
  designer: string
  /** Fx 'Lemon Zest Cardigan' */
  name: string
  /** dame | herre | barn | baby | unisex */
  audience: string
  /** Maskinlæsbar nøgle: cardigan, sweater, top, vest, kjole, ... */
  garment_type: string
  /** Vist label: 'Cardigan', 'Sweater', ... — kapitaliseret */
  garment_label: string
  /** sommer | vinter | jul | påske */
  season: string
  /** Streng som '4' eller '4,5' (komma-decimal — brugerens forventning) */
  needle_size: string
  /** Numerisk version til sortering: '4,5' → 4.5 */
  needle_size_num: number
  /** Original CDN-URL — må IKKE manipuleres (DROPS-licens). */
  image_url: string
  /** URL til designerens originale opskrift — åbnes i ny fane. */
  pattern_url: string
  /** Uppercase yarn-keys, fx ['BABY MERINO', 'KID-SILK'] */
  yarns: string[]
  yarn_details: RecipeYarnDetail[]
}

export type RecipeFilters = {
  q: string
  audience: string[]
  garment_type: string[]
  season: string[]
  needle: string[]
  fiber: string[]
  /** Toggle: kun mønstre brugeren har gemt som favorit. */
  onlyFavorites: boolean
}

export const EMPTY_RECIPE_FILTERS: RecipeFilters = {
  q: '',
  audience: [],
  garment_type: [],
  season: [],
  needle: [],
  fiber: [],
  onlyFavorites: false,
}

export type RecipeFilterOptions = {
  audience: string[]
  garment_type: string[]
  garment_label_for: Record<string, string>
  season: string[]
  needle: string[]
  fiber: string[]
}

export type RecipeStockStatus = 'has_all' | 'missing_one' | 'missing_many' | 'unknown'

export type RecipeStockMatch = {
  status: RecipeStockStatus
  /** Uppercase yarn-keys der mangler. Tom for 'has_all' og 'unknown'. */
  missing: string[]
}

/** Form på user's yarn_items i kontekst af opskrift-matching — kun de felter vi behøver. */
export type StockYarn = {
  name: string | null
  brand: string | null
}

/** Composite key på saved_recipes — `${source}:${external_id}` */
export type SavedRecipeKey = string

export function savedRecipeKey(source: RecipeSource, externalId: string): SavedRecipeKey {
  return `${source}:${externalId}`
}
