/**
 * HeroIllustration — genbrugelig SVG-illustration til hero-bannere.
 *
 * Matcher sitets palet. Bruges på /faellesskabet og /opskrifter. Flere
 * varianter kan tilføjes ved at udvide Variant-unionen.
 */

export type Variant =
  | 'skab-bloed'
  | 'opskrift-kop-strik'

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
      <SharedDefs />
      {renderVariant(variant)}
    </svg>
  )
}

function SharedDefs() {
  return (
    <defs>
      <filter id="heroSoftShadow" x="-10%" y="-10%" width="120%" height="125%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.6" />
        <feOffset dx="0" dy="1.5" result="offsetblur" />
        <feComponentTransfer><feFuncA type="linear" slope="0.18" /></feComponentTransfer>
        <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  )
}

function renderVariant(variant: Variant) {
  switch (variant) {
    case 'opskrift-kop-strik': return <OpskriftKopStrik />
    case 'skab-bloed':
    default:                    return <SkabBloed />
  }
}

/* ── Fællesskabet: skab-bloed ────────────────────────────────────────────── */

function SkabBloed() {
  return (
    <>
      <ellipse cx="140" cy="226" rx="94" ry="5" fill="#302218" fillOpacity="0.07" />
      <rect x="80" y="44" width="120" height="164" rx="10" fill="#EDD9D1" filter="url(#heroSoftShadow)" />
      <rect x="88" y="54" width="104" height="146" rx="6" fill="#F9F3E9" />
      <rect x="94" y="70" width="92" height="3" rx="1.5" fill="#C9B6A4" />

      <g transform="translate(110 74)">
        <path d="M-17 2 L-22 54 L-4 54 L-1 14 L1 14 L4 54 L22 54 L17 2 L12 -1 L-12 -1 Z" fill="#88A798" />
        <path d="M-17 2 L-29 28 L-24 33 L-13 11 Z" fill="#88A798" />
        <path d="M17 2 L29 28 L24 33 L13 11 Z" fill="#88A798" />
        <circle cx="0" cy="22" r="1.3" fill="#FFFCF7" />
        <circle cx="0" cy="32" r="1.3" fill="#FFFCF7" />
        <circle cx="0" cy="42" r="1.3" fill="#FFFCF7" />
      </g>

      <g transform="translate(140 74)">
        <path d="M-20 2 L-24 58 L24 58 L20 2 L14 -1 L-14 -1 Z" fill="#E2BFC5" />
        <ellipse cx="0" cy="3" rx="6" ry="2" fill="#F9F3E9" />
        <path d="M-20 2 L-32 30 L-27 35 L-16 13 Z" fill="#E2BFC5" />
        <path d="M20 2 L32 30 L27 35 L16 13 Z" fill="#E2BFC5" />
      </g>

      <g transform="translate(172 74)">
        <path d="M-15 2 L-17 40 L17 40 L15 2 L11 -1 L-11 -1 Z" fill="#C9E6DA" />
        <ellipse cx="0" cy="3" rx="4.5" ry="1.5" fill="#F9F3E9" />
        <path d="M-15 2 L-20 18 L-15 21 L-11 13 Z" fill="#C9E6DA" />
        <path d="M15 2 L20 18 L15 21 L11 13 Z" fill="#C9E6DA" />
      </g>

      <path d="M80 44 L50 56 L50 204 L80 210 Z" fill="#EDD9D1" filter="url(#heroSoftShadow)" />
      <path d="M200 44 L230 56 L230 204 L200 210 Z" fill="#EDD9D1" filter="url(#heroSoftShadow)" />
      <circle cx="55" cy="128" r="2.6" fill="#C9B6A4" />
      <circle cx="225" cy="128" r="2.6" fill="#C9B6A4" />
      <rect x="82" y="208" width="6" height="14" rx="2" fill="#C9B6A4" />
      <rect x="192" y="208" width="6" height="14" rx="2" fill="#C9B6A4" />
    </>
  )
}

/* ── Opskrifter: kop + åben bog + strik i baggrunden ─────────────────────── */

function OpskriftKopStrik() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="102" ry="5" fill="#302218" fillOpacity="0.07" />

      {/* Strikkestykke i baggrunden (til højre) */}
      <line x1="204" y1="180" x2="214" y2="56" stroke="#C9B6A4" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="250" y1="180" x2="256" y2="56" stroke="#C9B6A4" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="214" cy="56" r="2.5" fill="#C9B6A4" />
      <circle cx="256" cy="56" r="2.5" fill="#C9B6A4" />
      <path
        d="M202 178 L252 178 L254 90 Q234 84 216 88 Z"
        fill="#88A798"
        filter="url(#heroSoftShadow)"
      />
      {[110, 124, 138, 152, 166].map((y) => (
        <line key={y} x1="210" y1={y} x2="250" y2={y - 2} stroke="#FFFCF7" strokeOpacity="0.5" strokeWidth="0.8" />
      ))}

      {/* Åben opskriftsbog foran (center) */}
      <path
        d="M68 128 L140 122 L204 128 L202 196 L140 200 L70 196 Z"
        fill="#EDD9D1"
        filter="url(#heroSoftShadow)"
      />
      <path d="M76 134 L138 128 L138 194 L76 190 Z" fill="#FFFCF7" />
      <path d="M200 134 L142 128 L142 194 L200 190 Z" fill="#FFFCF7" />
      <rect x="138" y="126" width="4" height="72" rx="1" fill="#C9B6A4" />
      {[144, 156, 168, 180].map((y) => (
        <g key={y}>
          <line x1="84" y1={y - 4} x2="132" y2={y - 6} stroke="#8C7E74" strokeOpacity="0.4" strokeWidth="1" />
          <line x1="148" y1={y - 6} x2="194" y2={y - 4} stroke="#8C7E74" strokeOpacity="0.4" strokeWidth="1" />
        </g>
      ))}

      {/* Kop (tv) */}
      <path d="M28 118 L28 170 Q28 178 36 178 L62 178 Q70 178 70 170 L70 118 Z" fill="#D9BFC3" filter="url(#heroSoftShadow)" />
      <ellipse cx="49" cy="118" rx="21" ry="4" fill="#F9F3E9" />
      <ellipse cx="49" cy="118" rx="16" ry="2" fill="#C68E99" />
      {/* Hank */}
      <path d="M70 132 Q84 140 78 158 Q74 164 70 160" stroke="#D9BFC3" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* Damp */}
      <path d="M40 104 Q38 96 44 90 Q50 86 46 78" stroke="#C9B6A4" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeOpacity="0.65" />
      <path d="M56 104 Q54 96 60 90" stroke="#C9B6A4" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeOpacity="0.55" />
    </>
  )
}

export default HeroIllustration
