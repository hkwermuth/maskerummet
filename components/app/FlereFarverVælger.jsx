'use client'

import { useState } from 'react'
import FarvekategoriCirkler from './FarvekategoriCirkler'

// Multi-farve-vælger til F4 — wrapper omkring F3's <FarvekategoriCirkler>.
// Bruger kan tilføje 1-5 farver til et garn-item, fx hvis det er multi-farve garn
// (Permin Bella Color, Hedgehog Fibres Potion). Ved ≥2 farver renderes kortet
// som CSS linear-gradient via gradientFromHexColors().
//
// Bevidste valg:
// - Genbruger F3-komponenten uændret (props: colorCategory, hex, onChange, onExactHexChange)
// - "Tilføj farve"-knap ligger UDENFOR cirkel-grid'et — så F3-komponenten holdes ren
// - Maks 5 farver (DB-CHECK stopper også her)

const MAX_FARVER = 5

export default function FlereFarverVælger({ hexColors, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const list = Array.isArray(hexColors) ? hexColors : []
  const atMax = list.length >= MAX_FARVER

  function addColor(hex) {
    if (atMax) return
    if (!hex) return
    onChange([...list, hex])
    setPickerOpen(false)
  }

  function removeAt(idx) {
    onChange(list.filter((_, i) => i !== idx))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontSize: 11,
        color: '#6B5D4F',
      }}>
        Multi-farve garn? Tilføj op til {MAX_FARVER} farver — så vises de som
        farveforløb på garnkortet.
      </div>

      {list.length > 0 && (
        <div
          role="list"
          aria-label="Tilføjede farver"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
        >
          {list.map((hex, idx) => (
            <div
              key={`${hex}-${idx}`}
              role="listitem"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px 4px 4px',
                background: '#FFFFFF',
                border: '1px solid #D0C8BA',
                borderRadius: 999,
                fontSize: 11,
                color: '#2C2018',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: hex,
                  border: '1px solid rgba(44,32,24,.15)',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Farve {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                aria-label={`Fjern farve ${idx + 1}`}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  minWidth: 32,
                  minHeight: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  color: '#8B3A2A',
                  lineHeight: 1,
                  fontFamily: "'DM Sans', sans-serif",
                  borderRadius: '50%',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {!pickerOpen && (
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          disabled={atMax}
          aria-expanded={false}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: '1px dashed #C0B8A8',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 12,
            color: atMax ? '#A8A29A' : '#2C4A3E',
            cursor: atMax ? 'not-allowed' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            minHeight: 36,
          }}
        >
          {atMax ? `Maks ${MAX_FARVER} farver` : '+ Tilføj farve'}
        </button>
      )}

      {pickerOpen && (
        <div style={{
          padding: '10px 12px',
          border: '1px solid #D0C8BA',
          borderRadius: 8,
          background: '#FFFCF7',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ fontSize: 11, color: '#6B5D4F', fontWeight: 500 }}>
            Vælg farve at tilføje
          </div>
          <FarvekategoriCirkler
            colorCategory=""
            hex=""
            onChange={({ hex }) => addColor(hex)}
            onExactHexChange={hex => addColor(hex)}
          />
          <button
            type="button"
            onClick={() => setPickerOpen(false)}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: '#8B7D6B',
              padding: '2px 0',
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: 'underline',
            }}
          >
            Annullér
          </button>
        </div>
      )}
    </div>
  )
}
