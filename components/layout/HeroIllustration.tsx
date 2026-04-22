/**
 * HeroIllustration — genbrugelig SVG-illustration til hero-bannere.
 *
 * Matcher sitets palet. Bruges på /faellesskabet og /opskrifter. Flere
 * varianter kan tilføjes ved at udvide Variant-unionen.
 */

export type Variant =
  | 'skab-bloed'
  | 'opskrift-kop-strik'
  | 'forhandler-butik-facade'
  | 'forhandler-lup-dk'
  | 'forhandler-pin-nogle'
  | 'forhandler-lille-butik'
  | 'projekter-tre-stadier'

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
    case 'opskrift-kop-strik':      return <OpskriftKopStrik />
    case 'forhandler-butik-facade': return <ForhandlerButikFacade />
    case 'forhandler-lup-dk':       return <ForhandlerLupDk />
    case 'forhandler-pin-nogle':    return <ForhandlerPinNogle />
    case 'forhandler-lille-butik':  return <ForhandlerLilleButik />
    case 'projekter-tre-stadier':   return <ProjekterTreStadier />
    case 'skab-bloed':
    default:                        return <SkabBloed />
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

/* ── Forhandler 1: Butik-facade med store vinduer og garnnøgler ──────────── */

function ForhandlerButikFacade() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="104" ry="5" fill="#302218" fillOpacity="0.07" />

      {/* Bygning-korpus */}
      <path d="M40 196 L40 98 L140 44 L240 98 L240 196 Z" fill="#EDD9D1" filter="url(#heroSoftShadow)" />
      {/* Tag-streg */}
      <path d="M36 100 L140 46 L244 100" stroke="#C9B6A4" strokeWidth="1.8" fill="none" strokeLinejoin="round" />

      {/* Skilt over facaden */}
      <rect x="94" y="74" width="92" height="18" rx="3" fill="#88A798" filter="url(#heroSoftShadow)" />
      <text
        x="140"
        y="87"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', serif"
        fontSize="11"
        fontWeight="600"
        fill="#FFFCF7"
        letterSpacing="2"
      >
        GARN
      </text>

      {/* Venstre vindue */}
      <rect x="56" y="112" width="58" height="60" rx="3" fill="#F9F3E9" />
      <rect x="60" y="116" width="50" height="52" rx="2" fill="#E9F0EB" />
      {/* Garnnøgler i venstre vindue */}
      <circle cx="76" cy="136" r="9" fill="#E2BFC5" />
      <path d="M68 133 Q74 130 84 135" stroke="#FFFCF7" strokeWidth="1" fill="none" />
      <path d="M68 139 Q76 136 84 140" stroke="#FFFCF7" strokeWidth="1" fill="none" />
      <circle cx="96" cy="148" r="8" fill="#88A798" />
      <path d="M90 146 Q96 143 104 147" stroke="#FFFCF7" strokeWidth="1" fill="none" />
      <path d="M90 151 Q97 148 104 152" stroke="#FFFCF7" strokeWidth="1" fill="none" />
      <circle cx="76" cy="158" r="7" fill="#C9E6DA" />

      {/* Dør (centreret) */}
      <rect x="124" y="128" width="32" height="68" rx="3" fill="#D9BFC3" />
      <circle cx="148" cy="162" r="1.6" fill="#C9B6A4" />
      {/* Lille vindue i dør */}
      <rect x="132" y="136" width="16" height="10" rx="1" fill="#F9F3E9" />

      {/* Højre vindue */}
      <rect x="166" y="112" width="58" height="60" rx="3" fill="#F9F3E9" />
      <rect x="170" y="116" width="50" height="52" rx="2" fill="#E9F0EB" />
      {/* Garnnøgler i højre vindue */}
      <circle cx="186" cy="138" r="8" fill="#C9E6DA" />
      <path d="M180 136 Q186 133 192 137" stroke="#FFFCF7" strokeWidth="1" fill="none" />
      <path d="M180 141 Q187 138 192 142" stroke="#FFFCF7" strokeWidth="1" fill="none" />
      <circle cx="204" cy="146" r="9" fill="#E2BFC5" />
      <path d="M196 144 Q204 141 212 145" stroke="#FFFCF7" strokeWidth="1" fill="none" />
      <path d="M196 149 Q205 146 212 150" stroke="#FFFCF7" strokeWidth="1" fill="none" />
      <circle cx="188" cy="158" r="6" fill="#88A798" />

      {/* Trappe/afsats foran dør */}
      <rect x="118" y="196" width="44" height="4" rx="1" fill="#C9B6A4" />
    </>
  )
}

