import { useState, useEffect } from 'react'
import { supabase, fromUsageDb } from '../lib/supabase'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
}

function DetailModal({ entry, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('yarn_usage').delete().eq('id', entry.id)
    onDelete(entry.id)
    onClose()
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,32,24,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1200, overflowY: 'auto', padding: '20px 16px' }}
    >
      <div style={{ background: '#FFFCF7', borderRadius: '14px', width: '520px', maxWidth: '100%', boxShadow: '0 24px 60px rgba(44,32,24,.25)', margin: 'auto', overflow: 'hidden' }}>

        {/* Project image */}
        {entry.projectImageUrl ? (
          <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: '#EDE7D8' }}>
            <img src={entry.projectImageUrl} alt="Projekt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ height: '8px', background: entry.hex }} />
        )}

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#2C2018' }}>
                {entry.usedFor || 'Unavngivet projekt'}
              </div>
              <div style={{ fontSize: '12px', color: '#8B7D6B', marginTop: '2px' }}>{formatDate(entry.usedAt)}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#8B7D6B', padding: '4px' }}>✕</button>
          </div>

          {/* Yarn info */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 14px', background: '#F4EFE6', borderRadius: '10px', marginBottom: '16px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: entry.hex, border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '11px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.1em' }}>{entry.yarnBrand}</div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: '#2C2018' }}>{entry.yarnName} · {entry.colorName}</div>
              <div style={{ fontSize: '11px', color: '#8B7D6B' }}>{entry.quantityUsed} ngl brugt · {entry.colorCode}</div>
            </div>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {entry.needleSize && (
              <div>
                <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Pindestørrelse</div>
                <div style={{ fontSize: '13px', color: '#2C2018' }}>{entry.needleSize} mm</div>
              </div>
            )}
            {entry.heldWith && (
              <div>
                <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Strikket med</div>
                <div style={{ fontSize: '13px', color: '#2C2018' }}>{entry.heldWith}</div>
              </div>
            )}
          </div>

          {entry.notes && (
            <div style={{ padding: '12px 14px', background: '#F4EFE6', borderRadius: '8px', borderLeft: '3px solid #C16B47', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#5A4E42', lineHeight: '1.6', fontStyle: 'italic' }}>{entry.notes}</div>
            </div>
          )}

          {/* PDF link */}
          {entry.patternPdfUrl && (
            <a
              href={entry.patternPdfUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#EDE7D8', borderRadius: '8px', textDecoration: 'none', color: '#2C4A3E', fontSize: '13px', fontWeight: 500, marginBottom: '16px' }}
            >
              <span style={{ fontSize: '18px' }}>📄</span>
              Åbn opskrift (PDF)
            </a>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{ padding: '7px 14px', background: '#F0E8E0', color: '#8B3A2A', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              {deleting ? 'Sletter...' : 'Slet registrering'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Arkiv() {
  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('yarn_usage')
        .select('*')
        .order('used_at', { ascending: false })
      setEntries((data ?? []).map(fromUsageDb))
      setLoaded(true)
    }
    fetch()
  }, [])

  const filtered = entries.filter(e => {
    if (!q) return true
    const qL = q.toLowerCase()
    return (
      e.yarnName?.toLowerCase().includes(qL) ||
      e.colorName?.toLowerCase().includes(qL) ||
      e.usedFor?.toLowerCase().includes(qL) ||
      e.yarnBrand?.toLowerCase().includes(qL)
    )
  })

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: '#8B7D6B', fontFamily: "'DM Sans', sans-serif" }}>
      Henter arkiv...
    </div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F4EFE6', minHeight: '100vh' }}>

      {selected && (
        <DetailModal
          entry={selected}
          onClose={() => setSelected(null)}
          onDelete={id => setEntries(prev => prev.filter(e => e.id !== id))}
        />
      )}

      {/* Sub-header */}
      <div style={{ background: '#6A5638', padding: '10px 20px', borderBottom: '1px solid #5A4628' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,.6)', marginBottom: '2px' }}>
          {entries.length} registreringer
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Søg projekt, garn eller farve..."
          style={{ width: '100%', maxWidth: '340px', padding: '7px 12px', border: '1px solid rgba(255,255,255,.2)', borderRadius: '6px', fontSize: '13px', background: 'rgba(255,255,255,.12)', color: '#fff', fontFamily: "'DM Sans', sans-serif', outline: 'none'" }}
        />
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B7D6B' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px' }}>
            {entries.length === 0 ? 'Arkivet er tomt' : 'Ingen resultater'}
          </div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            {entries.length === 0
              ? 'Registreringer oprettes via "Brug nøgler" på et garn i lageret'
              : 'Prøv andre søgeord'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', padding: '20px' }}>
          {filtered.map(e => (
            <div
              key={e.id}
              onClick={() => setSelected(e)}
              style={{ background: '#FFFCF7', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(44,32,24,.08)', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
              onMouseEnter={el => { el.currentTarget.style.transform = 'translateY(-2px)'; el.currentTarget.style.boxShadow = '0 6px 20px rgba(44,32,24,.13)' }}
              onMouseLeave={el => { el.currentTarget.style.transform = ''; el.currentTarget.style.boxShadow = '0 1px 4px rgba(44,32,24,.08)' }}
            >
              {/* Image or color strip */}
              {e.projectImageUrl ? (
                <div style={{ height: '140px', overflow: 'hidden' }}>
                  <img src={e.projectImageUrl} alt="Projekt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ height: '6px', background: e.hex }} />
              )}

              <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {!e.projectImageUrl && (
                    <div style={{ width: '24px', height: '24px', borderRadius: '5px', background: e.hex, border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }} />
                  )}
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: '#2C2018', lineHeight: '1.2' }}>
                    {e.usedFor || 'Unavngivet projekt'}
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#8B7D6B', marginBottom: '8px' }}>
                  {e.yarnBrand} · {e.yarnName} · {e.colorName}
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', background: '#EDE7D8', color: '#5A4228', borderRadius: '20px', padding: '2px 8px' }}>
                    {e.quantityUsed} ngl
                  </span>
                  {e.needleSize && (
                    <span style={{ fontSize: '11px', background: '#E4EEE4', color: '#2A4A2A', borderRadius: '20px', padding: '2px 8px' }}>
                      Pind {e.needleSize}
                    </span>
                  )}
                  {e.patternPdfUrl && (
                    <span style={{ fontSize: '11px', background: '#D8D0E8', color: '#3C2A5C', borderRadius: '20px', padding: '2px 8px' }}>
                      📄 PDF
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '11px', color: '#B0A090', marginTop: '8px' }}>{formatDate(e.usedAt)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
