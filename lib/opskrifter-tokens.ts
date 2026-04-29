// Farve-tokens for /opskrifter — delt mellem server-page, kort og filterbar.
// Konsolideret fra app/opskrifter/page.tsx og EksempelGrid.tsx.

export const OPSKRIFTER_TOKENS = {
  bg:        '#F8F3EE',
  text:      '#302218',
  textMuted: '#8C7E74',
  sage:      '#61846D',
  sageDark:  '#4A6956',
  dustyPink: '#D4ADB6',
  accent:    '#D9BFC3',
  border:    '#E5DDD9',
  white:     '#FFFFFF',
  gold:      '#B89668',
  heart:     '#C25A6E',

  // Chip-farver fra striq-drops-preview.html (.chip-yarn / .chip-fiber).
  chipYarnBg:   '#EFE6D4',
  chipYarnInk:  '#6A4D20',
  chipFiberBg:  '#E6EFE8',
  chipFiberInk: '#355C3E',
  pillBg:       '#F1ECE2',
  pillInk:      '#3D362A',
  pillPindBg:   '#1F1D1A',
  pillPindInk:  '#FFFFFF',
} as const

export type OpskrifterToken = keyof typeof OPSKRIFTER_TOKENS
