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
  | 'online-pakke-laptop'
  | 'cafe-kop-strik'
  | 'projekter-tre-stadier'
  | 'garn-noegle-trio'
  | 'garn-streng'
  | 'garn-kage-pinde'
  | 'garn-typer-trio'

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
    case 'online-pakke-laptop':     return <OnlinePakkeLaptop />
    case 'cafe-kop-strik':          return <CafeKopStrik />
    case 'projekter-tre-stadier':   return <ProjekterTreStadier />
    case 'garn-noegle-trio':        return <GarnNoegleTrio />
    case 'garn-streng':             return <GarnStreng />
    case 'garn-kage-pinde':         return <GarnKagePinde />
    case 'garn-typer-trio':         return <GarnTyperTrio />
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

/* ── Online forhandler: Laptop med garnnøgle på skærmen + lille pakke ───── */

function OnlinePakkeLaptop() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="106" ry="5" fill="#302218" fillOpacity="0.07" />

      {/* Laptop-base (fortil) */}
      <path d="M52 196 L228 196 L240 210 L40 210 Z" fill="#C9B6A4" filter="url(#heroSoftShadow)" />
      <line x1="60" y1="196" x2="220" y2="196" stroke="#8C7E74" strokeWidth="0.8" opacity="0.5" />

      {/* Laptop-skærm (bagside) */}
      <path d="M60 196 L60 90 Q60 82 68 82 L212 82 Q220 82 220 90 L220 196 Z" fill="#EDD9D1" filter="url(#heroSoftShadow)" />

      {/* Skærm-viewport (browser) */}
      <rect x="70" y="94" width="140" height="92" rx="3" fill="#F9F3E9" />

      {/* Browser top-bar */}
      <rect x="70" y="94" width="140" height="11" fill="#E5DDD9" />
      <rect x="70" y="94" width="140" height="11" rx="3" fill="#E5DDD9" />
      <circle cx="76" cy="99" r="1.6" fill="#9B6272" opacity="0.7" />
      <circle cx="83" cy="99" r="1.6" fill="#C5A572" opacity="0.7" />
      <circle cx="90" cy="99" r="1.6" fill="#88A798" opacity="0.7" />
      {/* URL-felt */}
      <rect x="100" y="96" width="100" height="7" rx="2" fill="#F9F3E9" />

      {/* Garnnøgle på skærmen */}
      <g transform="translate(110 144)">
        <circle r="22" fill="#D4ADB6" filter="url(#heroSoftShadow)" />
        <path d="M-16 -6 Q-6 -14 16 -10" stroke="#FFFCF7" strokeWidth="1.1" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-18 0 Q-4 -8 18 -4" stroke="#FFFCF7" strokeWidth="1.1" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-16 6 Q0 0 18 6" stroke="#FFFCF7" strokeWidth="1.1" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-12 14 Q0 10 14 14" stroke="#FFFCF7" strokeWidth="1.1" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        {/* Tråd ned mod knappen */}
        <path d="M18 10 Q26 22 30 32" stroke="#D4ADB6" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </g>

      {/* Pris-tag */}
      <rect x="148" y="124" width="50" height="11" rx="2" fill="#FFFCF7" />
      <line x1="154" y1="129" x2="172" y2="129" stroke="#9B6272" strokeWidth="1" />
      <line x1="174" y1="129" x2="192" y2="129" stroke="#8C7E74" strokeWidth="0.8" opacity="0.5" />

      {/* "KØB" CTA-knap på skærmen */}
      <rect x="148" y="158" width="50" height="16" rx="3" fill="#61846D" />
      <text
        x="173"
        y="170"
        textAnchor="middle"
        fontFamily="'DM Sans', sans-serif"
        fontSize="8"
        fontWeight="600"
        fill="#FFFCF7"
        letterSpacing="0.5"
      >
        LÆG I KURV
      </text>

      {/* Pakke (foran laptop til højre) */}
      <g transform="translate(218 196)">
        {/* Box-krop */}
        <path d="M-20 -2 L20 -2 L20 24 L-20 24 Z" fill="#EDD9D1" filter="url(#heroSoftShadow)" />
        {/* Box-top */}
        <path d="M-20 -2 L0 -10 L20 -2 Z" fill="#D9BFC3" />
        {/* Tape */}
        <line x1="0" y1="-8" x2="0" y2="24" stroke="#9B6272" strokeWidth="1.6" opacity="0.7" />
        {/* Label */}
        <rect x="-13" y="6" width="22" height="12" rx="1.5" fill="#FFFCF7" />
        <line x1="-9" y1="10" x2="5" y2="10" stroke="#9B6272" strokeWidth="0.9" />
        <line x1="-9" y1="14" x2="3" y2="14" stroke="#8C7E74" strokeWidth="0.7" opacity="0.55" />
      </g>

      {/* WiFi-bue oppe over skærmen (subtil) */}
      <g transform="translate(140 70)" opacity="0.55">
        <path d="M-10 0 Q0 -8 10 0" stroke="#88A798" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <path d="M-6 4 Q0 -1 6 4" stroke="#88A798" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="0" cy="8" r="1.6" fill="#88A798" />
      </g>
    </>
  )
}

