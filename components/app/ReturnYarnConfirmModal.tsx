'use client'

import { useEffect, useMemo, useState } from 'react'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import type { Decision, MatchKind, MatchResult, ReturnableLine } from '@/lib/yarn-return'

export type ReturnCandidate = {
  source: ReturnableLine
  match: MatchResult
}

export type ReturnYarnConfirmModalProps = {
  candidates: ReturnCandidate[]
  /** Hvis true (default): kort med matchKind='by-yarn-item-id' bekræftes
   *  uden UI når alle kandidater har den type — ingen modal vises. */
  autoMergeOnYarnItemId?: boolean
  onCancel: () => void
  onConfirm: (decisions: Map<string, Decision>) => Promise<void> | void
}

const MATCH_KIND_LABEL: Record<MatchKind, string> = {
  'by-yarn-item-id':  'Samme række',
  'by-catalog-color': 'Samme katalog-garn',
  'by-name-color':    'Matcher på navn — bekræft venligst',
}

const MATCH_KIND_TONE: Record<MatchKind, { bg: string; fg: string }> = {
  'by-yarn-item-id':  { bg: '#DDE9DC', fg: '#3F5B43' },
  'by-catalog-color': { bg: '#DDE9DC', fg: '#3F5B43' },
  'by-name-color':    { bg: '#F5E8C8', fg: '#7A5C20' },
}

