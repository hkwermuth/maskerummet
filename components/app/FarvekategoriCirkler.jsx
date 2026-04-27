'use client'

import { useState } from 'react'
import { COLOR_FAMILY_LABELS, COLOR_FAMILY_DEFAULT_HEX } from '@/lib/data/colorFamilies'

// Visuelt grid af farve-cirkler. Klik sætter både farvekategori (til søgning)
// og en repræsentativ farve (til kort-visning) automatisk.
//
// "Vælg eksakt farve"-toggle udfolder native color-picker for brugere der
// vil ramme en specifik colorway (uden at ændre kategori).

const CIRCLE_SIZE = 36
const RING_INNER = '#FFFFFF'
const RING_OUTER = '#2C4A3E'

export default function FarvekategoriCirkler({
  colorCategory,
  hex,
  onChange,
  onExactHexChange,
}) {
  const [exactOpen, setExactOpen] = useState(false)
  const selected = (colorCategory || '').toLowerCase().trim()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        role="radiogroup"
        aria-label="Farvekategori"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(40px, 1fr))',
          gap: 10,
          maxWidth: '100%',
        }}
      >
        {COLOR_FAMILY_LABELS.map(family => {
          const color = COLOR_FAMILY_DEFAULT_HEX[family]
          const isSelected = selected === family
          return (
            <button
              key={family}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={family}
              onClick={() => onChange({ colorCategory: family, hex: color })}
              style={{
                width: CIRCLE_SIZE + 8,
                height: CIRCLE_SIZE + 8,
                minWidth: 44,
                minHeight: 44,
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: CIRCLE_SIZE,
                  height: CIRCLE_SIZE,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: isSelected
                    ? `0 0 0 2px ${RING_INNER}, 0 0 0 4px ${RING_OUTER}`
                    : '0 1px 3px rgba(44,32,24,.15)',
                  border: isSelected ? 'none' : '1px solid rgba(44,32,24,.12)',
                  display: 'inline-block',
                }}
              />
            </button>
          )
        })}
      </div>

      <div
        aria-live="polite"
        style={{
          fontSize: 11,
          color: '#6B5D4F',
          minHeight: 16,
        }}
      >
        {selected ? <>Valgt: <strong style={{ color: '#2C4A3E' }}>{capitalize(selected)}</strong> · bruges til søgning</> : 'Vælg en farve'}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setExactOpen(o => !o)}
          aria-expanded={exactOpen}
          style={{
            fontSize: 11,
            color: '#6B5D4F',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 0',
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: 'underline',
          }}
        >
          {exactOpen ? '▾ Skjul eksakt farve' : '▸ Vælg eksakt farve'}
        </button>
        {exactOpen && (
          <div style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginTop: 6,
          }}>
            <input
              type="color"
              aria-label="Vælg eksakt farve"
              value={validColor(hex)}
              onChange={e => onExactHexChange(e.target.value)}
              style={{
                width: 48,
                height: 44,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                padding: 2,
              }}
            />
            <span style={{ fontSize: 11, color: '#8B7D6B' }}>
              Justér farven uden at ændre kategori.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function capitalize(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function validColor(hex) {
  const s = (hex || '').trim()
  return /^#[0-9A-Fa-f]{6}$/.test(s) ? s : '#E8E4DC'
}
