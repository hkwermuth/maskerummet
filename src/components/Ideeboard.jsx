import { useState, useEffect } from 'react'

const COLS = [
  { id: 'garnlager', label: 'Garnlager', emoji: '🧶', ac: '#2C4A3E', hdr: '#1A3028', border: '#3A6050' },
  { id: 'mønstre', label: 'Mønstre & Inspiration', emoji: '✂️', ac: '#4A3C28', hdr: '#2E2418', border: '#6A5638' },
  { id: 'design', label: 'Design & UI', emoji: '🎨', ac: '#3A2C4A', hdr: '#221824', border: '#5A3C6A' },
  { id: 'tech', label: 'Tech & Platform', emoji: '⚙️', ac: '#1E3C4A', hdr: '#10222C', border: '#2A5A6A' },
  { id: 'forretning', label: 'Forretning', emoji: '📊', ac: '#4A2C2C', hdr: '#2C1818', border: '#6A3A3A' },
]

const INITIAL_CARDS = {
  garnlager: [
    { id: 1, title: 'Import fra Ravelry', desc: 'API eller CSV export fra hkwermuth-profilen' },
    { id: 2, title: 'Garnsubstitution baseret på stash', desc: '' },
    { id: 3, title: 'Fiber-kategorier til filter', desc: 'Uld, Merino, Mohair, Alpaka, Plante, Blanding' },
    { id: 4, title: 'Metrage-beregner pr. projekt', desc: '' },
  ],
  mønstre: [
    { id: 5, title: 'AI-forklaring af teknikker', desc: 'German short rows, Italian cast-off osv.' },
    { id: 6, title: 'Projekter knyttet til garnposter', desc: '' },
    { id: 7, title: 'Strikkefasthed-database', desc: 'Fælles referenceark på tværs af mærker' },
  ],
  design: [
    { id: 8, title: 'Mobil-first garnlager', desc: 'Mange strikker på farten — kamera til scanning' },
    { id: 9, title: 'Farvepalette og typografi færdig', desc: '' },
    { id: 10, title: 'Dark mode til aftenstrik', desc: '' },
  ],
  tech: [
    { id: 11, title: 'Supabase skema: yarn_stash', desc: 'user_id, brand, name, fiber, metrage, hex...' },
    { id: 12, title: 'Mailerlite → lead magnet flow', desc: 'Garnlager-guide trigger' },
    { id: 13, title: 'Claude API til garnspørgsmål', desc: '' },
  ],
  forretning: [
    { id: 14, title: 'Affiliate-model med garnbutikker', desc: 'Særligt fokus på fysiske DK-butikker' },
    { id: 15, title: 'Membership: Gratis / Pro', desc: 'AI-funktioner bag Pro-muren' },
  ],
}

const STORAGE_KEY = 'maskerummet-ideeboard'
const NID_KEY = 'maskerummet-ideeboard-nid'

function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveCards(cards, nid) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
    if (nid !== undefined) localStorage.setItem(NID_KEY, String(nid))
  } catch {}
}

