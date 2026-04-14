'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toSlug } from '@/lib/slug'
import type {
  SubstitutionCandidate,
  SubstitutionSuggestionRow,
  SubstitutionVoteRow,
  Verdict,
} from '@/lib/types'

type Props = {
  yarnId: string
  substitutions: SubstitutionCandidate[]
}

type VoteSummary = Record<Verdict, number>

const VERDICT_HELP: Record<Verdict, string> = {
  perfekt: 'Meget tæt match på de vigtigste egenskaber (tykkelse, løbelængde, strikkefasthed, fibre, vask og pinde).',
  god: 'Godt match, men med mindre afvigelser. Tjek strikkefasthed og udtryk før du går i gang.',
  forbehold: 'Kan fungere, men kræver at du justerer (strikkefasthed/forbrug/udtryk).',
  virker_ikke: 'Matcher dårligt på en eller flere vigtige egenskaber.',
}

function emptySummary(): VoteSummary {
  return { perfekt: 0, god: 0, forbehold: 0, virker_ikke: 0 }
}

function shortUser(u: string) {
  const s = (u || '').replace(/-/g, '')
  return s ? `Bruger ${s.slice(0, 6)}` : 'Bruger'
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, string> = {
    perfekt: 'bg-moss/40 text-forest',
    god: 'bg-sky-100 text-sky-900',
    forbehold: 'bg-amber-100 text-amber-900',
    virker_ikke: 'bg-red-100 text-red-900',
  }
  const cls = map[verdict] ?? 'bg-stone text-bark'
  const help = (VERDICT_HELP as Record<string, string>)[verdict]
  return (
    <span
      className={`text-[11px] uppercase tracking-wider px-2 py-1 rounded ${cls}`}
      title={help ?? verdict.replace(/_/g, ' ')}
    >
      {verdict.replace(/_/g, ' ')}
    </span>
  )
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-bark/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto max-w-xl px-4">
        <div className="bg-white rounded-xl border border-stone shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-stone flex items-center justify-between">
            <div className="font-serif text-lg text-forest">{title}</div>
            <button onClick={onClose} className="text-bark/70 hover:text-bark px-2">
              ×
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function SubstitutionsSection({ yarnId, substitutions }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const candidateIds = useMemo(() => substitutions.map((s) => s.yarn_id), [substitutions])

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [votesByCandidate, setVotesByCandidate] = useState<Record<string, SubstitutionVoteRow[]>>({})
  const [myVoteByCandidate, setMyVoteByCandidate] = useState<Record<string, Verdict | null>>({})

  const [suggestions, setSuggestions] = useState<SubstitutionSuggestionRow[]>([])
  const [myPendingExternal, setMyPendingExternal] = useState<SubstitutionSuggestionRow[]>([])

  const [commentsOpenFor, setCommentsOpenFor] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [saveErr, setSaveErr] = useState<string | null>(null)

  const [suggestOpen, setSuggestOpen] = useState(false)
  const [suggestTab, setSuggestTab] = useState<'catalog' | 'external'>('catalog')
  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogResults, setCatalogResults] = useState<Array<{ id: string; producer: string; name: string; series: string | null }>>([])
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null)
  const [externalProducer, setExternalProducer] = useState('')
  const [externalName, setExternalName] = useState('')
  const [externalSeries, setExternalSeries] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [suggestNote, setSuggestNote] = useState('')
  const [suggestErr, setSuggestErr] = useState<string | null>(null)

  async function loadAll() {
    setLoading(true)
    setSaveErr(null)
    const { data: auth } = await supabase.auth.getUser()
    const uid = auth.user?.id ?? null
    setUserId(uid)

    // Votes for the visible candidates
    if (candidateIds.length > 0) {
      const { data: votes, error } = await supabase
        .from('substitution_votes')
        .select('id,target_yarn_id,candidate_yarn_id,user_id,verdict,comment,created_at,updated_at')
        .eq('target_yarn_id', yarnId)
        .in('candidate_yarn_id', candidateIds)

      if (!error) {
        const grouped: Record<string, SubstitutionVoteRow[]> = {}
        const mine: Record<string, Verdict | null> = {}
        for (const v of (votes ?? []) as SubstitutionVoteRow[]) {
          if (!grouped[v.candidate_yarn_id]) grouped[v.candidate_yarn_id] = []
          grouped[v.candidate_yarn_id].push(v)
          if (uid && v.user_id === uid) mine[v.candidate_yarn_id] = v.verdict
        }
        setVotesByCandidate(grouped)
        setMyVoteByCandidate(mine)
      }
    }

    // Approved suggestions (catalog+external)
    const { data: sug, error: sErr } = await supabase
      .from('substitution_suggestions')
      .select('*')
      .eq('target_yarn_id', yarnId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    if (!sErr) setSuggestions((sug ?? []) as SubstitutionSuggestionRow[])

    // My pending external suggestions
    if (uid) {
      const { data: pending, error: pErr } = await supabase
        .from('substitution_suggestions')
        .select('*')
        .eq('target_yarn_id', yarnId)
        .eq('suggestion_type', 'external')
        .eq('status', 'new')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
      if (!pErr) setMyPendingExternal((pending ?? []) as SubstitutionSuggestionRow[])
    } else {
      setMyPendingExternal([])
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yarnId, candidateIds.join('|')])

  function summaryFor(candidateId: string): VoteSummary {
    const rows = votesByCandidate[candidateId] ?? []
    const sum = emptySummary()
    for (const r of rows) {
      sum[r.verdict] = (sum[r.verdict] ?? 0) + 1
    }
    return sum
  }

  function commentsFor(candidateId: string) {
    return (votesByCandidate[candidateId] ?? [])
      .filter((v) => (v.comment ?? '').trim().length > 0)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  }

  async function setVote(candidateId: string, verdict: Verdict) {
    if (!userId) {
      setSaveErr('Du skal være logget ind for at validere.')
      return
    }
    setSaveErr(null)
    const existing = (votesByCandidate[candidateId] ?? []).find((v) => v.user_id === userId) ?? null
    if (existing) {
      const { error } = await supabase
        .from('substitution_votes')
        .update({ verdict })
        .eq('id', existing.id)
      if (error) setSaveErr(error.message)
    } else {
      const { error } = await supabase
        .from('substitution_votes')
        .insert({
          target_yarn_id: yarnId,
          candidate_yarn_id: candidateId,
          user_id: userId,
          verdict,
          comment: null,
        })
      if (error) setSaveErr(error.message)
    }
    await loadAll()
  }

  async function saveComment(candidateId: string) {
    if (!userId) {
      setSaveErr('Du skal være logget ind for at skrive kommentarer.')
      return
    }
    const text = commentDraft.trim()
    if (!text) return
    const existing = (votesByCandidate[candidateId] ?? []).find((v) => v.user_id === userId) ?? null
    setSaveErr(null)
    if (existing) {
      const { error } = await supabase.from('substitution_votes').update({ comment: text }).eq('id', existing.id)
      if (error) setSaveErr(error.message)
    } else {
      const { error } = await supabase
        .from('substitution_votes')
        .insert({
          target_yarn_id: yarnId,
          candidate_yarn_id: candidateId,
          user_id: userId,
          verdict: 'forbehold',
          comment: text,
        })
      if (error) setSaveErr(error.message)
    }
    setCommentDraft('')
    await loadAll()
  }

  async function searchCatalog(q: string) {
    const t = q.trim()
    if (t.length < 2) {
      setCatalogResults([])
      return
    }
    const p = `%${t.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
    const { data, error } = await supabase
      .from('yarns_full')
      .select('id,producer,name,series')
      .or(`producer.ilike.${p},name.ilike.${p},full_name.ilike.${p}`)
      .limit(20)
    if (!error) setCatalogResults((data ?? []) as any)
  }

  async function submitSuggestion() {
    setSuggestErr(null)
    if (!userId) {
      setSuggestErr('Du skal være logget ind for at foreslå.')
      return
    }
    if (suggestTab === 'catalog') {
      if (!selectedCatalogId) {
        setSuggestErr('Vælg et garn fra kataloget.')
        return
      }
      const { error } = await supabase.from('substitution_suggestions').insert({
        target_yarn_id: yarnId,
        suggested_yarn_id: selectedCatalogId,
        suggestion_type: 'catalog',
        status: 'approved',
        user_id: userId,
        comment: suggestNote.trim() || null,
      })
      if (error) setSuggestErr(error.message)
      else {
        setSuggestOpen(false)
        setSuggestNote('')
        setSelectedCatalogId(null)
        setCatalogQuery('')
        setCatalogResults([])
        await loadAll()
      }
      return
    }

    // external
    const producer = externalProducer.trim()
    const name = externalName.trim()
    const url = externalUrl.trim()
    if (!producer || !name || !url) {
      setSuggestErr('Udfyld producent, navn og link.')
      return
    }
    const { error } = await supabase.from('substitution_suggestions').insert({
      target_yarn_id: yarnId,
      suggested_yarn_id: null,
      suggested_producer: producer,
      suggested_name: name,
      suggested_series: externalSeries.trim() || null,
      suggested_url: url,
      suggested_specs: null,
      suggestion_type: 'external',
      status: 'new',
      user_id: userId,
      comment: suggestNote.trim() || null,
    })
    if (error) setSuggestErr(error.message)
    else {
      setSuggestOpen(false)
      setSuggestNote('')
      setExternalProducer('')
      setExternalName('')
      setExternalSeries('')
      setExternalUrl('')
      await loadAll()
    }
  }

  const approvedCatalogIds = useMemo(() => {
    return suggestions.filter((s) => s.suggestion_type === 'catalog' && s.suggested_yarn_id).map((s) => s.suggested_yarn_id!) ?? []
  }, [suggestions])

  const [catalogSuggestionYarns, setCatalogSuggestionYarns] = useState<Record<string, { producer: string; name: string; series: string | null }>>({})
  useEffect(() => {
    async function fetchYarns() {
      const ids = [...new Set(approvedCatalogIds)]
      if (ids.length === 0) {
        setCatalogSuggestionYarns({})
        return
      }
      const { data, error } = await supabase.from('yarns_full').select('id,producer,name,series').in('id', ids)
      if (error) return
      const map: Record<string, any> = {}
      for (const y of (data ?? []) as any[]) map[y.id] = { producer: y.producer, name: y.name, series: y.series ?? null }
      setCatalogSuggestionYarns(map)
    }
    void fetchYarns()
  }, [approvedCatalogIds.join('|'), supabase])

  return (
    <section className="mt-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-forest mb-1">Mulige substitutter</h2>
          <p className="text-xs text-bark/70 mb-3">
            Forslagene er automatisk beregnet ud fra garnets tykkelse, løbelængde, strikkefasthed, fiberindhold og vaskeanvisning.
          </p>
          {saveErr && <p className="text-xs text-terracotta mb-2">{saveErr}</p>}
        </div>
        <button
          onClick={() => setSuggestOpen(true)}
          className="text-xs bg-stone px-3 py-2 rounded-lg hover:bg-sand"
        >
          + Foreslå substitut
        </button>
      </div>

      <ul className="divide-y divide-stone border border-stone rounded-lg overflow-hidden bg-white">
        {substitutions.map((s) => {
          const slug = toSlug(s.producer, s.name, s.series)
          const sum = summaryFor(s.yarn_id)
          const my = myVoteByCandidate[s.yarn_id] ?? null
          const totalVotes = sum.perfekt + sum.god + sum.forbehold + sum.virker_ikke
          return (
            <li key={s.yarn_id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/${slug}`} className="min-w-0 flex-1">
                  <div className="text-xs uppercase tracking-wider text-terracotta">{s.producer}</div>
                  <div className="text-forest truncate">
                    {s.name}
                    {s.series ? <span className="italic text-bark"> — {s.series}</span> : null}
                  </div>
                  {s.notes && <div className="text-xs text-bark/80 mt-1">{s.notes}</div>}
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  {s.is_manual && (
                    <span title="Verificeret manuelt" className="text-xs text-forest">
                      ✓
                    </span>
                  )}
                  <VerdictBadge verdict={s.verdict} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-bark/70">
                  {totalVotes > 0
                    ? `${sum.perfekt}× Perfekt · ${sum.god}× God · ${sum.forbehold}× Forbehold · ${sum.virker_ikke}× Virker ikke`
                    : 'Ingen bruger-valideringer endnu'}
                </span>
                <span className="mx-1 text-bark/40">•</span>
                <button
                  onClick={() => {
                    setCommentsOpenFor(s.yarn_id)
                    const mine = (votesByCandidate[s.yarn_id] ?? []).find((v) => v.user_id === userId)?.comment ?? ''
                    setCommentDraft(mine || '')
                  }}
                  className="underline text-bark hover:text-forest"
                >
                  Se kommentarer
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-terracotta">Din vurdering</span>
                {(['perfekt', 'god', 'forbehold', 'virker_ikke'] as Verdict[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => void setVote(s.yarn_id, v)}
                    className={`text-xs px-2 py-1 rounded border ${
                      my === v ? 'bg-forest text-cream border-forest' : 'bg-cream border-stone hover:bg-sand'
                    }`}
                    disabled={loading}
                    title={VERDICT_HELP[v]}
                  >
                    {v === 'virker_ikke' ? 'Virker ikke' : v[0].toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      {(suggestions.length > 0 || myPendingExternal.length > 0) && (
        <section className="mt-8">
          <h3 className="font-serif text-lg text-forest mb-2">Brugerforslag</h3>
          <div className="bg-cream border border-stone rounded-xl divide-y divide-stone overflow-hidden">
            {myPendingExternal.map((s) => (
              <div key={s.id} className="px-4 py-3 text-sm">
                <div className="text-xs uppercase tracking-wider text-terracotta">Afventer godkendelse</div>
                <div className="text-forest">
                  {s.suggested_producer} {s.suggested_name}
                  {s.suggested_series ? <span className="italic text-bark"> — {s.suggested_series}</span> : null}
                </div>
                {s.suggested_url && (
                  <a className="text-xs underline text-bark" href={s.suggested_url} target="_blank" rel="noreferrer">
                    {s.suggested_url}
                  </a>
                )}
                {s.comment && <div className="text-xs text-bark/80 mt-1">{s.comment}</div>}
              </div>
            ))}

            {suggestions.map((s) => {
              if (s.suggestion_type === 'catalog' && s.suggested_yarn_id) {
                const y = catalogSuggestionYarns[s.suggested_yarn_id]
                const slug = y ? toSlug(y.producer, y.name, y.series) : null
                return (
                  <div key={s.id} className="px-4 py-3 text-sm">
                    <div className="text-xs uppercase tracking-wider text-terracotta">Foreslået af brugere</div>
                    {y && slug ? (
                      <Link className="text-forest underline" href={`/${slug}`}>
                        {y.producer} {y.name}
                        {y.series ? <span className="italic text-bark"> — {y.series}</span> : null}
                      </Link>
                    ) : (
                      <div className="text-forest">Katalog-garn (kan ikke vises lige nu)</div>
                    )}
                    {s.comment && <div className="text-xs text-bark/80 mt-1">{s.comment}</div>}
                  </div>
                )
              }
              // external approved
              return (
                <div key={s.id} className="px-4 py-3 text-sm">
                  <div className="text-xs uppercase tracking-wider text-terracotta">Foreslået af brugere</div>
                  <div className="text-forest">
                    {s.suggested_producer} {s.suggested_name}
                    {s.suggested_series ? <span className="italic text-bark"> — {s.suggested_series}</span> : null}
                    <span className="ml-2 text-[11px] bg-stone text-bark px-2 py-1 rounded">ikke i kataloget endnu</span>
                  </div>
                  {s.suggested_url && (
                    <a className="text-xs underline text-bark" href={s.suggested_url} target="_blank" rel="noreferrer">
                      {s.suggested_url}
                    </a>
                  )}
                  {s.comment && <div className="text-xs text-bark/80 mt-1">{s.comment}</div>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <Modal
        open={!!commentsOpenFor}
        title="Kommentarer og din validering"
        onClose={() => setCommentsOpenFor(null)}
      >
        {commentsOpenFor ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {(commentsFor(commentsOpenFor) ?? []).slice(0, 50).map((c) => (
                <div key={c.id} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wider text-terracotta">{shortUser(c.user_id)}</span>
                    <VerdictBadge verdict={c.verdict} />
                    <span className="text-xs text-bark/60">{new Date(c.created_at).toLocaleDateString('da')}</span>
                  </div>
                  <div className="text-bark mt-1 whitespace-pre-wrap">{c.comment}</div>
                </div>
              ))}
              {commentsFor(commentsOpenFor).length === 0 && (
                <p className="text-sm text-bark/70">Ingen kommentarer endnu.</p>
              )}
            </div>

            <div className="border-t border-stone pt-4">
              <div className="text-xs uppercase tracking-wider text-terracotta mb-2">Skriv en kommentar</div>
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                rows={4}
                placeholder={userId ? 'Del din erfaring (valgfrit).' : 'Log ind for at kommentere.'}
                className="w-full px-3 py-2 rounded-lg border border-stone bg-cream"
                disabled={!userId}
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xs text-bark/60">Tip: din kommentar gemmes på din validering.</div>
                <button
                  onClick={() => void saveComment(commentsOpenFor)}
                  className="bg-forest text-cream px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  disabled={!userId || commentDraft.trim().length === 0}
                >
                  Gem
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={suggestOpen} title="Foreslå et substitut" onClose={() => setSuggestOpen(false)}>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSuggestTab('catalog')}
            className={`text-xs px-3 py-2 rounded-lg border ${suggestTab === 'catalog' ? 'bg-forest text-cream border-forest' : 'bg-cream border-stone'}`}
          >
            Fra kataloget
          </button>
          <button
            onClick={() => setSuggestTab('external')}
            className={`text-xs px-3 py-2 rounded-lg border ${suggestTab === 'external' ? 'bg-forest text-cream border-forest' : 'bg-cream border-stone'}`}
          >
            Nyt garn (ikke i kataloget)
          </button>
        </div>

        {suggestErr && <p className="text-xs text-terracotta mb-2">{suggestErr}</p>}

        {suggestTab === 'catalog' ? (
          <div className="space-y-3">
            <input
              value={catalogQuery}
              onChange={(e) => {
                const v = e.target.value
                setCatalogQuery(v)
                void searchCatalog(v)
              }}
              placeholder="Søg producent eller garnnavn…"
              className="w-full px-3 py-2 rounded-lg border border-stone bg-cream"
            />
            <div className="max-h-56 overflow-auto border border-stone rounded-lg bg-white">
              {(catalogResults ?? []).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedCatalogId(r.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-cream ${selectedCatalogId === r.id ? 'bg-sand' : ''}`}
                >
                  <div className="text-xs uppercase tracking-wider text-terracotta">{r.producer}</div>
                  <div className="text-forest">
                    {r.name}
                    {r.series ? <span className="italic text-bark"> — {r.series}</span> : null}
                  </div>
                </button>
              ))}
              {catalogResults.length === 0 && <div className="px-3 py-2 text-sm text-bark/70">Søg for at se resultater.</div>}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              value={externalProducer}
              onChange={(e) => setExternalProducer(e.target.value)}
              placeholder="Producent *"
              className="w-full px-3 py-2 rounded-lg border border-stone bg-cream"
            />
            <input
              value={externalName}
              onChange={(e) => setExternalName(e.target.value)}
              placeholder="Garnnavn *"
              className="w-full px-3 py-2 rounded-lg border border-stone bg-cream"
            />
            <input
              value={externalSeries}
              onChange={(e) => setExternalSeries(e.target.value)}
              placeholder="Serie (valgfrit)"
              className="w-full px-3 py-2 rounded-lg border border-stone bg-cream"
            />
            <input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="Link til produkt/datasheet *"
              className="w-full px-3 py-2 rounded-lg border border-stone bg-cream"
            />
            <p className="text-xs text-bark/70">
              Eksterne forslag bliver sendt til moderation og vises først offentligt når de er godkendt.
            </p>
          </div>
        )}

        <div className="mt-3">
          <textarea
            value={suggestNote}
            onChange={(e) => setSuggestNote(e.target.value)}
            rows={3}
            placeholder="Note (valgfrit): hvorfor er det et godt substitut?"
            className="w-full px-3 py-2 rounded-lg border border-stone bg-cream"
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button onClick={() => void submitSuggestion()} className="bg-forest text-cream px-4 py-2 rounded-lg text-sm">
            Send forslag
          </button>
        </div>
      </Modal>
    </section>
  )
}