/* ── Garncafé: Kop med damp + strikketøj + lille kage ─────────────────── */

function CafeKopStrik() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="104" ry="5" fill="#302218" fillOpacity="0.07" />

      {/* Bord-streg (subtil) */}
      <line x1="38" y1="202" x2="242" y2="202" stroke="#C9B6A4" strokeWidth="1.2" opacity="0.45" />

      {/* Kaffekop (venstre) */}
      <g transform="translate(82 156)">
        {/* Krop */}
        <path d="M-26 -14 L-26 28 Q-26 38 -16 38 L18 38 Q28 38 28 28 L28 -14 Z" fill="#9B6272" filter="url(#heroSoftShadow)" />
        {/* Kaffe-overflade */}
        <ellipse cx="1" cy="-14" rx="27" ry="5" fill="#5C3C45" />
        <ellipse cx="1" cy="-14" rx="22" ry="3.2" fill="#4A2E36" />
        {/* Hank */}
        <path d="M28 -2 Q42 6 36 22 Q32 30 28 26" stroke="#9B6272" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* Damp */}
        <path d="M-14 -24 Q-16 -34 -10 -40 Q-4 -44 -8 -52" stroke="#C9B6A4" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity="0.65" />
        <path d="M0 -24 Q-2 -34 4 -40 Q8 -44 4 -52" stroke="#C9B6A4" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity="0.55" />
        <path d="M12 -24 Q10 -32 16 -36 Q22 -38 18 -46" stroke="#C9B6A4" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeOpacity="0.5" />
      </g>

      {/* Strikketøj med pinde (højre) */}
      <g transform="translate(186 154)">
        {/* Pinde */}
        <line x1="-22" y1="-12" x2="-30" y2="-42" stroke="#C9B6A4" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="22" y1="-12" x2="30" y2="-42" stroke="#C9B6A4" strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="-30" cy="-42" r="3.2" fill="#C9B6A4" />
        <circle cx="30" cy="-42" r="3.2" fill="#C9B6A4" />
        {/* Strikkestykke (let bredt forneden) */}
        <path d="M-22 -12 L22 -12 L20 28 Q0 24 -20 28 Z" fill="#88A798" filter="url(#heroSoftShadow)" />
        {/* Strikke-rækker */}
        {[-4, 4, 12, 20].map(y => (
          <line key={y} x1="-18" y1={y} x2="18" y2={y} stroke="#FFFCF7" strokeOpacity="0.5" strokeWidth="0.8" />
        ))}
        {/* Lille garnnøgle nederst-venstre */}
        <g transform="translate(-14 40)">
          <circle r="10" fill="#D4ADB6" filter="url(#heroSoftShadow)" />
          <path d="M-7 -3 Q0 -6 7 -4" stroke="#FFFCF7" strokeWidth="0.9" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
          <path d="M-8 2 Q0 -1 8 2" stroke="#FFFCF7" strokeWidth="0.9" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
          <path d="M-6 7 Q0 4 6 7" stroke="#FFFCF7" strokeWidth="0.9" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
          {/* Tråd op til strikketøj */}
          <path d="M-2 -9 Q-10 -14 -16 -10" stroke="#D4ADB6" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* Tallerken med lille kage (forrest, midten) */}
      <g transform="translate(134 200)">
        {/* Tallerken */}
        <ellipse cx="0" cy="2" rx="24" ry="5.5" fill="#F9F3E9" filter="url(#heroSoftShadow)" />
        <ellipse cx="0" cy="2" rx="19" ry="3.2" fill="#EDD9D1" opacity="0.7" />
        {/* Kage-stykke (lagkage) */}
        <path d="M-12 -2 L12 -2 L10 -18 L-10 -18 Z" fill="#E2BFC5" />
        {/* Top-glasur */}
        <path d="M-10 -18 Q-6 -24 0 -21 Q6 -24 10 -18 Z" fill="#D4ADB6" />
        {/* Lille bær */}
        <circle cx="0" cy="-24" r="2.2" fill="#88A798" />
        {/* Lag-streg */}
        <line x1="-11" y1="-10" x2="11" y2="-10" stroke="#FFFCF7" strokeWidth="0.8" strokeOpacity="0.6" />
      </g>
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

