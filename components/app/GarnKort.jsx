import { dedupeYarnNameFromBrand, gradientFromHexColors, primaryFiberLabel } from '@/lib/yarn-display'
import { YARN_WEIGHT_LABELS } from '@/lib/yarn-weight'

// Status-badge-farver — kun brugt på kortet. Holder dem lokalt så
// Garnlager.jsx ikke skal eksportere/dele dem.
const STATUS_COLORS = {
  'På lager': '#D0E8D4',
  'I brug':   '#FFE0C4',
  'Brugt op': '#E4DDD6',
  'Ønskeliste': '#D8D0E8',
}
const STATUS_TEXT = {
  'På lager': '#2A5C35',
  'I brug':   '#7A3C10',
  'Brugt op': '#5A4E42',
  'Ønskeliste': '#3C2A5C',
}

// Pille-helper: katalog-swatches (per-farve billede) accepteres som visning.
// Generiske hero-billeder fra producenten matcher ikke den specifikke farve
// og vises derfor ikke. Permin og DROPS er de eneste kataloger med swatches
// pt; tilføj nye prefixes hvis flere kataloger får farveprøver.
// Eksporteret fordi Garnlager.jsx også bruger den i edit-modalens
// foto-preview-blok.
export function isCatalogSwatchUrl(url) {
  const s = String(url || '')
  if (s.includes('/img/spec/')) return true
  if (s.includes('images.garnstudio.com/img/shademap/')) return true
  return false
}

function Chip({ children, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', letterSpacing: '.02em', ...style }}>
      {children}
    </span>
  )
}