export default function ReturnYarnConfirmModal({
  candidates, autoMergeOnYarnItemId = true, onCancel, onConfirm,
}: ReturnYarnConfirmModalProps) {
  const [decisions, setDecisions] = useState<Map<string, Decision>>(() => {
    const m = new Map<string, Decision>()
    for (const c of candidates) m.set(c.source.yarnUsageId, 'merge')
    return m
  })
  const [busy, setBusy] = useState(false)

  useEscapeKey(!busy, onCancel)

  // Auto-merge short-circuit: hvis alle kandidater er by-yarn-item-id og
  // featuren er enabled, kald onConfirm direkte uden at vise UI.
  const allYarnItemId = useMemo(
    () => candidates.length > 0 && candidates.every(c => c.match.matchKind === 'by-yarn-item-id'),
    [candidates]
  )

  useEffect(() => {
    if (!autoMergeOnYarnItemId || !allYarnItemId || busy) return
    let cancelled = false
    void (async () => {
      setBusy(true)
      try {
        const all = new Map<string, Decision>()
        for (const c of candidates) all.set(c.source.yarnUsageId, 'merge')
        await onConfirm(all)
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMergeOnYarnItemId, allYarnItemId])

  if (candidates.length === 0) return null
  if (autoMergeOnYarnItemId && allYarnItemId) return null

  function setDecision(yarnUsageId: string, d: Decision) {
    setDecisions(prev => {
      const next = new Map(prev)
      next.set(yarnUsageId, d)
      return next
    })
  }

  function applyToAll() {
    const first = candidates[0]
    const d = decisions.get(first.source.yarnUsageId) ?? 'merge'
    const next = new Map<string, Decision>()
    for (const c of candidates) next.set(c.source.yarnUsageId, d)
    setDecisions(next)
  }

  async function handleConfirm() {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm(decisions)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && !busy && onCancel()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(48,34,24,.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 1400, overflowY: 'auto', padding: '20px 16px',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-yarn-confirm-title"
    >
      <div
        style={{
          background: '#FFFCF7', borderRadius: 14,
          width: 560, maxWidth: '100%',
          boxShadow: '0 24px 60px rgba(48,34,24,.25)',
          margin: 'auto', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ background: '#61846D', padding: '20px 24px', position: 'relative' }}>
          <button
            onClick={() => !busy && onCancel()}
            disabled={busy}
            aria-label="Luk"
            style={{
              position: 'absolute', top: 12, right: 16,
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,.7)', fontSize: 18,
              cursor: busy ? 'default' : 'pointer',
              minWidth: 44, minHeight: 44,
            }}
          >
            ✕
          </button>
          <div
            id="return-yarn-confirm-title"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 20, fontWeight: 600, color: '#fff',
            }}
          >
            Læg sammen med eksisterende garn?
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginTop: 2 }}>
            Vi fandt {candidates.length === 1 ? 'et garn' : `${candidates.length} garn`} på dit lager der ligner.
          </div>
        </div>

        {/* Cards */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {candidates.map(c => {
            const decision = decisions.get(c.source.yarnUsageId) ?? 'merge'
            const tone = MATCH_KIND_TONE[c.match.matchKind]
            return (
              <div
                key={c.source.yarnUsageId}
                style={{
                  border: '1px solid #EDE7D8',
                  borderRadius: 10,
                  padding: 14,
                  background: '#F9F6F0',
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex', alignSelf: 'flex-start',
                    padding: '2px 8px', borderRadius: 4,
                    fontSize: 10, fontWeight: 500, letterSpacing: '.05em',
                    background: tone.bg, color: tone.fg,
                  }}
                >
                  {MATCH_KIND_LABEL[c.match.matchKind]}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Source (returneres) */}
                  <YarnSummary
                    label="Returneres"
                    hex={c.source.hex}
                    brand={c.source.yarnBrand}
                    name={c.source.yarnName}
                    colorName={c.source.colorName}
                    qty={Number(c.source.quantityUsed ?? 0)}
                  />
                  <div aria-hidden style={{ fontSize: 18, color: '#8C7E74' }}>↔</div>
                  {/* Match (på lager) */}
                  <YarnSummary
                    label="På lager"
                    hex={c.match.hex}
                    brand={c.match.brand}
                    name={c.match.name}
                    colorName={c.match.colorName}
                    qty={c.match.currentQuantity}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Radio
                    name={`d-${c.source.yarnUsageId}`}
                    value="merge"
                    checked={decision === 'merge'}
                    onChange={() => setDecision(c.source.yarnUsageId, 'merge')}
                    label="Det er det samme garn — læg sammen"
                  />
                  <Radio
                    name={`d-${c.source.yarnUsageId}`}
                    value="separate"
                    checked={decision === 'separate'}
                    onChange={() => setDecision(c.source.yarnUsageId, 'separate')}
                    label="Det er forskellige — opret som ny række"
                  />
                </div>
              </div>
            )
          })}

          {candidates.length > 1 && (
            <button
              type="button"
              onClick={applyToAll}
              disabled={busy}
              style={{
                alignSelf: 'flex-start',
                padding: '6px 12px',
                fontSize: 11,
                color: '#61846D',
                background: 'transparent',
                border: '1px dashed #61846D',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Behold første valg for alle
            </button>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{
                padding: '8px 14px',
                border: '1px solid #D0C8BA',
                borderRadius: 6,
                background: 'transparent',
                fontSize: 13,
                cursor: busy ? 'default' : 'pointer',
                color: '#8C7E74',
                fontFamily: "'DM Sans', sans-serif",
                minHeight: 44,
              }}
            >
              Annuller
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              style={{
                padding: '8px 20px',
                background: busy ? '#8C7E74' : '#61846D',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: busy ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                minHeight: 44,
              }}
            >
              {busy ? 'Behandler…' : 'Bekræft'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function YarnSummary({
  label, hex, brand, name, colorName, qty,
}: {
  label: string
  hex: string | null
  brand: string | null
  name: string | null
  colorName: string | null
  qty: number
}) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden
          style={{
            width: 22, height: 22, borderRadius: 5,
            background: hex || '#A8C4C4',
            border: '1px solid rgba(48,34,24,.15)',
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0, fontSize: 12, color: '#302218', lineHeight: 1.3 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {[brand, name].filter(Boolean).join(' · ') || 'Garn'}
          </div>
          <div style={{ color: '#8B7D6B', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {colorName ?? ''} · {qty} ngl
          </div>
        </div>
      </div>
    </div>
  )
}

function Radio({
  name, value, checked, onChange, label,
}: {
  name: string
  value: string
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 4px', cursor: 'pointer',
        fontSize: 13, color: '#302218',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, cursor: 'pointer' }}
      />
      <span>{label}</span>
    </label>
  )
}
