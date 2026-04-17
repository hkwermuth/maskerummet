// Ofte stavefejl / varianter: groen, blaa, graa, roed, tyrkis, lila, hvit … (udvid ved behov)
export const COLOR_FAMILIES = {
  grøn:   ['grøn', 'groen', 'green', 'sage', 'moss', 'blomstereng', 'forest', 'army', 'olivin', 'jade',
            'smaragd', 'mint', 'lime', 'fern', 'thyme', 'basil', 'pistachio', 'ærtesuppe',
            'skovgrøn', 'lysegrøn', 'mørkegrøn', 'naturgrøn', 'eucalyptus', 'hunter', 'juniper'],
  brun:   ['brun', 'braun', 'brown', 'camel', 'kamel', 'nougat', 'mokka', 'mocha', 'cognac', 'sand',
            'taupe', 'cappuccino', 'chokolade', 'chocolate', 'toffee', 'hazel', 'walnut',
            'chestnut', 'fudge', 'beige', 'khaki', 'latte', 'sienna', 'umber', 'sepia', 'ecru'],
  blå:    ['blå', 'blaa', 'blue', 'marine', 'marineblå', 'indigo', 'denim', 'navy', 'petrol',
            'cobalt', 'himmel', 'jeans', 'azur', 'arctic', 'ocean', 'teal', 'aqua',
            'cornflower', 'periwinkle', 'steel', 'powder', 'royal', 'midnight blue',
            'lyseblå', 'mørkeblå', 'cornflowerblue', 'fjord'],
  rød:    ['rød', 'roed', 'red', 'bordeaux', 'burgundy', 'rust', 'rusten', 'terracotta', 'kirsebær',
            'hindbær', 'coral', 'crimson', 'scarlet', 'wine', 'merlot', 'cherry', 'rosewood',
            'cranberry', 'pomegranate', 'brick', 'tomato', 'vermilion'],
  rosa:   ['rosa', 'pink', 'lyserød', 'flamingo', 'pudder', 'bloom', 'blush', 'rose',
            'bubblegum', 'peach', 'fersken', 'petal', 'ballet', 'quartz', 'dusty rose',
            'blush rose', 'hot pink', 'magenta', 'fuchsia', 'fuchia', 'fuschia', 'orchid'],
  gul:    ['gul', 'yellow', 'sennep', 'mustard', 'curry', 'citron', 'lemon', 'honning',
            'honey', 'guld', 'gold', 'amber', 'butter', 'sunflower', 'banana', 'straw',
            'canary', 'maize', 'golden', 'harvest', 'sunshine'],
  lilla:  ['lilla', 'lila', 'purple', 'violet', 'lavendel', 'lavender', 'plum', 'aubergine',
            'lilac', 'mauve', 'heather', 'wisteria', 'grape', 'iris', 'amethyst',
            'thistle', 'mulberry', 'eggplant', 'prune'],
  grå:    ['grå', 'graa', 'gray', 'grey', 'silver', 'skifer', 'sten', 'perle', 'graphite',
            'slate', 'ash', 'charcoal', 'pebble', 'stone', 'flint', 'pewter', 'smoke',
            'cement', 'dove', 'cloud', 'fog', 'mist', 'lysegrå', 'mørkegrå', 'cool grey'],
  hvid:   ['hvid', 'hvit', 'white', 'creme', 'cream', 'offwhite', 'elfenben', 'ivory', 'vanilla',
            'snow', 'chalk', 'cotton', 'pearl', 'milk', 'natural', 'linen', 'ecru blanc',
            'blanc', 'marshmallow', 'alabaster', 'porcelain'],
  sort:   ['sort', 'black', 'kul', 'lakrids', 'licorice', 'onyx', 'midnight', 'jet',
            'ebony', 'charcoal black', 'noir', 'raven', 'ink'],
  orange: ['orange', 'oransje', 'brændt', 'paprika', 'abrikost', 'apricot', 'mandarin', 'tangerine',
            'pumpkin', 'burnt orange', 'copper', 'bronze', 'ginger', 'clementine', 'persimmon'],
  turkis: ['turkis', 'tyrkis', 'tyrkise', 'turkise', 'turquoise', 'teal', 'cyan', 'aquamarine', 'caribbean', 'tropical',
            'biscay', 'glacier', 'sea glass', 'seafoam'],
}

// Repræsentative nuancer pr. farvefamilie (bruges som auto-hex når bruger kun skriver farveord)
export const COLOR_FAMILY_DEFAULT_HEX = {
  grøn: '#4A7A62',
  brun: '#A67C52',
  blå: '#4A6FA8',
  rød: '#C14B3A',
  rosa: '#E1A1B0',
  gul: '#F0D040',
  lilla: '#7A5AA8',
  grå: '#9A948C',
  hvid: '#F4EFE6',
  sort: '#1A1A1A',
  orange: '#D07A3A',
  turkis: '#3BA6A6',
}

// Fiber synonyms for search (hør = lin)
export const FIBER_SYNONYMS = {
  'hør': ['hør', 'lin', 'linen', 'flax'],
  'lin': ['hør', 'lin', 'linen', 'flax'],
}

/**
 * Detect which color family best matches a color name.
 * Returns e.g. "grøn", "brun", or null if no match.
 */
