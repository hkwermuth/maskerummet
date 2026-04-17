'use client'

import { useState, useEffect } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import Link from 'next/link'

const ADMIN_EMAILS = ['hannah@leanmind.dk', 'hkwermuth@gmail.com', 'pernillejin@hotmail.com']

const COLS = [
  { id: 'garnlager',   label: 'Garnlager',            emoji: '🧶', ac: '#2C4A3E', hdr: '#1A3028', border: '#3A6050' },
  { id: 'mønstre',     label: 'Mønstre & Inspiration', emoji: '✂️', ac: '#4A3C28', hdr: '#2E2418', border: '#6A5638' },
  { id: 'design',      label: 'Design & UI',            emoji: '🎨', ac: '#3A2C4A', hdr: '#221824', border: '#5A3C6A' },
  { id: 'tech',        label: 'Tech & Platform',        emoji: '⚙️', ac: '#1E3C4A', hdr: '#10222C', border: '#2A5A6A' },
  { id: 'forretning',  label: 'Forretning',             emoji: '📊', ac: '#4A2C2C', hdr: '#2C1818', border: '#6A3A3A' },
]

const SEED_CARDS = [
  { column_id: 'garnlager',  title: 'Import fra Ravelry', description: 'API eller CSV export fra hkwermuth-profilen', position: 0 },
  { column_id: 'garnlager',  title: 'Garnsubstitution baseret på stash', description: '', position: 1 },
  { column_id: 'garnlager',  title: 'Fiber-kategorier til filter', description: 'Uld, Merino, Mohair, Alpaka, Plante, Blanding', position: 2 },
  { column_id: 'garnlager',  title: 'Metrage-beregner pr. projekt', description: '', position: 3 },
  { column_id: 'mønstre',    title: 'AI-forklaring af teknikker', description: 'German short rows, Italian cast-off osv.', position: 0 },
  { column_id: 'mønstre',    title: 'Projekter knyttet til garnposter', description: '', position: 1 },
  { column_id: 'mønstre',    title: 'Strikkefasthed-database', description: 'Fælles referenceark på tværs af mærker', position: 2 },
  { column_id: 'design',     title: 'Mobil-first garnlager', description: 'Mange strikker på farten — kamera til scanning', position: 0 },
  { column_id: 'design',     title: 'Farvepalette og typografi færdig', description: '', position: 1 },
  { column_id: 'design',     title: 'Dark mode til aftenstrik', description: '', position: 2 },
  { column_id: 'tech',       title: 'Supabase skema: yarn_stash', description: 'user_id, brand, name, fiber, metrage, hex...', position: 0 },
  { column_id: 'tech',       title: 'Mailerlite → lead magnet flow', description: 'Garnlager-guide trigger', position: 1 },
  { column_id: 'tech',       title: 'Claude API til garnspørgsmål', description: '', position: 2 },
  { column_id: 'forretning', title: 'Affiliate-model med garnbutikker', description: 'Særligt fokus på fysiske DK-butikker', position: 0 },
  { column_id: 'forretning', title: 'Membership: Gratis / Pro', description: 'AI-funktioner bag Pro-muren', position: 1 },
]

const inputStyle: React.CSSProperties = {
  width: '100%', border: '1px solid #D0C8BA', borderRadius: 5,
  padding: '6px 8px', fontSize: 12, fontFamily: "'DM Sans', sans-serif",
  background: '#FFFCF7', color: '#2C2018', outline: 'none', boxSizing: 'border-box',
}

type Card = {
  id: string
  column_id: string
  title: string
  description?: string
  position: number
  created_by?: string
}

type CardsMap = Record<string, Card[]>

export default function IdeerPage() {
  const supabase = useSupabase()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  if (authLoading) return null

  if (!user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 74px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F3EE' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '48px 24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#61846D', margin: '0 0 8px' }}>Ideer</h2>
          <p style={{ fontSize: 14, color: '#8C7E74', lineHeight: 1.6, margin: '0 0 24px' }}>Log ind for at se og tilføje ideer.</p>
          <Link href="/login" style={{ background: '#61846D', color: '#fff', borderRadius: 24, padding: '10px 28px', fontSize: 14, fontWeight: 500, textDecoration: 'none', fontFamily: "'DM Sans', sans-serif" }}>
            Log ind
          </Link>
        </div>
      </div>
    )
  }

  return <IdeerBoard user={user} />
}

