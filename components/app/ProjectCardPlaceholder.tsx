import { CSSProperties } from 'react'
import { PROJECT_PLACEHOLDER_LABELS, ProjectStatus } from '@/lib/types'
import { contrastRatio, pickReadableTextColor, relativeLuminance } from '@/lib/colorContrast'

type Props = {
  status: ProjectStatus
  yarnHexes: string[]
  height?: number
  className?: string
}

const MAX_GRADIENT_STOPS = 4
const PLACEHOLDER_NEUTRAL_BG = '#F9F6F0'   // creme — striq.input
const PLACEHOLDER_DUSTYROSE  = '#B58A92'   // striq.dustyrose

function normalizeHex(h: string): string | null {
  if (!h || typeof h !== 'string') return null
  const trimmed = h.trim()
  if (!trimmed) return null
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

function buildBackground(hexes: string[]): string {
  if (hexes.length === 0) return PLACEHOLDER_NEUTRAL_BG
  if (hexes.length === 1) return hexes[0]
  const stops = hexes.slice(0, MAX_GRADIENT_STOPS)
  const step = 100 / (stops.length - 1)
  const parts = stops.map((c, i) => `${c} ${Math.round(i * step)}%`).join(', ')
  return `linear-gradient(135deg, ${parts})`
}

// Vælg tekstfarve så den er læsbar mod ALLE gradient-stops (worst-case-kontrast).
// Forhindrer at en mørk tekst forsvinder i den lyse del af en lys-til-mørk gradient.
const TEXT_DARK = '#1A1410'
const TEXT_LIGHT = '#FFFCF7'

function pickPlaceholderTextColor(hexes: string[]): string {
  if (hexes.length === 0) return PLACEHOLDER_DUSTYROSE
  if (hexes.length === 1) return pickReadableTextColor(hexes[0])
  const lumDark = relativeLuminance(TEXT_DARK)
  const lumLight = relativeLuminance(TEXT_LIGHT)
  let worstDark = Infinity
  let worstLight = Infinity
  for (const h of hexes) {
    const bg = relativeLuminance(h)
    worstDark = Math.min(worstDark, contrastRatio(bg, lumDark))
    worstLight = Math.min(worstLight, contrastRatio(bg, lumLight))
  }
  return worstDark >= worstLight ? TEXT_DARK : TEXT_LIGHT
}

export default function ProjectCardPlaceholder({
  status,
  yarnHexes,
  height = 140,
  className,
}: Props) {
  const hexes = yarnHexes
    .map(normalizeHex)
    .filter((h): h is string => h !== null)
  const limited = hexes.slice(0, MAX_GRADIENT_STOPS)
  const overflow = hexes.length - limited.length
  const label = PROJECT_PLACEHOLDER_LABELS[status]
  const noYarn = hexes.length === 0

  const style: CSSProperties = {
    height,
    background: buildBackground(limited),
    color: pickPlaceholderTextColor(limited),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 16px',
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 18,
    fontWeight: 500,
    fontStyle: noYarn ? 'italic' : 'normal',
    textAlign: 'center',
    position: 'relative',
    letterSpacing: noYarn ? '.01em' : 0,
  }

  const ariaLabel = noYarn
    ? `${label}. Ingen garn valgt.`
    : `${label}. ${hexes.length} ${hexes.length === 1 ? 'garn-farve' : 'garn-farver'}.`

  return (
    <div
      className={className}
      role="img"
      aria-label={ariaLabel}
      style={style}
    >
      <span>{label}</span>
      {overflow > 0 && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 6,
            right: 8,
            padding: '2px 8px',
            borderRadius: 999,
            fontSize: 11,
            fontFamily: "'DM Sans', sans-serif",
            fontStyle: 'normal',
            background: 'rgba(44,32,24,.55)',
            color: '#FFFCF7',
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
