// Filcolana Tilia — 60 farver i kid mohair/silke
// GS1-prefix: 5709673
// Metrage: 210m/25g, Pindstørrelse: 3.5mm, Fiber: 70% Kid Mohair + 30% Mulberry Silk

// Alle 60 farver sorteret efter farvenummer
const TILIA_COLORS = [
  { colorNumber: 100, colorName: 'Snow White',       colorNameDa: 'Snehvid',           hex: '#FFFFFF' },
  { colorNumber: 101, colorName: 'Natural White',    colorNameDa: 'Naturhvid',         hex: '#F5F0E8' },
  { colorNumber: 102, colorName: 'Black',            colorNameDa: 'Sort',              hex: '#1A1A1A' },
  { colorNumber: 105, colorName: 'Slate Green',      colorNameDa: 'Skifergrøn',        hex: '#6B8A7A' },
  { colorNumber: 124, colorName: 'Reseda',           colorNameDa: 'Reseda',            hex: '#9AAA7A' },
  { colorNumber: 136, colorName: 'Mustard',          colorNameDa: 'Sennep',            hex: '#D4A76A' },
  { colorNumber: 145, colorName: 'Navy Blue',        colorNameDa: 'Marineblå',         hex: '#1A3A6A' },
  { colorNumber: 196, colorName: 'French Vanilla',   colorNameDa: 'Fransk vanilje',    hex: '#F0E8C8' },
  { colorNumber: 203, colorName: 'Camel',            colorNameDa: 'Kamel',             hex: '#C8A878' },
  { colorNumber: 211, colorName: 'Banana',           colorNameDa: 'Banan',             hex: '#F0D840' },
  { colorNumber: 213, colorName: 'Fuchsia',          colorNameDa: 'Fuchsia',           hex: '#E03090' },
  { colorNumber: 218, colorName: 'Chinese Red',      colorNameDa: 'Kinesisk rød',      hex: '#CC3333' },
  { colorNumber: 255, colorName: 'Limelight',        colorNameDa: 'Limelight',         hex: '#B0E040' },
  { colorNumber: 270, colorName: 'Midnight Blue',    colorNameDa: 'Midnatsblå',        hex: '#1A3A9A' },
  { colorNumber: 278, colorName: 'Delicate Orchid',  colorNameDa: 'Delikat orkide',    hex: '#C0A8D8' },
  { colorNumber: 279, colorName: 'Juicy Green',      colorNameDa: 'Saftig grøn',       hex: '#6AAA5A' },
  { colorNumber: 281, colorName: 'Rime Frost',       colorNameDa: 'Rimfrost',          hex: '#B0D0D8' },
  { colorNumber: 286, colorName: 'Purpur',           colorNameDa: 'Purpur',            hex: '#8A3A9A' },
  { colorNumber: 289, colorName: 'Blue Coral',       colorNameDa: 'Blå koral',         hex: '#4A90B0' },
  { colorNumber: 313, colorName: 'Bubblegum',        colorNameDa: 'Bubblegum',         hex: '#F080C0' },
  { colorNumber: 319, colorName: 'Blue Violet',      colorNameDa: 'Blå violet',        hex: '#6A40AA' },
  { colorNumber: 321, colorName: 'Sakura',           colorNameDa: 'Sakura',            hex: '#F0B0C0' },
  { colorNumber: 322, colorName: 'Begonia Pink',     colorNameDa: 'Begonia pink',      hex: '#E090A8' },
  { colorNumber: 323, colorName: 'Cranberry',        colorNameDa: 'Tyttebær',          hex: '#A03050' },
  { colorNumber: 324, colorName: 'Amethyst',         colorNameDa: 'Ametyst',           hex: '#7A50A0' },
  { colorNumber: 325, colorName: 'Coffee',           colorNameDa: 'Kaffe',             hex: '#6A5040' },
  { colorNumber: 326, colorName: 'Meadow',           colorNameDa: 'Eng',               hex: '#7AA060' },
  { colorNumber: 327, colorName: 'Sage',             colorNameDa: 'Salvie',            hex: '#8A9A7A' },
  { colorNumber: 328, colorName: 'Bluebell',         colorNameDa: 'Blåklokke',         hex: '#5A7AA0' },
  { colorNumber: 329, colorName: 'Playa',            colorNameDa: 'Playa',             hex: '#5A9A9A' },
  { colorNumber: 330, colorName: 'Ash',              colorNameDa: 'Aske',              hex: '#A0A0A0' },
  { colorNumber: 331, colorName: 'Steel',            colorNameDa: 'Stål',              hex: '#707080' },
  { colorNumber: 335, colorName: 'Peach Blossom',    colorNameDa: 'Ferskenbløm',       hex: '#F0B0A0' },
  { colorNumber: 336, colorName: 'Latte',            colorNameDa: 'Latte',             hex: '#D0A880' },
  { colorNumber: 337, colorName: 'Bright Cobalt',    colorNameDa: 'Lys kobolt',        hex: '#2060E0' },
  { colorNumber: 338, colorName: 'Frost Grey',       colorNameDa: 'Frostgrå',          hex: '#C0C8D0' },
  { colorNumber: 340, colorName: 'Ice Blue',         colorNameDa: 'Isblå',             hex: '#80C0E0' },
  { colorNumber: 341, colorName: 'Winter Peach',     colorNameDa: 'Vinter fersken',    hex: '#E0A080' },
  { colorNumber: 342, colorName: 'Arctic Blue',      colorNameDa: 'Arktisk blå',       hex: '#5AA0D0' },
  { colorNumber: 347, colorName: 'Deep Pine',        colorNameDa: 'Dyb fyr',           hex: '#2A5A3A' },
  { colorNumber: 348, colorName: 'Rainy Day',        colorNameDa: 'Regnvejrsdag',      hex: '#8A9AA0' },
  { colorNumber: 349, colorName: 'Mauve',            colorNameDa: 'Malva',             hex: '#A080B0' },
  { colorNumber: 350, colorName: 'Sienna',           colorNameDa: 'Sienna',            hex: '#B07040' },
  { colorNumber: 351, colorName: 'Tapenade',         colorNameDa: 'Tapenade',          hex: '#6A5A40' },
  { colorNumber: 352, colorName: 'Red Squirrel',     colorNameDa: 'Rødt egern',        hex: '#D06050' },
  { colorNumber: 353, colorName: 'Freesia',          colorNameDa: 'Fresia',            hex: '#F0D080' },
  { colorNumber: 354, colorName: 'Light Truffle',    colorNameDa: 'Lys trøffel',       hex: '#C0A080' },
  { colorNumber: 355, colorName: 'Green Tea',        colorNameDa: 'Grøn te',           hex: '#7A9A7A' },
  { colorNumber: 358, colorName: 'Silver',           colorNameDa: 'Sølv',              hex: '#D0D0D0' },
  { colorNumber: 360, colorName: 'Azalea',           colorNameDa: 'Azalea',            hex: '#E090B0' },
  { colorNumber: 361, colorName: 'Madeira Rose',     colorNameDa: 'Madeira rose',      hex: '#E06A90' },
  { colorNumber: 362, colorName: 'Autumn Leaves',    colorNameDa: 'Efterårsblade',     hex: '#C07050' },
  { colorNumber: 363, colorName: 'Caramel',          colorNameDa: 'Karamel',           hex: '#D0906A' },
  { colorNumber: 364, colorName: 'Chai',             colorNameDa: 'Chai',              hex: '#A0805A' },
  { colorNumber: 365, colorName: 'Calendula',        colorNameDa: 'Ringblomst',        hex: '#F0B040' },
  { colorNumber: 367, colorName: 'Lemongrass',       colorNameDa: 'Citrongræs',        hex: '#B0C060' },
  { colorNumber: 370, colorName: 'Flamingo',         colorNameDa: 'Flamingo',          hex: '#F08090' },
  { colorNumber: 373, colorName: 'Vintage Rose',     colorNameDa: 'Vintage rose',      hex: '#D07090' },
  { colorNumber: 381, colorName: 'Summer Sky',       colorNameDa: 'Sommerhimmel',      hex: '#6AB0E0' },
  { colorNumber: 382, colorName: 'Dark Bordeaux',    colorNameDa: 'Mørk bordeaux',     hex: '#803040' },
]