export default function GarnKort({ yarn: y, onEdit }) {
  const displayName = dedupeYarnNameFromBrand(y.name, y.brand)
  const colorBg = gradientFromHexColors(y.hexColors, y.hex)
  const isMulti = Array.isArray(y.hexColors) && y.hexColors.length >= 2
  // Bruger-uploadet foto vinder altid. Ellers vises katalog-swatch (per-farve
  // billede fra Permin/DROPS) hvis tilgængelig — den matcher brugerens valgte farve
  // 1:1. Generiske hero-billeder vises stadig ikke (de repræsenterer ikke farven).
  const showUserPhoto = Boolean(y.imageUrl)
  const showCatalogSwatch =
    !showUserPhoto && y.catalogImageUrl && isCatalogSwatchUrl(y.catalogImageUrl)
  const colorPillText = y.colorName || (isMulti ? `Multi (${y.hexColors.length})` : '')
  const weightLabel = (y.weight && YARN_WEIGHT_LABELS[String(y.weight).toLowerCase()])
    || y.weight
    || ''
  const fiberLabel = primaryFiberLabel(y.fiber)

  return (
    <div
      onClick={() => onEdit(y)}
      style={{ background: '#FFFCF7', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(44,32,24,.08)', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(44,32,24,.13)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(44,32,24,.08)' }}
    >
      {/* Header — bruger-foto hvis uploadet, ellers farve/farve-gradient.
          "Brugt op"-status signaleres via badge alene; greyscale fjernet
          så brugeren stadig kan genkende garnet på farven (F15-feedback). */}
      <div style={{
        position: 'relative',
        height: '120px',
        background: showUserPhoto ? '#F4EFE6' : colorBg,
        overflow: 'hidden',
      }}>
        {showUserPhoto && (
          <img
            src={y.imageUrl}
            alt={y.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {showCatalogSwatch && (
          <img
            src={y.catalogImageUrl}
            alt={y.colorName ? `Farveprøve: ${y.colorName}` : 'Farveprøve fra katalog'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
        {/* Status-badge — øverste venstre, diskret label for alle 4 statusser */}
        {y.status && (
          <span
            data-status-badge={y.status}
            {...(y.status === 'Brugt op' ? { 'data-testid': 'brugt-op-badge' } : {})}
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 11,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              letterSpacing: '.02em',
              boxShadow: '0 1px 3px rgba(44,32,24,.15)',
              background: STATUS_COLORS[y.status] ?? '#FFFCF7',
              color: STATUS_TEXT[y.status] ?? '#302218',
            }}
          >
            {y.status}
          </span>
        )}

        {/* Manuelt-ikon ved IKKE-katalog (omvendt logik) */}
        {!y.catalogYarnId && (
          <span
            title="Manuelt tilføjet"
            aria-label="Manuelt tilføjet"
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.85)',
              border: '1px solid rgba(44,32,24,.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              boxShadow: '0 1px 3px rgba(44,32,24,.12)',
            }}
          >
            ✎
          </span>
        )}

        {/* Farvenavn-pille i nederste hjørne */}
        {colorPillText && (
          <span style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            maxWidth: 'calc(100% - 20px)',
            padding: '3px 10px',
            background: 'rgba(255,255,255,.92)',
            border: '1px solid rgba(44,32,24,.18)',
            borderRadius: 999,
            fontSize: 11,
            color: '#2C2018',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            boxShadow: '0 1px 3px rgba(44,32,24,.10)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {colorPillText}
          </span>
        )}
      </div>

      <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#8B7D6B', marginBottom: '2px' }}>{y.brand}</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '17px', fontWeight: 600, color: '#2C2018', marginBottom: '6px' }}>{displayName}</div>
        {/* Kompakt detaljelinje: kode · antal · status */}
        <div style={{ fontSize: '12px', color: '#6B5D4F', marginBottom: '9px' }}>
          {[
            y.colorCode || null,
            `${y.antal} ngl`,
            y.status,
          ].filter(Boolean).join(' · ')}
        </div>
        {/* Tags på samme linje: vægt + fiber */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {weightLabel && (
            <Chip style={{ background: '#EDE7D8', color: '#5A4228' }}>{weightLabel}</Chip>
          )}
          {fiberLabel && (
            <Chip style={{ background: '#E4EEE4', color: '#2A4A2A' }}>{fiberLabel}</Chip>
          )}
        </div>
        {/* Brugt op-garn: vis hvilke projekter garnet blev brugt i + nøgle-antal pr. projekt.
            Kapper visuelt ved 3 linjer + "…og N flere" så kortet ikke sprænger.
            Statisk tekst (ingen klik) — selve kortet åbner edit-modalen.
            Skjules helt for legacy "Brugt op" uden yarn_usage-relation. */}
        {y.status === 'Brugt op' && y.usages && y.usages.length > 0 && (
          <ul
            data-testid="brugt-op-projects"
            style={{
              listStyle: 'none', padding: 0, margin: '8px 0 0',
              display: 'flex', flexDirection: 'column', gap: 3,
              fontSize: '11.5px', color: '#6B5D4F', lineHeight: 1.5,
            }}
          >
            {y.usages.slice(0, 3).map(u => (
              <li key={u.yarnUsageId} style={{ display: 'flex', gap: 6, alignItems: 'baseline', minWidth: 0 }}>
                <span aria-hidden="true" style={{ color: '#A89888', flexShrink: 0 }}>•</span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.title || 'Unavngivet projekt'}
                </span>
                <span style={{ color: '#8B7D6B', flexShrink: 0 }}>
                  {u.quantityUsed == null ? '—' : `${u.quantityUsed} ngl`}
                </span>
              </li>
            ))}
            {y.usages.length > 3 && (
              <li style={{ color: '#8B7D6B', fontStyle: 'italic', paddingLeft: 12 }}>
                …og {y.usages.length - 3} flere
              </li>
            )}
          </ul>
        )}
        {y.noter && <div style={{ marginTop: '8px', fontSize: '11px', color: '#8B7D6B', fontStyle: 'italic', lineHeight: '1.45' }}>{y.noter}</div>}
      </div>
    </div>
  )
}
