// WCAG-baseret tekst-kontrast for vilkårlige hex-baggrunde.
// Bruges af ProjectCardPlaceholder mv. til at vælge læsbar tekstfarve.

const DARK_TEXT  = '#1A1410'
const LIGHT_TEXT = '#FFFCF7'

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function parseHex(hex: string): [number, number, number] | null {
  if (typeof hex !== 'string') return null
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return [r, g, b]
}

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex)
  if (!rgb) return 1
  const [r, g, b] = rgb.map(srgbToLinear) as [number, number, number]
  return clamp01(0.2126 * r + 0.7152 * g + 0.0722 * b)
}

export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function pickReadableTextColor(
  hex: string,
  opts?: { dark?: string; light?: string },
): string {
  const dark = opts?.dark ?? DARK_TEXT
  const light = opts?.light ?? LIGHT_TEXT
  const bg = relativeLuminance(hex)
  const darkContrast = contrastRatio(bg, relativeLuminance(dark))
  const lightContrast = contrastRatio(bg, relativeLuminance(light))
  return darkContrast >= lightContrast ? dark : light
}
