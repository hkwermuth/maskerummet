'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/client'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import { toDb, fromDb, toUsageDb } from '@/lib/supabase/mappers'
import { uploadFile as uploadFileRaw } from '@/lib/supabase/storage'
import {
  fetchYarnFullById,
  fetchColorsForYarn,
  displayYarnName,
  applyCatalogYarnOnlyToForm,
} from '@/lib/catalog'
import BarcodeScanner from './BarcodeScanner'
import BrugNoeglerModal from './BrugNoeglerModal'
import GarnKort from './GarnKort'
import GarnModal from './GarnModal'
import { useGarnFilters } from '@/lib/hooks/useGarnFilters'
import { detectColorFamily, yarnMatchesStashSearch } from '@/lib/data/colorFamilies'
import { looseWeightKey } from '@/lib/yarn-weight'
import { validateForm } from '@/lib/validators/yarnForm'

const WEIGHTS  = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky']
const STATUSES = ['På lager', 'I brug', 'Brugt op', 'Ønskeliste']
const FIBER_PILLS = ['Uld', 'Merino', 'Mohair', 'Alpaka', 'Silke', 'Bomuld', 'Hør', 'Akryl']

// Skanning skjult indtil EAN-koder er fyldt på colors-tabellen i kataloget.
// Sæt til true for at gen-aktivere scanner-knappen + modal.
const SHOW_SCANNER = false

const EMPTY_FORM = {
  name: '', brand: '', colorName: '', colorCode: '', colorCategory: '',
  weight: 'DK', fiber: '', metrage: '', pindstr: '',
  antal: 1, status: 'På lager', hex: '', hexColors: [], noter: '', barcode: '',
  imageUrl: null,
  brugtTilProjekt: '',
  brugtOpDato: '',
  // F15: 3-mode projekt-kobling for "Brugt op"-flow.
  brugtOpMode: 'none',
  brugtOpProjectId: '',
  brugtOpNewTitle: '',
  catalogYarnId: null,
  catalogColorId: null,
  catalogImageUrl: null,
}

// ─── Kom godt i gang (quick-start popup) ──────────────────────────────────────

