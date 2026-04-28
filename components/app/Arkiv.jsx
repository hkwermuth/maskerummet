'use client'
import { useMemo, useRef, useState, useEffect } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import { fromDb, fromUsageDb, toUsageDb } from '@/lib/supabase/mappers'
import {
  uploadFile as uploadFileRaw,
  uploadFilesParallel,
  deleteFiles,
  validateUploadFile,
} from '@/lib/supabase/storage'
import { renderPdfFirstPage } from '@/lib/pdf-thumbnail'
import { displayYarnName, fetchColorsByIds, fetchColorsForYarn, searchYarnsFull } from '@/lib/catalog'
import { exportProjekter } from '@/lib/export/exportProjekter'
import { formatDanish } from '@/lib/date/formatDanish'
import { DelMedFaellesskabetModal } from '@/components/app/DelMedFaellesskabetModal'
import GarnLinjeVælger from '@/components/app/GarnLinjeVælger'
import ProjectCardPlaceholder from '@/components/app/ProjectCardPlaceholder'
import ImageCarousel from '@/components/app/ImageCarousel'
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  MAX_PROJECT_IMAGES,
  MAX_PATTERN_IMAGES,
  MAX_UPLOAD_BYTES,
  ALLOWED_IMAGE_MIME,
  ALLOWED_PDF_MIME,
} from '@/lib/types'

const PROJECT_FIELDS =
  'id,user_id,title,used_at,needle_size,held_with,notes,' +
  'project_image_urls,pattern_pdf_url,pattern_pdf_thumbnail_url,pattern_image_urls,' +
  'is_shared,shared_at,project_type,pattern_name,pattern_designer,community_description,community_size_shown,' +
  'status,created_at,updated_at'

const IMAGES_BUCKET   = 'yarn-images'
const PATTERNS_BUCKET = 'patterns'

function safeExt(name, fallback = 'bin') {
  const m = (name || '').match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : fallback
}

function makeImagePath(userId, projectId) {
  // Stabile UUID-baserede paths så reorder ikke kræver rename i Storage.
  const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return (ext) => `${userId}/projects/${projectId}/${uuid}.${ext}`
}

function pathFromUrl(url) {
  // Vi gemmer URL'er i DB; storage.remove kræver path. Vi parser path ud af
  // signed/public URL'er ved at finde "/<bucket>/" og tage resten frem til "?".
  if (!url) return null
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    // Format: .../object/{public|sign}/<bucket>/<path...>
    const idx = parts.findIndex(p => p === IMAGES_BUCKET || p === PATTERNS_BUCKET)
    if (idx === -1) return null
    return parts.slice(idx + 1).join('/')
  } catch {
    return null
  }
}

function StatusChips({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {PROJECT_STATUSES.map(s => {
        const active = value === s
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            style={{
              padding: '7px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer',
              border: active ? '1px solid #6A5638' : '1px solid #D0C8BA',
              background: active ? '#6A5638' : 'transparent',
              color: active ? '#fff' : '#6B5D4F',
              fontWeight: active ? 500 : 400,
            }}
          >
            {PROJECT_STATUS_LABELS[s]}
          </button>
        )
      })}
    </div>
  )
}

const PROJECT_STATUS_CHIP_STYLE = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: '999px',
  fontSize: '11px',
  fontFamily: "'DM Sans', sans-serif",
  background: '#EDE7D8',
  color: '#6A5638',
  letterSpacing: '.02em',
}

// Status-accent matcher Garnlager.STATUS_COLORS mønstret så systemet føles ét.
const PROJECT_STATUS_ACCENT = {
  vil_gerne:       { bg: '#D8D0E8', fg: '#3C2A5C' },
  i_gang:          { bg: '#FFE0C4', fg: '#7A3C10' },
  faerdigstrikket: { bg: '#D0E8D4', fg: '#2A5C35' },
}

function titleLabelForStatus(status) {
  if (status === 'vil_gerne') return 'Hvad vil du strikke?'
  if (status === 'i_gang')    return 'Hvad strikker du?'
  return 'Hvad strikkede du?'
}

