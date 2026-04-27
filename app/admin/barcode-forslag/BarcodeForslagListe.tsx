'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/client'
import {
  approveBarcodeSuggestion,
  rejectBarcodeSuggestion,
} from '@/lib/data/barcodeSuggestions'
import { searchYarnsFull, fetchColorsForYarn, displayYarnName } from '@/lib/catalog'
import type { BarcodeSuggestion } from '@/lib/types'

type YarnRow = { id: string; producer: string; name: string; series: string | null; full_name?: string }
type ColorRow = {
  id: string
  yarn_id: string
  color_number: string | null
  color_name: string | null
  hex_code: string | null
  status: string | null
  barcode: string | null
}

type Props = { suggestions: BarcodeSuggestion[] }

/**
 * Editor-side til at godkende eller afvise stregkode-forslag.
 *
 * Forslag grupperes efter EAN — så hvis flere brugere har bidraget samme
 * kode, vises de samlet (editor kan vælge den bedste).
 */
export default function BarcodeForslagListe({ suggestions }: Props) {
  const router = useRouter()

  const groups = useMemo(() => {
    const map = new Map<string, BarcodeSuggestion[]>()
    for (const s of suggestions) {
      const arr = map.get(s.barcode) ?? []
      arr.push(s)
      map.set(s.barcode, arr)
    }
    return Array.from(map.entries())
  }, [suggestions])

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-striq-border bg-cream p-8 text-center">
        <div className="text-3xl mb-2">✓</div>
        <p className="text-striq-sage font-medium">Ingen forslag i kø.</p>
        <p className="text-sm text-striq-muted mt-1">Godt arbejde!</p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {groups.map(([barcode, group]) => (
        <BarcodeGruppe
          key={barcode}
          barcode={barcode}
          suggestions={group}
          onResolved={() => router.refresh()}
        />
      ))}
    </ul>
  )
}

