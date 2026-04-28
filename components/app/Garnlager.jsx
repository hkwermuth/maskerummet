'use client'

import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import { toDb, fromDb } from '@/lib/supabase/mappers'
import { uploadFile as uploadFileRaw } from '@/lib/supabase/storage'
import {
  searchYarnsFull,
  fetchYarnFullById,
  fetchColorsForYarn,
  displayYarnName,
  applyCatalogYarnOnlyToForm,
  applyCatalogYarnColorToForm,
} from '@/lib/catalog'
import BarcodeScanner from './BarcodeScanner'
import BrugNoeglerModal from './BrugNoeglerModal'
import KatalogInfoblok from './KatalogInfoblok'
import BrugtOpFoldeUd from './BrugtOpFoldeUd'
import FarvekategoriCirkler from './FarvekategoriCirkler'
import FlereFarverVælger from './FlereFarverVælger'
import AntalStepper from './AntalStepper'
import { detectColorFamily, COLOR_FAMILY_DEFAULT_HEX, yarnMatchesStashSearch } from '@/lib/data/colorFamilies'
import { parseCombinedColorInput, combineColorDisplay } from '@/lib/colorInput'
import { dedupeYarnNameFromBrand, gradientFromHexColors, primaryFiberLabel } from '@/lib/yarn-display'
import { YARN_WEIGHT_LABELS } from '@/lib/yarn-weight'
import { exportGarnlager } from '@/lib/export/exportGarnlager'
import { validateForm } from '@/lib/validators/yarnForm'
import { toISODate } from '@/lib/date/formatDanish'

const WEIGHTS  = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky']
const STATUSES = ['På lager', 'I brug', 'Brugt op', 'Ønskeliste']
const FIBER_PILLS = ['Uld', 'Merino', 'Mohair', 'Alpaka', 'Silke', 'Bomuld', 'Hør', 'Akryl']

// Skanning skjult indtil EAN-koder er fyldt på colors-tabellen i kataloget.
// Sæt til true for at gen-aktivere scanner-knappen + modal.
const SHOW_SCANNER = false

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
  antal: 1, status: 'På lager', hex: '', hexColors: [], noter: '', barcode: '',
  imageUrl: null,
  brugtTilProjekt: '',
  brugtOpDato: '',
  catalogYarnId: null,
  catalogColorId: null,
  catalogImageUrl: null,
}

function isCatalogSwatchUrl(url) {
  const s = String(url || '')
  // Permin uses 100x100 swatches at /img/spec/<hash>.png
  if (s.includes('/img/spec/')) return true
  return false
}

// ─── Garn-katalog søgning (Supabase `yarns_full`) ─────────────────────────────