/* ── Forhandler 2: Forstørrelsesglas over DK-silhouet med pins ───────────── */

function ForhandlerLupDk() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="104" ry="5" fill="#302218" fillOpacity="0.06" />

      {/* DK-silhouet (abstrakt) */}
      {/* Jylland */}
      <path
        d="M60 90 Q56 70 74 60 Q92 56 100 78 L104 110 Q108 138 96 168 Q86 188 70 186 Q58 180 58 158 Q54 130 60 90 Z"
        fill="#C9E6DA"
        filter="url(#heroSoftShadow)"
      />
      {/* Fyn */}
      <ellipse cx="130" cy="148" rx="14" ry="10" fill="#C9E6DA" filter="url(#heroSoftShadow)" />
      {/* Sjælland */}
      <path
        d="M160 126 Q180 122 194 134 Q206 148 198 164 Q186 178 166 174 Q152 168 152 150 Q152 132 160 126 Z"
        fill="#C9E6DA"
        filter="url(#heroSoftShadow)"
      />
      {/* Bornholm */}
      <circle cx="224" cy="162" r="7" fill="#C9E6DA" filter="url(#heroSoftShadow)" />

      {/* Pins spredt på landkortet */}
      {[
        { x: 78, y: 96 },
        { x: 86, y: 132 },
        { x: 74, y: 164 },
        { x: 130, y: 146 },
        { x: 176, y: 154 },
      ].map((p, i) => (
        <g key={i} transform={`translate(${p.x} ${p.y})`}>
          <path d="M0 0 Q-6 -12 0 -20 Q6 -12 0 0 Z" fill="#9B6272" />
          <circle cx="0" cy="-14" r="3" fill="#FFFCF7" />
        </g>
      ))}

      {/* Forstørrelsesglas (over Sjælland) */}
      <g transform="translate(178 148)">
        {/* Håndtag */}
        <line x1="28" y1="30" x2="58" y2="60" stroke="#C9B6A4" strokeWidth="5" strokeLinecap="round" />
        <line x1="28" y1="30" x2="58" y2="60" stroke="#8C7E74" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        {/* Glas (ring) */}
        <circle cx="0" cy="0" r="32" fill="#FFFCF7" fillOpacity="0.3" stroke="#C9B6A4" strokeWidth="3.5" />
        <circle cx="0" cy="0" r="32" fill="none" stroke="#EDD9D1" strokeWidth="1.4" strokeOpacity="0.6" />
        {/* Glans */}
        <path d="M-18 -20 Q-22 -8 -14 -6" stroke="#FFFCF7" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.65" />
      </g>
    </>
  )
}

/* ── Forhandler 3: Stor markør-pin med garnnøgle inde ────────────────────── */

function ForhandlerPinNogle() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="54" ry="5" fill="#302218" fillOpacity="0.1" />

      {/* Små bi-pins i baggrunden */}
      <g transform="translate(60 170)" opacity="0.55">
        <path d="M0 0 Q-6 -10 0 -18 Q6 -10 0 0 Z" fill="#D4ADB6" />
        <circle cx="0" cy="-12" r="2.6" fill="#FFFCF7" />
      </g>
      <g transform="translate(220 178)" opacity="0.55">
        <path d="M0 0 Q-5 -9 0 -16 Q5 -9 0 0 Z" fill="#88A798" />
        <circle cx="0" cy="-10" r="2.4" fill="#FFFCF7" />
      </g>

      {/* Hovedpin (stor) */}
      <g transform="translate(140 214)">
        {/* Dråbe-form */}
        <path
          d="M0 0 Q-40 -76 0 -170 Q40 -76 0 0 Z"
          fill="#9B6272"
          filter="url(#heroSoftShadow)"
        />
        {/* Inner cirkel (hvor nøglen sidder) */}
        <circle cx="0" cy="-132" r="34" fill="#FFFCF7" />
        <circle cx="0" cy="-132" r="34" fill="none" stroke="#8C4A5A" strokeWidth="1.5" strokeOpacity="0.25" />

        {/* Garnnøgle i pin-cirklen */}
        <circle cx="0" cy="-132" r="24" fill="#E2BFC5" />
        <path d="M-18 -138 Q-8 -144 12 -140" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M-20 -132 Q-6 -138 18 -130" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M-18 -126 Q-4 -130 18 -124" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M-16 -120 Q0 -124 16 -118" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeLinecap="round" />

        {/* Tråd der løber ned af pin-spidsen */}
        <path d="M6 -110 Q14 -80 10 -40 Q8 -20 14 -8" stroke="#E2BFC5" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Lille glans på pin */}
      <path d="M110 90 Q106 118 118 138" stroke="#FFFCF7" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.45" />
    </>
  )
}