/* ── Garn-katalog 1: Tre garnnøgler i trio ───────────────────────────────── */

function GarnNoegleTrio() {
  return (
    <>
      <ellipse cx="140" cy="220" rx="100" ry="6" fill="#302218" fillOpacity="0.08" />

      {/* Bagest til venstre — sage, lille */}
      <g transform="translate(82 122)">
        <circle r="32" fill="#88A798" filter="url(#heroSoftShadow)" />
        <path d="M-24 -10 Q-8 -22 22 -16" stroke="#FFFCF7" strokeWidth="1.3" fill="none" strokeOpacity="0.6" strokeLinecap="round" />
        <path d="M-26 -2 Q-8 -14 24 -6" stroke="#FFFCF7" strokeWidth="1.3" fill="none" strokeOpacity="0.6" strokeLinecap="round" />
        <path d="M-26 8 Q-6 -2 26 6" stroke="#FFFCF7" strokeWidth="1.3" fill="none" strokeOpacity="0.6" strokeLinecap="round" />
        <path d="M-24 18 Q-2 12 22 18" stroke="#FFFCF7" strokeWidth="1.3" fill="none" strokeOpacity="0.6" strokeLinecap="round" />
        <path d="M-18 26 Q0 23 18 26" stroke="#FFFCF7" strokeWidth="1.3" fill="none" strokeOpacity="0.6" strokeLinecap="round" />
      </g>

      {/* Højre — cream, mellem */}
      <g transform="translate(206 142)">
        <circle r="38" fill="#EDD9D1" filter="url(#heroSoftShadow)" />
        <path d="M-28 -14 Q-10 -28 26 -22" stroke="#C9B6A4" strokeWidth="1.4" fill="none" strokeOpacity="0.55" strokeLinecap="round" />
        <path d="M-32 -4 Q-8 -18 30 -10" stroke="#C9B6A4" strokeWidth="1.4" fill="none" strokeOpacity="0.55" strokeLinecap="round" />
        <path d="M-34 6 Q-8 -4 32 4" stroke="#C9B6A4" strokeWidth="1.4" fill="none" strokeOpacity="0.55" strokeLinecap="round" />
        <path d="M-32 16 Q-4 10 30 16" stroke="#C9B6A4" strokeWidth="1.4" fill="none" strokeOpacity="0.55" strokeLinecap="round" />
        <path d="M-26 26 Q0 22 26 26" stroke="#C9B6A4" strokeWidth="1.4" fill="none" strokeOpacity="0.55" strokeLinecap="round" />
        <path d="M30 22 Q40 36 32 56" stroke="#EDD9D1" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Forrest — dusty pink, størst */}
      <g transform="translate(140 156)">
        <circle r="48" fill="#D4ADB6" filter="url(#heroSoftShadow)" />
        <path d="M-36 -16 Q-14 -32 34 -26" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-40 -4 Q-12 -22 38 -12" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-42 8 Q-10 -4 40 4" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-40 20 Q-6 12 38 18" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-32 32 Q0 28 34 32" stroke="#FFFCF7" strokeWidth="1.6" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M40 28 Q52 44 44 64" stroke="#D4ADB6" strokeWidth="1.7" fill="none" strokeLinecap="round" />
      </g>
    </>
  )
}

