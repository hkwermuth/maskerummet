'use client'

import { useEffect, useRef } from 'react'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'

type Row = { type: string; meters: string; needles: string }

const ROWS: Row[] = [
  { type: 'Lace',                  meters: '800+ m',     needles: '1,5 – 3,5 mm' },
  { type: 'Fingering',             meters: '350 – 500 m', needles: '2,0 – 3,5 mm' },
  { type: 'Sport',                 meters: '250 – 350 m', needles: '3,0 – 4,0 mm' },
  { type: 'DK (Double Knitting)',  meters: '200 – 250 m', needles: '3,5 – 4,5 mm' },
  { type: 'Worsted',               meters: '140 – 200 m', needles: '4,5 – 5,5 mm' },
  { type: 'Aran',                  meters: '100 – 175 m', needles: '5,0 – 6,0 mm' },
  { type: 'Bulky',                 meters: '80 – 140 m',  needles: '6,0 – 8,0 mm' },
]

export default function GarnvaegtInfoModal({ onClose }: { onClose: () => void }) {
  useEscapeKey(true, onClose)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus-trap: send fokus til dialogen ved mount så ESC og tab fungerer
  // selvom triggeren stod inde i en anden form.
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="garnvaegt-info-title"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(44,32,24,.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 1400,
        overflowY: 'auto',
        padding: '20px 16px',
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          background: '#FFFCF7',
          borderRadius: 14,
          width: 520, maxWidth: '100%',
          boxShadow: '0 24px 60px rgba(44,32,24,.25)',
          margin: 'auto',
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        <div style={{ background: '#6A5638', padding: '18px 24px', position: 'relative' }}>
          <button
            onClick={onClose}
            aria-label="Luk"
            style={{
              position: 'absolute', top: 10, right: 12,
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,.85)', fontSize: 18,
              cursor: 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            ✕
          </button>
          <div
            id="garnvaegt-info-title"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#fff' }}
          >
            Internationale garnvægt-betegnelser
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.78)', marginTop: 2, lineHeight: 1.5 }}>
            Vejledende — ikke præcise. Tjek altid banderolen.
          </div>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: '#2C2018',
              }}
            >
              <thead>
                <tr style={{ background: '#F4EFE6' }}>
                  <th scope="col" style={thStyle}>Type</th>
                  <th scope="col" style={thStyle}>Løbelængde (m/100g)</th>
                  <th scope="col" style={thStyle}>Pindestørrelse</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(r => (
                  <tr key={r.type} style={{ borderTop: '1px solid #EDE7D8' }}>
                    <td style={tdStyle}>{r.type}</td>
                    <td style={tdStyle}>{r.meters}</td>
                    <td style={tdStyle}>{r.needles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                background: '#2C4A3E',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                minHeight: 44,
              }}
            >
              Luk
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: '#6B5D4F',
  fontWeight: 600,
}

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'top',
  lineHeight: 1.4,
}