/* ── Forhandler 4: Lille butik med skilt "Garn" og åben dør ──────────────── */

function ForhandlerLilleButik() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="104" ry="5" fill="#302218" fillOpacity="0.07" />

      {/* Fortov */}
      <rect x="40" y="210" width="200" height="4" rx="1" fill="#C9B6A4" opacity="0.5" />

      {/* Bygning-korpus */}
      <rect x="66" y="110" width="148" height="100" rx="2" fill="#F9F3E9" filter="url(#heroSoftShadow)" />

      {/* Tag/markise */}
      <path d="M54 110 L140 74 L226 110 Z" fill="#9B6272" filter="url(#heroSoftShadow)" />
      {/* Tag-skygge nederst */}
      <rect x="60" y="106" width="160" height="8" rx="2" fill="#9B6272" />

      {/* Skilt (ovalt) med "Garn" */}
      <ellipse cx="140" cy="98" rx="30" ry="13" fill="#EDD9D1" filter="url(#heroSoftShadow)" />
      <ellipse cx="140" cy="98" rx="26" ry="10" fill="#FFFCF7" />
      {/* Bogstaver "Garn" antydet */}
      <line x1="124" y1="98" x2="156" y2="98" stroke="#9B6272" strokeWidth="2" strokeLinecap="round" />
      <circle cx="128" cy="98" r="1.3" fill="#9B6272" />

      {/* Vindue venstre */}
      <rect x="80" y="132" width="42" height="52" rx="2" fill="#E9F0EB" />
      <line x1="80" y1="158" x2="122" y2="158" stroke="#F9F3E9" strokeWidth="1" />
      <line x1="101" y1="132" x2="101" y2="184" stroke="#F9F3E9" strokeWidth="1" />
      {/* Garnnøgler i vindue */}
      <circle cx="92" cy="152" r="5" fill="#D4ADB6" />
      <circle cx="110" cy="164" r="4.5" fill="#88A798" />

      {/* Åben dør (højre) */}
      <rect x="160" y="134" width="36" height="76" rx="2" fill="#C9B6A4" />
      {/* Åben dør som bag-skygge */}
      <path d="M160 134 L144 140 L144 210 L160 210 Z" fill="#FFFCF7" />
      {/* Indvendigt "lys" */}
      <path d="M148 146 L144 148 L144 204 L148 206 Z" fill="#F4E8C9" />
      {/* Dørhåndtag */}
      <circle cx="188" cy="172" r="1.6" fill="#F9F3E9" />

      {/* Blomsterkrukke ved døren (lille detalje) */}
      <rect x="200" y="196" width="14" height="14" rx="2" fill="#9B6272" />
      <circle cx="204" cy="192" r="3" fill="#88A798" />
      <circle cx="210" cy="192" r="3" fill="#88A798" />
      <circle cx="207" cy="188" r="3" fill="#88A798" />
    </>
  )
}

/* ── Projekter: Tre kort fanet ud (vil_gerne → i_gang → færdig) ─────────── */