/* ── Garn-katalog 2: Streng garn (hank) med banderole ────────────────────── */

function GarnStreng() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="104" ry="5" fill="#302218" fillOpacity="0.07" />

      {/* Bundt-form */}
      <path
        d="M50 124 Q42 96 80 88 L200 88 Q238 96 230 124 Q238 152 200 160 L80 160 Q42 152 50 124 Z"
        fill="#9B6272"
        filter="url(#heroSoftShadow)"
      />

      {/* Vandrette tråd-bølger */}
      {[100, 108, 116, 124, 132, 140, 148].map((y) => (
        <path
          key={y}
          d={`M58 ${y} Q100 ${y - 2} 140 ${y} T222 ${y}`}
          stroke="#FFFCF7" strokeWidth="0.8" fill="none" strokeOpacity="0.32"
        />
      ))}

      {/* Twist-konturer på siderne */}
      <path d="M70 96 Q88 124 70 152" stroke="#7A4D5A" strokeWidth="1.8" fill="none" strokeOpacity="0.5" strokeLinecap="round" />
      <path d="M210 96 Q192 124 210 152" stroke="#7A4D5A" strokeWidth="1.8" fill="none" strokeOpacity="0.5" strokeLinecap="round" />

      {/* Banderole (papirbånd om midten) */}
      <rect x="116" y="74" width="48" height="100" rx="1" fill="#F9F3E9" filter="url(#heroSoftShadow)" />
      <circle cx="140" cy="98" r="3.5" fill="#88A798" />
      <line x1="124" y1="116" x2="156" y2="116" stroke="#9B6272" strokeWidth="1.2" />
      <line x1="124" y1="124" x2="148" y2="124" stroke="#8C7E74" strokeWidth="0.9" strokeOpacity="0.6" />
      <line x1="124" y1="130" x2="152" y2="130" stroke="#8C7E74" strokeWidth="0.9" strokeOpacity="0.6" />

      {/* Trådende der stikker ud */}
      <path d="M48 106 Q34 100 30 92" stroke="#9B6272" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M48 144 Q32 148 28 156" stroke="#9B6272" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M232 106 Q246 100 250 92" stroke="#9B6272" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M232 144 Q248 148 252 156" stroke="#9B6272" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </>
  )
}

/* ── Garn-katalog 3: Garnkage med strikkepinde ───────────────────────────── */

function GarnKagePinde() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="78" ry="6" fill="#302218" fillOpacity="0.08" />

      {/* Cylinder-krop */}
      <path
        d="M76 100 L76 196 Q76 210 140 210 Q204 210 204 196 L204 100 Z"
        fill="#D4ADB6"
        filter="url(#heroSoftShadow)"
      />

      {/* Stribe-bånd (variegated) */}
      <rect x="76" y="118" width="128" height="6" fill="#C68E99" opacity="0.45" />
      <rect x="76" y="148" width="128" height="8" fill="#E2BFC5" opacity="0.6" />
      <rect x="76" y="176" width="128" height="6" fill="#C68E99" opacity="0.4" />

      {/* Top */}
      <ellipse cx="140" cy="100" rx="64" ry="14" fill="#E2BFC5" />
      <ellipse cx="140" cy="100" rx="64" ry="14" fill="none" stroke="#9B6272" strokeWidth="0.8" strokeOpacity="0.3" />
      <ellipse cx="140" cy="100" rx="50" ry="10" fill="none" stroke="#9B6272" strokeWidth="0.6" strokeOpacity="0.18" />
      <ellipse cx="140" cy="100" rx="34" ry="7" fill="none" stroke="#9B6272" strokeWidth="0.6" strokeOpacity="0.18" />

      {/* Center-pull hul */}
      <ellipse cx="140" cy="100" rx="10" ry="3" fill="#9B6272" opacity="0.55" />

      {/* Strikkepinde — stikker op fra toppen */}
      <line x1="124" y1="100" x2="106" y2="48" stroke="#C9B6A4" strokeWidth="3" strokeLinecap="round" />
      <line x1="156" y1="100" x2="174" y2="48" stroke="#C9B6A4" strokeWidth="3" strokeLinecap="round" />
      <circle cx="106" cy="48" r="3.5" fill="#C9B6A4" />
      <circle cx="174" cy="48" r="3.5" fill="#C9B6A4" />

      {/* Tråd ud af centerhullet */}
      <path d="M138 100 Q134 114 144 126 Q152 138 138 152 Q124 168 142 188" stroke="#D4ADB6" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </>
  )
}

