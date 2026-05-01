'use client'

import { useState } from 'react'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@/lib/types'

export type ConfirmDeleteProjectModalProps = {
  project: { id: string; title: string | null; status: ProjectStatus }
  yarnLines: Array<{
    id: string
    yarnItemId: string | null
    yarnName: string | null
    yarnBrand: string | null
    colorName: string | null
    colorCode: string | null
    hex: string | null
    quantityUsed: number | null
  }>
  onCancel: () => void
  onConfirm: (choice: 'return' | 'delete-all') => Promise<void>
}

const buttonBase: React.CSSProperties = {
  padding: '10px 16px',
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "'DM Sans', sans-serif",
  cursor: 'pointer',
  border: 'none',
  minHeight: 44,
}

export default function ConfirmDeleteProjectModal({
  project, yarnLines, onCancel, onConfirm,
}: ConfirmDeleteProjectModalProps) {
  const [busy, setBusy] = useState<null | 'return' | 'delete-all'>(null)
  useEscapeKey(busy === null, onCancel)

  const totalQty = yarnLines.reduce((sum, l) => sum + Number(l.quantityUsed ?? 0), 0)

  async function handle(choice: 'return' | 'delete-all') {
    if (busy) return
    setBusy(choice)
    try {
      await onConfirm(choice)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && busy === null && onCancel()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(48,34,24,.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 1300, overflowY: 'auto', padding: '20px 16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-project-title"
    >
      <div
        style={{
          background: '#FFFCF7', borderRadius: 14,
          width: 480, maxWidth: '100%',
          boxShadow: '0 24px 60px rgba(48,34,24,.25)',
          margin: 'auto', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ background: '#8B3A2A', padding: '20px 24px', position: 'relative' }}>
          <button
            onClick={() => busy === null && onCancel()}
            disabled={busy !== null}
            aria-label="Luk"
            style={{
              position: 'absolute', top: 12, right: 16,
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,.7)', fontSize: 18,
              cursor: busy === null ? 'pointer' : 'default',
              minWidth: 44, minHeight: 44,
            }}
          >
            ✕
          </button>
          <div
            id="confirm-delete-project-title"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 20, fontWeight: 600, color: '#fff',
            }}
          >
            Slet projekt
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginTop: 2 }}>
            {project.title || 'Unavngivet projekt'} · {PROJECT_STATUS_LABELS[project.status]}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#302218', lineHeight: 1.5 }}>
            Projektet indeholder følgende garn:
          </div>

          <div
            style={{
              display: 'flex', flexDirection: 'column', gap: 6,
              padding: 12, background: '#F4EFE6',
              border: '1px solid #EDE7D8', borderRadius: 8,
              maxHeight: 220, overflowY: 'auto',
            }}
          >
            {yarnLines.map(line => (
              <div
                key={line.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontSize: 12, color: '#302218',
                }}
              >
                <span
                  style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    background: line.hex || '#A8C4C4',
                    border: '1px solid rgba(48,34,24,.15)',
                  }}
                  aria-hidden
                />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[line.yarnBrand, line.yarnName].filter(Boolean).join(' · ') || 'Garn'}
                  {line.colorName ? ` · ${line.colorName}` : ''}
                </span>
                <span style={{ color: '#8B7D6B', fontSize: 11, flexShrink: 0 }}>
                  {Number(line.quantityUsed ?? 0)} ngl
                </span>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 13, color: '#302218', fontWeight: 500 }}>
            Hvad skal der ske med {totalQty} {totalQty === 1 ? 'nøgle' : 'nøgler'}?
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={() => handle('return')}
              disabled={busy !== null}
              style={{
                ...buttonBase,
                background: busy === 'return' ? '#8C7E74' : '#61846D',
                color: '#fff',
              }}
            >
              {busy === 'return' ? 'Behandler…' : `Returnér garn til lager (${totalQty} ngl)`}
            </button>
            <button
              type="button"
              onClick={() => handle('delete-all')}
              disabled={busy !== null}
              style={{
                ...buttonBase,
                background: busy === 'delete-all' ? '#8C7E74' : '#FFFCF7',
                color: busy === 'delete-all' ? '#fff' : '#8B3A2A',
                border: '1px solid #8B3A2A',
              }}
            >
              {busy === 'delete-all' ? 'Behandler…' : 'Slet alt — også garn-historik'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy !== null}
              style={{
                ...buttonBase,
                background: 'transparent',
                color: '#8C7E74',
                border: '1px solid #D0C8BA',
              }}
            >
              Annuller
            </button>
          </div>

          <div style={{ fontSize: 11, color: '#8C7E74', lineHeight: 1.5 }}>
            Hvis du ikke selv har strikket garnet op, så vælg <strong>Returnér til lager</strong>.
            Vi finder dine eksisterende garn på lageret og spørger om de skal lægges sammen.
          </div>
        </div>
      </div>
    </div>
  )
}