function ProjekterTreStadier() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="104" ry="5" fill="#302218" fillOpacity="0.07" />

      {/* Kort 1: Ønske — 3 nøgler garn (venstre, skrå) */}
      <g transform="translate(70 140) rotate(-10)">
        <rect x="-34" y="-56" width="68" height="96" rx="6" fill="#F9F3E9" filter="url(#heroSoftShadow)" />

        {/* Nøgle 1 (øverst-bagest) — dusty pink */}
        <g transform="translate(-10 -34)">
          <ellipse cx="0" cy="0" rx="14" ry="11" fill="#D4ADB6" />
          <path d="M-10 -4 Q-2 -7 10 -4" stroke="#FFFCF7" strokeOpacity="0.7" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M-12 1 Q0 -3 12 1" stroke="#FFFCF7" strokeOpacity="0.7" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M-10 6 Q2 2 10 6" stroke="#FFFCF7" strokeOpacity="0.7" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>

        {/* Nøgle 2 (øverst-højre, let overlap) — soft sage */}
        <g transform="translate(12 -24)">
          <ellipse cx="0" cy="0" rx="13" ry="10" fill="#C9E6DA" />
          <path d="M-9 -4 Q-2 -6 9 -4" stroke="#FFFCF7" strokeOpacity="0.75" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M-11 1 Q-1 -3 11 1" stroke="#FFFCF7" strokeOpacity="0.75" strokeWidth="1" fill="none" strokeLinecap="round" />
          <path d="M-9 5 Q1 2 9 5" stroke="#FFFCF7" strokeOpacity="0.75" strokeWidth="1" fill="none" strokeLinecap="round" />
        </g>

        {/* Nøgle 3 (forrest, størst) — lys pink */}
        <g transform="translate(-2 8)">
          <ellipse cx="0" cy="0" rx="17" ry="13" fill="#E2BFC5" filter="url(#heroSoftShadow)" />
          <path d="M-13 -5 Q-2 -9 13 -5" stroke="#FFFCF7" strokeOpacity="0.7" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M-15 0 Q-1 -4 15 0" stroke="#FFFCF7" strokeOpacity="0.7" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M-13 6 Q1 2 13 6" stroke="#FFFCF7" strokeOpacity="0.7" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          {/* Tråd-ende */}
          <path d="M14 4 Q20 14 16 26" stroke="#E2BFC5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* Kort 2: I gang (midten, lige) */}
      <g transform="translate(140 144)">
        <rect x="-36" y="-60" width="72" height="100" rx="6" fill="#F9F3E9" filter="url(#heroSoftShadow)" />
        {/* Strikketøj på pindene */}
        <line x1="-28" y1="-28" x2="-34" y2="-52" stroke="#C9B6A4" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="28" y1="-28" x2="34" y2="-52" stroke="#C9B6A4" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="-34" cy="-52" r="2.4" fill="#C9B6A4" />
        <circle cx="34" cy="-52" r="2.4" fill="#C9B6A4" />
        <path d="M-28 -28 L28 -28 L26 14 Q14 10 0 12 Q-14 10 -26 14 Z" fill="#88A798" />
        {[-18, -8, 2].map(y => (
          <line key={y} x1="-22" y1={y} x2="22" y2={y} stroke="#FFFCF7" strokeOpacity="0.5" strokeWidth="0.8" />
        ))}
        {/* Garn-nøgle nederst */}
        <circle cx="-14" cy="26" r="8" fill="#E2BFC5" />
        <path d="M-20 24 Q-14 21 -8 25" stroke="#FFFCF7" strokeWidth="0.9" fill="none" strokeOpacity="0.7" />
        <path d="M-20 28 Q-13 25 -8 29" stroke="#FFFCF7" strokeWidth="0.9" fill="none" strokeOpacity="0.7" />
      </g>

      {/* Kort 3: Færdig trøje (højre, skrå) */}
      <g transform="translate(210 140) rotate(10)">
        <rect x="-34" y="-56" width="68" height="96" rx="6" fill="#F9F3E9" filter="url(#heroSoftShadow)" />
        {/* Trøje */}
        <path d="M-22 -32 L-28 -20 L-22 -14 L-22 20 L22 20 L22 -14 L28 -20 L22 -32 L12 -36 Q0 -32 -12 -36 Z" fill="#D4ADB6" />
        {/* Hals */}
        <path d="M-8 -32 Q0 -28 8 -32" stroke="#9B6272" strokeWidth="1.4" fill="none" />
        {/* Strikkelinjer */}
        {[-22, -14, -6, 2, 10].map(y => (
          <line key={y} x1="-18" y1={y} x2="18" y2={y} stroke="#FFFCF7" strokeOpacity="0.4" strokeWidth="0.8" />
        ))}
        {/* Lille check-flueben */}
        <circle cx="22" cy="-48" r="8" fill="#88A798" />
        <path d="M18 -48 L21 -45 L26 -51" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </>
  )
}

export default HeroIllustration