function BarcodeGruppe({
  barcode,
  suggestions,
  onResolved,
}: {
  barcode: string
  suggestions: BarcodeSuggestion[]
  onResolved: () => void
}) {
  const supabase = useSupabase()

  const [yarnQuery, setYarnQuery] = useState(suggestions[0]?.suggested_producer ?? '')
  const [yarnResults, setYarnResults] = useState<YarnRow[]>([])
  const [pickedYarn, setPickedYarn] = useState<YarnRow | null>(null)
  const [colors, setColors] = useState<ColorRow[]>([])
  const [pickedColorId, setPickedColorId] = useState<string>('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmApprove, setConfirmApprove] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (yarnQuery.trim().length < 2 || pickedYarn) return
    debounceRef.current = setTimeout(async () => {
      const results = (await searchYarnsFull(supabase, yarnQuery)) as YarnRow[]
      setYarnResults(results.slice(0, 6))
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [yarnQuery, pickedYarn, supabase])

  useEffect(() => {
    if (!pickedYarn) {
      setColors([])
      setPickedColorId('')
      return
    }
    fetchColorsForYarn(supabase, pickedYarn.id, { includeDiscontinued: true }).then(
      (rows) => setColors(rows as ColorRow[])
    )
  }, [pickedYarn, supabase])

  function handlePickYarn(y: YarnRow) {
    setPickedYarn(y)
    setYarnQuery(displayYarnName(y))
    setYarnResults([])
  }

  async function handleApprove() {
    if (!pickedColorId) return
    setError(null)
    setBusy('approve')
    try {
      // Godkend alle forslag i gruppen — første via RPC, resten linkes til samme color.
      const [first, ...rest] = suggestions
      await approveBarcodeSuggestion(supabase, first.id, pickedColorId)
      // Resterende forslag for samme EAN markeres som approved (eller rejected)
      // af editor i en senere iteration. For nu: lad dem stå som 'new' så editor
      // kan se at de blev del-løst. Mere ergonomisk håndtering kommer i v2.
      void rest
      onResolved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke gemme. Prøv igen.')
    } finally {
      setBusy(null)
      setConfirmApprove(false)
    }
  }

  async function handleReject(suggestionId: string) {
    setError(null)
    setBusy(`reject-${suggestionId}`)
    try {
      await rejectBarcodeSuggestion(supabase, suggestionId)
      onResolved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke afvise. Prøv igen.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="rounded-xl border border-striq-border bg-cream p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-striq-muted">EAN</div>
          <code className="text-base font-medium">{barcode}</code>
        </div>
        <div className="text-xs text-striq-muted">
          {suggestions.length} forslag fra brugere
        </div>
      </div>

      <ul className="space-y-2 mb-4">
        {suggestions.map((s) => (
          <li key={s.id} className="text-sm border border-striq-border rounded-md px-3 py-2 bg-striq-input/40 flex items-start gap-3">
            <div className="flex-1">
              <div className="text-striq-sage font-medium">
                {s.suggested_producer ?? '—'}{s.suggested_yarn_name ? ` · ${s.suggested_yarn_name}` : ''}
              </div>
              <div className="text-xs text-striq-muted">
                Farve: {s.suggested_color_number ?? '?'} {s.suggested_color_name ?? ''}
              </div>
              {s.comment && (
                <div className="text-xs text-striq-muted italic mt-1">&ldquo;{s.comment}&rdquo;</div>
              )}
            </div>
            {s.banderole_image_url && (
              <a
                href={s.banderole_image_url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0"
                aria-label="Se foto af banderolen i fuld størrelse"
              >
                <img
                  src={s.banderole_image_url}
                  alt=""
                  className="w-14 h-14 rounded object-cover border border-striq-border"
                />
              </a>
            )}
            <button
              type="button"
              onClick={() => handleReject(s.id)}
              disabled={busy !== null}
              className="text-xs px-2 py-1 border border-striq-border rounded text-striq-muted hover:bg-striq-link/10 hover:text-striq-link disabled:opacity-50 self-start"
              aria-label="Afvis dette forslag"
            >
              {busy === `reject-${s.id}` ? 'Afviser…' : 'Afvis'}
            </button>
          </li>
        ))}
      </ul>

      <div className="space-y-3 border-t border-striq-border pt-4">
        <div className="text-[10px] uppercase tracking-wider text-striq-muted font-medium">
          Vælg garn der skal kobles til EAN
        </div>

        <div className="relative">
          <label htmlFor={`yarn-${barcode}`} className="sr-only">Garn</label>
          <input
            id={`yarn-${barcode}`}
            type="text"
            value={yarnQuery}
            onChange={(e) => { setYarnQuery(e.target.value); setPickedYarn(null) }}
            placeholder="Søg garn (producent + navn)"
            className="w-full px-3 py-2 border border-striq-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
          />
          {yarnResults.length > 0 && (
            <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-striq-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {yarnResults.map((y) => (
                <li key={y.id}>
                  <button
                    type="button"
                    onClick={() => handlePickYarn(y)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-moss/40 min-h-[44px]"
                  >
                    <div className="text-xs text-striq-muted">{y.producer}</div>
                    <div className="text-striq-sage">{displayYarnName(y)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {pickedYarn && (
          <div>
            <label htmlFor={`color-${barcode}`} className="block text-xs text-striq-muted mb-1">Farve</label>
            <select
              id={`color-${barcode}`}
              value={pickedColorId}
              onChange={(e) => setPickedColorId(e.target.value)}
              className="w-full px-3 py-2 border border-striq-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
            >
              <option value="">— vælg farve —</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.color_number ?? '?'} — {c.color_name ?? ''}
                  {c.status === 'udgaaet' ? ' (udgået)' : ''}
                  {c.barcode ? ` [allerede knyttet til ${c.barcode}]` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div role="alert" className="text-sm text-striq-link bg-striq-link/10 border border-striq-link/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setConfirmApprove(true)}
            disabled={!pickedColorId || busy !== null}
            className="px-4 py-2 text-sm text-cream rounded-md hover:opacity-95 disabled:opacity-50"
            style={{ background: '#61846D' }}
          >
            Godkend kobling
          </button>
        </div>
      </div>

      {confirmApprove && pickedYarn && pickedColorId && (
        <ConfirmApproveModal
          barcode={barcode}
          yarnName={displayYarnName(pickedYarn)}
          colorLabel={
            colors.find((c) => c.id === pickedColorId)?.color_name ??
            colors.find((c) => c.id === pickedColorId)?.color_number ??
            'farve'
          }
          onConfirm={handleApprove}
          onCancel={() => setConfirmApprove(false)}
          busy={busy === 'approve'}
        />
      )}
    </li>
  )
}

function ConfirmApproveModal({
  barcode,
  yarnName,
  colorLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  barcode: string
  yarnName: string
  colorLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel()}
      className="fixed inset-0 bg-black/60 z-[1300] flex items-center justify-center p-4"
    >
      <div className="bg-cream rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="font-serif text-xl text-striq-sage mb-3">Bekræft kobling</h3>
        <p className="text-sm text-striq-text mb-2">
          EAN <code className="bg-striq-input px-1.5 py-0.5 rounded">{barcode}</code> kobles til:
        </p>
        <p className="text-sm font-medium text-striq-sage mb-3">{yarnName} — {colorLabel}</p>
        <p className="text-xs text-striq-muted mb-5">
          Dette opdaterer kataloget for alle brugere. Hvis EAN&apos;en allerede er på en anden farve, flyttes den.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm border border-striq-border rounded-md text-striq-muted hover:bg-striq-border/30 disabled:opacity-50"
          >
            Annullér
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="px-4 py-2 text-sm text-cream rounded-md hover:opacity-95 disabled:opacity-50"
            style={{ background: '#61846D' }}
          >
            {busy ? 'Gemmer…' : 'Godkend'}
          </button>
        </div>
      </div>
    </div>
  )
}