const QUICK_START_STEPS = [
  { title: 'Opret garn', body: 'Find garnet i Garn-kataloget når du opretter, eller tilføj garnet manuelt.' },
  { title: 'Filtrér', body: 'Filtrér på fiber, vægt eller farve, når du vil finde noget bestemt.' },
  { title: 'Brug garnet', body: "Aktiver dit garn på dine projekter eller ideer til dine projekter. Du kan stadig se det i dit lager under 'I brug' eller 'Brugt op'." },
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const uploadFile = (bucket, path, file) => uploadFileRaw(supabase, bucket, path, file)
  const [yarns, setYarns] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Filter-state + localStorage-persistens (user-namespaced) i én hook.
  const {
    q, setQ,
    filterWeight, setFilterWeight,
    filterStatus, setFilterStatus,
    filterFiber, setFilterFiber,
  } = useGarnFilters(user.id)

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
  // Sporbarhed: aktive projekter for det åbne garn (vises i edit-modal)
  const [activeProjects, setActiveProjects] = useState([])
  // Forhindrer auto-åbn-effekten i at trigge igen efter brugeren har lukket modalen
  const autoOpenedYarnId = useRef(null)

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
  // fetchYarns er stable callback så vi kan refresh fra fx BrugNoeglerModal-
  // onSaved (hvor allocate-flow kan have oprettet en ny I-brug-række der ikke
  // er repræsenteret i lokal state).
  const fetchYarns = useMemo(() => async () => {
    const { data, error } = await supabase
      .from('yarn_items')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Fejl ved hentning af garnlager:', error.message)
      setLoaded(true)
      return
    }

    const mapped = (data ?? []).map(fromDb)

    // Hent yarn_usage + projekt-info for "Brugt op"-garn i ÉT bulk-kald (ingen N+1)
    // så grid-kortet kan vise hvilke projekter garnet blev brugt i + nøgle-antal
    // direkte uden at åbne edit-modal. Andre statuser har ikke brug for det her.
    const brugtOpIds = mapped.filter(y => y.status === 'Brugt op').map(y => y.id)
    if (brugtOpIds.length > 0) {
      const { data: usageRows, error: usageError } = await supabase
        .from('yarn_usage')
        .select('id, yarn_item_id, project_id, quantity_used, projects(id, title, status)')
        .in('yarn_item_id', brugtOpIds)
        .eq('user_id', user.id)
      if (usageError) {
        console.error('Fejl ved hentning af projekt-brug for Brugt op-garn:', usageError.message)
      }
      const byYarnId = new Map()
      for (const r of usageRows ?? []) {
        if (!r.projects) continue
        const list = byYarnId.get(r.yarn_item_id) ?? []
        list.push({
          yarnUsageId:  r.id,
          projectId:    r.projects.id,
          title:        r.projects.title ?? null,
          status:       r.projects.status ?? 'i_gang',
          quantityUsed: r.quantity_used == null ? null : Number(r.quantity_used),
        })
        byYarnId.set(r.yarn_item_id, list)
      }
      for (const y of mapped) {
        if (y.status === 'Brugt op') y.usages = byYarnId.get(y.id) ?? []
      }
    }

    setYarns(mapped)
    setLoaded(true)
  }, [supabase, user.id])

  useEffect(() => {
    fetchYarns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Projects til "Brugt op"-folde-ud autocomplete ───────────────────────────
  // Defensiv: autocomplete-data er nice-to-have. Hvis kaldet fejler (offline,
  // RLS-edge, mocked Supabase i tests) viser vi blot fri tekst-input uden forslag.
  useEffect(() => {
    async function loadProjects() {
      try {
        // Kun brugerens egne projekter, og kun status='vil_gerne' eller 'i_gang'.
        // Færdigstrikkede projekter er ikke et naturligt mål for "garnet blev brugt
        // her" — listen blev for lang. Brugeren kan stadig genåbne et færdigt
        // projekt i Arkiv hvis nødvendigt (F15).
        const { data } = await supabase
          .from('projects')
          .select('id,title,used_at,created_at,status')
          .eq('user_id', user.id)
          .in('status', ['vil_gerne', 'i_gang'])
          .order('used_at', { ascending: false })
          .limit(200)
        setProjects(data ?? [])
      } catch {
        setProjects([])
      }
    }
    loadProjects()
  }, [user.id])

  // ── Sporbarhed: aktive projekter for det åbne garn ──────────────────────────
  // Loader yarn_usage joinet med projects når brugeren åbner edit-modal på et
  // konkret garn. Tomt for 'add'-mode. Defensiv: hvis kaldet fejler vises
  // sektionen bare ikke (intet UI-disrupt).
  useEffect(() => {
    if (!modal || modal === 'add') {
      setActiveProjects([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('yarn_usage')
          .select('id, project_id, quantity_used, projects!inner(id, title, status)')
          .eq('yarn_item_id', modal)
          .eq('user_id', user.id)
        if (cancelled) return
        const lines = (data ?? []).map(r => ({
          yarnUsageId:  r.id,
          projectId:    r.projects?.id,
          title:        r.projects?.title ?? null,
          status:       r.projects?.status ?? 'i_gang',
          quantityUsed: Number(r.quantity_used ?? 0),
        }))
        setActiveProjects(lines.filter(l => l.projectId))
      } catch {
        if (!cancelled) setActiveProjects([])
      }
    })()
    return () => { cancelled = true }
  }, [modal, user.id, supabase])

  // ── Auto-åbn garn fra ?yarn=<id> query-param ────────────────────────────────
  // Bruges til cross-link fra Arkiv ("Vis i Mit garn"). Trigger kun én gang per
  // yarn-id så brugeren kan lukke modalen uden at den åbner igen.
  useEffect(() => {
    const yarnId = searchParams?.get('yarn')
    if (!yarnId || !loaded) return
    if (autoOpenedYarnId.current === yarnId) return
    const row = yarns.find(y => y.id === yarnId)
    if (!row) return
    autoOpenedYarnId.current = yarnId
    void openEdit(row)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, yarns, loaded])

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

      // F15: fang det oprindelige antal (før toDb nuller det ud) — bruges som
      // quantity_used hvis vi opretter en yarn_usage-række til projektet.
      const previousQty = parseFloat(String(form.antal)) || 0

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

      // F15: hvis status='Brugt op' OG projekt-mode≠'none', opret yarn_usage-række
      // så projektet faktisk ved at garnet er brugt der. 'new' opretter også projektet.
      const mode = form.brugtOpMode || 'none'
      if (form.status === 'Brugt op' && mode !== 'none' && savedId) {
        let projectId = null
        if (mode === 'existing') {
          projectId = form.brugtOpProjectId || null
        } else if (mode === 'new') {
          const title = (form.brugtOpNewTitle || '').trim()
          if (title) {
            const { data: proj, error: pErr } = await supabase
              .from('projects')
              .insert([{ user_id: user.id, title, status: 'i_gang', used_at: form.brugtOpDato || null }])
              .select('id,title,used_at,created_at,status')
              .single()
            if (pErr) { setSaveError(`Kunne ikke oprette projekt: ${pErr.message}`); return }
            projectId = proj.id
            // Tilføj det nye projekt til lokal state så datalist/select er up-to-date.
            setProjects(prev => [proj, ...prev])
          }
        }
        if (projectId) {
          const usagePayload = toUsageDb({
            projectId,
            yarnItemId: savedId,
            yarnName:   form.name,
            yarnBrand:  form.brand,
            colorName:  form.colorName,
            colorCode:  form.colorCode,
            hex:        form.hex,
            catalogYarnId:  form.catalogYarnId  ?? null,
            catalogColorId: form.catalogColorId ?? null,
            quantityUsed: previousQty > 0 ? previousQty : null,
            usedAt:       form.brugtOpDato || undefined,
          })
          const { error: uErr } = await supabase
            .from('yarn_usage')
            .insert([{ ...usagePayload, user_id: user.id }])
          if (uErr) { setSaveError(`Kunne ikke koble garn til projekt: ${uErr.message}`); return }
        }
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

  // ── Filtering + sortering ──────────────────────────────────────────────────
  // Default-visning skjuler "Brugt op"-garn så lageret viser hvad brugeren har.
  // Brugeren kan eksplicit vælge "Brugt op" i status-dropdown for at se dem.
  // Sortering: nyeste først (created_at desc), så alfabetisk på navn som tie-break.
  const filtered = yarns
    .filter(y => {
      const matchesSearch = yarnMatchesStashSearch(y, q)
      // Vægt-felt har historisk været gemt med blandet casing ('Lace' vs 'lace')
      // afhængigt af om garnet kom fra katalog eller manuel form. Sammenlign på
      // den kanoniske lowercase enum-værdi så 'Lace' matcher 'lace' matcher 'sock'.
      const matchesWeight = !filterWeight || looseWeightKey(y.weight) === looseWeightKey(filterWeight)
      const matchesStatus = filterStatus
        ? y.status === filterStatus
        : y.status !== 'Brugt op'
      const matchesFiber  = !filterFiber  || (y.fiber ?? '').toLowerCase().includes(filterFiber.toLowerCase())
      return matchesSearch && matchesWeight && matchesStatus && matchesFiber
    })
    .slice()
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      if (ta !== tb) return tb - ta
      return (a.name || '').localeCompare(b.name || '', 'da')
    })

  // Bug 5 (2026-05-05): Brugt op-rækker bevarer nu antal forbrugt, men de
  // tæller IKKE som lagerbeholdning. Ekskluder fra totalsummen så
  // "Nøgler i alt"-statbar viser reel disponibel mængde.
  const totalNgl    = yarns
    .filter(y => y.status !== 'Brugt op')
    .reduce((s, y) => s + Number(y.antal || 0), 0)
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
          onSaved={async (usageRow, newQty, newStatus) => {
            // Optimistisk lokal opdatering af source-rækken så UI ikke
            // flickerer mens vi henter ny stash. fetchYarns synkroniserer
            // bagefter (allocate-flow kan have oprettet ny I-brug-række
            // og merget kvantiteter — kan ikke afledes fra parametrene).
            setYarns(prev => prev.map(y =>
              y.id === brugModal.id
                ? { ...y, antal: newQty, status: newStatus ?? y.status }
                : y
            ))
            setBrugModal(null)
            setModal(null)
            await fetchYarns()
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
          {filtered.map(y => (
            <GarnKort key={y.id} yarn={y} onEdit={openEdit} />
          ))}
        </div>
      )}

      {/* Edit/Add Modal */}
      <GarnModal
        modal={modal}
        form={form}
        yarns={yarns}
        fieldErrors={fieldErrors}
        saveError={saveError}
        isFormValid={isFormValid}
        confirmDel={confirmDel}
        deleting={deleting}
        imagePreview={imagePreview}
        imageOpen={imageOpen}
        catalogQuery={catalogQuery}
        selectedYarn={selectedYarn}
        colorsForYarn={colorsForYarn}
        projects={projects}
        activeProjects={activeProjects}
        onClose={() => setModal(null)}
        onSetForm={setForm}
        onSetF={setF}
        onSetFieldErrors={setFieldErrors}
        onSave={save}
        onDel={del}
        onConfirmDel={setConfirmDel}
        onSetImageOpen={setImageOpen}
        onImageFile={handleImageFile}
        onRemoveImage={() => { setImageFile(null); setImagePreview(null); setF('imageUrl', null) }}
        onCatalogQueryChange={setCatalogQuery}
        onSelectCatalogYarn={handleSelectCatalogYarn}
        onClearCatalogLink={clearCatalogLink}
        onToggleFiber={toggleFiberInForm}
        onOpenBrugModal={(yarn) => setBrugModal(yarn)}
        onOpenProject={(projectId) => router.push(`/projekter?projekt=${projectId}`)}
      />

    </div>
  )
}
