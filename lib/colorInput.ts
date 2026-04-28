// Hjælpere til kombineret farvenavn/farvenummer-input.
// Bruges af både Mit Garnlager (F3) og projekt-form (F11).

export type ParsedColorInput = {
  colorName: string
  colorCode: string
}

/**
 * Splitter et kombineret farve-input til separate {colorName, colorCode}.
 * Heuristik: 3+ sammenhængende cifre er nummer, resten er navn.
 *
 *   "883174 Rosa" → { colorCode: '883174', colorName: 'Rosa' }
 *   "Rosa 883174" → { colorCode: '883174', colorName: 'Rosa' }
 *   "Rosa"        → { colorCode: '',       colorName: 'Rosa' }
 *   "883174"      → { colorCode: '883174', colorName: '' }
 *   ""            → { colorCode: '',       colorName: '' }
 */
export function parseCombinedColorInput(input: string | null | undefined): ParsedColorInput {
  const s = String(input || '').trim()
  if (!s) return { colorName: '', colorCode: '' }
  const codeMatch = s.match(/(\d{3,})/)
  if (codeMatch) {
    const code = codeMatch[1]
    const name = s.replace(code, '').replace(/\s+/g, ' ').trim()
    return { colorName: name, colorCode: code }
  }
  return { colorName: s, colorCode: '' }
}

/**
 * Sammensætter farvenummer + farvenavn til ét synligt input.
 *   ('883174', 'Rosa') → '883174 Rosa'
 *   ('', 'Rosa')       → 'Rosa'
 *   ('883174', '')     → '883174'
 */
export function combineColorDisplay(
  colorCode: string | null | undefined,
  colorName: string | null | undefined,
): string {
  return [colorCode, colorName].filter(s => s && String(s).trim()).join(' ').trim()
}
