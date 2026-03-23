import { useState, useEffect, useRef } from 'react'
import { supabase, toDb, fromDb, uploadFile } from '../lib/supabase'
import BarcodeScanner from './BarcodeScanner'
import BrugNøglerModal from './BrugNøglerModal'
import { PERMIN_CATALOG } from '../data/perminCatalog'
import { FILCOLANA_CATALOG } from '../data/filcolanaCatalog'
import { detectColorFamily, COLOR_FAMILY_LABELS } from '../data/colorFamilies'

const ALL_CATALOG = [...PERMIN_CATALOG, ...FILCOLANA_CATALOG]

const WEIGHTS  = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky']
const STATUSES = ['På lager', 'I brug', 'Brugt op', 'Ønskeliste']
const FIBER_PILLS = ['Uld', 'Merino', 'Mohair', 'Alpaka', 'Silke', 'Bomuld', 'Hør', 'Akryl']

const STATUS_COLORS = {
  'På lager': '#D0E8D4',
  'I brug':   '#FFE0C4',
  'Brugt op': '#E4DDD6',
  'Ønskeliste': '#D8D0E8',
}
const STATUS_TEXT = {
  'På lager': '#2A5C35',
  'I brug':   '#7A3C10',
  'Brugt op': '#5A4E42',
  'Ønskeliste': '#3C2A5C',
}

const EMPTY_FORM = {
  name: '', brand: '', colorName: '', colorCode: '', colorCategory: '',
  weight: 'DK', fiber: '', metrage: '', pindstr: '',
  antal: 1, status: 'På lager', hex: '#A8C4C4', noter: '', barcode: '',
  imageUrl: null,
}

// ─── Catalog autocomplete ─────────────────────────────────────────────────────