/* ── Garn-katalog 4: Tre garn-typer side om side (streng + nøgle + cone) ── */

function GarnTyperTrio() {
  return (
    <>
      <ellipse cx="140" cy="222" rx="112" ry="5" fill="#302218" fillOpacity="0.07" />

      {/* Streng (venstre) */}
      <g transform="translate(54 188)">
        <path
          d="M-30 -16 Q-38 0 -30 16 L26 16 Q34 0 26 -16 Z"
          fill="#9B6272"
          filter="url(#heroSoftShadow)"
        />
        {[-10, -3, 4, 11].map((y) => (
          <path
            key={y}
            d={`M-26 ${y} Q-2 ${y - 1.5} 22 ${y}`}
            stroke="#FFFCF7" strokeWidth="0.7" fill="none" strokeOpacity="0.35"
          />
        ))}
        <path d="M-14 -14 Q-4 0 -14 14" stroke="#7A4D5A" strokeWidth="1.3" fill="none" strokeOpacity="0.5" strokeLinecap="round" />
        <path d="M14 -14 Q4 0 14 14" stroke="#7A4D5A" strokeWidth="1.3" fill="none" strokeOpacity="0.5" strokeLinecap="round" />
        <rect x="-8" y="-22" width="16" height="44" fill="#F9F3E9" filter="url(#heroSoftShadow)" />
        <line x1="-4" y1="-2" x2="4" y2="-2" stroke="#9B6272" strokeWidth="0.9" />
        <line x1="-4" y1="3" x2="3" y2="3" stroke="#8C7E74" strokeWidth="0.7" strokeOpacity="0.6" />
      </g>

      {/* Klassisk garnnøgle (midten, størst) */}
      <g transform="translate(140 158)">
        <circle r="44" fill="#D4ADB6" filter="url(#heroSoftShadow)" />
        <path d="M-32 -14 Q-12 -28 30 -22" stroke="#FFFCF7" strokeWidth="1.4" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-36 -4 Q-10 -18 34 -10" stroke="#FFFCF7" strokeWidth="1.4" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-38 6 Q-10 -4 36 4" stroke="#FFFCF7" strokeWidth="1.4" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-36 16 Q-6 10 34 18" stroke="#FFFCF7" strokeWidth="1.4" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M-30 28 Q0 24 30 28" stroke="#FFFCF7" strokeWidth="1.4" fill="none" strokeOpacity="0.7" strokeLinecap="round" />
        <path d="M36 22 Q46 38 38 56" stroke="#D4ADB6" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Cone (højre) — tilspidset spole */}
      <g transform="translate(220 182)">
        {/* Garn-vikling om cone */}
        <path
          d="M-5 -50 L-16 10 L16 10 L5 -50 Z"
          fill="#88A798"
          filter="url(#heroSoftShadow)"
        />
        {/* Vandrette tråd-linjer */}
        {[-42, -32, -22, -12, -2].map((y) => {
          const t = (y + 50) / 60
          const halfWidth = 5 + t * 11
          return (
            <line
              key={y}
              x1={-halfWidth + 1}
              y1={y}
              x2={halfWidth - 1}
              y2={y}
              stroke="#FFFCF7"
              strokeWidth="0.7"
              strokeOpacity="0.4"
            />
          )
        })}
        {/* Top-elipse + cone-spids */}
        <ellipse cx="0" cy="-50" rx="5" ry="1.5" fill="#C9E6DA" />
        <path d="M-1.5 -52 L-3 -58 L3 -58 L1.5 -52 Z" fill="#C9B6A4" />
        {/* Bund-base */}
        <rect x="-20" y="10" width="40" height="6" rx="2" fill="#C9B6A4" />
        <rect x="-22" y="16" width="44" height="4" rx="1" fill="#8C7E74" opacity="0.55" />
        {/* Tråd ud af toppen */}
        <path d="M0 -58 Q5 -68 -2 -78" stroke="#88A798" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      </g>
    </>
  )
}

export default HeroIllustration