function YarnCatalogSearch({ value, onChange, onSelectYarn, placeholder, autoFocus }) {
  const supabase = useSupabase()
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!autoFocus) return
    const el = inputRef.current
    if (!el) return
    // preventScroll undgår ubehagelig scroll-jump når modal åbner
    try { el.focus({ preventScroll: true }) } catch { el.focus() }
  }, [autoFocus])

  useEffect(() => {
    const q = (value || '').trim()
    if (q.length < 1) {
      setHits([])
      setOpen(false)
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const r = await searchYarnsFull(supabase, q)
      setHits(r)
      setOpen(r.length > 0)
      setLoading(false)
    }, 320)
    return () => clearTimeout(debounceRef.current)
  }, [value])

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        onKeyDown={e => {
          // Esc lukker dropdown (uden at også lukke den omsluttende modal).
          if (e.key === 'Escape' && open) {
            e.stopPropagation()
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
        aria-label={placeholder}
      />
      {loading && (
        <div style={{ fontSize: '10px', color: '#8B7D6B', marginTop: '4px' }}>Søger i katalog…</div>
      )}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: '#FFFCF7', border: '1px solid #D0C8BA', borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(44,32,24,.15)', marginTop: '2px',
          maxHeight: '240px', overflowY: 'auto',
        }}>
          {hits.map(y => (
            <div
              key={y.id}
              onMouseDown={() => { onSelectYarn(y); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '9px 12px', cursor: 'pointer',
                borderBottom: '1px solid #F0EAE0',
              }}
              onMouseEnter={el => { el.currentTarget.style.background = '#F4EFE6' }}
              onMouseLeave={el => { el.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: '#2C2018' }}>
                  {displayYarnName(y)}
                </div>
                <div style={{ fontSize: '11px', color: '#8B7D6B' }}>
                  {y.producer}{y.thickness_category ? ` · ${y.thickness_category}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Kom godt i gang (quick-start popup) ──────────────────────────────────────

const QUICK_START_STEPS = [
  { title: 'Opret garn', body: 'Find garnet i Garn-kataloget når du opretter, eller tilføj garnet manuelt.' },
  { title: 'Filtrér', body: 'Filtrér på fiber, vægt eller farve, når du vil finde noget bestemt.' },
  { title: 'Print', body: 'Print en oversigt, hvis du også ønsker at have overblikket på papir.' },
]

function QuickStartModal({ onClose }) {
  useEscapeKey(true, onClose)
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(30,18,12,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div style={{
        position: 'relative', maxWidth: 520, width: '100%',
        background: '#FFFCF7', borderRadius: 16,
        padding: '36px 32px 32px',
        boxShadow: '0 20px 60px rgba(48,34,24,.25)',
        maxHeight: '88vh', overflowY: 'auto',
      }}>
        <button
          onClick={onClose}
          aria-label="Luk"
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(48,34,24,0.06)', border: 'none',
            cursor: 'pointer', fontSize: 18, color: '#5A4E42',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >×</button>
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28, fontWeight: 600, color: '#302218',
          margin: '0 0 6px',
        }}>
          Kom godt i gang med din garnsamling
        </h2>
        <p style={{ fontSize: 13.5, color: '#8C7E74', margin: '0 0 22px' }}>
          Tre enkle skridt til et godt overblik.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {QUICK_START_STEPS.map((s, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              border: '1px solid #E5DDD9', borderRadius: 12,
              padding: '14px 16px', background: '#FFFFFF',
            }}>
              <span style={{
                flexShrink: 0,
                width: 30, height: 30, borderRadius: '50%',
                background: '#61846D', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 16, fontWeight: 600,
              }}>{i + 1}</span>
              <div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 18, fontWeight: 600, color: '#302218',
                  margin: '0 0 4px',
                }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: '#5A4E42', lineHeight: 1.6 }}>{s.body}</div>
              </div>
            </div>
          ))}
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

function LoginPrompt({ onRequestLogin, title, desc, icon }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 74px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F3EE' }}>
      <div style={{ textAlign: 'center', maxWidth: 400, padding: '48px 24px' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid #E5DDD9' }}>
          {icon}
        </div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#2C4A3E', margin: '0 0 8px' }}>{title}</h2>
        <p style={{ fontSize: 14, color: '#8C7E74', lineHeight: 1.6, margin: '0 0 24px' }}>{desc}</p>
        <button onClick={onRequestLogin} style={{
          background: '#61846D', color: '#fff', border: 'none', borderRadius: 24,
          padding: '10px 28px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          fontFamily: "'DM Sans', sans-serif",
        }}>Log ind</button>
      </div>
    </div>
  )
}

export default function Garnlager({ user, onRequestLogin }) {
  const supabase = useSupabase()
  const uploadFile = (bucket, path, file) => uploadFileRaw(supabase, bucket, path, file)
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
  const [imageOpen, setImageOpen] = useState(false)

  const [modal, setModal] = useState(null) // null | 'add' | yarn.id
  const [form, setForm] = useState(EMPTY_FORM)

  const [showQuickStart, setShowQuickStart] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [brugModal, setBrugModal] = useState(null) // yarn object or null
  const [saveError, setSaveError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setConfirmDel(false)
    setDeleting(false)
    setFieldErrors({})
  }, [modal])

  useEscapeKey(modal !== null && !brugModal && !showScanner, () => setModal(null))

  const [catalogQuery, setCatalogQuery] = useState('')
  const [selectedYarn, setSelectedYarn] = useState(null)
  const [colorsForYarn, setColorsForYarn] = useState([])
  const [projects, setProjects] = useState([])

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

  // ── Projects til "Brugt op"-folde-ud autocomplete ───────────────────────────
  // Defensiv: autocomplete-data er nice-to-have. Hvis kaldet fejler (offline,
  // RLS-edge, mocked Supabase i tests) viser vi blot fri tekst-input uden forslag.
  useEffect(() => {
    async function loadProjects() {
      try {
        const { data } = await supabase
          .from('projects')
          .select('id,title,used_at,created_at')
          .order('used_at', { ascending: false })
          .limit(200)
        setProjects(data ?? [])
      } catch {
        setProjects([])
      }
    }
    loadProjects()
  }, [])

  // ── Persist helpers ─────────────────────────────────────────────────────────
  function flashSave() {
    setSaving(true)
    setSaveMsg('Gemmer...')
    setTimeout(() => { setSaving(false); setSaveMsg('✓ Gemt') }, 700)
    setTimeout(() => setSaveMsg(''), 2500)
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const formErrors = validateForm(form)
  const isFormValid = Object.keys(formErrors).length === 0

  async function save() {
    setSaveError(null)
    const errs = validateForm(form)
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      return
    }
    setFieldErrors({})
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
    setSaveError(null)
    setDeleting(true)
    try {
      const { error } = await supabase.from('yarn_items').delete().eq('id', modal)
      if (error) {
        setSaveError(`Kunne ikke slette: ${error.message}`)
        setDeleting(false)
        return
      }
      setYarns(prev => prev.filter(y => y.id !== modal))
      setModal(null)
      flashSave()
    } catch (e) {
      setSaveError('Fejl: ' + e.message)
      setDeleting(false)
    }
  }

  function openAdd() {
    setForm({ ...EMPTY_FORM })
    setCatalogQuery('')
    setSelectedYarn(null)
    setColorsForYarn([])
    setImageFile(null)
    setImagePreview(null)
    setImageOpen(false)
    setModal('add')
  }
  async function openEdit(y) {
    setForm({ ...y })
    setCatalogQuery('')
    setSelectedYarn(null)
    setColorsForYarn([])
    setImageFile(null)
    setImagePreview(y.imageUrl ?? null)
    // Åbn billede-blok automatisk hvis garnet allerede har et billede.
    setImageOpen(Boolean(y.imageUrl || y.catalogImageUrl))
    setModal(y.id)
    if (y.catalogYarnId) {
      const yarn = await fetchYarnFullById(supabase, y.catalogYarnId)
      if (yarn) {
        setSelectedYarn(yarn)
        setCatalogQuery(displayYarnName(yarn))
        setColorsForYarn(await fetchColorsForYarn(supabase, yarn.id, { includeDiscontinued: true }))
      }
    }
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

  async function handleSelectCatalogYarn(yarn) {
    setSelectedYarn(yarn)
    setCatalogQuery(displayYarnName(yarn))
    const cols = await fetchColorsForYarn(supabase, yarn.id, { includeDiscontinued: true })
    setColorsForYarn(cols)
    setForm(f => applyCatalogYarnOnlyToForm(yarn, { ...f, antal: f.antal || 1 }))
    // Hvis kataloget medbringer et billede, så åbn billede-blokken så bruger kan se det.
    if (yarn?.image_url) setImageOpen(true)
  }

  function clearCatalogLink() {
    setSelectedYarn(null)
    setColorsForYarn([])
    setCatalogQuery('')
    setForm(f => ({
      ...f,
      catalogYarnId: null,
      catalogColorId: null,
      catalogImageUrl: null,
    }))
  }

  // ── Scanner callback ────────────────────────────────────────────────────────
  function handleScanResult(yarnData) {
    setForm({ ...EMPTY_FORM, ...yarnData })
    setCatalogQuery('')
    setSelectedYarn(null)
    setColorsForYarn([])
    if (yarnData.catalogYarnId) {
      fetchYarnFullById(supabase, yarnData.catalogYarnId).then(y => {
        if (y) {
          setSelectedYarn(y)
          setCatalogQuery(displayYarnName(y))
          fetchColorsForYarn(supabase, y.id, { includeDiscontinued: true }).then(setColorsForYarn)
        }
      })
    }
    setModal('add')
  }

  // ── Filtering ───────────────────────────────────────────────────────────────
  // Default-visning skjuler "Brugt op"-garn så lageret viser hvad brugeren har.
  // Brugeren kan eksplicit vælge "Brugt op" i status-dropdown for at se dem.
  const filtered = yarns.filter(y => {
    const matchesSearch = yarnMatchesStashSearch(y, q)
    const matchesWeight = !filterWeight || y.weight === filterWeight
    const matchesStatus = filterStatus
      ? y.status === filterStatus
      : y.status !== 'Brugt op'
    const matchesFiber  = !filterFiber  || (y.fiber ?? '').toLowerCase().includes(filterFiber.toLowerCase())
    return matchesSearch && matchesWeight && matchesStatus && matchesFiber
  })

  const totalNgl    = yarns.reduce((s, y) => s + Number(y.antal || 0), 0)
  const brugtOpCount = yarns.filter(y => y.status === 'Brugt op').length

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', color: '#8B7D6B', fontFamily: "'DM Sans', sans-serif" }}>
      Henter garnlager...
    </div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: 'transparent', minHeight: '100vh' }}>

      {showQuickStart && <QuickStartModal onClose={() => setShowQuickStart(false)} />}
      {showScanner && <BarcodeScanner onClose={() => setShowScanner(false)} onAddToLager={handleScanResult} />}
      {brugModal && (
        <BrugNoeglerModal
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

      {/* Hero banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(97,132,109,0.33) 0%, #C9E6DA 100%)',
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(32px, 4.5vw, 48px)',
          fontWeight: 600,
          color: '#302218',
          margin: '0 0 12px',
          letterSpacing: '.01em',
        }}>
          Mit garn
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(16px, 2vw, 20px)',
          fontStyle: 'italic',
          color: '#302218',
          margin: '0 auto 22px', maxWidth: 600, lineHeight: 1.55,
          opacity: 0.85,
        }}>
          Hele din garnsamling ét sted.
        </p>
        <button
          onClick={() => setShowQuickStart(true)}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5DDD9',
            borderRadius: 999,
            padding: '10px 22px',
            fontSize: 13.5, fontWeight: 500,
            color: '#302218', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 2px 8px rgba(48,34,24,.06)',
            transition: 'transform .15s, box-shadow .15s',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(48,34,24,.10)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(48,34,24,.06)' }}
        >
          <span style={{ fontSize: 10, lineHeight: 1 }}>▾</span>
          Kom godt i gang med din garnsamling
        </button>
      </div>

      {/* Stats + handlinger (smal) */}
      <div style={{
        background: '#EDE7D8',
        borderBottom: '1px solid #D8D0C0',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{
          display: 'flex', flex: '1 1 auto', gap: '18px',
          minWidth: 0, flexWrap: 'wrap',
        }}>
          {[
            [yarns.length, 'Garntyper'],
            [totalNgl, 'Nøgler i alt'],
            [yarns.filter(y => y.status === 'I brug').length, 'I brug'],
            [yarns.filter(y => y.status === 'På lager').length, 'På lager'],
            [brugtOpCount, 'Brugt op'],
          ].map(([n, l]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '18px', fontWeight: 600, color: '#2C4A3E', lineHeight: 1.1 }}>{n}</span>
              <span style={{ fontSize: '9px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.1em' }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {saveMsg && (
            <span style={{ fontSize: '11px', color: saving ? '#61846D' : '#4A8A6A', marginRight: 4 }}>{saveMsg}</span>
          )}
          {SHOW_SCANNER && yarns.length > 0 && (
            <button
              onClick={() => setShowScanner(true)}
              style={{ background: '#FFFFFF', border: '1px solid #61846D', borderRadius: '6px', padding: '6px 11px', fontSize: '12px', color: '#2C4A3E', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <span>📷</span> Skann garn
            </button>
          )}
          <button
            onClick={async () => {
              const result = await exportGarnlager(supabase)
              if (!result.success) alert(result.error)
            }}
            style={{ background: '#FFFFFF', border: '1px solid #D0C8BA', borderRadius: '6px', padding: '6px 11px', fontSize: '12px', color: '#5A4E42', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px' }}
            aria-label="Eksporter garnlager som CSV"
          >
            <span>📥</span> Eksporter
          </button>
          <button
            onClick={openAdd}
            style={{ background: '#61846D', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer' }}
          >
            + Tilføj garn
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: '12px 20px 8px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Søg garn, farve eller mærke…"
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
              minHeight: '36px', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
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
          {filtered.map(y => {
            const displayName = dedupeYarnNameFromBrand(y.name, y.brand)
            const colorBg = gradientFromHexColors(y.hexColors, y.hex)
            const isMulti = Array.isArray(y.hexColors) && y.hexColors.length >= 2
            const headerUrl = y.imageUrl || y.catalogImageUrl
            const isSwatch = !y.imageUrl && y.catalogImageUrl && isCatalogSwatchUrl(y.catalogImageUrl)
            const showPhoto = headerUrl && !isSwatch
            const colorPillText = y.colorName || (isMulti ? `Multi (${y.hexColors.length})` : '')
            const weightLabel = (y.weight && YARN_WEIGHT_LABELS[String(y.weight).toLowerCase()])
              || y.weight
              || ''
            const fiberLabel = primaryFiberLabel(y.fiber)
            return (
              <div
                key={y.id}
                onClick={() => openEdit(y)}
                style={{ background: '#FFFCF7', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(44,32,24,.08)', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(44,32,24,.13)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(44,32,24,.08)' }}
              >
                {/* Billedfelt — fyldt med foto, swatch-på-farve, eller solid/gradient */}
                {/* "Brugt op"-status: greyscale + badge så kortet visuelt læses som arkiveret */}
                <div style={{
                  position: 'relative',
                  height: '120px',
                  background: showPhoto ? '#F4EFE6' : colorBg,
                  overflow: 'hidden',
                  filter: y.status === 'Brugt op' ? 'grayscale(1)' : 'none',
                }}>
                  {showPhoto && (
                    <img
                      src={headerUrl}
                      alt={y.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  {isSwatch && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        width: 76,
                        height: 76,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,.72)',
                        border: '1px solid rgba(44,32,24,.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 10px rgba(44,32,24,.12)',
                      }}>
                        <img
                          src={headerUrl}
                          alt={y.name}
                          style={{ width: 64, height: 64, objectFit: 'contain' }}
                        />
                      </div>
                    </div>
                  )}

                  {/* "Brugt op"-badge — øverste venstre, F9 src-warning-tokens */}
                  {y.status === 'Brugt op' && (
                    <span
                      data-testid="brugt-op-badge"
                      className="bg-striq-src-warning-bg text-striq-src-warning-fg"
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        padding: '3px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 500,
                        letterSpacing: '.02em',
                        boxShadow: '0 1px 3px rgba(44,32,24,.15)',
                      }}
                    >
                      Brugt op
                    </span>
                  )}

                  {/* Manuelt-ikon ved IKKE-katalog (omvendt logik) */}
                  {!y.catalogYarnId && (
                    <span
                      title="Manuelt tilføjet"
                      aria-label="Manuelt tilføjet"
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,.85)',
                        border: '1px solid rgba(44,32,24,.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        boxShadow: '0 1px 3px rgba(44,32,24,.12)',
                      }}
                    >
                      ✎
                    </span>
                  )}

                  {/* Farvenavn-pille i nederste hjørne */}
                  {colorPillText && (
                    <span style={{
                      position: 'absolute',
                      left: 10,
                      bottom: 10,
                      maxWidth: 'calc(100% - 20px)',
                      padding: '3px 10px',
                      background: 'rgba(255,255,255,.92)',
                      border: '1px solid rgba(44,32,24,.18)',
                      borderRadius: 999,
                      fontSize: 11,
                      color: '#2C2018',
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      boxShadow: '0 1px 3px rgba(44,32,24,.10)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {colorPillText}
                    </span>
                  )}
                </div>

                <div style={{ padding: '12px' }}>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#8B7D6B', marginBottom: '2px' }}>{y.brand}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '17px', fontWeight: 600, color: '#2C2018', marginBottom: '6px' }}>{displayName}</div>
                  {/* Kompakt detaljelinje: kode · antal · status */}
                  <div style={{ fontSize: '12px', color: '#6B5D4F', marginBottom: '9px' }}>
                    {[
                      y.colorCode || null,
                      `${y.antal} ngl`,
                      y.status,
                    ].filter(Boolean).join(' · ')}
                  </div>
                  {/* Tags på samme linje: vægt + fiber */}
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {weightLabel && (
                      <Chip style={{ background: '#EDE7D8', color: '#5A4228' }}>{weightLabel}</Chip>
                    )}
                    {fiberLabel && (
                      <Chip style={{ background: '#E4EEE4', color: '#2A4A2A' }}>{fiberLabel}</Chip>
                    )}
                  </div>
                  {y.noter && <div style={{ marginTop: '8px', fontSize: '11px', color: '#8B7D6B', fontStyle: 'italic', lineHeight: '1.45' }}>{y.noter}</div>}
                </div>
              </div>
            )
          })}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Field label="Søg i garn-katalog">
                  <YarnCatalogSearch
                    value={catalogQuery}
                    onChange={setCatalogQuery}
                    onSelectYarn={handleSelectCatalogYarn}
                    placeholder="Skriv mærke eller garnnavn fra garn-kataloget…"
                    autoFocus={!form.catalogYarnId}
                  />
                </Field>
              </div>

              {form.catalogYarnId && (
                <KatalogInfoblok yarn={selectedYarn} onClearLink={clearCatalogLink} />
              )}

              {form.catalogYarnId && (
                <div
                  role="heading"
                  aria-level={3}
                  style={{
                    gridColumn: '1 / -1',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '.12em',
                    color: '#6B5D4F',
                    fontWeight: 600,
                    marginTop: 4,
                    paddingBottom: 4,
                    borderBottom: '1px solid #E5DDD9',
                  }}
                >
                  Dine egne oplysninger
                </div>
              )}

              {selectedYarn && colorsForYarn.length >= 1 && (
                <Field label="Farve fra katalog">
                  <select
                    value={form.catalogColorId || ''}
                    onChange={e => {
                      const id = e.target.value
                      if (!id) {
                        setForm(f => applyCatalogYarnOnlyToForm(selectedYarn, { ...f, antal: f.antal || 1 }))
                        return
                      }
                      const c = colorsForYarn.find(x => x.id === id)
                      if (c) {
                        setForm(f => {
                          const next = applyCatalogYarnColorToForm(selectedYarn, c, f)
                          const cn = next.colorName || ''
                          return { ...next, colorCategory: detectColorFamily(cn) || f.colorCategory }
                        })
                      }
                    }}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">Vælg farve…</option>
                    {colorsForYarn.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.color_number} · {c.color_name || '—'}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {!form.catalogYarnId && [
                ['name', 'Garnnavn', true], ['brand', 'Mærke', true],
                ['metrage', 'Løbelængde/nøgle (m)', false],
                ['pindstr', 'Pindstørrelse', false],
              ].map(([k, l, required]) => {
                const err = fieldErrors[k]
                return (
                  <Field key={k} label={required ? `${l} *` : l}>
                    <input
                      value={form[k] ?? ''}
                      onChange={e => {
                        setF(k, e.target.value)
                        if (err) setFieldErrors(prev => { const n = { ...prev }; delete n[k]; return n })
                      }}
                      type={k === 'metrage' ? 'number' : 'text'}
                      step={k === 'metrage' ? '1' : undefined}
                      aria-invalid={err ? true : undefined}
                      aria-describedby={err ? `err-${k}` : undefined}
                      style={err ? { ...inputStyle, borderColor: '#8B3A2A' } : inputStyle}
                    />
                    {err && (
                      <div id={`err-${k}`} role="alert" style={{ fontSize: '11px', color: '#8B3A2A', marginTop: '2px' }}>
                        {err}
                      </div>
                    )}
                  </Field>
                )
              })}

              {/* Fiber med hurtigvalg — skjult ved katalog-link (vist read-only i KatalogInfoblok) */}
              {!form.catalogYarnId && (
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
                            minHeight: '32px', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer',
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
              )}

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Label>Farve</Label>
                <input
                  value={combineColorDisplay(form.colorCode, form.colorName)}
                  onChange={e => {
                    const { colorName, colorCode } = parseCombinedColorInput(e.target.value)
                    setForm(p => {
                      const detected = detectColorFamily(colorName)
                      const nextCategory = (p.colorCategory && String(p.colorCategory).trim())
                        ? p.colorCategory
                        : (detected ?? '')
                      const shouldSetHex = !(p.hex && String(p.hex).trim())
                      const nextHex = shouldSetHex && detected && COLOR_FAMILY_DEFAULT_HEX[detected]
                        ? COLOR_FAMILY_DEFAULT_HEX[detected]
                        : p.hex
                      return {
                        ...p,
                        colorName,
                        colorCode,
                        colorCategory: nextCategory,
                        hex: nextHex ?? '',
                      }
                    })
                  }}
                  placeholder="fx 883174 eller Rosa"
                  style={inputStyle}
                />
                <span style={{ fontSize: '11px', color: '#8B7D6B' }}>Skriv farvenummer, navn eller begge dele</span>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Label>Farvekategori</Label>
                <FarvekategoriCirkler
                  colorCategory={form.colorCategory}
                  hex={form.hex}
                  onChange={({ colorCategory, hex }) => {
                    setForm(p => ({ ...p, colorCategory, hex }))
                  }}
                  onExactHexChange={hex => setF('hex', hex)}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <FlereFarverVælger
                  hexColors={form.hexColors}
                  onChange={hexColors => setF('hexColors', hexColors)}
                />
              </div>

              {!form.catalogYarnId && (
                <Field label="Garnvægt">
                  <select value={form.weight} onChange={e => setF('weight', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {WEIGHTS.map(w => <option key={w}>{w}</option>)}
                  </select>
                </Field>
              )}

              <Field label="Status">
                <select
                  value={form.status}
                  onChange={e => {
                    const next = e.target.value
                    setForm(p => ({
                      ...p,
                      status: next,
                      // Default dato til i dag når status skifter til "Brugt op" og dato er tom.
                      brugtOpDato: next === 'Brugt op' && !p.brugtOpDato ? toISODate(new Date()) : p.brugtOpDato,
                    }))
                  }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>

              {/* Antal nøgler — −/+/n stepper */}
              <Field label="Antal nøgler">
                <AntalStepper
                  value={form.antal}
                  onChange={v => setF('antal', v)}
                />
              </Field>

              {/* Brugt op-folde-ud — vises kun når status = "Brugt op" (F5) */}
              {form.status === 'Brugt op' && (
                <BrugtOpFoldeUd
                  brugtTilProjekt={form.brugtTilProjekt}
                  brugtOpDato={form.brugtOpDato}
                  onChangeProjekt={v => {
                    setF('brugtTilProjekt', v)
                    if (fieldErrors.brugtTilProjekt) {
                      setFieldErrors(prev => { const n = { ...prev }; delete n.brugtTilProjekt; return n })
                    }
                  }}
                  onChangeDato={v => setF('brugtOpDato', v)}
                  existingProjects={projects}
                  error={fieldErrors.brugtTilProjekt}
                />
              )}

              {/* Billede upload — kollapset bag toggle indtil bruger åbner */}
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!imageOpen ? (
                  <button
                    type="button"
                    onClick={() => setImageOpen(true)}
                    aria-expanded={false}
                    style={{
                      alignSelf: 'flex-start',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 0',
                      fontSize: '12px',
                      color: '#6B5D4F',
                      fontFamily: "'DM Sans', sans-serif",
                      textDecoration: 'underline',
                    }}
                  >
                    ▸ + Tilføj billede
                  </button>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Label>Billede af garnet</Label>
                      {!imagePreview && !form.catalogImageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageOpen(false)}
                          aria-expanded={true}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#8B7D6B', fontFamily: "'DM Sans', sans-serif" }}
                        >
                          ▾ Skjul
                        </button>
                      )}
                    </div>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '8px 12px', border: '1px dashed #C0B8A8',
                      borderRadius: '8px', cursor: 'pointer', background: '#F4EFE6',
                    }}>
                      <input type="file" accept="image/*" onChange={handleImageFile} style={{ display: 'none' }} />
                      {imagePreview ? (
                        <img src={imagePreview} alt="preview" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #D0C8BA' }} />
                      ) : form.catalogImageUrl ? (
                        <img
                          src={form.catalogImageUrl}
                          alt="Katalog"
                          style={{
                            width: '56px',
                            height: '56px',
                            objectFit: isCatalogSwatchUrl(form.catalogImageUrl) ? 'contain' : 'cover',
                            borderRadius: '6px',
                            border: '1px solid #D0C8BA',
                            background: isCatalogSwatchUrl(form.catalogImageUrl) ? 'rgba(255,255,255,.65)' : 'transparent',
                          }}
                        />
                      ) : (
                        <div style={{ width: '56px', height: '56px', background: '#EDE7D8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#8B7D6B' }}>📷</div>
                      )}
                      <div>
                        <div style={{ fontSize: '12px', color: '#2C2018', fontWeight: 500 }}>{imagePreview ? 'Skift billede' : 'Upload billede'}</div>
                        <div style={{ fontSize: '11px', color: '#8B7D6B' }}>JPG eller PNG — vises på garnkortet</div>
                      </div>
                    </label>
                    {!imagePreview && form.catalogImageUrl && isCatalogSwatchUrl(form.catalogImageUrl) && (
                      <div style={{ fontSize: '11px', color: '#8B7D6B', lineHeight: '1.45' }}>
                        Katalogbilledet er en lille farveprøve (100×100). Upload et foto for skarpere kort.
                      </div>
                    )}
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreview(null); setF('imageUrl', null) }}
                        style={{ alignSelf: 'flex-start', fontSize: '11px', color: '#8B3A2A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}
                      >
                        ✕ Fjern billede
                      </button>
                    )}
                  </>
                )}
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
                confirmDel ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginRight: 'auto' }}>
                    <span style={{ fontSize: '13px', color: '#8B3A2A' }}>Er du sikker?</span>
                    <button onClick={() => setConfirmDel(false)} disabled={deleting} style={{ padding: '8px 12px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#6B5D4F' }}>Annuller</button>
                    <button onClick={del} disabled={deleting} style={{ padding: '8px 14px', background: '#8B3A2A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: deleting ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      {deleting ? 'Sletter...' : 'Ja, slet'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(true)} style={{ padding: '8px 14px', background: '#F0E8E0', color: '#8B3A2A', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', marginRight: 'auto', fontFamily: "'DM Sans', sans-serif" }}>
                    Slet
                  </button>
                )
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
              <button
                onClick={save}
                disabled={!isFormValid}
                aria-disabled={!isFormValid}
                style={{
                  padding: '8px 18px',
                  background: isFormValid ? '#2C4A3E' : '#8AAAA0',
                  color: '#fff', border: 'none', borderRadius: '6px',
                  fontSize: '13px', fontWeight: 500,
                  cursor: isFormValid ? 'pointer' : 'not-allowed',
                  opacity: isFormValid ? 1 : 0.7,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {modal === 'add' ? 'Tilføj til lager' : 'Gem ændringer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