function IdeerBoard({ user }: { user: any }) {
  const supabase = useSupabase()
  const [cards, setCards] = useState<CardsMap>({})
  const [loaded, setLoaded] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ card: Card; colId: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ card: Card; colId: string } | null>(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [dragCard, setDragCard] = useState<{ cardId: string; colId: string } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const isAdmin = ADMIN_EMAILS.includes(user?.email)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from('ideas').select('*').order('position', { ascending: true })
      if (error) { setLoaded(true); return }
      if ((data?.length ?? 0) === 0 && isAdmin) {
        const { data: seeded } = await supabase.from('ideas')
          .insert(SEED_CARDS.map(c => ({ ...c, created_by: user.id }))).select()
        organise(seeded ?? [])
      } else {
        organise(data ?? [])
      }
      setLoaded(true)
    }
    load()
  }, [])

  function organise(rows: Card[]) {
    const grouped: CardsMap = {}
    COLS.forEach(c => { grouped[c.id] = [] })
    rows.forEach(r => {
      if (!grouped[r.column_id]) grouped[r.column_id] = []
      grouped[r.column_id].push(r)
    })
    COLS.forEach(c => grouped[c.id].sort((a, b) => a.position - b.position))
    setCards(grouped)
  }

  async function addCard(colId: string) {
    if (!title.trim() || !isAdmin) return
    const position = (cards[colId] || []).length
    const { data, error } = await supabase.from('ideas')
      .insert([{ column_id: colId, title: title.trim(), description: desc.trim(), position, created_by: user.id }])
      .select().single()
    if (!error && data) setCards(prev => ({ ...prev, [colId]: [...(prev[colId] || []), data as Card] }))
    setAdding(null); setTitle(''); setDesc('')
  }

  function openEdit(card: Card, colId: string) {
    setEditing({ card, colId }); setEditTitle(card.title); setEditDesc(card.description ?? '')
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editing) return
    const { card, colId } = editing
    const { data, error } = await supabase.from('ideas')
      .update({ title: editTitle.trim(), description: editDesc.trim() }).eq('id', card.id).select().single()
    if (!error && data) setCards(prev => ({ ...prev, [colId]: prev[colId].map(c => c.id === card.id ? data as Card : c) }))
    setEditing(null)
  }

  async function confirmAndDelete() {
    if (!confirmDelete) return
    const { card, colId } = confirmDelete
    await supabase.from('ideas').delete().eq('id', card.id)
    setCards(prev => ({ ...prev, [colId]: prev[colId].filter(c => c.id !== card.id) }))
    setConfirmDelete(null); setEditing(null)
  }

  async function onDrop(toColId: string) {
    if (!dragCard || dragCard.colId === toColId || !isAdmin) { setDragCard(null); setDragOver(null); return }
    const card = cards[dragCard.colId].find(c => c.id === dragCard.cardId)
    if (!card) return
    const newPosition = (cards[toColId] || []).length
    await supabase.from('ideas').update({ column_id: toColId, position: newPosition }).eq('id', card.id)
    const updated = { ...card, column_id: toColId, position: newPosition }
    setCards(prev => ({
      ...prev,
      [dragCard.colId]: prev[dragCard.colId].filter(c => c.id !== dragCard.cardId),
      [toColId]: [...(prev[toColId] || []), updated],
    }))
    setDragCard(null); setDragOver(null)
  }

  const total = Object.values(cards).flat().length

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: '#4A7A62', fontFamily: "'DM Sans', sans-serif", background: '#1A2620' }}>
      Henter idéer...
    </div>
  )

  return (
    <div style={{ background: '#1A2620', minHeight: 'calc(100vh - 60px)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Edit modal */}
      {editing && (
        <div onClick={e => e.target === e.currentTarget && setEditing(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 20 }}>
          <div style={{ background: '#FFFCF7', borderRadius: 12, width: 360, maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.3)', overflow: 'hidden' }}>
            <div style={{ background: COLS.find(c => c.id === editing.colId)?.hdr ?? '#1A3028', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#C8D8CC' }}>Rediger idé</span>
              <button onClick={() => setEditing(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)', fontSize: 16, cursor: 'pointer', padding: 0 }}>✕</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74', display: 'block', marginBottom: 4 }}>Titel</label>
                <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(null) }}
                  style={inputStyle} />
              </div>
              <div>
                <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74', display: 'block', marginBottom: 4 }}>Beskrivelse</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', paddingTop: 4 }}>
                <button onClick={() => setConfirmDelete({ card: editing.card, colId: editing.colId })}
                  style={{ padding: '7px 12px', background: '#F0E8E0', color: '#8B3A2A', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Slet
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setEditing(null)} style={{ padding: '7px 12px', border: '1px solid #D0C8BA', borderRadius: 6, background: 'transparent', fontSize: 12, cursor: 'pointer', color: '#8C7E74', fontFamily: "'DM Sans', sans-serif" }}>Annuller</button>
                  <button onClick={saveEdit} disabled={!editTitle.trim()} style={{ padding: '7px 16px', background: '#61846D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Gem</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div onClick={e => e.target === e.currentTarget && setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300, padding: 20 }}>
          <div style={{ background: '#FFFCF7', borderRadius: 12, width: 320, maxWidth: '100%', padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,.35)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗑️</div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#302218', marginBottom: 6 }}>Er du sikker?</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#302218', background: '#F4EFE6', borderRadius: 6, padding: '8px 12px', marginBottom: 20 }}>"{confirmDelete.card.title}"</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: '8px 18px', border: '1px solid #D0C8BA', borderRadius: 6, background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#8C7E74', fontFamily: "'DM Sans', sans-serif" }}>Annuller</button>
              <button onClick={confirmAndDelete} style={{ padding: '8px 18px', background: '#8B3A2A', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Ja, slet</button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-header */}
      <div style={{ background: '#0F1A14', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E3828' }}>
        <span style={{ fontSize: 12, color: '#4A7A62', letterSpacing: '.05em' }}>
          {isAdmin ? 'Klik på kort for at redigere · Træk for at flytte' : 'Kun læseadgang'}
        </span>
        <span style={{ fontSize: 12, color: '#4A7A62' }}>{total} ideer i alt</span>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: 14, padding: '20px 20px 32px', overflowX: 'auto', alignItems: 'flex-start' }}>
        {COLS.map(col => {
          const colCards = cards[col.id] || []
          return (
            <div key={col.id} style={{ minWidth: 220, width: 220, flexShrink: 0 }}>
              <div style={{ background: col.hdr, padding: '9px 12px', borderRadius: '7px 7px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${col.ac}` }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#C8D8CC' }}>{col.emoji} {col.label}</span>
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,.12)', padding: '1px 7px', borderRadius: 10, color: '#A8C0B4' }}>{colCards.length}</span>
              </div>
              <div
                onDragOver={e => { e.preventDefault(); if (isAdmin) setDragOver(col.id) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => onDrop(col.id)}
                style={{ background: dragOver === col.id ? 'rgba(255,255,255,.06)' : '#1E2E24', border: `1px solid ${col.border}`, borderTop: 'none', borderRadius: '0 0 7px 7px', padding: 9, minHeight: 160, transition: 'background .15s' }}
              >
                {colCards.map(card => (
                  <div key={card.id}
                    draggable={isAdmin}
                    onDragStart={() => isAdmin && setDragCard({ cardId: card.id, colId: col.id })}
                    onClick={() => isAdmin && openEdit(card, col.id)}
                    style={{ background: '#FDFAF5', borderRadius: 7, padding: '10px 12px', marginBottom: 7, cursor: isAdmin ? 'pointer' : 'default', borderLeft: `3px solid ${col.ac}`, boxShadow: '0 1px 3px rgba(0,0,0,.1)' }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#302218', lineHeight: 1.4 }}>{card.title}</div>
                    {card.description && <div style={{ fontSize: 11, color: '#7A6C60', marginTop: 4, lineHeight: 1.5 }}>{card.description}</div>}
                  </div>
                ))}
                {isAdmin && (
                  adding === col.id ? (
                    <div style={{ background: '#FFFCF7', borderRadius: 6, padding: 9 }}>
                      <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCard(col.id); if (e.key === 'Escape') { setAdding(null); setTitle(''); setDesc('') } }}
                        placeholder="Idé-titel..." style={{ ...inputStyle, marginBottom: 6 }} />
                      <input value={desc} onChange={e => setDesc(e.target.value)}
                        placeholder="Beskrivelse (valgfri)..." style={{ ...inputStyle, marginBottom: 8 }} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => addCard(col.id)} style={{ flex: 1, background: col.ac, color: '#fff', border: 'none', borderRadius: 5, padding: 6, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Tilføj</button>
                        <button onClick={() => { setAdding(null); setTitle(''); setDesc('') }} style={{ background: 'none', border: '1px solid #D0C8BA', borderRadius: 5, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#8C7E74' }}>✕</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAdding(col.id); setTitle(''); setDesc('') }}
                      style={{ width: '100%', background: 'none', border: `1.5px dashed ${col.border}`, borderRadius: 6, padding: 7, color: col.ac, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: .65 }}>
                      + Tilføj idé
                    </button>
                  )
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
