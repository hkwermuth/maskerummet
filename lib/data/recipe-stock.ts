import type { Recipe, RecipeStockMatch, StockYarn } from '@/lib/types-recipes'

// Normalisér til lowercase, erstat '-' og '_' med space, kollapsé whitespace.
function normalize(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Fjern eventuel 'drops'-prefiks fra start af strengen (efter normalisering).
function stripDropsPrefix(s: string): string {
  return s.replace(/^drops\s+/, '').trim()
}

/**
 * Tjek om et lager-element matcher en given DROPS yarn-key.
 *
 * Match-regel: efter normalisering (lowercase, '-' → space, kollaps space), skal:
 *   1. Lager-streng (brand + name) indeholde 'drops' (DROPS-specifik filtrering).
 *   2. Den fulde, normaliserede yarn-key matche EXACT mod stock-navnet efter
 *      'drops'-prefiks er strippet.
 *
 * Vi matcher hele key som hele yarn-name, ikke som substring/whole-word — det
 * undgår at 'ALPACA' false-positive matcher 'BRUSHED ALPACA SILK' og at
 * 'MERINO' false-positive matcher 'BABY MERINO'.
 *
 * Eksempler (✓ match, ✗ ingen match):
 *   ✓  brand='Drops', name='Air'                + key='AIR'
 *   ✓  brand='Drops', name='Baby Merino'        + key='BABY MERINO'
 *   ✓  brand='Drops', name='Kid-Silk'           + key='KID-SILK'
 *   ✗  brand='Drops', name='Brushed Alpaca Silk'+ key='ALPACA'        (key er kun fragment)
 *   ✗  brand='Drops', name='Baby Merino'        + key='MERINO'        (key er kun fragment)
 *   ✗  brand='Drops', name='Baby Alpaca Silk'   + key='BABY MERINO'   (forskellige garn)
 *   ✗  brand='Lampedusa', name='Air'            + key='AIR'           (mangler 'drops')
 *
 * Brugeren kan have 'Drops' i brand-feltet, name-feltet eller begge — vi tjekker den
 * kombinerede streng for 'drops', og match'er key mod den NAME-del der er tilbage
 * efter brand-præfiks-stripping.
 */
export function stockYarnMatchesRecipeYarn(stock: StockYarn, recipeYarnKey: string): boolean {
  const brand = normalize(stock.brand)
  const name = normalize(stock.name)
  if (!name && !brand) return false

  const combined = `${brand} ${name}`.trim()
  if (!combined.includes('drops')) return false

  const key = normalize(recipeYarnKey)
  if (!key) return false

  // Ekstrahér yarn-name uden 'drops'-prefiks. Hvis brand er 'drops', er name allerede kun yarn-navnet.
  // Hvis 'drops' står i name (fx brand=null, name='drops air'), skal vi strippe der.
  const candidate = name ? stripDropsPrefix(name) : stripDropsPrefix(combined)
  return candidate === key
}

/**
 * Sammenlign en opskrift med brugerens garnlager.
 *
 * Returnerer:
 *   'has_all'      — alle påkrævede garn findes på lager
 *   'missing_one'  — præcis ét garn mangler
 *   'missing_many' — flere garn mangler (renderes uden badge — undgå støj)
 *   'unknown'      — vi ved det ikke (ikke logget ind / tomt lager)
 */
export function matchRecipeAgainstStock(
  recipe: Pick<Recipe, 'yarns'>,
  yarnItems: StockYarn[] | null | undefined,
): RecipeStockMatch {
  if (!yarnItems || yarnItems.length === 0) {
    return { status: 'unknown', missing: [] }
  }
  if (!recipe.yarns || recipe.yarns.length === 0) {
    return { status: 'unknown', missing: [] }
  }

  const missing: string[] = []
  for (const key of recipe.yarns) {
    const found = yarnItems.some((it) => stockYarnMatchesRecipeYarn(it, key))
    if (!found) missing.push(key)
  }

  if (missing.length === 0) return { status: 'has_all', missing: [] }
  if (missing.length === 1) return { status: 'missing_one', missing }
  return { status: 'missing_many', missing }
}
