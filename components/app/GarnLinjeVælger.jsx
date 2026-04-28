'use client'

import { useId, useState, useMemo } from 'react'
import AntalStepper from './AntalStepper'
import FarvekategoriCirkler from './FarvekategoriCirkler'
import GarnvaegtInfoModal from './GarnvaegtInfoModal'
import { displayYarnName } from '@/lib/catalog'
import { detectColorFamily, COLOR_FAMILY_DEFAULT_HEX } from '@/lib/data/colorFamilies'
import { parseCombinedColorInput, combineColorDisplay } from '@/lib/colorInput'
import { dedupeYarnNameFromBrand } from '@/lib/yarn-display'

const MANUAL_WEIGHTS = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky']

// F11: Tre-tabs vælger pr. garn-linje i projekt-formularen.
//   • "Fra mit garn"  — vælg fra brugerens yarn_items-lager (default ved i_gang/færdig)
//   • "Fra kataloget" — søg i offentligt katalog (default ved vil_gerne)
//   • "Manuelt"       — fri tekst med F9-warning-banner
//
// Default-tab beregnes ved første mount af linjen og låses derefter — status-skift
// mid-edit ændrer ikke allerede tilføjede liniers tab.
//
// Antal-feltet er <AntalStepper> med default step=0.5 (hele + halve nøgler).

const TAB_MIT_GARN = 'mit_garn'
const TAB_KATALOG  = 'katalog'
const TAB_MANUELT  = 'manuelt'

const TABS = [
  { id: TAB_MIT_GARN, label: 'Fra mit garn' },
  { id: TAB_KATALOG,  label: 'Fra kataloget' },
  { id: TAB_MANUELT,  label: 'Manuelt' },
]

export function defaultTabForStatus(status) {
  return status === 'vil_gerne' ? TAB_KATALOG : TAB_MIT_GARN
}

// Når et eksisterende garn-linje åbnes, gæt hvilken tab den blev oprettet med
// så vi viser den korrekte UI uden at miste data.
export function inferTabFromLine(line) {
  if (line?.yarnItemId) return TAB_MIT_GARN
  if (line?.catalogYarnId) return TAB_KATALOG
  return TAB_MANUELT
}

const inputStyle = {
  padding: '7px 10px',
  border: '1px solid #D0C8BA',
  borderRadius: 6,
  fontSize: 13,
  background: '#F9F6F0',
  color: '#2C2018',
  fontFamily: "'DM Sans', sans-serif",
  width: '100%',
  boxSizing: 'border-box',
}

function Label({ children }) {
  return (
    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B', marginBottom: 4 }}>
      {children}
    </div>
  )
}

export default function GarnLinjeVælger({
  line,
  onChange,
  onRemove,
  canRemove = true,
  initialTab,
  status,
  userYarnItems = [],
  catalogSearch,            // <YarnCatalogSearch>-komponent passes ind så vi ikke laver dobbelt-import
  catalogColors = [],       // colors for det aktuelt valgte katalog-garn
  onSelectCatalogColor,     // (color) => void
}) {
  const initialResolved = initialTab || (line?.yarnItemId || line?.catalogYarnId
    ? inferTabFromLine(line)
    : defaultTabForStatus(status))
  const [tab, setTab] = useState(initialResolved)

  function patch(p) { onChange({ ...line, ...p }) }

  return (
    <div style={{ border: '1px solid #EDE7D8', background: '#F9F6F0', borderRadius: 10, padding: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: line?.hex || '#A8C4C4', border: '1px solid rgba(0,0,0,.08)', flexShrink: 0, marginTop: 4 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <TabBar tab={tab} setTab={setTab} />

          {tab === TAB_MIT_GARN && (
            <FraMitGarnTab line={line} patch={patch} userYarnItems={userYarnItems} />
          )}

          {tab === TAB_KATALOG && (
            <FraKatalogTab
              line={line}
              patch={patch}
              catalogSearch={catalogSearch}
              catalogColors={catalogColors}
              onSelectCatalogColor={onSelectCatalogColor}
            />
          )}

          {tab === TAB_MANUELT && (
            <ManueltTab line={line} patch={patch} />
          )}

          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 10, alignItems: 'center' }}>
            <Label>Antal nøgler brugt</Label>
            <AntalStepper
              value={line?.quantityUsed ?? ''}
              onChange={v => patch({ quantityUsed: v })}
              min={0}
              ariaLabel="Antal nøgler brugt"
            />
          </div>
        </div>

        {canRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            style={{ background: 'none', border: 'none', color: '#8B3A2A', cursor: 'pointer', fontSize: 12, padding: 4, flexShrink: 0 }}
          >
            Fjern
          </button>
        )}
      </div>
    </div>
  )
}

// ── Tab-bar ───────────────────────────────────────────────────────────────────

