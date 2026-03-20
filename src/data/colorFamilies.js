export const COLOR_FAMILIES = {
  grøn:   ['grøn', 'green', 'sage', 'moss', 'blomstereng', 'forest', 'army', 'olivin', 'jade',
            'smaragd', 'mint', 'lime', 'fern', 'thyme', 'basil', 'pistachio', 'ærtesuppe',
            'skovgrøn', 'lysegrøn', 'mørkegrøn', 'naturgrøn', 'eucalyptus', 'hunter', 'juniper'],
  brun:   ['brun', 'brown', 'camel', 'kamel', 'nougat', 'mokka', 'mocha', 'cognac', 'sand',
            'taupe', 'cappuccino', 'chokolade', 'chocolate', 'toffee', 'hazel', 'walnut',
            'chestnut', 'fudge', 'beige', 'khaki', 'latte', 'sienna', 'umber', 'sepia', 'ecru'],
  blå:    ['blå', 'blue', 'marine', 'marineblå', 'indigo', 'denim', 'navy', 'petrol',
            'cobalt', 'himmel', 'jeans', 'azur', 'arctic', 'ocean', 'teal', 'aqua',
            'cornflower', 'periwinkle', 'steel', 'powder', 'royal', 'midnight blue',
            'lyseblå', 'mørkeblå', 'cornflowerblue', 'fjord'],
  rød:    ['rød', 'red', 'bordeaux', 'burgundy', 'rust', 'rusten', 'terracotta', 'kirsebær',
            'hindbær', 'coral', 'crimson', 'scarlet', 'wine', 'merlot', 'cherry', 'rosewood',
            'cranberry', 'pomegranate', 'brick', 'tomato', 'vermilion'],
  rosa:   ['rosa', 'pink', 'lyserød', 'flamingo', 'pudder', 'bloom', 'blush', 'rose',
            'bubblegum', 'peach', 'fersken', 'petal', 'ballet', 'quartz', 'dusty rose',
            'blush rose', 'hot pink', 'magenta', 'fuchsia', 'orchid'],
  gul:    ['gul', 'yellow', 'sennep', 'mustard', 'curry', 'citron', 'lemon', 'honning',
            'honey', 'guld', 'gold', 'amber', 'butter', 'sunflower', 'banana', 'straw',
            'canary', 'maize', 'golden', 'harvest', 'sunshine'],
  lilla:  ['lilla', 'purple', 'violet', 'lavendel', 'lavender', 'plum', 'aubergine',
            'lilac', 'mauve', 'heather', 'wisteria', 'grape', 'iris', 'amethyst',
            'thistle', 'mulberry', 'eggplant', 'prune'],
  grå:    ['grå', 'gray', 'grey', 'silver', 'skifer', 'sten', 'perle', 'graphite',
            'slate', 'ash', 'charcoal', 'pebble', 'stone', 'flint', 'pewter', 'smoke',
            'cement', 'dove', 'cloud', 'fog', 'mist', 'lysegrå', 'mørkegrå', 'cool grey'],
  hvid:   ['hvid', 'white', 'creme', 'cream', 'offwhite', 'elfenben', 'ivory', 'vanilla',
            'snow', 'chalk', 'cotton', 'pearl', 'milk', 'natural', 'linen', 'ecru blanc',
            'blanc', 'marshmallow', 'alabaster', 'porcelain'],
  sort:   ['sort', 'black', 'kul', 'lakrids', 'licorice', 'onyx', 'midnight', 'jet',
            'ebony', 'charcoal black', 'noir', 'raven', 'ink'],
  orange: ['orange', 'brændt', 'paprika', 'abrikost', 'apricot', 'mandarin', 'tangerine',
            'pumpkin', 'burnt orange', 'copper', 'bronze', 'ginger', 'clementine', 'persimmon'],
  turkis: ['turkis', 'turquoise', 'teal', 'cyan', 'aquamarine', 'caribbean', 'tropical',
            'biscay', 'glacier', 'sea glass', 'seafoam'],
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
