// Synonymer for opskrift-søgning: dansk → engelsk og engelsk → dansk.
// DROPS-mønstrenes navne er på engelsk ("Iced Coffee Dress"), mens vores garment_type
// er på dansk ("kjole"). Synonymerne lader brugeren søge på dansk og finde engelske
// titler — eller omvendt.
//
// Tilføj nye nøgler her når flere designere/sprog kommer til. Hver nøgle er et
// SØGEORD; værdierne er ALTERNATIVER der også skal matche når brugeren skriver nøglen.
// Mappet er bilateralt — både `'kjole': ['dress']` og `'dress': ['kjole']` ligger her.

export const RECIPE_SEARCH_SYNONYMS: Record<string, string[]> = {
  // Beklædning — top-niveau
  cardigan: ['jakke', 'cardi'],
  cardi: ['cardigan', 'jakke'],
  jakke: ['cardigan', 'jacket', 'cardi'],
  jacket: ['jakke', 'cardigan'],

  sweater: ['trøje', 'pullover', 'jumper'],
  pullover: ['sweater', 'trøje', 'jumper'],
  jumper: ['sweater', 'trøje', 'pullover'],
  trøje: ['sweater', 'pullover', 'jumper'],
  troeje: ['sweater', 'pullover', 'jumper'],

  top: ['tee', 'bluse'],
  tee: ['top', 't-shirt'],
  bluse: ['top', 'blouse'],
  blouse: ['bluse', 'top'],

  hue: ['hat', 'beanie', 'cap'],
  hat: ['hue', 'beanie'],
  beanie: ['hue', 'hat'],

  kjole: ['dress', 'gown'],
  dress: ['kjole', 'gown'],
  gown: ['kjole', 'dress'],

  nederdel: ['skirt'],
  skirt: ['nederdel'],

  vest: ['vest', 'waistcoat'],
  waistcoat: ['vest'],

  poncho: ['poncho'],

  sjal: ['shawl', 'wrap'],
  shawl: ['sjal', 'wrap'],
  wrap: ['sjal', 'shawl'],

  sokker: ['socks'],
  socks: ['sokker'],
  strømper: ['socks'],
  stroemper: ['socks'],

  vanter: ['mittens', 'gloves'],
  mittens: ['vanter'],
  gloves: ['vanter'],

  tørklæde: ['scarf'],
  toerklaede: ['scarf'],
  scarf: ['tørklæde'],

  bukser: ['pants', 'trousers'],
  pants: ['bukser'],
  trousers: ['bukser'],

  // Sæsoner
  sommer: ['summer'],
  summer: ['sommer'],
  vinter: ['winter'],
  winter: ['vinter'],
  forår: ['spring'],
  foraar: ['spring'],
  spring: ['forår'],
  efterår: ['autumn', 'fall'],
  efteraar: ['autumn', 'fall'],
  autumn: ['efterår'],
  fall: ['efterår'],
  jul: ['christmas', 'xmas'],
  christmas: ['jul'],
  påske: ['easter'],
  paaske: ['easter'],
  easter: ['påske'],

  // Målgruppe (matches også via filter, men tillader søgetokens i navne)
  dame: ['women', 'woman', 'ladies'],
  women: ['dame'],
  herre: ['men', 'man', 'gent'],
  men: ['herre'],
  baby: ['baby', 'infant'],
  barn: ['kid', 'child', 'children'],
  børn: ['kids', 'children'],
  boern: ['kids', 'children'],

  // Strikketeknik / mønster-egenskaber
  kabel: ['cable', 'cables'],
  cable: ['kabel'],
  cables: ['kabel'],
  raglan: ['raglan'],
  blonde: ['lace'],
  lace: ['blonde'],
  glat: ['stockinette', 'plain'],
  rib: ['rib', 'ribbed'],
  fairisle: ['fairisle', 'fair-isle'],
  perle: ['seed', 'moss'],
  seed: ['perle'],
  moss: ['perle'],
}