function StatusAccentBar({ status }) {
  const c = PROJECT_STATUS_ACCENT[status] ?? PROJECT_STATUS_ACCENT.faerdigstrikket
  const label = PROJECT_STATUS_LABELS[status] ?? PROJECT_STATUS_LABELS.faerdigstrikket
  return (
    <div
      role="status"
      aria-label={`Projektstatus: ${label}`}
      style={{
        background: c.bg,
        color: c.fg,
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '.04em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: c.fg, opacity: 0.65 }} />
      {label}
    </div>
  )
}

const formatDate = formatDanish

const inputStyle = {
  padding: '7px 10px', border: '1px solid #D0C8BA', borderRadius: '6px',
  fontSize: '13px', background: '#F9F6F0', color: '#2C2018',
  fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
}

function Label({ children }) {
  return <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B', marginBottom: '4px' }}>{children}</div>
}

function normalizeHex(hex) {
  if (!hex) return ''
  const s = String(hex).trim()
  return s.startsWith('#') ? s : `#${s}`
}

function YarnCatalogSearch({ value, onChange, onSelectYarn, placeholder }) {
  const supabase = useSupabase()
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)

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
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder={placeholder}
        style={inputStyle}
        autoComplete="off"
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

// Items i MultiImageGrid: { url, pendingFile, isExisting, _key } hvor url er
// enten signed/public URL (isExisting=true) eller blob:URL (pending).
function MultiImageGrid({
  items,
  onAdd,
  onRemove,
  onReorder,
  max,
  label,
  hint,
}) {
  const inputRef = useRef(null)
  const remaining = Math.max(0, max - items.length)

  function pickFiles(e) {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length === 0) return
    onAdd(files.slice(0, remaining))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Label>{label}</Label>
        <span aria-live="polite" style={{ fontSize: '11px', color: '#8B7D6B' }}>{items.length} / {max}</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
        gap: '8px',
      }}>
        {items.map((it, i) => (
          <div
            key={it._key}
            style={{
              position: 'relative',
              aspectRatio: '1 / 1',
              borderRadius: '8px',
              overflow: 'hidden',
              background: '#EDE7D8',
              border: i === 0 ? '2px solid #6A5638' : '1px solid #D0C8BA',
            }}
          >
            <img src={it.url} alt={`Billede ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {i === 0 && (
              <span style={{
                position: 'absolute', top: 4, left: 4,
                padding: '2px 7px', borderRadius: 999,
                fontSize: 10, background: 'rgba(106,86,56,.92)', color: '#fff',
                letterSpacing: '.04em',
              }}>Cover</span>
            )}
            <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, display: 'flex', gap: 4, justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => onReorder(i, i - 1)}
                    aria-label={`Flyt billede ${i + 1} op`}
                    style={iconBtnStyle}
                  >↑</button>
                )}
                {i < items.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onReorder(i, i + 1)}
                    aria-label={`Flyt billede ${i + 1} ned`}
                    style={iconBtnStyle}
                  >↓</button>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Slet billede ${i + 1}`}
                style={{ ...iconBtnStyle, background: 'rgba(139,58,42,.92)' }}
              >✕</button>
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={`Tilføj billede${remaining > 1 ? 'r' : ''}`}
            style={{
              aspectRatio: '1 / 1',
              borderRadius: '8px',
              border: '1px dashed #C0B8A8',
              background: '#F4EFE6',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#6B5D4F',
              fontFamily: "'DM Sans', sans-serif",
              minHeight: 110,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, marginBottom: 2 }}>＋</span>
            Tilføj
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={remaining > 1}
        onChange={pickFiles}
        style={{ display: 'none' }}
      />
      {hint && <div style={{ fontSize: 11, color: '#8B7D6B' }}>{hint}</div>}
    </div>
  )
}

const iconBtnStyle = {
  minWidth: 40, minHeight: 40,
  padding: '0 8px',
  border: 'none', borderRadius: 6,
  background: 'rgba(44,32,24,.78)', color: '#fff',
  fontSize: 14, lineHeight: 1, cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
}

function PatternModeToggle({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Opskrift-format" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {[
        { v: 'pdf',    label: 'PDF' },
        { v: 'images', label: 'Billeder' },
      ].map(o => {
        const active = value === o.v
        return (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.v)}
            style={{
              padding: '7px 14px',
              borderRadius: 999,
              border: '1px solid ' + (active ? '#6A5638' : '#D0C8BA'),
              background: active ? '#6A5638' : '#FFFCF7',
              color: active ? '#fff' : '#6B5D4F',
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: active ? 500 : 400,
              cursor: disabled ? 'default' : 'pointer',
              minHeight: 36,
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function DetailModal({ entry, user, onClose, onDelete, onSaved, onShare }) {
  const supabase = useSupabase()
  const [editing, setEditing]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const [saveError, setSaveError]     = useState(null)

  const yarns = entry?.yarnLines ?? []
  const fallbackHex = yarns[0]?.hex || '#A8C4C4'

  const [form, setForm] = useState({
    title:           entry?.title            ?? '',
    usedAt:          entry?.used_at          ?? '',
    needleSize:      entry?.needle_size      ?? '',
    notes:           entry?.notes            ?? '',
    status:          entry?.status           ?? 'faerdigstrikket',
    patternName:     entry?.pattern_name     ?? '',
    patternDesigner: entry?.pattern_designer ?? '',
    yarnLines:       (entry?.yarnLines ?? []).map(l => ({ ...l, catalogQuery: l.yarnName || '' })),
  })

  const [userYarnItems, setUserYarnItems] = useState([])

  // Strik-billeder
  const [projectImages, setProjectImages] = useState(() =>
    (entry?.project_image_urls ?? []).map((url, i) => ({
      url, pendingFile: null, isExisting: true, _key: `e-${i}-${url}`,
    }))
  )
  const [removedProjectImageUrls, setRemovedProjectImageUrls] = useState([])

  // Opskrift
  const initialPatternMode =
    entry?.pattern_pdf_url ? 'pdf'
    : (entry?.pattern_image_urls?.length ?? 0) > 0 ? 'images'
    : 'pdf'
  const [patternMode, setPatternMode] = useState(initialPatternMode)

  // PDF-mode state
  const [pdfFile, setPdfFile]       = useState(null)
  const [pdfFileName, setPdfFileName] = useState(null)
  const [existingPdfUrl, setExistingPdfUrl] = useState(entry?.pattern_pdf_url ?? null)
  const [pdfThumbnailBlob, setPdfThumbnailBlob] = useState(null)
  const [pdfThumbnailPreview, setPdfThumbnailPreview] = useState(entry?.pattern_pdf_thumbnail_url ?? null)
  const [removePdf, setRemovePdf]   = useState(false)
  const [renderingThumb, setRenderingThumb] = useState(false)

  // Billed-mode state
  const [patternImages, setPatternImages] = useState(() =>
    (entry?.pattern_image_urls ?? []).map((url, i) => ({
      url, pendingFile: null, isExisting: true, _key: `pe-${i}-${url}`,
    }))
  )
  const [removedPatternImageUrls, setRemovedPatternImageUrls] = useState([])

  const [colorsByYarnId, setColorsByYarnId] = useState(new Map())

  // Cleanup blob URLs ved unmount
  useEffect(() => {
    return () => {
      projectImages.forEach(it => { if (!it.isExisting) URL.revokeObjectURL(it.url) })
      patternImages.forEach(it => { if (!it.isExisting) URL.revokeObjectURL(it.url) })
      if (pdfThumbnailPreview && pdfThumbnailPreview.startsWith('blob:')) URL.revokeObjectURL(pdfThumbnailPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // F11: hent brugerens lager én gang så "Fra mit garn"-tab kan vise det.
  // Kun garn som faktisk findes i lageret (status: På lager / I brug) — ikke
  // ønskeliste eller brugt op. Et projekt skal kunne kobles til reelt garn.
  useEffect(() => {
    async function loadStash() {
      try {
        const { data } = await supabase
          .from('yarn_items')
          .select('*')
          .in('status', ['På lager', 'I brug'])
          .order('brand', { ascending: true })
        setUserYarnItems((data ?? []).map(fromDb))
      } catch {
        setUserYarnItems([])
      }
    }
    loadStash()
  }, [])

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }
  function setLine(i, patch) {
    setForm(p => ({
      ...p,
      yarnLines: (p.yarnLines ?? []).map((l, idx) => idx === i ? { ...l, ...patch } : l),
    }))
  }
  function addLine() {
    setForm(p => ({ ...p, yarnLines: [...(p.yarnLines ?? []), EMPTY_YARN_LINE] }))
  }
  function removeLine(i) {
    setForm(p => ({ ...p, yarnLines: (p.yarnLines ?? []).filter((_, idx) => idx !== i) }))
  }
  async function ensureColorsLoaded(yarnId) {
    if (!yarnId) return []
    if (colorsByYarnId.has(yarnId)) return colorsByYarnId.get(yarnId)
    const colors = await fetchColorsForYarn(supabase, yarnId, { includeDiscontinued: true })
    setColorsByYarnId(prev => {
      const next = new Map(prev)
      next.set(yarnId, colors)
      return next
    })
    return colors
  }

  function addProjectImages(files) {
    setSaveError(null)
    const accepted = []
    for (const file of files) {
      try {
        validateUploadFile(file, { maxBytes: MAX_UPLOAD_BYTES, allowedMimes: ALLOWED_IMAGE_MIME })
      } catch (e) {
        setSaveError(e.message)
        return
      }
      accepted.push({
        url: URL.createObjectURL(file),
        pendingFile: file,
        isExisting: false,
        _key: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
    }
    setProjectImages(prev => [...prev, ...accepted].slice(0, MAX_PROJECT_IMAGES))
  }
  function removeProjectImage(index) {
    setProjectImages(prev => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed.isExisting) {
        setRemovedProjectImageUrls(rs => [...rs, removed.url])
      } else {
        URL.revokeObjectURL(removed.url)
      }
      return next
    })
  }
  function reorderProjectImage(from, to) {
    setProjectImages(prev => {
      const next = [...prev]
      const [it] = next.splice(from, 1)
      next.splice(to, 0, it)
      return next
    })
  }

  function addPatternImages(files) {
    setSaveError(null)
    const accepted = []
    for (const file of files) {
      try {
        validateUploadFile(file, { maxBytes: MAX_UPLOAD_BYTES, allowedMimes: ALLOWED_IMAGE_MIME })
      } catch (e) {
        setSaveError(e.message)
        return
      }
      accepted.push({
        url: URL.createObjectURL(file),
        pendingFile: file,
        isExisting: false,
        _key: `pn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
    }
    setPatternImages(prev => [...prev, ...accepted].slice(0, MAX_PATTERN_IMAGES))
  }
  function removePatternImage(index) {
    setPatternImages(prev => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (removed.isExisting) {
        setRemovedPatternImageUrls(rs => [...rs, removed.url])
      } else {
        URL.revokeObjectURL(removed.url)
      }
      return next
    })
  }
  function reorderPatternImage(from, to) {
    setPatternImages(prev => {
      const next = [...prev]
      const [it] = next.splice(from, 1)
      next.splice(to, 0, it)
      return next
    })
  }

  async function handlePdfPick(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      validateUploadFile(file, { maxBytes: MAX_UPLOAD_BYTES, allowedMimes: ALLOWED_PDF_MIME })
    } catch (err) {
      setSaveError(err.message)
      return
    }
    setSaveError(null)
    setPdfFile(file)
    setPdfFileName(file.name)
    setRemovePdf(false)
    // Render thumbnail i baggrunden — fejler den, fortsætter vi alligevel.
    setRenderingThumb(true)
    try {
      const blob = await renderPdfFirstPage(file)
      setPdfThumbnailBlob(blob)
      if (pdfThumbnailPreview && pdfThumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(pdfThumbnailPreview)
      }
      setPdfThumbnailPreview(URL.createObjectURL(blob))
    } catch {
      setPdfThumbnailBlob(null)
    }
    setRenderingThumb(false)
  }
  function clearPdf() {
    setPdfFile(null)
    setPdfFileName(null)
    setPdfThumbnailBlob(null)
    if (pdfThumbnailPreview && pdfThumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(pdfThumbnailPreview)
    }
    setPdfThumbnailPreview(null)
    setRemovePdf(true)
  }

  function switchPatternMode(next) {
    if (next === patternMode) return
    const hasPdf    = patternMode === 'pdf'    && (pdfFile || (existingPdfUrl && !removePdf))
    const hasImages = patternMode === 'images' && patternImages.length > 0
    if (hasPdf || hasImages) {
      const ok = typeof window === 'undefined'
        ? true
        : window.confirm('Skift af opskrift-format sletter den nuværende opskrift. Fortsæt?')
      if (!ok) return
      if (patternMode === 'pdf') {
        clearPdf()
      } else {
        for (const it of patternImages) {
          if (it.isExisting) {
            setRemovedPatternImageUrls(rs => [...rs, it.url])
          } else {
            URL.revokeObjectURL(it.url)
          }
        }
        setPatternImages([])
      }
    }
    setPatternMode(next)
  }

  async function handleSave() {
    setSaving(true); setSaveError(null)
    const newlyUploadedPaths = [] // til oprydning hvis DB-update fejler
    try {
      // F11/2026-04-28: held_with-feltet er fjernet fra projekt-formen.
      // DB-kolonnen lever videre for bagudkompatibilitet (CSV-eksport, gamle
      // rækker), men vi skriver ikke længere fra UI.
      const updates = {
        title:            form.title           || null,
        used_at:          form.usedAt          || null,
        needle_size:      form.needleSize      || null,
        notes:            form.notes           || null,
        status:           form.status          || 'faerdigstrikket',
        pattern_name:     form.patternName     || null,
        pattern_designer: form.patternDesigner || null,
      }
      if (form.status !== 'faerdigstrikket' && entry.is_shared) {
        updates.is_shared = false
      }

      // ── Strik-billeder: upload pending, byg endeligt array ──
      const finalProjectUrls = []
      for (const it of projectImages) {
        if (it.isExisting) {
          finalProjectUrls.push(it.url)
        } else {
          const path = makeImagePath(user.id, entry.id)(safeExt(it.pendingFile.name, 'jpg'))
          const url = await uploadFileRaw(supabase, IMAGES_BUCKET, path, it.pendingFile)
          newlyUploadedPaths.push({ bucket: IMAGES_BUCKET, path })
          finalProjectUrls.push(url)
        }
      }
      updates.project_image_urls = finalProjectUrls

      // ── Opskrift ──
      if (patternMode === 'pdf') {
        updates.pattern_image_urls = []
        if (pdfFile) {
          // Upload ny PDF (overwriter eksisterende sti)
          const pdfPath = `${user.id}/projects/${entry.id}.pdf`
          updates.pattern_pdf_url = await uploadFileRaw(supabase, PATTERNS_BUCKET, pdfPath, pdfFile)
          newlyUploadedPaths.push({ bucket: PATTERNS_BUCKET, path: pdfPath })
          if (pdfThumbnailBlob) {
            const thumbPath = `${user.id}/projects/${entry.id}-thumb.png`
            const thumbFile = new File([pdfThumbnailBlob], `${entry.id}-thumb.png`, { type: 'image/png' })
            updates.pattern_pdf_thumbnail_url = await uploadFileRaw(supabase, PATTERNS_BUCKET, thumbPath, thumbFile)
            newlyUploadedPaths.push({ bucket: PATTERNS_BUCKET, path: thumbPath })
          } else {
            updates.pattern_pdf_thumbnail_url = null
          }
        } else if (removePdf) {
          updates.pattern_pdf_url = null
          updates.pattern_pdf_thumbnail_url = null
        }
      } else {
        // images-mode
        updates.pattern_pdf_url = null
        updates.pattern_pdf_thumbnail_url = null
        const finalPatternUrls = []
        for (const it of patternImages) {
          if (it.isExisting) {
            finalPatternUrls.push(it.url)
          } else {
            const path = makeImagePath(user.id, entry.id)(safeExt(it.pendingFile.name, 'jpg'))
            const url = await uploadFileRaw(supabase, PATTERNS_BUCKET, path, it.pendingFile)
            newlyUploadedPaths.push({ bucket: PATTERNS_BUCKET, path })
            finalPatternUrls.push(url)
          }
        }
        updates.pattern_image_urls = finalPatternUrls
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', entry.id)
        .select(PROJECT_FIELDS)
        .single()
      if (error) throw error

      // ── Oprydning af gamle blobs efter succesfuld DB-update ──
      const cleanupImages = removedProjectImageUrls
        .map(pathFromUrl).filter(Boolean)
      if (cleanupImages.length > 0) {
        await deleteFiles(supabase, IMAGES_BUCKET, cleanupImages).catch(() => { /* best-effort */ })
      }
      const cleanupPatterns = removedPatternImageUrls
        .map(pathFromUrl).filter(Boolean)
      // Hvis vi skiftede væk fra PDF, eller PDF blev fjernet, slet gammel PDF + thumb
      const cleanupPdfPaths = []
      if (entry.pattern_pdf_url && (patternMode !== 'pdf' || (removePdf && !pdfFile) || pdfFile)) {
        const oldPdfPath = pathFromUrl(entry.pattern_pdf_url)
        if (oldPdfPath && oldPdfPath !== `${user.id}/projects/${entry.id}.pdf`) {
          cleanupPdfPaths.push(oldPdfPath)
        }
      }
      // Ryd gammel thumbnail når mode-skift, PDF er fjernet, ELLER ny PDF er
      // uploadet uden at thumbnail kunne genereres (graceful fallback) — i den
      // sidste case skriver vi pattern_pdf_thumbnail_url=null og må derfor
      // også rydde den gamle fil for at undgå orphan.
      if (entry.pattern_pdf_thumbnail_url && (
        patternMode !== 'pdf' ||
        (removePdf && !pdfFile) ||
        (pdfFile && !pdfThumbnailBlob)
      )) {
        const oldThumbPath = pathFromUrl(entry.pattern_pdf_thumbnail_url)
        if (oldThumbPath) cleanupPdfPaths.push(oldThumbPath)
      }
      if (cleanupPatterns.length > 0 || cleanupPdfPaths.length > 0) {
        await deleteFiles(supabase, PATTERNS_BUCKET, [...cleanupPatterns, ...cleanupPdfPaths]).catch(() => { /* best-effort */ })
      }

      // Synkroniser yarn_usage-rækker: slet fjernede, upsert resten
      const keptIds = new Set((form.yarnLines ?? []).map(l => l.id).filter(Boolean))
      const originalIds = (entry.yarnLines ?? []).map(l => l.id).filter(Boolean)
      const toDelete = originalIds.filter(id => !keptIds.has(id))
      if (toDelete.length > 0) {
        const { error: dErr } = await supabase.from('yarn_usage').delete().in('id', toDelete)
        if (dErr) throw dErr
      }

      const lines = (form.yarnLines ?? []).filter(l =>
        (l.yarnName || l.yarnBrand || l.colorName || l.colorCode || l.quantityUsed)
      )
      if (lines.length === 0) throw new Error('Tilføj mindst ét garn til projektet.')

      const usageRows = lines.map(l => ({
        ...(l.id ? { id: l.id } : {}),
        ...toUsageDb({
          projectId: data.id,
          yarnItemId: l.yarnItemId ?? null,
          yarnName: l.yarnName,
          yarnBrand: l.yarnBrand,
          colorName: l.colorName,
          colorCode: l.colorCode,
          hex: l.hex,
          catalogYarnId: l.catalogYarnId,
          catalogColorId: l.catalogColorId,
          quantityUsed: l.quantityUsed,
          usedFor: data.title,
          needleSize: data.needle_size,
          notes: data.notes,
          usedAt: data.used_at,
        }),
        user_id: user.id,
      }))

      const { data: savedUsages, error: uErr } = await supabase
        .from('yarn_usage')
        .upsert(usageRows)
        .select()
      if (uErr) throw uErr

      // Reset removal-trackere; lokale URL-objekter overskrives af entry-data
      setRemovedProjectImageUrls([])
      setRemovedPatternImageUrls([])
      setExistingPdfUrl(data.pattern_pdf_url ?? null)
      setPdfFile(null)
      setPdfFileName(null)
      setRemovePdf(false)

      onSaved({ ...data, yarnLines: (savedUsages ?? []).map(fromUsageDb) })
      setEditing(false)
    } catch (e) {
      // Rul nyligt uploadede filer tilbage så vi ikke efterlader orphans.
      const byBucket = new Map()
      for (const { bucket, path } of newlyUploadedPaths) {
        const arr = byBucket.get(bucket) ?? []
        arr.push(path)
        byBucket.set(bucket, arr)
      }
      for (const [bucket, paths] of byBucket) {
        await deleteFiles(supabase, bucket, paths).catch(() => { /* best-effort */ })
      }
      setSaveError('Kunne ikke gemme: ' + e.message)
    }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    // Slet projektet i DB først; cascade fjerner yarn_usage. Storage-filer
    // ryddes herefter best-effort så vi ikke efterlader orphans.
    await supabase.from('projects').delete().eq('id', entry.id)

    const imagePaths = (entry.project_image_urls ?? []).map(pathFromUrl).filter(Boolean)
    if (imagePaths.length > 0) {
      await deleteFiles(supabase, IMAGES_BUCKET, imagePaths).catch(() => { /* best-effort */ })
    }
    const patternPaths = [
      ...(entry.pattern_image_urls ?? []).map(pathFromUrl).filter(Boolean),
      ...(entry.pattern_pdf_url ? [pathFromUrl(entry.pattern_pdf_url)].filter(Boolean) : []),
      ...(entry.pattern_pdf_thumbnail_url ? [pathFromUrl(entry.pattern_pdf_thumbnail_url)].filter(Boolean) : []),
    ]
    if (patternPaths.length > 0) {
      await deleteFiles(supabase, PATTERNS_BUCKET, patternPaths).catch(() => { /* best-effort */ })
    }

    onDelete(entry.id)
    onClose()
  }

  const coverImage = projectImages[0]?.url ?? null
  const galleryImages = projectImages.slice(1)
  const hasPdf = patternMode === 'pdf' && (pdfFile || (existingPdfUrl && !removePdf))
  const pdfDisplayName = pdfFile ? pdfFileName : (existingPdfUrl ? 'Eksisterende PDF' : null)

  return (
    <div
      onClick={e => e.target === e.currentTarget && !editing && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,32,24,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1200, overflowY: 'auto', padding: '20px 16px' }}
    >
      <div style={{ background: '#FFFCF7', borderRadius: '14px', width: '520px', maxWidth: '100%', boxShadow: '0 24px 60px rgba(44,32,24,.25)', margin: 'auto', overflow: 'hidden' }}>
        {coverImage ? (
          <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: '#EDE7D8', position: 'relative' }}>
            <img src={coverImage} alt="Projekt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ height: '8px', background: fallbackHex }} />
        )}
        {!editing && galleryImages.length > 0 && (
          <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#F9F6F0', overflowX: 'auto' }}>
            {galleryImages.map((it, i) => (
              <img
                key={it._key}
                src={it.url}
                alt={`Billede ${i + 2}`}
                style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
              />
            ))}
          </div>
        )}

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder={titleLabelForStatus(form.status)} style={{ ...inputStyle, fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600 }} />
              ) : (
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#2C2018' }}>
                  {entry.title || 'Unavngivet projekt'}
                </div>
              )}
              {!editing && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={PROJECT_STATUS_CHIP_STYLE}>
                    {PROJECT_STATUS_LABELS[entry.status ?? 'faerdigstrikket']}
                  </span>
                  {entry.used_at && (
                    <span style={{ fontSize: '12px', color: '#8B7D6B' }}>{formatDate(entry.used_at)}</span>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
              {!editing && (
                <button onClick={() => setEditing(true)} style={{ padding: '5px 12px', background: '#EDE7D8', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#6A5638', fontFamily: "'DM Sans', sans-serif" }}>
                  Rediger
                </button>
              )}
              <button
                onClick={onClose}
                aria-label="Luk projekt"
                style={{
                  minWidth: 44, minHeight: 44, width: 44, height: 44,
                  background: 'none', border: 'none', fontSize: '20px',
                  cursor: 'pointer', color: '#8B7D6B',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0,
                }}
              >✕</button>
            </div>
          </div>

          {!editing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {yarns.map((y) => (
                <div key={y.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 14px', background: '#F4EFE6', borderRadius: '10px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: y.hex || '#A8C4C4', border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '11px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.1em' }}>{y.yarnBrand}</div>
                    <div style={{ fontSize: '15px', fontWeight: 500, color: '#2C2018' }}>
                      {y.yarnName} {y.colorName ? `· ${y.colorName}` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8B7D6B' }}>
                      {y.quantityUsed} ngl · {y.colorCode}
                      {y.catalogYarnId && <span style={{ marginLeft: '6px', color: '#1E4D3A' }}>· katalog</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <Label>Status</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <StatusChips value={form.status} onChange={v => setF('status', v)} />
                  <StatusAccentBar status={form.status} />
                </div>
                {form.status !== 'faerdigstrikket' && entry.is_shared && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#8B3A2A' }}>
                    Projektet er delt i Fællesskabet. Hvis du gemmer med denne status, fjernes delingen.
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div>
                  <Label>Dato</Label>
                  <input type="date" value={form.usedAt} onChange={e => setF('usedAt', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <Label>Pindestørrelse</Label>
                  <input value={form.needleSize} onChange={e => setF('needleSize', e.target.value)} placeholder="mm" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div>
                  <Label>Opskriftsnavn</Label>
                  <input value={form.patternName} onChange={e => setF('patternName', e.target.value)} placeholder="Fx. Sophie Scarf" style={inputStyle} />
                </div>
                <div>
                  <Label>Designer</Label>
                  <input value={form.patternDesigner} onChange={e => setF('patternDesigner', e.target.value)} placeholder="Fx. PetiteKnit" style={inputStyle} />
                </div>
              </div>

              <div>
                <Label>Garn i projektet</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(form.yarnLines ?? []).map((l, i) => (
                    <GarnLinjeVælger
                      key={l.id ?? `new-${i}`}
                      line={l}
                      onChange={updated => setLine(i, updated)}
                      onRemove={() => removeLine(i)}
                      canRemove={true}
                      status={form.status}
                      userYarnItems={userYarnItems}
                      catalogColors={colorsByYarnId.get(l.catalogYarnId) ?? []}
                      onSelectCatalogColor={c => {
                        setLine(i, {
                          catalogColorId: c?.id ?? null,
                          colorName:      c?.color_name   ?? '',
                          colorCode:      c?.color_number ?? '',
                          hex:            c?.hex_code ? normalizeHex(c.hex_code) : (l.hex || '#A8C4C4'),
                        })
                      }}
                      catalogSearch={
                        <YarnCatalogSearch
                          value={l.catalogQuery ?? ''}
                          onChange={v => setLine(i, { catalogQuery: v })}
                          placeholder="Søg producent, navn eller serie…"
                          onSelectYarn={async y => {
                            setLine(i, {
                              catalogQuery:   displayYarnName(y),
                              catalogYarnId:  y.id,
                              catalogColorId: null,
                              yarnBrand:      y.producer ?? '',
                              yarnName:       displayYarnName(y),
                              colorName:      '',
                              colorCode:      '',
                            })
                            const colors = await ensureColorsLoaded(y.id)
                            if (colors.length === 1) {
                              const c = colors[0]
                              setLine(i, {
                                catalogColorId: c.id,
                                colorName:      c.color_name   ?? '',
                                colorCode:      c.color_number ?? '',
                                hex:            normalizeHex(c.hex_code) || l.hex || '#A8C4C4',
                              })
                            }
                          }}
                        />
                      }
                    />
                  ))}
                  <button type="button" onClick={addLine} style={{ alignSelf: 'flex-start', padding: '7px 12px', borderRadius: '8px', border: '1px dashed #C0B8A8', background: '#F4EFE6', cursor: 'pointer', fontSize: '12px', color: '#2C2018', fontFamily: "'DM Sans', sans-serif" }}>
                    + Tilføj garn
                  </button>
                </div>
              </div>

              <div>
                <Label>Noter</Label>
                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <MultiImageGrid
                label={`Billeder af projektet (op til ${MAX_PROJECT_IMAGES})`}
                items={projectImages}
                max={MAX_PROJECT_IMAGES}
                onAdd={addProjectImages}
                onRemove={removeProjectImage}
                onReorder={reorderProjectImage}
                hint="JPG, PNG eller WebP. Det første billede bruges som cover."
              />

              <div style={{ borderTop: '1px solid #EDE7D8', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Label>Opskrift</Label>
                <PatternModeToggle value={patternMode} onChange={switchPatternMode} disabled={saving} />

                {patternMode === 'pdf' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', border: '1px dashed #C0B8A8', borderRadius: '8px', cursor: 'pointer', background: '#F4EFE6' }}>
                      <input type="file" accept=".pdf,application/pdf" onChange={handlePdfPick} style={{ display: 'none' }} />
                      {pdfThumbnailPreview ? (
                        <img src={pdfThumbnailPreview} alt="PDF første side" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                      ) : hasPdf ? (
                        <div style={{ width: '48px', height: '48px', background: '#2C4A3E', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📄</div>
                      ) : (
                        <div style={{ width: '48px', height: '48px', background: '#EDE7D8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#8B7D6B' }}>📎</div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: '#2C2018', fontWeight: 500 }}>{hasPdf ? 'Skift PDF' : 'Upload PDF'}</div>
                        <div style={{ fontSize: '11px', color: '#8B7D6B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {renderingThumb ? 'Genererer thumbnail…' : (pdfDisplayName ?? 'Vælg PDF-fil (maks. 10 MB)')}
                        </div>
                      </div>
                    </label>
                    {hasPdf && (
                      <button type="button" onClick={clearPdf} style={{ alignSelf: 'flex-start', fontSize: '11px', color: '#8B3A2A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
                        ✕ Fjern PDF
                      </button>
                    )}
                  </div>
                ) : (
                  <MultiImageGrid
                    label={`Opskrift som billeder (op til ${MAX_PATTERN_IMAGES})`}
                    items={patternImages}
                    max={MAX_PATTERN_IMAGES}
                    onAdd={addPatternImages}
                    onRemove={removePatternImage}
                    onReorder={reorderPatternImage}
                    hint="Vælg flere på én gang. JPG, PNG eller WebP."
                  />
                )}
              </div>

              {saveError && (
                <div style={{ padding: '10px 14px', background: '#F5E8E0', borderRadius: '8px', fontSize: '12px', color: '#8B3A2A' }}>{saveError}</div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
                <button onClick={() => { setEditing(false); setSaveError(null) }} style={{ padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#6B5D4F', fontFamily: "'DM Sans', sans-serif" }}>
                  Annuller
                </button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: saving ? '#8AAAA0' : '#2C4A3E', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {saving ? 'Gemmer...' : 'Gem ændringer'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                {entry.needle_size && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Pindestørrelse</div>
                    <div style={{ fontSize: '13px', color: '#2C2018' }}>{entry.needle_size} mm</div>
                  </div>
                )}
                {entry.pattern_name && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Opskrift</div>
                    <div style={{ fontSize: '13px', color: '#2C2018' }}>{entry.pattern_name}</div>
                  </div>
                )}
                {entry.pattern_designer && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Designer</div>
                    <div style={{ fontSize: '13px', color: '#2C2018' }}>{entry.pattern_designer}</div>
                  </div>
                )}
              </div>

              {entry.notes && (
                <div style={{ padding: '12px 14px', background: '#F4EFE6', borderRadius: '8px', borderLeft: '3px solid #C16B47', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#5A4E42', lineHeight: '1.6', fontStyle: 'italic' }}>{entry.notes}</div>
                </div>
              )}

              {entry.pattern_pdf_url && (
                <a href={entry.pattern_pdf_url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#EDE7D8', borderRadius: '8px', textDecoration: 'none', color: '#2C4A3E', fontSize: '13px', fontWeight: 500, marginBottom: '16px' }}>
                  {entry.pattern_pdf_thumbnail_url
                    ? <img src={entry.pattern_pdf_thumbnail_url} alt="Opskrift, side 1" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />
                    : <span style={{ fontSize: '18px' }}>📄</span>}
                  Åbn opskrift (PDF)
                </a>
              )}

              {(entry.pattern_image_urls?.length ?? 0) > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>
                    Opskrift ({entry.pattern_image_urls.length} {entry.pattern_image_urls.length === 1 ? 'billede' : 'billeder'})
                  </div>
                  <ImageCarousel images={entry.pattern_image_urls} alt="Opskrift" />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {(entry.status ?? 'faerdigstrikket') === 'faerdigstrikket' ? (
                  <button
                    onClick={() => onShare?.(entry)}
                    style={{ padding: '7px 14px', background: entry.is_shared ? '#E4EEE4' : '#F0E5D8', color: entry.is_shared ? '#2A4A2A' : '#6A5638', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    aria-label={entry.is_shared ? 'Rediger deling med Fællesskabet' : 'Del med Fællesskabet'}
                  >
                    {entry.is_shared ? '✓ Delt med Fællesskabet' : 'Del med Fællesskabet'}
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: '#8B7D6B', fontStyle: 'italic' }}>
                    Del er mulig når projektet er færdigstrikket
                  </span>
                )}
                {confirmDel ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#8B3A2A' }}>Er du sikker?</span>
                    <button onClick={() => setConfirmDel(false)} style={{ padding: '6px 12px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#6B5D4F' }}>Annuller</button>
                    <button onClick={handleDelete} disabled={deleting} style={{ padding: '6px 14px', background: '#8B3A2A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                      {deleting ? 'Sletter...' : 'Ja, slet'}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDel(true)} style={{ padding: '7px 14px', background: '#F0E8E0', color: '#8B3A2A', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Slet projekt
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const EMPTY_YARN_LINE = {
  yarnName: '',
  yarnBrand: '',
  colorName: '',
  colorCode: '',
  hex: '#A8C4C4',
  quantityUsed: '',
  catalogYarnId: null,
  catalogColorId: null,
}

const EMPTY_NEW = {
  title: '',
  usedAt: new Date().toISOString().slice(0, 10),
  needleSize: '',
  notes: '',
  status: 'faerdigstrikket',
  patternName: '',
  patternDesigner: '',
  yarnLines: [EMPTY_YARN_LINE],
}

function NytProjektModal({ user, onClose, onSaved }) {
  const supabase = useSupabase()
  const [form, setForm]           = useState(EMPTY_NEW)
  const [userYarnItems, setUserYarnItems] = useState([])
  const [projectImages, setProjectImages] = useState([])
  const [patternMode, setPatternMode] = useState('pdf')
  const [pdfFile, setPdfFile]     = useState(null)
  const [pdfFileName, setPdfFileName] = useState(null)
  const [pdfThumbnailBlob, setPdfThumbnailBlob] = useState(null)
  const [pdfThumbnailPreview, setPdfThumbnailPreview] = useState(null)
  const [renderingThumb, setRenderingThumb] = useState(false)
  const [patternImages, setPatternImages] = useState([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)
  const [colorsByYarnId, setColorsByYarnId] = useState(new Map())

  useEffect(() => {
    return () => {
      projectImages.forEach(it => { if (!it.isExisting) URL.revokeObjectURL(it.url) })
      patternImages.forEach(it => { if (!it.isExisting) URL.revokeObjectURL(it.url) })
      if (pdfThumbnailPreview && pdfThumbnailPreview.startsWith('blob:')) URL.revokeObjectURL(pdfThumbnailPreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // F11: hent brugerens lager én gang så "Fra mit garn"-tab kan vise det.
  // Kun garn som faktisk findes i lageret (status: På lager / I brug) — ikke
  // ønskeliste eller brugt op. Et projekt skal kunne kobles til reelt garn.
  useEffect(() => {
    async function loadStash() {
      try {
        const { data } = await supabase
          .from('yarn_items')
          .select('*')
          .in('status', ['På lager', 'I brug'])
          .order('brand', { ascending: true })
        setUserYarnItems((data ?? []).map(fromDb))
      } catch {
        setUserYarnItems([])
      }
    }
    loadStash()
  }, [])

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }
  function setLine(i, patch) {
    setForm(p => ({
      ...p,
      yarnLines: (p.yarnLines ?? []).map((l, idx) => idx === i ? { ...l, ...patch } : l),
    }))
  }
  function addLine() {
    setForm(p => ({ ...p, yarnLines: [...(p.yarnLines ?? []), EMPTY_YARN_LINE] }))
  }
  function removeLine(i) {
    setForm(p => ({ ...p, yarnLines: (p.yarnLines ?? []).filter((_, idx) => idx !== i) }))
  }

  async function ensureColorsLoaded(yarnId) {
    if (!yarnId) return []
    if (colorsByYarnId.has(yarnId)) return colorsByYarnId.get(yarnId)
    const colors = await fetchColorsForYarn(supabase, yarnId, { includeDiscontinued: true })
    setColorsByYarnId(prev => {
      const next = new Map(prev)
      next.set(yarnId, colors)
      return next
    })
    return colors
  }

  function addProjectImagesNew(files) {
    setError(null)
    const accepted = []
    for (const file of files) {
      try { validateUploadFile(file, { maxBytes: MAX_UPLOAD_BYTES, allowedMimes: ALLOWED_IMAGE_MIME }) }
      catch (e) { setError(e.message); return }
      accepted.push({
        url: URL.createObjectURL(file),
        pendingFile: file,
        isExisting: false,
        _key: `n-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
    }
    setProjectImages(prev => [...prev, ...accepted].slice(0, MAX_PROJECT_IMAGES))
  }
  function removeProjectImageNew(index) {
    setProjectImages(prev => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (!removed.isExisting) URL.revokeObjectURL(removed.url)
      return next
    })
  }
  function reorderProjectImageNew(from, to) {
    setProjectImages(prev => {
      const next = [...prev]
      const [it] = next.splice(from, 1); next.splice(to, 0, it); return next
    })
  }
  function addPatternImagesNew(files) {
    setError(null)
    const accepted = []
    for (const file of files) {
      try { validateUploadFile(file, { maxBytes: MAX_UPLOAD_BYTES, allowedMimes: ALLOWED_IMAGE_MIME }) }
      catch (e) { setError(e.message); return }
      accepted.push({
        url: URL.createObjectURL(file),
        pendingFile: file,
        isExisting: false,
        _key: `pn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      })
    }
    setPatternImages(prev => [...prev, ...accepted].slice(0, MAX_PATTERN_IMAGES))
  }
  function removePatternImageNew(index) {
    setPatternImages(prev => {
      const next = [...prev]
      const [removed] = next.splice(index, 1)
      if (!removed.isExisting) URL.revokeObjectURL(removed.url)
      return next
    })
  }
  function reorderPatternImageNew(from, to) {
    setPatternImages(prev => {
      const next = [...prev]
      const [it] = next.splice(from, 1); next.splice(to, 0, it); return next
    })
  }
  async function handlePdfPickNew(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try { validateUploadFile(file, { maxBytes: MAX_UPLOAD_BYTES, allowedMimes: ALLOWED_PDF_MIME }) }
    catch (err) { setError(err.message); return }
    setError(null)
    setPdfFile(file)
    setPdfFileName(file.name)
    setRenderingThumb(true)
    try {
      const blob = await renderPdfFirstPage(file)
      setPdfThumbnailBlob(blob)
      if (pdfThumbnailPreview) URL.revokeObjectURL(pdfThumbnailPreview)
      setPdfThumbnailPreview(URL.createObjectURL(blob))
    } catch {
      setPdfThumbnailBlob(null)
    }
    setRenderingThumb(false)
  }
  function clearPdfNew() {
    setPdfFile(null); setPdfFileName(null); setPdfThumbnailBlob(null)
    if (pdfThumbnailPreview) URL.revokeObjectURL(pdfThumbnailPreview)
    setPdfThumbnailPreview(null)
  }
  function switchPatternModeNew(next) {
    if (next === patternMode) return
    const hasContent =
      (patternMode === 'pdf' && pdfFile) ||
      (patternMode === 'images' && patternImages.length > 0)
    if (hasContent) {
      const ok = typeof window === 'undefined'
        ? true
        : window.confirm('Skift af opskrift-format sletter den nuværende opskrift. Fortsæt?')
      if (!ok) return
      if (patternMode === 'pdf') clearPdfNew()
      else {
        for (const it of patternImages) URL.revokeObjectURL(it.url)
        setPatternImages([])
      }
    }
    setPatternMode(next)
  }

  async function save() {
    setSaving(true); setError(null)
    const newlyUploadedPaths = []
    try {
      const { data: project, error: pErr } = await supabase
        .from('projects')
        .insert([{
          user_id:          user.id,
          title:            form.title           || null,
          used_at:          form.usedAt          || null,
          needle_size:      form.needleSize      || null,
          notes:            form.notes           || null,
          status:           form.status          || 'faerdigstrikket',
          pattern_name:     form.patternName     || null,
          pattern_designer: form.patternDesigner || null,
        }])
        .select()
        .single()
      if (pErr) throw pErr

      const pUpdates = {}
      if (projectImages.length > 0) {
        const urls = []
        for (const it of projectImages) {
          const path = makeImagePath(user.id, project.id)(safeExt(it.pendingFile.name, 'jpg'))
          urls.push(await uploadFileRaw(supabase, IMAGES_BUCKET, path, it.pendingFile))
          newlyUploadedPaths.push({ bucket: IMAGES_BUCKET, path })
        }
        pUpdates.project_image_urls = urls
      }
      if (patternMode === 'pdf' && pdfFile) {
        const pdfPath = `${user.id}/projects/${project.id}.pdf`
        pUpdates.pattern_pdf_url = await uploadFileRaw(supabase, PATTERNS_BUCKET, pdfPath, pdfFile)
        newlyUploadedPaths.push({ bucket: PATTERNS_BUCKET, path: pdfPath })
        if (pdfThumbnailBlob) {
          const thumbPath = `${user.id}/projects/${project.id}-thumb.png`
          const thumbFile = new File([pdfThumbnailBlob], `${project.id}-thumb.png`, { type: 'image/png' })
          pUpdates.pattern_pdf_thumbnail_url = await uploadFileRaw(supabase, PATTERNS_BUCKET, thumbPath, thumbFile)
          newlyUploadedPaths.push({ bucket: PATTERNS_BUCKET, path: thumbPath })
        }
      } else if (patternMode === 'images' && patternImages.length > 0) {
        const urls = []
        for (const it of patternImages) {
          const path = makeImagePath(user.id, project.id)(safeExt(it.pendingFile.name, 'jpg'))
          urls.push(await uploadFileRaw(supabase, PATTERNS_BUCKET, path, it.pendingFile))
          newlyUploadedPaths.push({ bucket: PATTERNS_BUCKET, path })
        }
        pUpdates.pattern_image_urls = urls
      }
      if (Object.keys(pUpdates).length > 0) {
        const { data: upd, error: uErr } = await supabase
          .from('projects')
          .update(pUpdates)
          .eq('id', project.id)
          .select()
          .single()
        if (uErr) throw uErr
        Object.assign(project, upd)
      }

      const lines = (form.yarnLines ?? []).filter(l => (l.yarnName || l.yarnBrand || l.colorName || l.colorCode || l.quantityUsed))
      // Ønskeprojekter må gerne oprettes uden garn — brugere har sjældent valgt
      // garn på ønskestadiet. Igangværende og færdige projekter kræver mindst ét garn.
      if (lines.length === 0 && form.status !== 'vil_gerne') {
        throw new Error('Tilføj mindst ét garn til projektet.')
      }

      const usageRows = lines.map(l => ({
        ...toUsageDb({
          projectId: project.id,
          yarnItemId: l.yarnItemId ?? null,
          yarnName: l.yarnName,
          yarnBrand: l.yarnBrand,
          colorName: l.colorName,
          colorCode: l.colorCode,
          hex: l.hex,
          catalogYarnId: l.catalogYarnId,
          catalogColorId: l.catalogColorId,
          quantityUsed: l.quantityUsed,
          usedFor: project.title,
          needleSize: project.needle_size,
          notes: project.notes,
          usedAt: project.used_at,
        }),
        user_id: user.id,
      }))

      let usages = []
      if (usageRows.length > 0) {
        const { data, error: yErr } = await supabase
          .from('yarn_usage')
          .insert(usageRows)
          .select()
        if (yErr) throw yErr
        usages = data ?? []
      }

      onSaved({
        ...project,
        yarnLines: usages.map(fromUsageDb),
      })
      onClose()
    } catch (e) {
      // Rul nyligt uploadede filer tilbage så vi ikke efterlader orphans.
      const byBucket = new Map()
      for (const { bucket, path } of newlyUploadedPaths) {
        const arr = byBucket.get(bucket) ?? []
        arr.push(path)
        byBucket.set(bucket, arr)
      }
      for (const [bucket, paths] of byBucket) {
        await deleteFiles(supabase, bucket, paths).catch(() => { /* best-effort */ })
      }
      setError('Kunne ikke gemme: ' + e.message)
    }
    setSaving(false)
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,32,24,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1200, overflowY: 'auto', padding: '20px 16px' }}
    >
      <div style={{ background: '#FFFCF7', borderRadius: '14px', width: '500px', maxWidth: '100%', boxShadow: '0 24px 60px rgba(44,32,24,.25)', margin: 'auto', overflow: 'hidden' }}>

        <div style={{ background: '#6A5638', padding: '18px 24px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: '#fff' }}>Nyt projekt</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.6)', marginTop: '2px' }}>Ønske, i gang eller færdigstrikket</div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div>
            <Label>Status</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <StatusChips value={form.status} onChange={v => setF('status', v)} />
              <StatusAccentBar status={form.status} />
            </div>
          </div>

          <div>
            <Label>{titleLabelForStatus(form.status)}</Label>
            <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="F.eks. Sommersweater, hue til børn..." style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
            <div>
              <Label>Pindestørrelse</Label>
              <input value={form.needleSize} onChange={e => setF('needleSize', e.target.value)} placeholder="mm" style={inputStyle} />
            </div>
            <div>
              <Label>Dato</Label>
              <input type="date" value={form.usedAt} onChange={e => setF('usedAt', e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div>
              <Label>Opskriftsnavn</Label>
              <input value={form.patternName} onChange={e => setF('patternName', e.target.value)} placeholder="Fx. Sophie Scarf" style={inputStyle} />
            </div>
            <div>
              <Label>Designer</Label>
              <input value={form.patternDesigner} onChange={e => setF('patternDesigner', e.target.value)} placeholder="Fx. PetiteKnit" style={inputStyle} />
            </div>
          </div>

          <div>
            <Label>Garn i projektet</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(form.yarnLines ?? []).map((l, i) => (
                <GarnLinjeVælger
                  key={i}
                  line={l}
                  onChange={updated => setLine(i, updated)}
                  onRemove={() => removeLine(i)}
                  canRemove={(form.yarnLines?.length ?? 0) > 1}
                  status={form.status}
                  userYarnItems={userYarnItems}
                  catalogColors={colorsByYarnId.get(l.catalogYarnId) ?? []}
                  onSelectCatalogColor={c => {
                    setLine(i, {
                      catalogColorId: c?.id ?? null,
                      colorName:      c?.color_name   ?? '',
                      colorCode:      c?.color_number ?? '',
                      hex:            c?.hex_code ? normalizeHex(c.hex_code) : (l.hex || '#A8C4C4'),
                    })
                  }}
                  catalogSearch={
                    <YarnCatalogSearch
                      value={l.catalogQuery ?? ''}
                      onChange={v => setLine(i, { catalogQuery: v })}
                      placeholder="Søg producent, navn eller serie…"
                      onSelectYarn={async y => {
                        setLine(i, {
                          catalogQuery:   displayYarnName(y),
                          catalogYarnId:  y.id,
                          catalogColorId: null,
                          yarnBrand:      y.producer ?? '',
                          yarnName:       displayYarnName(y),
                          colorName:      '',
                          colorCode:      '',
                        })
                        const colors = await ensureColorsLoaded(y.id)
                        if (colors.length === 1) {
                          const c = colors[0]
                          setLine(i, {
                            catalogColorId: c.id,
                            colorName:      c.color_name   ?? '',
                            colorCode:      c.color_number ?? '',
                            hex:            normalizeHex(c.hex_code) || l.hex || '#A8C4C4',
                          })
                        }
                      }}
                    />
                  }
                />
              ))}
              <button type="button" onClick={addLine} style={{ alignSelf: 'flex-start', padding: '7px 12px', borderRadius: '8px', border: '1px dashed #C0B8A8', background: '#F4EFE6', cursor: 'pointer', fontSize: '12px', color: '#2C2018', fontFamily: "'DM Sans', sans-serif" }}>
                + Tilføj garn
              </button>
            </div>
          </div>

          <div>
            <Label>Noter</Label>
            <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} placeholder="Ændringer, tips, erfaringer..." style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          <MultiImageGrid
            label={`Billeder af projektet (op til ${MAX_PROJECT_IMAGES})`}
            items={projectImages}
            max={MAX_PROJECT_IMAGES}
            onAdd={addProjectImagesNew}
            onRemove={removeProjectImageNew}
            onReorder={reorderProjectImageNew}
            hint="JPG, PNG eller WebP. Det første billede bruges som cover."
          />

          <div style={{ borderTop: '1px solid #EDE7D8', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Label>Opskrift</Label>
            <PatternModeToggle value={patternMode} onChange={switchPatternModeNew} disabled={saving} />

            {patternMode === 'pdf' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', border: '1px dashed #C0B8A8', borderRadius: '8px', cursor: 'pointer', background: '#F4EFE6' }}>
                  <input type="file" accept=".pdf,application/pdf" onChange={handlePdfPickNew} style={{ display: 'none' }} />
                  {pdfThumbnailPreview ? (
                    <img src={pdfThumbnailPreview} alt="PDF første side" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
                  ) : pdfFile ? (
                    <div style={{ width: '48px', height: '48px', background: '#2C4A3E', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📄</div>
                  ) : (
                    <div style={{ width: '48px', height: '48px', background: '#EDE7D8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#8B7D6B' }}>📎</div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#2C2018', fontWeight: 500 }}>{pdfFile ? 'Skift PDF' : 'Upload PDF'}</div>
                    <div style={{ fontSize: '11px', color: '#8B7D6B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {renderingThumb ? 'Genererer thumbnail…' : (pdfFileName ?? 'Valgfri PDF (maks. 10 MB)')}
                    </div>
                  </div>
                </label>
                {pdfFile && (
                  <button type="button" onClick={clearPdfNew} style={{ alignSelf: 'flex-start', fontSize: '11px', color: '#8B3A2A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
                    ✕ Fjern PDF
                  </button>
                )}
              </div>
            ) : (
              <MultiImageGrid
                label={`Opskrift som billeder (op til ${MAX_PATTERN_IMAGES})`}
                items={patternImages}
                max={MAX_PATTERN_IMAGES}
                onAdd={addPatternImagesNew}
                onRemove={removePatternImageNew}
                onReorder={reorderPatternImageNew}
                hint="Vælg flere på én gang. JPG, PNG eller WebP."
              />
            )}
          </div>

          {error && <div style={{ padding: '10px 14px', background: '#F5E8E0', borderRadius: '8px', fontSize: '12px', color: '#8B3A2A' }}>{error}</div>}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#6B5D4F', fontFamily: "'DM Sans', sans-serif" }}>Annuller</button>
            <button onClick={save} disabled={saving} style={{ padding: '8px 20px', background: saving ? '#8AAAA0' : '#6A5638', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? 'Gemmer...' : 'Tilføj projekt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Arkiv({ user, onRequestLogin }) {
  const supabase = useSupabase()
  const uploadFile = (bucket, path, file) => uploadFileRaw(supabase, bucket, path, file)
  const [projects, setProjects] = useState([])
  const [loaded, setLoaded]   = useState(false)
  const [q, setQ]             = useState('')
  const [statusTab, setStatusTab] = useState('faerdigstrikket')
  const [selected, setSelected] = useState(null)
  const [sharing, setSharing]   = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [colorMap, setColorMap] = useState(new Map())

  function applyShareUpdate(updated) {
    setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    if (selected?.id === updated.id) setSelected(prev => prev ? { ...prev, ...updated } : prev)
  }

  useEffect(() => {
    async function load() {
      // Fetch projects and yarn lines separately.
      // This avoids PostgREST embed/relationship issues (schema cache) that can
      // otherwise make the entire UI appear empty even though data exists.
      const { data: pData, error: pErr } = await supabase
        .from('projects')
        .select(PROJECT_FIELDS)
        .eq('user_id', user.id)
        .order('used_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (pErr) console.error(pErr)

      const projects = pData ?? []
      const ids = projects.map(p => p.id).filter(Boolean)

      let yarnByProjectId = new Map()
      if (ids.length > 0) {
        const { data: yData, error: yErr } = await supabase
          .from('yarn_usage')
          .select('*')
          .in('project_id', ids)
          .order('created_at', { ascending: false })
        if (yErr) console.error(yErr)
        for (const row of (yData ?? [])) {
          const y = fromUsageDb(row)
          const pid = row.project_id
          if (!pid) continue
          const arr = yarnByProjectId.get(pid) ?? []
          arr.push(y)
          yarnByProjectId.set(pid, arr)
        }
      }

      const rows = projects.map(p => ({
        ...p,
        yarnLines: yarnByProjectId.get(p.id) ?? [],
      }))

      setProjects(rows)
      setLoaded(true)
    }
    load()
  }, [])

  useEffect(() => {
    async function loadColors() {
      const ids = []
      for (const p of projects) {
        for (const l of (p.yarnLines ?? [])) {
          if (l.catalogColorId) ids.push(l.catalogColorId)
        }
      }
      const map = await fetchColorsByIds(supabase, ids)
      setColorMap(map)
    }
    if (projects.length > 0) loadColors()
  }, [projects])

  const counts = useMemo(() => {
    const c = { vil_gerne: 0, i_gang: 0, faerdigstrikket: 0 }
    for (const p of projects) {
      const s = p.status ?? 'faerdigstrikket'
      if (c[s] !== undefined) c[s]++
    }
    return c
  }, [projects])

  const filtered = projects.filter(p => {
    const s = p.status ?? 'faerdigstrikket'
    if (s !== statusTab) return false
    if (!q) return true
    const qL = q.toLowerCase()
    const title = (p.title || '').toLowerCase()
    if (title.includes(qL)) return true
    for (const l of (p.yarnLines ?? [])) {
      if ((l.yarnName || '').toLowerCase().includes(qL)) return true
      if ((l.colorName || '').toLowerCase().includes(qL)) return true
      if ((l.yarnBrand || '').toLowerCase().includes(qL)) return true
    }
    return false
  })

  const projectCountLabel = useMemo(() => {
    const n = projects.length
    return `${n} projekter`
  }, [projects.length])

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', color: '#8B7D6B', fontFamily: "'DM Sans', sans-serif" }}>
      Henter arkiv...
    </div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: 'transparent', minHeight: '100vh' }}>

      {selected && (
        <DetailModal
          entry={selected}
          user={user}
          onClose={() => setSelected(null)}
          onDelete={id => { setProjects(prev => prev.filter(p => p.id !== id)); setSelected(null) }}
          onSaved={updated => {
            setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
            setSelected(updated)
          }}
          onShare={entry => setSharing(entry)}
        />
      )}

      {sharing && (
        <DelMedFaellesskabetModal
          project={sharing}
          user={user}
          onClose={() => setSharing(null)}
          onShared={applyShareUpdate}
          onUnshared={applyShareUpdate}
        />
      )}

      {showNew && (
        <NytProjektModal
          user={user}
          onClose={() => setShowNew(false)}
          onSaved={project => setProjects(prev => [project, ...prev])}
        />
      )}

      {/* Sub-header — 1 row: count + handlinger (matches Garnlager-pattern) */}
      <div style={{
        background: '#EDE7D8',
        borderBottom: '1px solid #D8D0C0',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: '#6B5D4F' }}>
          {projectCountLabel}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={async () => {
              const result = await exportProjekter(supabase)
              if (!result.success) alert(result.error)
            }}
            style={{ background: '#FFFFFF', border: '1px solid #D0C8BA', borderRadius: '6px', padding: '6px 11px', fontSize: '12px', color: '#5A4E42', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px' }}
            aria-label="Eksporter projekter som CSV"
          >
            <span>📥</span> Eksporter
          </button>
          <button
            onClick={() => setShowNew(true)}
            style={{ background: '#61846D', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer' }}
          >
            + Nyt projekt
          </button>
        </div>
      </div>

      {/* Søg + tabs i indholdsområdet */}
      <div style={{ padding: '12px 20px 8px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Søg projekt, garn eller farve..."
          style={{ flex: '1 1 220px', minWidth: '0', padding: '8px 12px', border: '1px solid #D0C8BA', borderRadius: '6px', fontSize: '13px', background: '#FFFCF7', color: '#2C2018', fontFamily: "'DM Sans', sans-serif" }}
        />
        <div role="tablist" aria-label="Projekt-stadier" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PROJECT_STATUSES.map(s => {
            const active = statusTab === s
            return (
              <button
                key={s}
                role="tab"
                aria-selected={active}
                onClick={() => setStatusTab(s)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  border: '1px solid ' + (active ? '#6A5638' : '#D0C8BA'),
                  background: active ? '#6A5638' : '#FFFCF7',
                  color: active ? '#fff' : '#6B5D4F',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {PROJECT_STATUS_LABELS[s]} <span style={{ opacity: active ? .8 : .7 }}>({counts[s]})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B7D6B' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px' }}>
            {q
              ? 'Ingen resultater'
              : statusTab === 'vil_gerne'
                ? 'Ingen ønskeprojekter endnu'
                : statusTab === 'i_gang'
                  ? 'Ingen igangværende projekter'
                  : 'Ingen færdige projekter endnu'}
          </div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            {q
              ? 'Prøv andre søgeord'
              : statusTab === 'faerdigstrikket'
                ? 'Klik "+ Nyt projekt" for at registrere, eller brug "Brug nøgler" på et garn i lageret'
                : 'Klik "+ Nyt projekt" og vælg status øverst i dialogen'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', padding: '20px' }}>
          {filtered.map(p => {
            const yarns = (p.yarnLines ?? [])
            const thumbs = yarns.slice(0, 6)
            const placeholderHexes = yarns
              .map(l => {
                const c = l.catalogColorId ? colorMap.get(l.catalogColorId) : null
                if (c?.hex_code) return String(c.hex_code).startsWith('#') ? c.hex_code : `#${c.hex_code}`
                return l.hex || ''
              })
              .filter(h => typeof h === 'string' && h.trim().length > 0)
            return (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              style={{ background: '#FFFCF7', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(44,32,24,.08)', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
              onMouseEnter={el => { el.currentTarget.style.transform = 'translateY(-2px)'; el.currentTarget.style.boxShadow = '0 6px 20px rgba(44,32,24,.13)' }}
              onMouseLeave={el => { el.currentTarget.style.transform = ''; el.currentTarget.style.boxShadow = '0 1px 4px rgba(44,32,24,.08)' }}
            >
              {p.project_image_urls?.[0] ? (
                <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
                  <img src={p.project_image_urls[0]} alt="Projekt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {p.project_image_urls.length > 1 && (
                    <span style={{
                      position: 'absolute', bottom: 6, right: 6,
                      padding: '2px 7px', borderRadius: 999, fontSize: 10,
                      background: 'rgba(44,32,24,.78)', color: '#fff',
                      fontFamily: "'DM Sans', sans-serif",
                    }}>
                      +{p.project_image_urls.length - 1}
                    </span>
                  )}
                </div>
              ) : (
                <ProjectCardPlaceholder
                  status={p.status ?? 'i_gang'}
                  yarnHexes={placeholderHexes}
                />
              )}
              <div style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    {thumbs.map((l) => {
                      const c = l.catalogColorId ? colorMap.get(l.catalogColorId) : null
                      const img = c?.image_url || null
                      const hx = (c?.hex_code ? (String(c.hex_code).startsWith('#') ? c.hex_code : `#${c.hex_code}`) : (l.hex || '#A8C4C4'))
                      return img ? (
                        <img key={l.id} src={img} alt="" style={{ width: '22px', height: '22px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(0,0,0,.08)' }} />
                      ) : (
                        <div key={l.id} style={{ width: '22px', height: '22px', borderRadius: '6px', background: hx, border: '1px solid rgba(0,0,0,.08)' }} />
                      )
                    })}
                    {yarns.length > thumbs.length && (
                      <div style={{ fontSize: '11px', color: '#8B7D6B' }}>+{yarns.length - thumbs.length}</div>
                    )}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600, color: '#2C2018', lineHeight: '1.2' }}>
                    {p.title || 'Unavngivet projekt'}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#8B7D6B', marginBottom: '8px' }}>
                  {yarns.slice(0, 2).map((l, idx) => (
                    <span key={l.id}>
                      {idx > 0 && <span> · </span>}
                      {(l.yarnBrand || '').trim()} {(l.yarnName || '').trim()} {l.colorName ? `· ${l.colorName}` : ''}
                    </span>
                  ))}
                  {yarns.length > 2 && <span> · …</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', background: '#EDE7D8', color: '#5A4228', borderRadius: '20px', padding: '2px 8px' }}>
                    {yarns.reduce((s, l) => s + (Number(l.quantityUsed) || 0), 0) || ''} ngl
                  </span>
                  {p.needle_size && <span style={{ fontSize: '11px', background: '#E4EEE4', color: '#2A4A2A', borderRadius: '20px', padding: '2px 8px' }}>Pind {p.needle_size}</span>}
                  {p.pattern_pdf_url && <span style={{ fontSize: '11px', background: '#D8D0E8', color: '#3C2A5C', borderRadius: '20px', padding: '2px 8px' }}>📄 PDF</span>}
                  {p.is_shared && <span style={{ fontSize: '11px', background: '#EAD9DE', color: '#6A3A52', borderRadius: '20px', padding: '2px 8px' }}>✦ Delt</span>}
                </div>
                <div style={{ fontSize: '11px', color: '#B0A090', marginTop: '8px' }}>{formatDate(p.used_at)}</div>
              </div>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}