function TabBar({ tab, setTab }) {
  const groupId = useId()
  return (
    <div role="tablist" aria-label="Vælg garn-kilde" style={{ display: 'flex', gap: 4, marginBottom: 10, borderBottom: '1px solid #E5DDD9' }}>
      {TABS.map(t => {
        const active = tab === t.id
        return (
          <button
            key={t.id}
            id={`${groupId}-${t.id}`}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 12px',
              border: 'none',
              borderBottom: active ? '2px solid #2C4A3E' : '2px solid transparent',
              background: 'transparent',
              color: active ? '#2C4A3E' : '#6B5D4F',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              minHeight: 40,
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Tab 1: Fra mit garn ───────────────────────────────────────────────────────

function FraMitGarnTab({ line, patch, userYarnItems }) {
  const datalistId = useId()
  const [query, setQuery] = useState(() => {
    if (line?.yarnItemId) {
      const found = userYarnItems.find(y => y.id === line.yarnItemId)
      if (found) return formatStashLabel(found)
    }
    return ''
  })

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return userYarnItems.slice(0, 30)
    return userYarnItems.filter(y => formatStashLabel(y).toLowerCase().includes(q)).slice(0, 30)
  }, [query, userYarnItems])

  function handleSelect(e) {
    const label = e.target.value
    setQuery(label)
    const found = userYarnItems.find(y => formatStashLabel(y) === label)
    if (found) {
      patch({
        yarnItemId:     found.id,
        yarnBrand:      found.brand     ?? '',
        yarnName:       found.name      ?? '',
        colorName:      found.colorName ?? '',
        colorCode:      found.colorCode ?? '',
        hex:            found.hex       || '#A8C4C4',
        catalogYarnId:  found.catalogYarnId  ?? null,
        catalogColorId: found.catalogColorId ?? null,
      })
    }
  }

  if (userYarnItems.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#8B7D6B', fontStyle: 'italic', padding: '8px 0' }}>
        Dit garnlager er tomt. Tilføj garn på Mit Garn-siden, eller brug en af de andre kilder.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <Label>Søg i mit garn</Label>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); }}
          onBlur={handleSelect}
          list={datalistId}
          placeholder={`${userYarnItems.length} garn i lageret — skriv mærke, navn eller farve…`}
          style={inputStyle}
        />
        <datalist id={datalistId}>
          {matches.map(y => (
            <option key={y.id} value={formatStashLabel(y)} />
          ))}
        </datalist>
      </div>
      {line?.yarnItemId && (
        <div style={{ fontSize: 11, color: '#5A4E42' }}>
          Valgt: {line.yarnBrand} · {dedupeYarnNameFromBrand(line.yarnName, line.yarnBrand)}
          {line.colorName && ` · ${line.colorName}`}
        </div>
      )}
    </div>
  )
}

function formatStashLabel(y) {
  const name = dedupeYarnNameFromBrand(y.name || '', y.brand || '')
  const farve = [y.colorCode, y.colorName].filter(Boolean).join(' ')
  return [y.brand, name, farve].filter(Boolean).join(' · ')
}

// ── Tab 2: Fra kataloget ──────────────────────────────────────────────────────

const PILL_PREVIEW_COUNT = 6

function CatalogColorPill({ color, isActive, onClick }) {
  const hex = color.hex_code
    ? (String(color.hex_code).startsWith('#') ? color.hex_code : `#${color.hex_code}`)
    : null
  const label = [color.color_number, color.color_name].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px 6px 6px',
        minHeight: 32,
        borderRadius: 999,
        border: isActive ? '1.5px solid #2C4A3E' : '1px solid #D0C8BA',
        background: isActive ? '#EAF3DE' : '#FFFCF7',
        color: '#2C2018',
        fontSize: 12,
        fontFamily: "'DM Sans', sans-serif",
        cursor: 'pointer',
        maxWidth: '100%',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 18, height: 18, borderRadius: '50%',
          background: hex || '#E5DDD9',
          border: '1px solid rgba(0,0,0,.10)',
          flexShrink: 0,
        }}
      />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label || 'Uden navn'}
      </span>
    </button>
  )
}

