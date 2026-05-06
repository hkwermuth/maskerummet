'use client'

import { useState } from 'react'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import type {
  FinalizableClassification,
  FinalizableEntry,
  FinalizableSource,
  FinalizeDecision,
  MultiProjectEntry,
} from '@/lib/yarn-finalize'

export type MarkYarnsBrugtOpModalProps = {
  classification: FinalizableClassification
  projektTitel:   string
  onCancel:       () => void
  onConfirm:      (decisions: Map<string, FinalizeDecision>) => Promise<void> | void
}

const buttonBase: React.CSSProperties = {
  padding:    '8px 14px',
  borderRadius: 6,
  fontSize:   13,
  fontWeight: 500,
  fontFamily: "'DM Sans', sans-serif",
  cursor:     'pointer',
  border:     'none',
  minHeight:  44,
}

export default function MarkYarnsBrugtOpModal({
  classification, projektTitel, onCancel, onConfirm,
}: MarkYarnsBrugtOpModalProps) {
  // Default: behold ALT på lager (ikke-destruktivt — bruger skal eksplicit
  // vælge at noget skal markeres brugt op).
  const [decisions, setDecisions] = useState<Map<string, FinalizeDecision>>(() => {
    const m = new Map<string, FinalizeDecision>()
    for (const e of classification.finalizable) {
      const total = Math.max(0, Math.floor(Number(e.source.quantityUsed ?? 0)))
      m.set(e.source.yarnUsageId, { kind: 'behold', keepOnStock: total })
    }
    return m
  })
  const [busy, setBusy] = useState(false)

  useEscapeKey(!busy, onCancel)

  function setDecision(yarnUsageId: string, d: FinalizeDecision) {
    setDecisions(prev => {
      const next = new Map(prev)
      next.set(yarnUsageId, d)
      return next
    })
  }

  function applyFirstToAll() {
    const first = classification.finalizable[0]
    if (!first) return
    const firstTotal = Math.max(0, Math.floor(Number(first.source.quantityUsed ?? 0)))
    const firstDec = decisions.get(first.source.yarnUsageId)
      ?? { kind: 'behold', keepOnStock: firstTotal }
    const next = new Map<string, FinalizeDecision>()
    for (const e of classification.finalizable) {
      const total = Math.max(0, Math.floor(Number(e.source.quantityUsed ?? 0)))
      // Klamp keepOnStock til target-linjes total ved kopiering — målets total
      // kan være mindre end source'ens.
      next.set(
        e.source.yarnUsageId,
        firstDec.kind === 'brugt-op'
          ? { kind: 'brugt-op' }
          : { kind: 'behold', keepOnStock: Math.min(total, Math.max(0, firstDec.keepOnStock)) },
      )
    }
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

  const hasFinalizable    = classification.finalizable.length > 0
  const hasMultiProject   = classification.multiProject.length > 0
  const hasNoYarnItem     = classification.noYarnItem.length > 0
  const totalShown        = classification.finalizable.length + classification.multiProject.length + classification.noYarnItem.length

  // Hvis der intet er at vise (alle er alreadyBrugtOp), skal modalen ikke åbnes
  // i første omgang. Defensiv guard her hvis kalderen alligevel bruger den.
  if (totalShown === 0) return null

  // Tæller hvor mange linjer der har NOGEN brugt op (helt eller delvist) for
  // at differentiere knaptekst.
  const brugtOpCount = classification.finalizable.reduce((n, e) => {
    const d = decisions.get(e.source.yarnUsageId)
    if (!d) return n
    if (d.kind === 'brugt-op') return n + 1
    const total = Math.max(0, Math.floor(Number(e.source.quantityUsed ?? 0)))
    if (d.keepOnStock < total) return n + 1
    return n
  }, 0)

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
      aria-labelledby="mark-yarns-brugt-op-title"
    >
      <div
        style={{
          background: '#FFFCF7', borderRadius: 14,
          width: 600, maxWidth: '100%',
          boxShadow: '0 24px 60px rgba(48,34,24,.25)',
          margin: 'auto', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ background: '#61846D', padding: '20px 24px', position: 'relative' }}>
          <button
            type="button"
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
            id="mark-yarns-brugt-op-title"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 20, fontWeight: 600, color: '#fff',
            }}
          >
            Markér garn som brugt op?
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginTop: 2 }}>
            {projektTitel || 'Projekt'} markeres som færdigstrikket.
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {hasFinalizable && (
            <>
              <div style={{ fontSize: 13, color: '#302218', lineHeight: 1.5 }}>
                Vælg pr. garn om resten skal markeres <strong>Brugt op</strong> eller <strong>Beholdes på lager</strong>.
                Default er at beholde — vi nulstiller intet uden dit valg.
              </div>

              {classification.finalizable.map(entry => {
                const total = Math.max(0, Math.floor(Number(entry.source.quantityUsed ?? 0)))
                return (
                  <FinalizableCard
                    key={entry.source.yarnUsageId}
                    entry={entry}
                    decision={
                      decisions.get(entry.source.yarnUsageId)
                        ?? { kind: 'behold', keepOnStock: total }
                    }
                    onChange={d => setDecision(entry.source.yarnUsageId, d)}
                    disabled={busy}
                  />
                )
              })}

              {classification.finalizable.length > 1 && (
                <button
                  type="button"
                  onClick={applyFirstToAll}
                  disabled={busy}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '6px 12px',
                    fontSize: 11,
                    color: '#61846D',
                    background: 'transparent',
                    border: '1px dashed #61846D',
                    borderRadius: 6,
                    cursor: busy ? 'default' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Anvend første valg på alle
                </button>
              )}
            </>
          )}

          {hasMultiProject && (
            <MultiProjectInfo entries={classification.multiProject} />
          )}

          {hasNoYarnItem && (
            <NoYarnItemInfo lines={classification.noYarnItem} />
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              style={{
                ...buttonBase,
                border: '1px solid #D0C8BA',
                background: 'transparent',
                color: '#8C7E74',
              }}
            >
              Annuller
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              style={{
                ...buttonBase,
                background: busy ? '#8C7E74' : '#61846D',
                color: '#fff',
              }}
            >
              {busy
                ? 'Behandler…'
                : brugtOpCount === 0
                  ? 'Markér færdig (intet brugt op)'
                  : 'Markér garn brugt op'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── FinalizableCard ──────────────────────────────────────────────────────────

function FinalizableCard({
  entry, decision, onChange, disabled,
}: {
  entry:    FinalizableEntry
  decision: FinalizeDecision
  onChange: (d: FinalizeDecision) => void
  disabled: boolean
}) {
  const { source } = entry
  const used = Math.max(0, Math.floor(Number(source.quantityUsed ?? 0)))
  const isBehold = decision.kind === 'behold'
  const keepOnStock = isBehold ? Math.max(0, Math.min(used, Math.floor(decision.keepOnStock))) : 0
  const usedUp = isBehold ? used - keepOnStock : used

  return (
    <div
      style={{
        border: '1px solid #EDE7D8',
        borderRadius: 10,
        padding: 14,
        background: '#F9F6F0',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 24, height: 24, borderRadius: 5,
            background: source.hex || '#A8C4C4',
            border: '1px solid rgba(48,34,24,.15)',
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 13, color: '#302218', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {[source.yarnBrand, source.yarnName].filter(Boolean).join(' · ') || 'Garn'}
          </div>
          <div style={{ fontSize: 11, color: '#8B7D6B' }}>
            {source.colorName ?? ''} · brugt {used} ngl
          </div>
        </div>
      </div>

      <div role="radiogroup" aria-label={`Status for ${source.yarnBrand ?? ''} ${source.yarnName ?? ''}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Radio
          name={`d-${source.yarnUsageId}`}
          checked={isBehold}
          onChange={() => onChange({ kind: 'behold', keepOnStock: used })}
          disabled={disabled}
          label="Behold på lager (helt eller delvist)"
        />
        <Radio
          name={`d-${source.yarnUsageId}`}
          checked={decision.kind === 'brugt-op'}
          onChange={() => onChange({ kind: 'brugt-op' })}
          disabled={disabled}
          label="Brugt op — markér som forbrugt"
        />
      </div>

      {/* Antal-split-input vises kun når 'behold' er valgt. Default = used (alt
          tilbage på lager); brugeren kan reducere så resten markeres brugt op. */}
      {isBehold && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#302218', fontFamily: "'DM Sans', sans-serif" }}>
            <span>Antal til lager:</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={used}
              step={1}
              value={keepOnStock}
              disabled={disabled}
              onChange={e => {
                const raw = Number(e.target.value)
                const clamped = Number.isFinite(raw)
                  ? Math.max(0, Math.min(used, Math.floor(raw)))
                  : 0
                onChange({ kind: 'behold', keepOnStock: clamped })
              }}
              style={{
                width: 70,
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid #D0C8BA',
                borderRadius: 6,
                background: '#FFFCF7',
                fontFamily: "'DM Sans', sans-serif",
                color: '#302218',
                minHeight: 36,
              }}
            />
            <span style={{ color: '#8B7D6B' }}>af {used}</span>
          </label>
          <div style={{ fontSize: 11, color: '#8B7D6B', lineHeight: 1.5 }}>
            {keepOnStock === used
              ? 'Alle nøgler flyttes tilbage til "På lager".'
              : keepOnStock === 0
                ? 'Alle nøgler markeres brugt op.'
                : `${keepOnStock} ngl tilbage til lager · ${usedUp} ngl markeres brugt op.`}
          </div>
        </div>
      )}
    </div>
  )
}

// ── MultiProjectInfo (AC-3) ──────────────────────────────────────────────────

function MultiProjectInfo({ entries }: { entries: MultiProjectEntry[] }) {
  return (
    <div
      role="status"
      style={{
        background: '#FAEEDA',
        color: '#633806',
        border: '1px solid #E2C9A5',
        borderRadius: 8,
        padding: 12,
        fontSize: 12, lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        Kan ikke markeres brugt op endnu
      </div>
      <div style={{ marginBottom: 8 }}>
        {entries.length === 1 ? 'Et garn' : `${entries.length} garn`} bruges også af andre aktive projekter:
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entries.map(e => (
          <li key={e.source.yarnUsageId}>
            <strong>{[e.source.yarnBrand, e.source.yarnName].filter(Boolean).join(' · ') || 'Garn'}</strong>
            {' — også i: '}
            {e.otherProjectTitles.join(', ') || '(ukendte projekter)'}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── NoYarnItemInfo (AC-4) ────────────────────────────────────────────────────

function NoYarnItemInfo({ lines }: { lines: FinalizableSource[] }) {
  return (
    <div
      role="status"
      style={{
        background: '#EAF3DE',
        color: '#173404',
        border: '1px solid #C8DDB1',
        borderRadius: 8,
        padding: 12,
        fontSize: 12, lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        Ikke knyttet til dit lager
      </div>
      <div>
        {lines.length === 1 ? 'Et garn' : `${lines.length} garn`} på projektet er ikke linket til Mit Garn
        og kan derfor ikke automatisk markeres brugt op. Du kan opdatere status i Mit Garn manuelt.
      </div>
    </div>
  )
}

// ── Radio ────────────────────────────────────────────────────────────────────

function Radio({
  name, checked, onChange, label, disabled,
}: {
  name:     string
  checked:  boolean
  onChange: () => void
  label:    string
  disabled: boolean
}) {
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 4px',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13, color: '#302218',
        fontFamily: "'DM Sans', sans-serif",
        minHeight: 44,
      }}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ width: 16, height: 16, cursor: disabled ? 'default' : 'pointer' }}
      />
      <span>{label}</span>
    </label>
  )
}