export function detectColorFamily(colorName) {
  if (!colorName) return null
  const lower = colorName.toLowerCase().trim()
  for (const [family, keywords] of Object.entries(COLOR_FAMILIES)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return family
    }
  }
  return null
}

export const COLOR_FAMILY_LABELS = Object.keys(COLOR_FAMILIES)

/**
 * Om brugerens søgestreng matcher et nøgleord.
 * "ink" kræver helt ord (\b), så "pink" ikke aktiverer sort-familien.
 */
function queryMatchesKeyword(q, kw) {
  if (kw === q) return true
  if (kw.includes(q)) return true
  if (kw === 'ink') return /\bink\b/i.test(q)
  return q.includes(kw)
}

/**
 * Udvider søgestreng med synonymer fra samme farvefamilie (fx "pink" → lyserød, rosa, …).
 * Korte strenge (under 3 tegn) udvider ikke, så "r" ikke matcher alt.
 */
export function expandColorSearchTerms(query) {
  const q = query.toLowerCase().trim()
  if (!q) return []
  const terms = new Set([q])
  if (q.length < 3) {
    return [q]
  }
  for (const [family, keywords] of Object.entries(COLOR_FAMILIES)) {
    if (family === q) {
      keywords.forEach((k) => terms.add(k))
      continue
    }
    const hit = keywords.some((kw) => queryMatchesKeyword(q, kw))
    if (hit) {
      keywords.forEach((k) => terms.add(k))
    }
  }
  return [...terms]
}

/**
 * Hvilke farvefamilier brugerens søgning rammer (til semantisk hex-match).
 */
export function getFamiliesMatchingQuery(query) {
  const q = query.toLowerCase().trim()
  if (!q || q.length < 3) return []
  const families = []
  for (const [family, keywords] of Object.entries(COLOR_FAMILIES)) {
    if (family === q) {
      families.push(family)
      continue
    }
    const hit = keywords.some((kw) => queryMatchesKeyword(q, kw))
    if (hit) families.push(family)
  }
  return [...new Set(families)]
}

function parseHexToRgb(hex) {
  if (!hex) return null
  const s = String(hex).trim().replace(/^#/, '')
  if (!/^[0-9a-f]{6}$/i.test(s)) return null
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  }
}

function rgbToHsl(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  const l = (max + min) / 2
  let s = 0
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      default:
        h = ((r - g) / d + 4) / 6
    }
  }
  return { h: h * 360, s, l }
}

/**
 * Grov HSL-match: ren hex uden tekst kan stadig findes via fx "pink" → rosa-familien.
 * #e9dde2 ≈ hue ~336°, lys pudder-rosa.
 */
export function hexRoughlyMatchesFamily(hex, family) {
  const rgb = parseHexToRgb(hex)
  if (!rgb) return false
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)

  const inHue = (a, b) => (h >= a && h <= b)

  switch (family) {
    case 'rosa':
      // Undgå orange/brun (ca. 18–35°) og grå-lilla med næsten nul mætning.
      if (inHue(285, 360)) return s >= 0.14 || l > 0.62
      // Achromatisk grå har ofte hue 0 og s ≈ 0 — kræv mætning, ellers matcher alt grå som "pink".
      if (inHue(0, 18)) return s >= 0.1
      return l > 0.8 && s < 0.4 && inHue(300, 360)
    case 'rød':
      return inHue(0, 35) || inHue(345, 360) || (l < 0.35 && s < 0.2 && inHue(0, 40))
    case 'orange':
      return inHue(15, 48)
    case 'gul':
      return inHue(40, 72)
    case 'grøn':
      return inHue(72, 165)
    case 'turkis':
      return inHue(160, 195)
    case 'blå':
      return inHue(195, 265)
    case 'lilla':
      return inHue(265, 305)
    case 'brun':
      return (inHue(15, 45) && l < 0.55 && s < 0.45) || (l < 0.45 && s < 0.35)
    case 'grå':
      // Neutral næsten-sort ("ink") kan vises ved grå-søgning.
      return (
        (s < 0.12 && l > 0.25 && l < 0.85) ||
        (s < 0.1 && l < 0.16 && l > 0.04)
      )
    case 'hvid':
      return l > 0.92 && s < 0.08
    case 'sort':
      if (l >= 0.12) return false
      // Mørk brun er ikke sort/ink.
      if (inHue(8, 48) && s > 0.12) return false
      return true
    default:
      return false
  }
}

/**
 * Matcher garn mod fritekst (navn, farve, hex, fiber, …) inkl. farve-synonymer og semantisk hex.
 */
export function yarnMatchesStashSearch(y, query) {
  const qRaw = (query ?? '').trim()
  if (!qRaw) return true

  const qL = qRaw.toLowerCase()
  const terms = expandColorSearchTerms(qL)
  const hexNorm = (y.hex || '').replace(/^#/, '').toLowerCase()

  const hayFields = [
    y.name,
    y.brand,
    y.colorName,
    y.colorCategory,
    y.fiber,
    y.noter,
    hexNorm,
  ].map((s) => (s ?? '').toLowerCase())

  const textMatch = terms.some((term) => {
    const t = term.toLowerCase()
    return hayFields.some((hay) => hay.includes(t))
  })
  if (textMatch) return true

  const families = getFamiliesMatchingQuery(qL)
  if (!families.length || !y.hex || !(String(y.hex).trim())) return false

  return families.some((fam) => hexRoughlyMatchesFamily(y.hex, fam))
}
