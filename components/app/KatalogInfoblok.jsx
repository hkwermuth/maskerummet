'use client'

import { displayYarnName, metrageFromYarn, pindstrFromYarn } from '@/lib/catalog'
import { YARN_WEIGHT_LABELS } from '@/lib/yarn-weight'

// Read-only info-blok der viser felter fra det offentlige garn-katalog.
// Visuelt grøn for at signalere "katalog-data — kan ikke redigeres".
// Farve-tokens matcher Garnlager.jsx ("Katalog"-chip + primær-knap).

export default function KatalogInfoblok({ yarn, onClearLink }) {
  const rows = yarn ? buildRows(yarn) : []

  return (
    <section
      aria-label="Information fra garn-kataloget"
      data-testid="katalog-infoblok"
      style={{
        gridColumn: '1 / -1',
        background: '#D8E8E0',
        border: '1px solid #61846D',
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <span style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          color: '#1E4D3A',
          fontWeight: 600,
        }}>
          Fra kataloget
        </span>
        {onClearLink && (
          <button
            type="button"
            onClick={onClearLink}
            style={{
              fontSize: 11,
              color: '#1E4D3A',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 4px',
              textDecoration: 'underline',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Fjern katalog-link
          </button>
        )}
      </div>

      {yarn ? (
        <dl style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px 16px',
          margin: 0,
        }}>
          {rows.map(([label, val]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <dt style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '.1em',
                color: '#3E6650',
                fontWeight: 500,
              }}>
                {label}
              </dt>
              <dd style={{
                margin: 0,
                fontSize: 13,
                color: '#2C4A3E',
                fontWeight: 500,
                wordBreak: 'break-word',
              }}>
                {val}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p style={{
          margin: 0,
          fontSize: 12,
          color: '#3E6650',
          fontStyle: 'italic',
        }}>
          Henter katalog-data…
        </p>
      )}
    </section>
  )
}

function buildRows(yarn) {
  const weightLabel = (yarn.yarn_weight && YARN_WEIGHT_LABELS[yarn.yarn_weight])
    || yarn.thickness_category
    || ''
  const metrage = metrageFromYarn(yarn)
  const pindstr = pindstrFromYarn(yarn)
  const fiber = (yarn.fiber_main || '').trim()
  const ballWeight = yarn.ball_weight_g != null ? `${yarn.ball_weight_g} g` : ''
  const gaugeNeedle = yarn.gauge_needle_mm != null ? `${yarn.gauge_needle_mm} mm` : ''

  return [
    ['Mærke', yarn.producer || ''],
    ['Garnnavn', displayYarnName(yarn)],
    ['Fiber', fiber],
    ['Vægt', weightLabel],
    ['Løbelængde/nøgle', metrage ? `${metrage} m` : ''],
    ['Pindstørrelse', pindstr],
    ['Ball-vægt', ballWeight],
    ['Gauge-pind', gaugeNeedle],
  ].filter(([, v]) => v != null && String(v).trim() !== '')
}