function FraKatalogTab({ line, patch, catalogSearch, catalogColors, onSelectCatalogColor }) {
  const [showAllColors, setShowAllColors] = useState(false)

  const visibleColors = showAllColors || catalogColors.length <= PILL_PREVIEW_COUNT
    ? catalogColors
    : catalogColors.slice(0, PILL_PREVIEW_COUNT)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <Label>Søg i garn-katalog</Label>
        {catalogSearch}
      </div>

      {line?.catalogYarnId && (
        <>
          <div>
            <Label>Farve</Label>
            <input
              value={combineColorDisplay(line?.colorCode, line?.colorName)}
              onChange={e => {
                const { colorName, colorCode } = parseCombinedColorInput(e.target.value)
                const detected = detectColorFamily(colorName)
                const nextHex = !(line?.hex && String(line.hex).trim()) && detected && COLOR_FAMILY_DEFAULT_HEX[detected]
                  ? COLOR_FAMILY_DEFAULT_HEX[detected]
                  : line?.hex
                patch({
                  colorName,
                  colorCode,
                  hex: nextHex || line?.hex || '#A8C4C4',
                  catalogColorId: null,
                })
              }}
              placeholder="fx 883174 eller Rosa"
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: '#8B7D6B', marginTop: 4 }}>Skriv farvenummer, navn eller begge dele</div>
          </div>

          {catalogColors.length > 0 && (
            <div>
              <Label>Farver fra kataloget</Label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {visibleColors.map(c => (
                  <CatalogColorPill
                    key={c.id}
                    color={c}
                    isActive={line?.catalogColorId === c.id}
                    onClick={() => onSelectCatalogColor(c)}
                  />
                ))}
                {catalogColors.length > PILL_PREVIEW_COUNT && (
                  <button
                    type="button"
                    onClick={() => setShowAllColors(v => !v)}
                    style={{
                      minHeight: 32,
                      padding: '6px 12px',
                      borderRadius: 999,
                      border: '1px dashed #D0C8BA',
                      background: 'transparent',
                      color: '#6B5D4F',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {showAllColors ? 'Vis færre' : `Vis alle (${catalogColors.length})`}
                  </button>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#8B7D6B', marginTop: 4 }}>
                Klik for at fylde feltet — du kan altid skrive ovenpå
              </div>
            </div>
          )}
        </>
      )}

      {line?.catalogYarnId && (
        <div className="bg-striq-src-catalog-bg text-striq-src-catalog-fg" style={{ borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
          <strong>{line.yarnBrand}</strong> · {dedupeYarnNameFromBrand(line.yarnName, line.yarnBrand)}
          {line.colorName && ` — ${line.colorName}`}
        </div>
      )}
    </div>
  )
}

// ── Tab 3: Manuelt ────────────────────────────────────────────────────────────

function ManueltTab({ line, patch }) {
  const [showWeightInfo, setShowWeightInfo] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="bg-striq-src-warning-bg text-striq-src-warning-fg" style={{ borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
        Husk at tilføje garnet til dit lager bagefter for præcis sporing.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <Label>Mærke</Label>
          <input
            value={line?.yarnBrand ?? ''}
            onChange={e => patch({ yarnBrand: e.target.value })}
            placeholder="F.eks. Permin"
            style={inputStyle}
          />
        </div>
        <div>
          <Label>Garn</Label>
          <input
            value={line?.yarnName ?? ''}
            onChange={e => patch({ yarnName: e.target.value })}
            placeholder="F.eks. Bella"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <Label>Farve</Label>
        <input
          value={combineColorDisplay(line?.colorCode, line?.colorName)}
          onChange={e => {
            const { colorName, colorCode } = parseCombinedColorInput(e.target.value)
            const detected = detectColorFamily(colorName)
            const nextHex = !(line?.hex && String(line.hex).trim()) && detected && COLOR_FAMILY_DEFAULT_HEX[detected]
              ? COLOR_FAMILY_DEFAULT_HEX[detected]
              : line?.hex
            patch({ colorName, colorCode, hex: nextHex || line?.hex || '#A8C4C4' })
          }}
          placeholder="fx 883174 eller Rosa"
          style={inputStyle}
        />
        <div style={{ fontSize: 11, color: '#8B7D6B', marginTop: 4 }}>Skriv farvenummer, navn eller begge dele</div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B' }}>Garnvægt</div>
          <button
            type="button"
            onClick={() => setShowWeightInfo(true)}
            aria-label="Vis garnvægt-tabel"
            style={{
              minWidth: 44, minHeight: 44,
              padding: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#2C4A3E',
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginLeft: -4,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 18, height: 18,
                borderRadius: '50%',
                border: '1.5px solid #2C4A3E',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, lineHeight: 1,
                fontStyle: 'italic',
              }}
            >
              i
            </span>
          </button>
        </div>
        <select
          value={line?.weight ?? ''}
          onChange={e => patch({ weight: e.target.value || null })}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          <option value="">Vælg garnvægt…</option>
          {MANUAL_WEIGHTS.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      <div>
        <Label>Farvekategori</Label>
        <FarvekategoriCirkler
          colorCategory={line?.colorCategory}
          hex={line?.hex || ''}
          onChange={({ colorCategory, hex }) => patch({ colorCategory, hex })}
          onExactHexChange={hex => patch({ hex })}
        />
      </div>

      {showWeightInfo && <GarnvaegtInfoModal onClose={() => setShowWeightInfo(false)} />}
    </div>
  )
}