// SKU-kort: farvenummer → 5-cifret SKU
// Bekræftet: 102→00030, 325→00045, 330→00050, 336→00053
// For 319–382: sekventiel tildeling efter sortering
const TILIA_SKU_MAP = {
  102: 30,  // Black (confirmed anchor)
  319: 40,
  321: 41,
  322: 42,
  323: 43,
  324: 44,
  325: 45,
  326: 46,
  327: 47,
  328: 48,
  329: 49,
  330: 50,
  331: 51,
  335: 52,
  336: 53,
  337: 54,
  338: 55,
  340: 56,
  341: 57,
  342: 58,
  347: 59,
  348: 60,
  349: 61,
  350: 62,
  351: 63,
  352: 64,
  353: 65,
  354: 66,
  355: 67,
  358: 68,
  360: 69,
  361: 70,
  362: 71,
  363: 72,
  364: 73,
  365: 74,
  367: 75,
  370: 76,
  373: 77,
  381: 78,
  382: 79,
}

export const TILIA = TILIA_COLORS

export const FILCOLANA_CATALOG = TILIA_COLORS.map(e => ({
  ...e,
  series: 'Tilia',
  brand: 'Filcolana',
  fiber: 'Kid Mohair/Silke',
  metrage: 210,
  weight: 'DK',
  pindstr: '3.5',
  articleNumber: String(e.colorNumber).padStart(3, '0'),
}))

/**
 * Slår farve op i Tilia baseret på EAN-13 stregkode.
 * GS1-prefix: 5709673 (7 cifre)
 * EAN-13 format: 5709673 + SKU (5 cifre) + check-ciffer
 */
export function lookupTiliaByBarcode(scannedCode) {
  if (!scannedCode) return null
  const code = String(scannedCode).trim()

  // Direct color number match (user typed it manually)
  const direct = FILCOLANA_CATALOG.find(e => e.colorNumber === parseInt(code, 10))
  if (direct) return direct

  // EAN-13 with Filcolana GS1 prefix 5709673
  if (code.length === 13 && code.startsWith('5709673')) {
    const sku = parseInt(code.slice(7, 12), 10)
    // Reverse lookup: find color by SKU
    for (const [colorStr, skuVal] of Object.entries(TILIA_SKU_MAP)) {
      if (skuVal === sku) {
        const color = FILCOLANA_CATALOG.find(e => e.colorNumber === parseInt(colorStr, 10))
        if (color) return color
      }
    }
  }

  return null
}