// Stopwords: korte funktionsord der intet siger om hvad bruger leder efter.
// Filtreres væk inden tokens matches mod hay'en.
export const RECIPE_SEARCH_STOPWORDS: Set<string> = new Set([
  // Dansk
  'i', 'med', 'til', 'og', 'eller', 'fra', 'på', 'paa', 'af', 'en', 'et',
  'den', 'det', 'der', 'som', 'ved',
  // Engelsk
  'a', 'an', 'the', 'in', 'on', 'with', 'and', 'or', 'of', 'to', 'for',
])

// Sammensatte danske ord → component-tokens.
// Dansk lægger ord sammen, så "sommerbluse" skal matche både "sommer" og "bluse".
// Vi splitter eksplicit; automatisk compound-splitting kræver ordbog.
export const RECIPE_SEARCH_COMPOUNDS: Record<string, string[]> = {
  // sommer-X
  sommerbluse: ['sommer', 'bluse'],
  sommertop: ['sommer', 'top'],
  sommertrøje: ['sommer', 'trøje'],
  sommertroeje: ['sommer', 'trøje'],
  sommercardigan: ['sommer', 'cardigan'],
  sommerjakke: ['sommer', 'jakke'],
  sommerkjole: ['sommer', 'kjole'],
  sommerstrik: ['sommer', 'strik'],

  // vinter-X
  vinterhue: ['vinter', 'hue'],
  vintertrøje: ['vinter', 'trøje'],
  vintertroeje: ['vinter', 'trøje'],
  vintersweater: ['vinter', 'sweater'],
  vintercardigan: ['vinter', 'cardigan'],
  vinterjakke: ['vinter', 'jakke'],
  vinterstrik: ['vinter', 'strik'],

  // baby-X / barne-X
  babytrøje: ['baby', 'trøje'],
  babytroeje: ['baby', 'trøje'],
  babyhue: ['baby', 'hue'],
  babycardigan: ['baby', 'cardigan'],
  babykjole: ['baby', 'kjole'],
  babytøj: ['baby'],
  babytoej: ['baby'],
  børnetrøje: ['barn', 'trøje'],
  boernetroeje: ['barn', 'trøje'],

  // teknik
  kabelsweater: ['kabel', 'sweater'],
  kabeltrøje: ['kabel', 'trøje'],
  kabeltroeje: ['kabel', 'trøje'],
  raglansweater: ['raglan', 'sweater'],
  raglantrøje: ['raglan', 'sweater'],

  // jul/påske-X
  julesweater: ['jul', 'sweater'],
  juletrøje: ['jul', 'trøje'],
  juletroeje: ['jul', 'trøje'],
  juleslag: ['jul'],
}

/**
 * Udvid en query-streng til alle dens synonym-varianter.
 * Steps:
 *   1. Lowercase + split på whitespace
 *   2. Drop stopwords ("i", "med", ...)
 *   3. Splittér sammensatte ord ("sommerbluse" → ["sommer", "bluse"])
 *   4. Synonym-expand hvert token ("kjole" → ["kjole", "dress", "gown"])
 *
 * Returnerer en liste hvor hvert element er en gruppe af synonym-varianter.
 * Caller bruger AND mellem grupper, OR inden for hver gruppe.
 */
export function expandSearchQuery(q: string): string[][] {
  const cleaned = q.toLowerCase().trim()
  if (!cleaned) return []

  // 1+2: split + filter stopwords
  const rawTokens = cleaned.split(/\s+/).filter((t) => t && !RECIPE_SEARCH_STOPWORDS.has(t))
  if (rawTokens.length === 0) return []

  // 3: split sammensatte ord
  const expanded: string[] = []
  for (const t of rawTokens) {
    const compound = RECIPE_SEARCH_COMPOUNDS[t]
    if (compound) {
      for (const c of compound) {
        if (!RECIPE_SEARCH_STOPWORDS.has(c)) expanded.push(c)
      }
    } else {
      expanded.push(t)
    }
  }

  // 4: synonym-expand hvert token
  return expanded.map((t) => {
    const variants = new Set<string>([t])
    const syns = RECIPE_SEARCH_SYNONYMS[t]
    if (syns) for (const s of syns) variants.add(s.toLowerCase())
    return [...variants]
  })
}
