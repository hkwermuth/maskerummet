'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import { toUsageDb } from '@/lib/supabase/mappers'
import { uploadFile } from '@/lib/supabase/storage'
import { renderPdfFirstPage } from '@/lib/pdf-thumbnail'
import { MAX_PROJECT_IMAGES } from '@/lib/types'

function safeExt(name: string, fallback = 'bin'): string {
  const m = (name || '').match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : fallback
}

function imagePath(userId: string, projectId: string, ext: string): string {
  const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${userId}/projects/${projectId}/${uuid}.${ext}`
}

const inputStyle: React.CSSProperties = {
  padding: '7px 10px', border: '1px solid #D0C8BA',
  borderRadius: 6, fontSize: 13, background: '#F9F6F0',
  color: '#302218', fontFamily: "'DM Sans', sans-serif",
  width: '100%', boxSizing: 'border-box',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8C7E74' }}>{label}</label>
      {children}
    </div>
  )
}

function FileUploadField({ label, accept, preview, onChange, onClear, hint }: {
  label: string; accept: string; preview: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  hint: string
}) {
  return (
    <Field label={label}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px dashed #C0B8A8', borderRadius: 8, background: '#F4EFE6' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flex: 1, minWidth: 0 }}>
          <input type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
          {preview ? (
            accept.includes('image') ? (
              <img src={preview} alt="preview" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
            ) : (
              <div style={{ width: 48, height: 48, background: '#61846D', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📄</div>
            )
          ) : (
            <div style={{ width: 48, height: 48, background: '#EDE7D8', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#8C7E74', flexShrink: 0 }}>
              {accept.includes('image') ? '📷' : '📎'}
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#302218', fontWeight: 500 }}>{preview ? 'Skift fil' : 'Vælg fil'}</div>
            <div style={{ fontSize: 11, color: '#8C7E74', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint}</div>
          </div>
        </label>
        {preview && (
          <button
            type="button"
            onClick={onClear}
            aria-label={accept.includes('image') ? 'Fjern valgt billede' : 'Fjern valgt PDF'}
            style={{
              minWidth: 44, minHeight: 44,
              border: 'none', background: 'transparent',
              color: '#8B3A2A', cursor: 'pointer',
              fontSize: 18, fontFamily: "'DM Sans', sans-serif",
              padding: 0, flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </Field>
  )
}

type YarnItem = {
  id: string
  name: string
  brand: string
  colorName?: string
  colorCode?: string
  hex?: string
  antal: number
  status?: string
  pindstr?: string
  catalogYarnId?: string | null
  catalogColorId?: string | null
}

type Project = { id: string; title?: string; used_at?: string; created_at?: string }

export default function BrugNoeglerModal({
  yarn, user, onClose, onSaved,
}: {
  yarn: YarnItem
  user: { id: string }
  onClose: () => void
  onSaved: (usageRow: any, newQty: number, newStatus: string) => void
}) {
  const supabase = useSupabase()
  useEscapeKey(true, onClose)
  const today = new Date().toISOString().slice(0, 10)

  const [projects, setProjects] = useState<Project[]>([])
  const [projectMode, setProjectMode] = useState<'existing' | 'new'>('existing')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [newProject, setNewProject] = useState({ title: '', usedAt: today, needleSize: yarn.pindstr ?? '', notes: '' })
  const [form, setForm] = useState({ quantityUsed: 1, usedFor: '', needleSize: yarn.pindstr ?? '', notes: '', usedAt: today })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setF<K extends keyof typeof form>(k: K, v: typeof form[K]) { setForm(p => ({ ...p, [k]: v })) }
  function setNP<K extends keyof typeof newProject>(k: K, v: typeof newProject[K]) { setNewProject(p => ({ ...p, [k]: v })) }

  useEffect(() => {
    async function loadProjects() {
      // Kun brugerens EGNE projekter (ikke delte fra andre via community-RLS),
      // og kun i statusserne hvor det giver mening at logge garn-forbrug.
      const { data } = await supabase.from('projects').select('id,title,used_at,created_at')
        .eq('user_id', user.id)
        .in('status', ['vil_gerne', 'i_gang'])
        .order('used_at', { ascending: false }).order('created_at', { ascending: false }).limit(200)
      const rows = data ?? []
      setProjects(rows)
      if (rows.length > 0) {
        setSelectedProjectId((rows as Project[])[0].id)
      } else {
        // Ingen åbne projekter at tilføje til — skift til "Opret nyt projekt"-mode.
        setProjectMode('new')
      }
    }
    loadProjects()
  }, [user.id])

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }
  function handlePdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfFile(file); setPdfName(file.name)
  }
  function clearImage() {
    if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setImageFile(null); setImagePreview(null); setError(null)
  }
  function clearPdf() {
    setPdfFile(null); setPdfName(null); setError(null)
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      // ── 1) Bestem projekt ──────────────────────────────────────────────────
      const stampedNote = (() => {
        const trimmed = (form.notes || '').trim()
        if (!trimmed) return null
        return `— ${today}: ${trimmed}`
      })()

      let projectId: string
      let existingImages: string[] = []
      let existingPatternImages: string[] = []
      let existingNotes = ''
      if (projectMode === 'existing') {
        if (!selectedProjectId) throw new Error('Vælg et projekt.')
        projectId = selectedProjectId
        // Læs nuværende projekt for konflikt-check inden upload + notes-append
        const { data: p, error: pErr } = await supabase.from('projects')
          .select('project_image_urls,pattern_image_urls,pattern_pdf_url,notes')
          .eq('id', projectId).single()
        if (pErr) throw pErr
        existingImages = (p as any)?.project_image_urls ?? []
        existingPatternImages = (p as any)?.pattern_image_urls ?? []
        existingNotes = ((p as any)?.notes ?? '').toString()
        const existingPdfUrl: string | null = (p as any)?.pattern_pdf_url ?? null
        if (imageFile && existingImages.length >= MAX_PROJECT_IMAGES) {
          throw new Error(`Projektet har allerede ${MAX_PROJECT_IMAGES} billeder. Slet et i Arkiv før du tilføjer flere.`)
        }
        if (pdfFile && existingPatternImages.length > 0) {
          throw new Error('Projektet har allerede en opskrift som billed-kæde. Fjern den i Arkiv før du tilføjer en PDF.')
        }
        if (pdfFile && existingPdfUrl) {
          throw new Error('Projektet har allerede en opskrift som PDF. Fjern eller udskift den i Arkiv før du tilføjer en ny.')
        }
      } else {
        // Kombinér initial newProject.notes + stempled forbrugs-note ved insert
        const initialNotes = (newProject.notes || '').trim()
        const combinedNotes = stampedNote
          ? (initialNotes ? `${initialNotes}\n\n${stampedNote}` : stampedNote)
          : (initialNotes || null)
        const { data: project, error: pErr } = await supabase.from('projects')
          .insert([{ user_id: user.id, title: newProject.title || null, used_at: newProject.usedAt || null, needle_size: newProject.needleSize || null, notes: combinedNotes }])
          .select().single()
        if (pErr) throw pErr
        projectId = (project as { id: string }).id
      }

      // ── 2) Upload billede + PDF + thumbnail til Storage ────────────────────
      let projectImageUrl: string | null = null
      let patternPdfUrl: string | null = null
      let patternPdfThumbnailUrl: string | null = null

      if (imageFile) {
        const path = imagePath(user.id, projectId, safeExt(imageFile.name, 'jpg'))
        projectImageUrl = await uploadFile(supabase, 'yarn-images', path, imageFile)
      }
      if (pdfFile) {
        const pdfPath = `${user.id}/projects/${projectId}.pdf`
        patternPdfUrl = await uploadFile(supabase, 'patterns', pdfPath, pdfFile)
        try {
          const thumbBlob = await renderPdfFirstPage(pdfFile)
          const thumbPath = `${user.id}/projects/${projectId}-thumb.png`
          const thumbFile = new File([thumbBlob], `${projectId}-thumb.png`, { type: 'image/png' })
          patternPdfThumbnailUrl = await uploadFile(supabase, 'patterns', thumbPath, thumbFile)
        } catch {
          // Thumbnail-fejl er ikke fatal — PDF'en er stadig uploadet.
        }
      }

      // ── 3) Gem media-felter + appendet note på projekt-rækken ──────────────
      // For eksisterende projekt: appendér forbrugs-noten med dato-stamp så
      // brugeren kan se den i Arkiv (projects.notes er det felt der vises der).
      const shouldAppendNote = projectMode === 'existing' && stampedNote !== null
      const projectUpdates: Record<string, unknown> = {}
      if (projectImageUrl) {
        projectUpdates.project_image_urls = [...existingImages, projectImageUrl]
      }
      if (patternPdfUrl) {
        projectUpdates.pattern_pdf_url = patternPdfUrl
        projectUpdates.pattern_pdf_thumbnail_url = patternPdfThumbnailUrl
      }
      if (shouldAppendNote) {
        projectUpdates.notes = existingNotes.trim()
          ? `${existingNotes.trim()}\n\n${stampedNote}`
          : stampedNote
      }
      if (Object.keys(projectUpdates).length > 0) {
        const { error: updErr } = await supabase.from('projects').update(projectUpdates).eq('id', projectId)
        if (updErr) throw updErr
      }

      // ── 4) Insert yarn_usage (UDEN media-felter — de bor på projektet) ─────
      const usageData = toUsageDb({
        ...form,
        projectId,
        yarnItemId: yarn.id,
        yarnName:   yarn.name,
        yarnBrand:  yarn.brand,
        colorName:  yarn.colorName,
        colorCode:  yarn.colorCode,
        hex:        yarn.hex,
        catalogYarnId:  yarn.catalogYarnId  ?? null,
        catalogColorId: yarn.catalogColorId ?? null,
      })

      const { data: usageRow, error: insertErr } = await supabase.from('yarn_usage')
        .insert([{ ...usageData, user_id: user.id }]).select().single()
      if (insertErr) throw insertErr

      // ── 5) Opdatér yarn_items quantity + status ────────────────────────────
      // Når brugeren logger forbrug, bør garnet stå som "I brug" (ikke "På lager")
      // så det vises i Garnlager-filteret "I brug". Når antal når 0, bliver det
      // automatisk "Brugt op".
      const newQty = Math.max(0, (parseFloat(String(yarn.antal)) || 0) - parseFloat(String(form.quantityUsed) || '0'))
      const newStatus = newQty === 0 ? 'Brugt op' : 'I brug'
      await supabase.from('yarn_items').update({ quantity: newQty, status: newStatus }).eq('id', yarn.id)

      onSaved(usageRow, newQty, newStatus)
      onClose()
    } catch (e: any) {
      setError('Kunne ikke gemme: ' + e.message)
    }
    setSaving(false)
  }

  const maxQty = parseFloat(String(yarn.antal)) || 0

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, background: 'rgba(48,34,24,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1100, overflowY: 'auto', padding: '20px 16px' }}>
      <div style={{ background: '#FFFCF7', borderRadius: 14, width: 480, maxWidth: '100%', boxShadow: '0 24px 60px rgba(48,34,24,.25)', margin: 'auto', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ background: '#61846D', padding: '20px 24px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: 18, cursor: 'pointer' }}>✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: yarn.hex || '#A8C4C4', border: '2px solid rgba(255,255,255,.3)', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 600, color: '#fff' }}>Brug nøgler</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>{yarn.brand} · {yarn.name} · {yarn.colorName}</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Project selector */}
          <div style={{ border: '1px solid #EDE7D8', borderRadius: 10, padding: '12px', background: '#F9F6F0' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
              {(['existing', 'new'] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setProjectMode(mode)}
                  style={{ padding: '6px 10px', borderRadius: 999, border: '1px solid #D0C8BA', background: projectMode === mode ? '#EDE7D8' : 'transparent', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                  {mode === 'existing' ? 'Tilføj til eksisterende projekt' : 'Opret nyt projekt'}
                </button>
              ))}
            </div>
            {projectMode === 'existing' ? (
              <Field label="Projekt">
                <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)} style={inputStyle}>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{(p.title || 'Unavngivet projekt')}{p.used_at ? ` — ${p.used_at}` : ''}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Field label="Projektnavn"><input value={newProject.title} onChange={e => setNP('title', e.target.value)} placeholder="F.eks. Bluse" style={inputStyle} /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <Field label="Dato"><input type="date" value={newProject.usedAt} onChange={e => setNP('usedAt', e.target.value)} style={inputStyle} /></Field>
                  <Field label="Pindestørrelse"><input value={newProject.needleSize} onChange={e => setNP('needleSize', e.target.value)} placeholder="mm" style={inputStyle} /></Field>
                </div>
                <Field label="Noter"><textarea value={newProject.notes} onChange={e => setNP('notes', e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <Field label={`Antal nøgler brugt (max ${maxQty})`}>
              <input type="number" step="0.5" min="0.5" max={maxQty} value={form.quantityUsed} onChange={e => setF('quantityUsed', parseFloat(e.target.value))} style={inputStyle} />
            </Field>
            <Field label="Dato"><input type="date" value={form.usedAt} onChange={e => setF('usedAt', e.target.value)} style={inputStyle} /></Field>
          </div>

          <Field label="Hvad er strikket?">
            <input value={form.usedFor} onChange={e => setF('usedFor', e.target.value)} placeholder="F.eks. Sommersweater, hue til børn..." style={inputStyle} />
          </Field>

          <Field label="Pindestørrelse brugt"><input value={form.needleSize} onChange={e => setF('needleSize', e.target.value)} placeholder={yarn.pindstr || 'mm'} style={inputStyle} /></Field>

          <div style={{ borderTop: '1px solid #EDE7D8', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <FileUploadField label="Billede af projektet" accept="image/*" preview={imagePreview} onChange={handleImage} onClear={clearImage} hint="JPG, PNG — vises i arkivet" />
            <FileUploadField label="Opskrift (PDF)" accept=".pdf,application/pdf" preview={pdfName} onChange={handlePdf} onClear={clearPdf} hint={pdfName || 'PDF gemmes privat i dit arkiv'} />
          </div>

          <Field label="Noter">
            <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} placeholder="Ændringer til opskriften, tips..." style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          {error && <div style={{ padding: '10px 14px', background: '#F5E8E0', borderRadius: 8, fontSize: 12, color: '#8B3A2A' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: 6, background: 'transparent', fontSize: 13, cursor: 'pointer', color: '#8C7E74', fontFamily: "'DM Sans', sans-serif" }}>Annuller</button>
            <button onClick={save} disabled={saving || !form.quantityUsed} style={{ padding: '8px 20px', background: saving ? '#8C7E74' : '#61846D', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? 'Gemmer...' : 'Arkivér nøgler'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