function CatalogSearch({ value, onChange, onSelect, placeholder, field }) {
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState([])
  const wrapRef = useRef(null)

  useEffect(() => {
    const q = (value || '').toLowerCase().trim()
    if (q.length < 1) { setHits([]); setOpen(false); return }
    const results = ALL_CATALOG.filter(e => {
      if (field === 'colorCode') return e.articleNumber.includes(q)
      return (
        e.colorName?.toLowerCase().includes(q) ||
        (e.colorNameDa?.toLowerCase().includes(q)) ||
        e.articleNumber.includes(q) ||
        e.series.toLowerCase().includes(q)
      )
    }).slice(0, 8)
    setHits(results)
    setOpen(results.length > 0)
  }, [value, field])

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); }}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder={placeholder}
        style={inputStyle}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#FFFCF7', border: '1px solid #D0C8BA', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(44,32,24,.15)', marginTop: '2px',
          maxHeight: '240px', overflowY: 'auto',
        }}>
          {hits.map(e => (
            <div
              key={e.articleNumber}
              onMouseDown={() => { onSelect(e); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 12px', cursor: 'pointer',
                borderBottom: '1px solid #F0EAE0',
              }}
              onMouseEnter={el => el.currentTarget.style.background = '#F4EFE6'}
              onMouseLeave={el => el.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: e.hex, border: '1px solid rgba(0,0,0,.08)', flexShrink: 0,
              }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#2C2018' }}>
                  {e.series} · {e.colorNameDa ?? e.colorName}
                </div>
                <div style={{ fontSize: '11px', color: '#8B7D6B' }}>
                  {e.articleNumber} · {e.fiber} · {e.metrage}m
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 5S Guide ─────────────────────────────────────────────────────────────────

const FIVE_S_STEPS = [
  {
    num: 1, title: 'Sortér', sub: 'Seiri', emoji: '🧹', color: '#C16B47',
    intro: 'Start med at tømme hele garnskuffen. Hvert nøgle skal i én af tre bunker:',
    tips: ['Beholder — garn du aktivt vil strikke med', 'Giver væk — fint garn, bare ikke til dig (garn-swap!)', 'Kassér — mølædt, muggen eller mystisk fiber du aldrig rører'],
    nudge: 'Vær ærlig med "en dag"-købene. Hvis du ikke har rørt det i to år, er det nok tid til at give det videre.',
  },
  {
    num: 2, title: 'Systematisér', sub: 'Seiton', emoji: '🗂️', color: '#2C4A3E',
    intro: 'Nu skal det garn, du beholder, have faste pladser:',
    tips: ['Gruppér efter det der giver mening for dig — fiber, vægt eller projekt', 'Mærk kasser og kurve så du finder garnet uden at rode', 'Igangværende projekter i gennemsigtige poser med opskriften'],
    nudge: 'Hæng løse nøgler over en stang eller rul dem op, så de ikke filtrer sig ind i hinanden.',
  },
  {
    num: 3, title: 'Rengør', sub: 'Seiso', emoji: '✨', color: '#4A7A62',
    intro: 'Rent garn på rene hylder — enkelt princip, stor effekt:',
    tips: ['Tjek for møl og larveæg — frys mistænkeligt garn i 72 timer', 'Tør hylder og kasser af inden garnet lægges tilbage', 'Giv uld og mohair lidt plads til at ånde'],
    nudge: 'Et lavendel-pose eller cedertræ-klods i garnkassen holder møllen væk.',
  },
  {
    num: 4, title: 'Standardisér', sub: 'Seiketsu', emoji: '📋', color: '#6A5638',
    intro: 'Lav én fast rutine for nyt garn — så forbliver systemet intakt:',
    tips: ['Nyt garn registreres med det samme: fiber, metrage, farvenummer', 'Her hjælper dit digitale garnlager — det er præcis dét denne app er til!', 'Sæt en "kapacitetsgrænse" pr. kategori, fx én kasse fingering-garn'],
    nudge: 'Registrér garnet inden det ryger i kurven. Ellers glemmer du det — vi kender det alle.',
  },
  {
    num: 5, title: 'Vedligehold', sub: 'Shitsuke', emoji: '🔄', color: '#3A2C4A',
    intro: 'Det svære er ikke at rydde op — det er at holde det ved lige:',
    tips: ['Én gang om året (efterår = mølsæson): mini-sortering', 'Reglen "ind med ét, ud med ét" holder lageret stabilt', 'Afhold garn-swap med strikkevenner for at omsætte overskuddet'],
    nudge: 'Det handler ikke om perfektion. Bare om at vide hvad du har, og kunne finde det.',
  },
]

function FiveSGuide({ onClose }) {
  const [step, setStep] = useState(0)
  const s = FIVE_S_STEPS[step]
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,32,24,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
    >
      <div style={{ background: '#FFFCF7', borderRadius: '14px', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(44,32,24,.25)' }}>
        <div style={{ background: s.color, borderRadius: '14px 14px 0 0', padding: '24px 28px 20px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
          {step === 0 && (
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,.7)', marginBottom: '6px', letterSpacing: '.05em' }}>
              5S-metoden til dit garnlager
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '32px' }}>{s.emoji}</span>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', fontWeight: 600, color: '#fff' }}>Trin {s.num}: {s.title}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.5)', letterSpacing: '.08em', marginTop: '2px' }}>{s.sub}</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '24px 28px' }}>
          <p style={{ fontSize: '14px', color: '#2C2018', lineHeight: '1.6', margin: '0 0 16px' }}>{s.intro}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {s.tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ background: s.color, color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                <span style={{ fontSize: '13px', color: '#3A2E22', lineHeight: '1.5' }}>{tip}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#F4EFE6', borderRadius: '8px', padding: '12px 14px', borderLeft: `3px solid ${s.color}` }}>
            <span style={{ fontSize: '12px', color: '#5A4E42', lineHeight: '1.5', fontStyle: 'italic' }}>{s.nudge}</span>
          </div>
        </div>
        <div style={{ padding: '0 28px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {FIVE_S_STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{ width: i === step ? '20px' : '8px', height: '8px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: i === step ? s.color : '#D8D0C0', transition: 'all .2s' }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} style={{ padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#6B5D4F', fontFamily: "'DM Sans', sans-serif" }}>Tilbage</button>
            )}
            {step < FIVE_S_STEPS.length - 1 ? (
              <button onClick={() => setStep(step + 1)} style={{ padding: '8px 18px', background: s.color, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Næste</button>
            ) : (
              <button onClick={onClose} style={{ padding: '8px 18px', background: '#2C4A3E', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Kom i gang!</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Small reusable components ────────────────────────────────────────────────

function Chip({ children, style }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', letterSpacing: '.02em', ...style }}>
      {children}
    </span>
  )
}

function Label({ children }) {
  return <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B' }}>{children}</label>
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

const inputStyle = {
  padding: '7px 10px', border: '1px solid #D0C8BA',
  borderRadius: '6px', fontSize: '13px',
  background: '#F9F6F0', color: '#2C2018',
  fontFamily: "'DM Sans', sans-serif",
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Garnlager({ user }) {
  const [yarns, setYarns] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  const [q, setQ] = useState('')
  const [filterWeight, setFilterWeight] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFiber, setFilterFiber] = useState('')

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const [modal, setModal] = useState(null) // null | 'add' | yarn.id
  const [form, setForm] = useState(EMPTY_FORM)

  const [showGuide, setShowGuide] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [brugModal, setBrugModal] = useState(null) // yarn object or null
  const [saveError, setSaveError] = useState(null)

  // ── Load from Supabase ──────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchYarns() {
      const { data, error } = await supabase
        .from('yarn_items')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Fejl ved hentning af garnlager:', error.message)
      } else {
        setYarns((data ?? []).map(fromDb))
      }
      setLoaded(true)
    }
    fetchYarns()
  }, [])

  // ── Persist helpers ─────────────────────────────────────────────────────────
  function flashSave() {
    setSaving(true)
    setSaveMsg('Gemmer...')
    setTimeout(() => { setSaving(false); setSaveMsg('✓ Gemt') }, 700)
    setTimeout(() => setSaveMsg(''), 2500)
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  async function save() {
    setSaveError(null)
    try {
      // Auto-detect color category from color name if not manually set
      const colorCategory = form.colorCategory || detectColorFamily(form.colorName) || null
      const formWithCategory = { ...form, colorCategory }

      let savedId = modal === 'add' ? null : modal
      let dbRow

      if (modal === 'add') {
        const { data, error } = await supabase
          .from('yarn_items')
          .insert([{ ...toDb(formWithCategory), user_id: user.id }])
          .select()
          .single()
        if (error) { setSaveError(`Kunne ikke gemme: ${error.message} (kode: ${error.code})`); return }
        dbRow = data
        savedId = data.id
      } else {
        const { data, error } = await supabase
          .from('yarn_items')
          .update(toDb(formWithCategory))
          .eq('id', modal)
          .select()
          .single()
        if (error) { setSaveError(`Kunne ikke opdatere: ${error.message} (kode: ${error.code})`); return }
        dbRow = data
      }

      // Upload image if a new file was selected
      if (imageFile && savedId) {
        const ext = imageFile.name.split('.').pop()
        const url = await uploadFile('yarn-images', `${user.id}/${savedId}.${ext}`, imageFile)
        await supabase.from('yarn_items').update({ image_url: url }).eq('id', savedId)
        dbRow.image_url = url
      }

      const mapped = fromDb(dbRow)
      if (modal === 'add') {
        setYarns(prev => [...prev, mapped])
      } else {
        setYarns(prev => prev.map(y => y.id === modal ? mapped : y))
      }
    } catch (e) {
      setSaveError('Fejl: ' + e.message)
      return
    }
    setImageFile(null)
    setImagePreview(null)
    flashSave()
    setModal(null)
  }

  async function del() {
    const { error } = await supabase.from('yarn_items').delete().eq('id', modal)
    if (!error) setYarns(prev => prev.filter(y => y.id !== modal))
    setModal(null)
    flashSave()
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM })
    setImageFile(null)
    setImagePreview(null)
    setModal('add')
  }
  function openEdit(y) {
    setForm({ ...y })
    setImageFile(null)
    setImagePreview(y.imageUrl ?? null)
    setModal(y.id)
  }
  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function handleImageFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function toggleFiberInForm(fiber) {
    const current = form.fiber || ''
    const parts = current.split(',').map(s => s.trim()).filter(Boolean)
    const fiberLower = fiber.toLowerCase()
    const exists = parts.some(p => p.toLowerCase() === fiberLower)
    const newParts = exists ? parts.filter(p => p.toLowerCase() !== fiberLower) : [...parts, fiber]
    setF('fiber', newParts.join(', '))
  }

  function selectFromCatalog(entry) {
    const colorName = entry.colorNameDa ?? entry.colorName
    setForm(p => ({
      ...p,
      name:          entry.series,
      brand:         entry.brand,
      colorName,
      colorCode:     entry.articleNumber,
      colorCategory: detectColorFamily(colorName) || p.colorCategory,
      fiber:         entry.fiber,
      metrage:       entry.metrage,
      weight:        entry.weight,
      pindstr:       entry.pindstr,
      hex:           entry.hex,
    }))
  }

  // ── Scanner callback ────────────────────────────────────────────────────────
  function handleScanResult(yarnData) {
    setForm({ ...EMPTY_FORM, ...yarnData })
    setModal('add')
  }

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = yarns.filter(y => {
    const qL = q.toLowerCase()
    const matchesSearch = !qL || (
      [y.name, y.brand, y.colorName, y.colorCategory, y.fiber, y.noter].some(s => (s ?? '').toLowerCase().includes(qL))
    )
    const matchesWeight = !filterWeight || y.weight === filterWeight
    const matchesStatus = !filterStatus || y.status === filterStatus
    const matchesFiber  = !filterFiber  || (y.fiber ?? '').toLowerCase().includes(filterFiber.toLowerCase())
    return matchesSearch && matchesWeight && matchesStatus && matchesFiber
  })

  const totalNgl = yarns.reduce((s, y) => s + Number(y.antal || 0), 0)

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: '#8B7D6B', fontFamily: "'DM Sans', sans-serif" }}>
      Henter garnlager...
    </div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F4EFE6', minHeight: '100vh' }}>

      {showGuide && <FiveSGuide onClose={() => setShowGuide(false)} />}
      {showScanner && <BarcodeScanner onClose={() => setShowScanner(false)} onAddToLager={handleScanResult} />}
      {brugModal && (
        <BrugNøglerModal
          yarn={brugModal}
          user={user}
          onClose={() => setBrugModal(null)}
          onSaved={(usageRow, newQty, newStatus) => {
            setYarns(prev => prev.map(y =>
              y.id === brugModal.id
                ? { ...y, antal: newQty, status: newStatus ?? y.status }
                : y
            ))
            setBrugModal(null)
            setModal(null)
          }}
        />
      )}

      {/* Sub-header */}
      <div style={{ background: '#2C4A3E', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1E3828', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowGuide(true)}
          title="Åbn 5S guide til dit garnlager"
          style={{ background: 'none', border: 'none', padding: '4px 0', fontSize: '12px', color: '#7ABDA0', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline', textUnderlineOffset: '3px' }}
        >
          5S Guide
        </button>

        <div style={{ flex: 1 }} />

        {saveMsg && (
          <span style={{ fontSize: '11px', color: saving ? '#7ABDA0' : '#4A8A6A' }}>{saveMsg}</span>
        )}

        <button
          onClick={() => setShowScanner(true)}
          style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)', borderRadius: '6px', padding: '7px 13px', fontSize: '12px', color: '#EDF5F0', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>📷</span> Skann garn
        </button>

        <button
          onClick={openAdd}
          style={{ background: '#C16B47', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer' }}
        >
          + Tilføj garn
        </button>
      </div>

      {/* Stats */}
      <div style={{ background: '#EDE7D8', borderBottom: '1px solid #D8D0C0', padding: '12px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '12px' }}>
        {[
          [yarns.length, 'Garntyper'],
          [totalNgl, 'Nøgler i alt'],
          [yarns.filter(y => y.status === 'I brug').length, 'I brug'],
          [yarns.filter(y => y.status === 'På lager').length, 'På lager'],
        ].map(([n, l]) => (
          <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#2C4A3E' }}>{n}</span>
            <span style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.1em' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 20px 8px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Søg garn, mærke, farve eller grøn/brun/blå..."
          style={{ flex: '1 1 180px', minWidth: '0', padding: '8px 12px', border: '1px solid #D0C8BA', borderRadius: '6px', fontSize: '13px', background: '#FFFCF7', color: '#2C2018', fontFamily: "'DM Sans', sans-serif" }}
        />
        <select value={filterWeight} onChange={e => setFilterWeight(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', flex: '0 0 auto' }}>
          <option value="">Alle vægte</option>
          {WEIGHTS.map(w => <option key={w}>{w}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', flex: '0 0 auto' }}>
          <option value="">Alle statusser</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(q || filterWeight || filterStatus || filterFiber) && (
          <button onClick={() => { setQ(''); setFilterWeight(''); setFilterStatus(''); setFilterFiber('') }}
            style={{ padding: '7px 12px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '12px', color: '#8B7D6B', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
            ✕ Ryd
          </button>
        )}
      </div>

      {/* Fiber pills */}
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {FIBER_PILLS.map(f => (
          <button
            key={f}
            onClick={() => setFilterFiber(filterFiber.toLowerCase() === f.toLowerCase() ? '' : f)}
            style={{
              padding: '4px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", border: '1px solid',
              background: filterFiber.toLowerCase() === f.toLowerCase() ? '#2C4A3E' : 'transparent',
              color:      filterFiber.toLowerCase() === f.toLowerCase() ? '#fff' : '#6B5D4F',
              borderColor: filterFiber.toLowerCase() === f.toLowerCase() ? '#2C4A3E' : '#C8C0B0',
              transition: 'all .15s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B7D6B' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🧶</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px' }}>
            {yarns.length === 0 ? 'Dit garnlager er tomt' : 'Intet garn fundet'}
          </div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            {yarns.length === 0 ? 'Tilføj dit første garn med knappen ovenfor' : 'Prøv andre kriterier eller tilføj nyt garn'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', padding: '0 20px 32px' }}>
          {filtered.map(y => (
            <div
              key={y.id}
              onClick={() => openEdit(y)}
              style={{ background: '#FFFCF7', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(44,32,24,.08)', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(44,32,24,.13)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(44,32,24,.08)' }}
            >
              {y.imageUrl ? (
                <div style={{ height: '100px', overflow: 'hidden' }}>
                  <img src={y.imageUrl} alt={y.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ height: '72px', background: y.hex || '#D0C8BA' }} />
              )}
              <div style={{ padding: '12px' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#8B7D6B', marginBottom: '2px' }}>{y.brand}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '17px', fontWeight: 600, color: '#2C2018', marginBottom: '3px' }}>{y.name}</div>
                <div style={{ fontSize: '12px', color: '#6B5D4F', marginBottom: '9px' }}>{y.colorName}{y.colorCode ? ` · ${y.colorCode}` : ''}</div>
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  <Chip style={{ background: '#EDE7D8', color: '#5A4228' }}>{y.weight}</Chip>
                  <Chip style={{ background: '#E4EEE4', color: '#2A4A2A' }}>{y.antal} ngl</Chip>
                  <Chip style={{ background: STATUS_COLORS[y.status], color: STATUS_TEXT[y.status] }}>{y.status}</Chip>
                </div>
                {y.noter && <div style={{ marginTop: '8px', fontSize: '11px', color: '#8B7D6B', fontStyle: 'italic', lineHeight: '1.45' }}>{y.noter}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Add Modal */}
      {modal && (
        <div
          onClick={e => e.target === e.currentTarget && setModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(44,32,24,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px 16px' }}
        >
          <div style={{ background: '#FFFCF7', borderRadius: '12px', padding: '28px 24px', width: '460px', maxWidth: '100%', boxShadow: '0 24px 60px rgba(44,32,24,.22)', margin: 'auto' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#2C4A3E', marginBottom: '20px' }}>
              {modal === 'add' ? 'Tilføj garn' : 'Rediger garn'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
              {[
                ['name', 'Garnnavn'], ['brand', 'Mærke'],
                ['metrage', 'Løbelængde/nøgle (m)'],
                ['pindstr', 'Pindstørrelse'], ['antal', 'Antal nøgler'],
              ].map(([k, l]) => (
                <Field key={k} label={l}>
                  <input
                    value={form[k] ?? ''}
                    onChange={e => setF(k, e.target.value)}
                    type={k === 'antal' || k === 'metrage' ? 'number' : 'text'}
                    step={k === 'antal' ? '0.5' : k === 'metrage' ? '1' : undefined}
                    min={k === 'antal' ? '0' : undefined}
                    style={inputStyle}
                  />
                </Field>
              ))}

              {/* Fiber med hurtigvalg */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Label>Fiber</Label>
                <input
                  value={form.fiber ?? ''}
                  onChange={e => setF('fiber', e.target.value)}
                  placeholder="F.eks. 80% Uld, 20% Mohair"
                  style={inputStyle}
                />
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                  {FIBER_PILLS.map(f => {
                    const active = (form.fiber || '').toLowerCase().includes(f.toLowerCase())
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleFiberInForm(f)}
                        style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer',
                          fontFamily: "'DM Sans', sans-serif", border: '1px solid',
                          background: active ? '#2C4A3E' : 'transparent',
                          color:      active ? '#fff'    : '#6B5D4F',
                          borderColor: active ? '#2C4A3E' : '#C8C0B0',
                        }}
                      >
                        {f}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Field label="Farvenavn">
                <CatalogSearch
                  value={form.colorName ?? ''}
                  onChange={v => {
                    setF('colorName', v)
                    const detected = detectColorFamily(v)
                    if (detected && !form.colorCategory) setF('colorCategory', detected)
                  }}
                  onSelect={selectFromCatalog}
                  placeholder="F.eks. Blomstereng, Camel..."
                  field="colorName"
                />
              </Field>

              <Field label="Farvenummer">
                <CatalogSearch
                  value={form.colorCode ?? ''}
                  onChange={v => setF('colorCode', v)}
                  onSelect={selectFromCatalog}
                  placeholder="F.eks. 883174"
                  field="colorCode"
                />
              </Field>

              {/* Color category — auto-detected, can be overridden */}
              <Field label="Farvekategori (til søgning)">
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    value={form.colorCategory ?? ''}
                    onChange={e => setF('colorCategory', e.target.value)}
                    placeholder={detectColorFamily(form.colorName) ?? 'F.eks. grøn, brun...'}
                    style={{ ...inputStyle, flex: 1 }}
                    list="color-family-list"
                  />
                  <datalist id="color-family-list">
                    {COLOR_FAMILY_LABELS.map(c => <option key={c} value={c} />)}
                  </datalist>
                  {(form.colorCategory || detectColorFamily(form.colorName)) && (
                    <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', background: '#EDE7D8', color: '#6B5D4F', whiteSpace: 'nowrap' }}>
                      {form.colorCategory || detectColorFamily(form.colorName)}
                    </span>
                  )}
                </div>
              </Field>

              <Field label="Garnvægt">
                <select value={form.weight} onChange={e => setF('weight', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {WEIGHTS.map(w => <option key={w}>{w}</option>)}
                </select>
              </Field>

              <Field label="Status">
                <select value={form.status} onChange={e => setF('status', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Label>Farve (hex)</Label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input type="color" value={form.hex || '#A8C4C4'} onChange={e => setF('hex', e.target.value)}
                    style={{ width: '44px', height: '34px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '2px' }} />
                  <input value={form.hex || ''} onChange={e => setF('hex', e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: form.hex || '#A8C4C4', border: '1px solid #D0C8BA', flexShrink: 0 }} />
                </div>
              </div>

              {/* Billede upload */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Label>Billede af garnet</Label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '8px 12px', border: '1px dashed #C0B8A8',
                  borderRadius: '8px', cursor: 'pointer', background: '#F4EFE6',
                }}>
                  <input type="file" accept="image/*" onChange={handleImageFile} style={{ display: 'none' }} />
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #D0C8BA' }} />
                  ) : (
                    <div style={{ width: '56px', height: '56px', background: '#EDE7D8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#8B7D6B' }}>📷</div>
                  )}
                  <div>
                    <div style={{ fontSize: '12px', color: '#2C2018', fontWeight: 500 }}>{imagePreview ? 'Skift billede' : 'Upload billede'}</div>
                    <div style={{ fontSize: '11px', color: '#8B7D6B' }}>JPG eller PNG — vises på garnkortet</div>
                  </div>
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); setF('imageUrl', null) }}
                    style={{ alignSelf: 'flex-start', fontSize: '11px', color: '#8B3A2A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    ✕ Fjern billede
                  </button>
                )}
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Label>Stregkode (EAN)</Label>
                <input
                  value={form.barcode ?? ''}
                  onChange={e => setF('barcode', e.target.value)}
                  placeholder="Skannet eller manuelt"
                  style={inputStyle}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Label>Noter</Label>
                <textarea
                  value={form.noter ?? ''}
                  onChange={e => setF('noter', e.target.value)}
                  rows={3}
                  placeholder="Projekter, ideer, specielle egenskaber..."
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>
            </div>

            {saveError && (
              <div style={{ marginTop: '16px', padding: '10px 14px', background: '#F5E8E0', borderRadius: '8px', fontSize: '12px', color: '#8B3A2A', lineHeight: '1.5' }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px', alignItems: 'center' }}>
              {modal !== 'add' && (
                <button onClick={del} style={{ padding: '8px 14px', background: '#F0E8E0', color: '#8B3A2A', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', marginRight: 'auto', fontFamily: "'DM Sans', sans-serif" }}>
                  Slet
                </button>
              )}
              {modal !== 'add' && Number(form.antal) > 0 && (
                <button
                  onClick={() => { setBrugModal(yarns.find(y => y.id === modal)) }}
                  style={{ padding: '8px 14px', background: '#F4EFE6', color: '#6A5638', border: '1px solid #C8B89A', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Brug nøgler
                </button>
              )}
              <button onClick={() => setModal(null)} style={{ padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#6B5D4F', fontFamily: "'DM Sans', sans-serif" }}>
                Annuller
              </button>
              <button onClick={save} style={{ padding: '8px 18px', background: '#2C4A3E', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {modal === 'add' ? 'Tilføj' : 'Gem ændringer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
