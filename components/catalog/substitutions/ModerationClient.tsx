'use client'

import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { SubstitutionSuggestionRow } from '@/lib/types'

export function ModerationClient() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [rows, setRows] = useState<SubstitutionSuggestionRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    setErr(null)
    const { data, error } = await supabase
      .from('substitution_suggestions')
      .select('*')
      .eq('suggestion_type', 'external')
      .eq('status', 'new')
      .order('created_at', { ascending: true })
    if (error) setErr(error.message)
    setRows((data ?? []) as SubstitutionSuggestionRow[])
    setLoading(false)
  }

  useEffect(() => { void load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(id: string, status: 'approved' | 'rejected') {
    const { error } = await supabase
      .from('substitution_suggestions')
      .update({ status })
      .eq('id', id)
    if (error) setErr(error.message)
    else await load()
  }

  return (
    <div className="space-y-4">
      {err && <p className="text-sm text-striq-link">{err}</p>}
      {loading ? <p className="text-striq-muted">Henter…</p> : null}
      <div className="bg-cream border border-striq-border rounded-xl divide-y divide-striq-border overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-3 text-striq-muted">Ingen eksterne forslag til moderation.</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-striq-link">Eksternt forslag</div>
              <div className="text-striq-sage font-medium">
                {r.suggested_producer} {r.suggested_name}
                {r.suggested_series ? <span className="italic text-striq-muted"> — {r.suggested_series}</span> : null}
              </div>
              {r.suggested_url && (
                <a className="text-xs underline text-striq-muted" href={r.suggested_url} target="_blank" rel="noreferrer">
                  {r.suggested_url}
                </a>
              )}
              {r.comment && <div className="text-sm text-striq-muted mt-2 whitespace-pre-wrap">{r.comment}</div>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => void setStatus(r.id, 'approved')}
                  className="bg-striq-sage text-cream px-3 py-2 rounded-lg text-sm"
                >
                  Godkend
                </button>
                <button
                  onClick={() => void setStatus(r.id, 'rejected')}
                  className="bg-striq-border text-striq-muted px-3 py-2 rounded-lg text-sm"
                >
                  Afvis
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