export default function Ideeboard() {
  const [cards, setCards] = useState({})
  const [loaded, setLoaded] = useState(false)
  const [nid, setNid] = useState(30)
  const [adding, setAdding] = useState(null)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [dragCard, setDragCard] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  useEffect(() => {
    const stored = loadCards()
    setCards(stored || INITIAL_CARDS)
    if (!stored) saveCards(INITIAL_CARDS, 30)
    const storedNid = localStorage.getItem(NID_KEY)
    if (storedNid) setNid(Number(storedNid))
    setLoaded(true)
  }, [])

  function persist(newCards, newNid) {
    saveCards(newCards, newNid)
  }

  function addCard(colId) {
    if (!title.trim()) return
    const newNid = nid + 1
    const newCards = {
      ...cards,
      [colId]: [...(cards[colId] || []), { id: nid, title: title.trim(), desc: desc.trim() }],
    }
    setCards(newCards)
    setNid(newNid)
    setAdding(null)
    setTitle('')
    setDesc('')
    persist(newCards, newNid)
  }

  function deleteCard(colId, id) {
    const newCards = { ...cards, [colId]: cards[colId].filter(c => c.id !== id) }
    setCards(newCards)
    persist(newCards)
  }

  function onDrop(toColId) {
    if (!dragCard || dragCard.colId === toColId) { setDragCard(null); setDragOver(null); return }
    const card = cards[dragCard.colId].find(c => c.id === dragCard.cardId)
    const newCards = {
      ...cards,
      [dragCard.colId]: cards[dragCard.colId].filter(c => c.id !== dragCard.cardId),
      [toColId]: [...(cards[toColId] || []), card],
    }
    setCards(newCards)
    setDragCard(null)
    setDragOver(null)
    persist(newCards)
  }

  const total = Object.values(cards).flat().length

  if (!loaded) return null

  return (
    <div style={{ background: '#1A2620', minHeight: 'calc(100vh - 60px)', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Sub-header */}
      <div style={{ background: '#0F1A14', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1E3828' }}>
        <span style={{ fontSize: '12px', color: '#4A7A62', letterSpacing: '.05em' }}>Træk kort mellem kolonner · Klik ✕ for at slette</span>
        <span style={{ fontSize: '12px', color: '#4A7A62' }}>{total} ideer i alt</span>
      </div>

      {/* Board */}
      <div style={{ display: 'flex', gap: '14px', padding: '20px 20px 32px', overflowX: 'auto', alignItems: 'flex-start' }}>
        {COLS.map(col => {
          const colCards = cards[col.id] || []
          return (
            <div key={col.id} style={{ minWidth: '220px', width: '220px', flexShrink: 0 }}>

              {/* Column header */}
              <div style={{ background: col.hdr, padding: '9px 12px', borderRadius: '7px 7px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `2px solid ${col.ac}` }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#C8D8CC' }}>{col.emoji} {col.label}</span>
                <span style={{ fontSize: '10px', background: 'rgba(255,255,255,.12)', padding: '1px 7px', borderRadius: '10px', color: '#A8C0B4' }}>{colCards.length}</span>
              </div>

              {/* Column body */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(col.id) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => onDrop(col.id)}
                style={{
                  background: dragOver === col.id ? 'rgba(255,255,255,.06)' : '#1E2E24',
                  border: `1px solid ${col.border}`,
                  borderTop: 'none',
                  borderRadius: '0 0 7px 7px',
                  padding: '9px',
                  minHeight: '160px',
                  transition: 'background .15s',
                }}
              >
                {colCards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={() => setDragCard({ cardId: card.id, colId: col.id })}
                    style={{
                      background: '#FDFAF5',
                      borderRadius: '7px',
                      padding: '10px 12px',
                      marginBottom: '7px',
                      cursor: 'grab',
                      borderLeft: `3px solid ${col.ac}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,.1)',
                      position: 'relative',
                    }}
                    onMouseEnter={e => e.currentTarget.querySelector('.del').style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.querySelector('.del').style.opacity = '0'}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 500, color: '#2C2018', lineHeight: '1.4', paddingRight: '18px' }}>{card.title}</div>
                    {card.desc && <div style={{ fontSize: '11px', color: '#7A6C60', marginTop: '4px', lineHeight: '1.5' }}>{card.desc}</div>}
                    <button
                      className="del"
                      onClick={() => deleteCard(col.id, card.id)}
                      style={{ position: 'absolute', top: '6px', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#B0A090', fontSize: '15px', lineHeight: 1, padding: 0, opacity: 0, transition: 'opacity .15s' }}
                    >×</button>
                  </div>
                ))}

                {/* Add card */}
                {adding === col.id ? (
                  <div style={{ background: '#FFFCF7', borderRadius: '6px', padding: '9px' }}>
                    <input
                      autoFocus
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCard(col.id); if (e.key === 'Escape') { setAdding(null); setTitle(''); setDesc('') } }}
                      placeholder="Idé-titel..."
                      style={{ width: '100%', border: '1px solid #D0C8BA', borderRadius: '5px', padding: '6px 8px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", background: '#FFFCF7', color: '#2C2018', marginBottom: '6px', outline: 'none' }}
                    />
                    <input
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCard(col.id); if (e.key === 'Escape') { setAdding(null); setTitle(''); setDesc('') } }}
                      placeholder="Beskrivelse (valgfri)..."
                      style={{ width: '100%', border: '1px solid #D0C8BA', borderRadius: '5px', padding: '6px 8px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", background: '#FFFCF7', color: '#2C2018', marginBottom: '8px', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => addCard(col.id)} style={{ flex: 1, background: col.ac, color: '#fff', border: 'none', borderRadius: '5px', padding: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Tilføj</button>
                      <button onClick={() => { setAdding(null); setTitle(''); setDesc('') }} style={{ background: 'none', border: '1px solid #D0C8BA', borderRadius: '5px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#8B7D6B' }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAdding(col.id); setTitle(''); setDesc('') }}
                    style={{ width: '100%', background: 'none', border: `1.5px dashed ${col.border}`, borderRadius: '6px', padding: '7px', color: col.ac, fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: .65 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '.65'}
                  >
                    + Tilføj idé
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
