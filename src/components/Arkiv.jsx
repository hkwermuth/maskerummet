import { useMemo, useState, useEffect } from 'react'
import { supabase, fromUsageDb, toUsageDb, uploadFile } from '../lib/supabase'
import { fetchColorsByIds } from '../lib/catalog'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })
}

const inputStyle = {
  padding: '7px 10px', border: '1px solid #D0C8BA', borderRadius: '6px',
  fontSize: '13px', background: '#F9F6F0', color: '#2C2018',
  fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
}

function Label({ children }) {
  return <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B', marginBottom: '4px' }}>{children}</div>
}

function FileUploadField({ label, accept, preview, isImage, onChange, onRemove, hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <Label>{label}</Label>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', border: '1px dashed #C0B8A8', borderRadius: '8px', cursor: 'pointer', background: '#F4EFE6' }}>
        <input type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
        {preview ? (
          isImage
            ? <img src={preview} alt="preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
            : <div style={{ width: '48px', height: '48px', background: '#2C4A3E', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📄</div>
        ) : (
          <div style={{ width: '48px', height: '48px', background: '#EDE7D8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#8B7D6B' }}>
            {isImage ? '📷' : '📎'}
          </div>
        )}
        <div>
          <div style={{ fontSize: '12px', color: '#2C2018', fontWeight: 500 }}>{preview ? 'Skift fil' : 'Upload fil'}</div>
          <div style={{ fontSize: '11px', color: '#8B7D6B' }}>{hint}</div>
        </div>
      </label>
      {preview && (
        <button type="button" onClick={onRemove} style={{ alignSelf: 'flex-start', fontSize: '11px', color: '#8B3A2A', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
          ✕ Fjern
        </button>
      )}
    </div>
  )
}

function DetailModal({ entry, user, onClose, onDelete, onSaved }) {
  const [editing, setEditing]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [confirmDel, setConfirmDel]   = useState(false)
  const [saveError, setSaveError]     = useState(null)

  const yarns = entry?.yarnLines ?? []
  const fallbackHex = yarns[0]?.hex || '#A8C4C4'

  const [form, setForm] = useState({
    title:      entry?.title       ?? '',
    usedAt:     entry?.used_at     ?? '',
    needleSize: entry?.needle_size ?? '',
    heldWith:   entry?.held_with   ?? '',
    notes:      entry?.notes       ?? '',
  })
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(entry?.project_image_url ?? null)
  const [removeImage, setRemoveImage]   = useState(false)
  const [pdfFile, setPdfFile]           = useState(null)
  const [pdfPreview, setPdfPreview]     = useState(entry?.pattern_pdf_url ?? null)
  const [removePdf, setRemovePdf]       = useState(false)

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function handleImageFile(e) {
    const file = e.target.files[0]; if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file)); setRemoveImage(false)
  }
  function handlePdfFile(e) {
    const file = e.target.files[0]; if (!file) return
    setPdfFile(file); setPdfPreview(file.name); setRemovePdf(false)
  }

  async function handleSave() {
    setSaving(true); setSaveError(null)
    try {
      const updates = {
        title:       form.title      || null,
        used_at:     form.usedAt     || null,
        needle_size: form.needleSize || null,
        held_with:   form.heldWith   || null,
        notes:       form.notes      || null,
      }

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        updates.project_image_url = await uploadFile('yarn-images', `${user.id}/projects/${entry.id}.${ext}`, imageFile)
      } else if (removeImage) {
        updates.project_image_url = null
      }

      if (pdfFile) {
        updates.pattern_pdf_url = await uploadFile('patterns', `${user.id}/projects/${entry.id}.pdf`, pdfFile)
      } else if (removePdf) {
        updates.pattern_pdf_url = null
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', entry.id)
        .select('id,user_id,title,used_at,needle_size,held_with,notes,project_image_url,pattern_pdf_url,created_at,updated_at')
        .single()
      if (error) throw error

      onSaved({ ...data, yarnLines: entry.yarnLines })
      setEditing(false)
    } catch (e) {
      setSaveError('Kunne ikke gemme: ' + e.message)
    }
    setSaving(false)
  }

  async function handleDelete() {
    setDeleting(true)
    await supabase.from('projects').delete().eq('id', entry.id)
    onDelete(entry.id)
    onClose()
  }

  const currentImage = removeImage ? null : imagePreview
  const currentPdf   = removePdf   ? null : pdfPreview

  return (
    <div
      onClick={e => e.target === e.currentTarget && !editing && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,32,24,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1200, overflowY: 'auto', padding: '20px 16px' }}
    >
      <div style={{ background: '#FFFCF7', borderRadius: '14px', width: '520px', maxWidth: '100%', boxShadow: '0 24px 60px rgba(44,32,24,.25)', margin: 'auto', overflow: 'hidden' }}>
        {currentImage ? (
          <div style={{ aspectRatio: '16/9', overflow: 'hidden', background: '#EDE7D8', position: 'relative' }}>
            <img src={currentImage} alt="Projekt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{ height: '8px', background: fallbackHex }} />
        )}

        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Projektnavn..." style={{ ...inputStyle, fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600 }} />
              ) : (
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '22px', fontWeight: 600, color: '#2C2018' }}>
                  {entry.title || 'Unavngivet projekt'}
                </div>
              )}
              {!editing && entry.used_at && <div style={{ fontSize: '12px', color: '#8B7D6B', marginTop: '2px' }}>{formatDate(entry.used_at)}</div>}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginLeft: '12px', flexShrink: 0 }}>
              {!editing && (
                <button onClick={() => setEditing(true)} style={{ padding: '5px 12px', background: '#EDE7D8', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#6A5638', fontFamily: "'DM Sans', sans-serif" }}>
                  Rediger
                </button>
              )}
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#8B7D6B', padding: '4px' }}>✕</button>
            </div>
          </div>

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

          {editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <Label>Dato</Label>
                  <input type="date" value={form.usedAt} onChange={e => setF('usedAt', e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <Label>Pindestørrelse</Label>
                  <input value={form.needleSize} onChange={e => setF('needleSize', e.target.value)} placeholder="mm" style={inputStyle} />
                </div>
              </div>

              <div>
                <Label>Strikket med</Label>
                <input value={form.heldWith} onChange={e => setF('heldWith', e.target.value)} style={inputStyle} />
              </div>

              <div>
                <Label>Noter</Label>
                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              <FileUploadField
                label="Billede af projektet"
                accept="image/*"
                isImage
                preview={currentImage}
                onChange={handleImageFile}
                onRemove={() => { setImageFile(null); setImagePreview(null); setRemoveImage(true) }}
                hint="JPG eller PNG"
              />

              <FileUploadField
                label="Opskrift (PDF)"
                accept=".pdf,application/pdf"
                isImage={false}
                preview={currentPdf}
                onChange={handlePdfFile}
                onRemove={() => { setPdfFile(null); setPdfPreview(null); setRemovePdf(true) }}
                hint={pdfFile ? pdfFile.name : (entry.pattern_pdf_url ? 'Eksisterende PDF' : 'Upload PDF')}
              />

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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {entry.needle_size && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Pindestørrelse</div>
                    <div style={{ fontSize: '13px', color: '#2C2018' }}>{entry.needle_size} mm</div>
                  </div>
                )}
                {entry.held_with && (
                  <div>
                    <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '3px' }}>Strikket med</div>
                    <div style={{ fontSize: '13px', color: '#2C2018' }}>{entry.held_with}</div>
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
                  <span style={{ fontSize: '18px' }}>📄</span>
                  Åbn opskrift (PDF)
                </a>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
  heldWith: '',
  notes: '',
  yarnLines: [EMPTY_YARN_LINE],
}

function NytProjektModal({ user, onClose, onSaved }) {
  const [form, setForm]           = useState(EMPTY_NEW)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [pdfFile, setPdfFile]     = useState(null)
  const [pdfName, setPdfName]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState(null)

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

  function handleImageFile(e) {
    const file = e.target.files[0]; if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }
  function handlePdfFile(e) {
    const file = e.target.files[0]; if (!file) return
    setPdfFile(file); setPdfName(file.name)
  }

  async function save() {
    setSaving(true); setError(null)
    try {
      const { data: project, error: pErr } = await supabase
        .from('projects')
        .insert([{
          user_id: user.id,
          title: form.title || null,
          used_at: form.usedAt || null,
          needle_size: form.needleSize || null,
          held_with: form.heldWith || null,
          notes: form.notes || null,
        }])
        .select()
        .single()
      if (pErr) throw pErr

      const pUpdates = {}
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        pUpdates.project_image_url = await uploadFile('yarn-images', `${user.id}/projects/${project.id}.${ext}`, imageFile)
      }
      if (pdfFile) {
        pUpdates.pattern_pdf_url = await uploadFile('patterns', `${user.id}/projects/${project.id}.pdf`, pdfFile)
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
      if (lines.length === 0) throw new Error('Tilføj mindst ét garn til projektet.')

      const usageRows = lines.map(l => ({
        ...toUsageDb({
          projectId: project.id,
          yarnItemId: null,
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
          heldWith: project.held_with,
          notes: project.notes,
          usedAt: project.used_at,
        }),
        user_id: user.id,
      }))

      const { data: usages, error: yErr } = await supabase
        .from('yarn_usage')
        .insert(usageRows)
        .select()
      if (yErr) throw yErr

      onSaved({
        ...project,
        yarnLines: (usages ?? []).map(fromUsageDb),
      })
      onClose()
    } catch (e) {
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
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: '#fff' }}>Nyt færdigt projekt</div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.6)', marginTop: '2px' }}>Registrer uden at trække fra lageret</div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div>
            <Label>Hvad er strikket?</Label>
            <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="F.eks. Sommersweater, hue til børn..." style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <Label>Pindestørrelse</Label>
              <input value={form.needleSize} onChange={e => setF('needleSize', e.target.value)} placeholder="mm" style={inputStyle} />
            </div>
            <div>
              <Label>Dato</Label>
              <input type="date" value={form.usedAt} onChange={e => setF('usedAt', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <Label>Strikket med</Label>
              <input value={form.heldWith} onChange={e => setF('heldWith', e.target.value)} placeholder="F.eks. følgetråd" style={inputStyle} />
            </div>
          </div>

          <div>
            <Label>Garn i projektet</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(form.yarnLines ?? []).map((l, i) => (
                <div key={i} style={{ border: '1px solid #EDE7D8', background: '#F9F6F0', borderRadius: '10px', padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: l.hex || '#A8C4C4', border: '1px solid rgba(0,0,0,.08)', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <Label>Mærke</Label>
                        <input value={l.yarnBrand} onChange={e => setLine(i, { yarnBrand: e.target.value })} placeholder="F.eks. Permin" style={inputStyle} />
                      </div>
                      <div>
                        <Label>Garn</Label>
                        <input value={l.yarnName} onChange={e => setLine(i, { yarnName: e.target.value })} placeholder="F.eks. Bella" style={inputStyle} />
                      </div>
                      <div>
                        <Label>Farvenavn</Label>
                        <input value={l.colorName} onChange={e => setLine(i, { colorName: e.target.value })} placeholder="F.eks. Blå/Beige/Brun" style={inputStyle} />
                      </div>
                      <div>
                        <Label>Farvenr.</Label>
                        <input value={l.colorCode} onChange={e => setLine(i, { colorCode: e.target.value })} placeholder="F.eks. 883174" style={inputStyle} />
                      </div>
                      <div>
                        <Label>Antal nøgler brugt</Label>
                        <input type="number" step="0.25" min="0" value={l.quantityUsed} onChange={e => setLine(i, { quantityUsed: e.target.value })} style={inputStyle} />
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <Label>Farve (hex)</Label>
                          <input value={l.hex} onChange={e => setLine(i, { hex: e.target.value })} placeholder="#A8C4C4" style={inputStyle} />
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <Label>&nbsp;</Label>
                          <input type="color" value={l.hex || '#A8C4C4'} onChange={e => setLine(i, { hex: e.target.value })} style={{ width: '40px', height: '38px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent' }} />
                        </div>
                      </div>
                    </div>
                    {(form.yarnLines?.length ?? 0) > 1 && (
                      <button type="button" onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', color: '#8B3A2A', cursor: 'pointer', fontSize: '12px' }}>
                        Fjern
                      </button>
                    )}
                  </div>
                </div>
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

          <div style={{ borderTop: '1px solid #EDE7D8', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <FileUploadField
              label="Billede af projektet"
              accept="image/*" isImage
              preview={imagePreview}
              onChange={handleImageFile}
              onRemove={() => { setImageFile(null); setImagePreview(null) }}
              hint="JPG eller PNG"
            />
            <FileUploadField
              label="Opskrift (PDF)"
              accept=".pdf,application/pdf" isImage={false}
              preview={pdfName}
              onChange={handlePdfFile}
              onRemove={() => { setPdfFile(null); setPdfName(null) }}
              hint={pdfName || 'Valgfri PDF'}
            />
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

export default function Arkiv({ user }) {
  const [projects, setProjects] = useState([])
  const [loaded, setLoaded]   = useState(false)
  const [q, setQ]             = useState('')
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const [colorMap, setColorMap] = useState(new Map())

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('projects')
        .select('id,user_id,title,used_at,needle_size,held_with,notes,project_image_url,pattern_pdf_url,created_at,updated_at,yarn_usage(*)')
        .order('used_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) console.error(error)
      const rows = (data ?? []).map(p => ({
        ...p,
        yarnLines: (p.yarn_usage ?? []).map(fromUsageDb),
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
      const map = await fetchColorsByIds(ids)
      setColorMap(map)
    }
    if (projects.length > 0) loadColors()
  }, [projects])

  const filtered = projects.filter(p => {
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
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F4EFE6', minHeight: '100vh' }}>

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
        />
      )}

      {showNew && (
        <NytProjektModal
          user={user}
          onClose={() => setShowNew(false)}
          onSaved={project => setProjects(prev => [project, ...prev])}
        />
      )}

      {/* Sub-header */}
      <div style={{ background: '#6A5638', padding: '10px 20px', borderBottom: '1px solid #5A4628' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', color: 'rgba(255,255,255,.6)' }}>
            {projectCountLabel}
          </div>
          <button
            onClick={() => setShowNew(true)}
            style={{ padding: '7px 14px', background: '#C16B47', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          >
            + Nyt projekt
          </button>
        </div>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Søg projekt, garn eller farve..."
          style={{ width: '100%', maxWidth: '340px', padding: '7px 12px', border: '1px solid rgba(255,255,255,.2)', borderRadius: '6px', fontSize: '13px', background: 'rgba(255,255,255,.12)', color: '#fff', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
        />
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B7D6B' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>📦</div>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px' }}>
            {projects.length === 0 ? 'Ingen færdige projekter endnu' : 'Ingen resultater'}
          </div>
          <div style={{ fontSize: '13px', marginTop: '6px' }}>
            {projects.length === 0 ? 'Klik "+ Nyt projekt" for at registrere, eller brug "Brug nøgler" på et garn i lageret' : 'Prøv andre søgeord'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px', padding: '20px' }}>
          {filtered.map(p => {
            const yarns = (p.yarnLines ?? [])
            const first = yarns[0]
            const fallbackHex = first?.hex || '#A8C4C4'
            const thumbs = yarns.slice(0, 6)
            return (
            <div
              key={p.id}
              onClick={() => setSelected(p)}
              style={{ background: '#FFFCF7', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(44,32,24,.08)', cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
              onMouseEnter={el => { el.currentTarget.style.transform = 'translateY(-2px)'; el.currentTarget.style.boxShadow = '0 6px 20px rgba(44,32,24,.13)' }}
              onMouseLeave={el => { el.currentTarget.style.transform = ''; el.currentTarget.style.boxShadow = '0 1px 4px rgba(44,32,24,.08)' }}
            >
              {p.project_image_url ? (
                <div style={{ height: '140px', overflow: 'hidden' }}>
                  <img src={p.project_image_url} alt="Projekt" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : (
                <div style={{ height: '6px', background: fallbackHex }} />
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
