/**
 * HeroIllustration — genbrugelig SVG-illustration til hero-bannere.
 *
 * Matcher sitets palet. Bruges på /faellesskabet og kan genbruges på andre
 * sider. Flere varianter kan tilføjes ved at udvide Variant-unionen.
 */

export type Variant = 'skab-bloed'

type Props = {
  variant?: Variant
  className?: string
  style?: React.CSSProperties
  title?: string
}

export function HeroIllustration({
  variant = 'skab-bloed',
  className,
  style,
  title,
}: Props) {
  const decorative = !title
  return (
    <svg
      viewBox="0 0 280 240"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      className={className}
      style={{ display: 'block', width: '100%', height: 'auto', ...style }}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {renderVariant(variant)}
    </svg>
  )
}

function renderVariant(variant: Variant) {
  switch (variant) {
    case 'skab-bloed':
    default:
      return <SkabBloed />
  }
}

function SkabBloed() {
  return (
    <>
      <defs>
        <filter id="heroSoftShadow" x="-10%" y="-10%" width="120%" height="125%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" />
          <feOffset dx="0" dy="1.5" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.18" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <ellipse cx="140" cy="226" rx="94" ry="5" fill="#302218" fillOpacity="0.07" />

      {/* Skab (rund korpus) */}
      <rect x="80" y="44" width="120" height="164" rx="10" fill="#EDD9D1" filter="url(#heroSoftShadow)" />
      <rect x="88" y="54" width="104" height="146" rx="6" fill="#F9F3E9" />

      {/* Bøjle-stang */}
      <rect x="94" y="70" width="92" height="3" rx="1.5" fill="#C9B6A4" />

      {/* Venstre cardigan (sage) */}
      <g transform="translate(110 74)">
        <path d="M-17 2 L-22 54 L-4 54 L-1 14 L1 14 L4 54 L22 54 L17 2 L12 -1 L-12 -1 Z" fill="#88A798" />
        <path d="M-17 2 L-29 28 L-24 33 L-13 11 Z" fill="#88A798" />
        <path d="M17 2 L29 28 L24 33 L13 11 Z" fill="#88A798" />
        <circle cx="0" cy="22" r="1.3" fill="#FFFCF7" />
        <circle cx="0" cy="32" r="1.3" fill="#FFFCF7" />
        <circle cx="0" cy="42" r="1.3" fill="#FFFCF7" />
      </g>

      {/* Midter sweater (dustyPink) */}
      <g transform="translate(140 74)">
        <path d="M-20 2 L-24 58 L24 58 L20 2 L14 -1 L-14 -1 Z" fill="#E2BFC5" />
        <ellipse cx="0" cy="3" rx="6" ry="2" fill="#F9F3E9" />
        <path d="M-20 2 L-32 30 L-27 35 L-16 13 Z" fill="#E2BFC5" />
        <path d="M20 2 L32 30 L27 35 L16 13 Z" fill="#E2BFC5" />
      </g>

      {/* Højre kort top (moss) */}
      <g transform="translate(172 74)">
        <path d="M-15 2 L-17 40 L17 40 L15 2 L11 -1 L-11 -1 Z" fill="#C9E6DA" />
        <ellipse cx="0" cy="3" rx="4.5" ry="1.5" fill="#F9F3E9" />
        <path d="M-15 2 L-20 18 L-15 21 L-11 13 Z" fill="#C9E6DA" />
        <path d="M15 2 L20 18 L15 21 L11 13 Z" fill="#C9E6DA" />
      </g>

      {/* Åbne døre (fyldt pastel, ingen stroke) */}
      <path d="M80 44 L50 56 L50 204 L80 210 Z" fill="#EDD9D1" filter="url(#heroSoftShadow)" />
      <path d="M200 44 L230 56 L230 204 L200 210 Z" fill="#EDD9D1" filter="url(#heroSoftShadow)" />

      {/* Håndtag */}
      <circle cx="55" cy="128" r="2.6" fill="#C9B6A4" />
      <circle cx="225" cy="128" r="2.6" fill="#C9B6A4" />

      {/* Ben */}
      <rect x="82" y="208" width="6" height="14" rx="2" fill="#C9B6A4" />
      <rect x="192" y="208" width="6" height="14" rx="2" fill="#C9B6A4" />
    </>
  )
}

export default HeroIllustration
