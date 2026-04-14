import { useState } from 'react'
import { supabase, toUsageDb, uploadFile } from '../lib/supabase'

const inputStyle = {
  padding: '7px 10px', border: '1px solid #D0C8BA',
  borderRadius: '6px', fontSize: '13px',
  background: '#F9F6F0', color: '#2C2018',
  fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function FileUploadField({ label, accept, preview, onChange, hint }) {
  return (
    <Field label={label}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 12px', border: '1px dashed #C0B8A8',
        borderRadius: '8px', cursor: 'pointer', background: '#F4EFE6',
      }}>
        <input type="file" accept={accept} onChange={onChange} style={{ display: 'none' }} />
        {preview ? (
          accept.includes('image') ? (
            <img src={preview} alt="preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }} />
          ) : (
            <div style={{ width: '48px', height: '48px', background: '#2C4A3E', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📄</div>
          )
        ) : (
          <div style={{ width: '48px', height: '48px', background: '#EDE7D8', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#8B7D6B' }}>
            {accept.includes('image') ? '📷' : '📎'}
          </div>
        )}
        <div>
          <div style={{ fontSize: '12px', color: '#2C2018', fontWeight: 500 }}>
            {preview ? 'Skift fil' : 'Vælg fil'}
          </div>
          <div style={{ fontSize: '11px', color: '#8B7D6B' }}>{hint}</div>
        </div>
      </label>
    </Field>
  )
}

export default function BrugNøglerModal({ yarn, user, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10)

  const [form, setForm] = useState({
    quantityUsed: 1,
    usedFor:      '',
    needleSize:   yarn.pindstr ?? '',
    heldWith:     '',
    notes:        '',
    usedAt:       today,
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfName, setPdfName] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function handleImage(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function handlePdf(e) {
    const file = e.target.files[0]
    if (!file) return
    setPdfFile(file)
    setPdfName(file.name)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      // Insert usage record first to get the id
      const usageData = toUsageDb({
        ...form,
        yarnItemId: yarn.id,
        yarnName:   yarn.name,
        yarnBrand:  yarn.brand,
        colorName:  yarn.colorName,
        colorCode:  yarn.colorCode,
        hex:        yarn.hex,
        catalogYarnId:  yarn.catalogYarnId  ?? null,
        catalogColorId: yarn.catalogColorId ?? null,
      })

      const { data: usageRow, error: insertErr } = await supabase
        .from('yarn_usage')
        .insert([{ ...usageData, user_id: user.id }])
        .select()
        .single()

      if (insertErr) throw insertErr

      const usageId = usageRow.id
      let projectImageUrl = null
      let patternPdfUrl = null

      // Upload image if provided
      if (imageFile) {
        const ext = imageFile.name.split('.').pop()
        projectImageUrl = await uploadFile(
          'yarn-images',
          `${user.id}/${usageId}.${ext}`,
          imageFile
        )
      }

      // Upload PDF if provided
      if (pdfFile) {
        patternPdfUrl = await uploadFile(
          'patterns',
          `${user.id}/${usageId}.pdf`,
          pdfFile
        )
      }

      // Update record with file URLs if any were uploaded
      if (projectImageUrl || patternPdfUrl) {
        await supabase.from('yarn_usage').update({
          ...(projectImageUrl && { project_image_url: projectImageUrl }),
          ...(patternPdfUrl   && { pattern_pdf_url:   patternPdfUrl }),
        }).eq('id', usageId)
        usageRow.project_image_url = projectImageUrl
        usageRow.pattern_pdf_url   = patternPdfUrl
      }

      // Reduce yarn_items quantity
      const newQty = Math.max(0, (parseFloat(yarn.antal) || 0) - parseFloat(form.quantityUsed || 0))
      const updates = { quantity: newQty }
      if (newQty === 0) updates.status = 'Brugt op'

      await supabase.from('yarn_items').update(updates).eq('id', yarn.id)

      onSaved(usageRow, newQty, newQty === 0 ? 'Brugt op' : yarn.status)
      onClose()
    } catch (e) {
      setError('Kunne ikke gemme: ' + e.message)
    }
    setSaving(false)
  }

  const maxQty = parseFloat(yarn.antal) || 0

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,32,24,.5)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 1100, overflowY: 'auto', padding: '20px 16px',
      }}
    >
      <div style={{
        background: '#FFFCF7', borderRadius: '14px', width: '480px', maxWidth: '100%',
        boxShadow: '0 24px 60px rgba(44,32,24,.25)', margin: 'auto',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ background: '#6A5638', padding: '20px 24px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: yarn.hex || '#A8C4C4', border: '2px solid rgba(255,255,255,.3)', flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: '#fff' }}>
                Brug nøgler
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.7)', marginTop: '1px' }}>
                {yarn.brand} · {yarn.name} · {yarn.colorName}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label={`Antal nøgler brugt (max ${maxQty})`}>
              <input
                type="number" step="0.25" min="0.25" max={maxQty}
                value={form.quantityUsed}
                onChange={e => setF('quantityUsed', e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Dato">
              <input type="date" value={form.usedAt} onChange={e => setF('usedAt', e.target.value)} style={inputStyle} />
            </Field>
          </div>

          <Field label="Hvad er strikket?">
            <input value={form.usedFor} onChange={e => setF('usedFor', e.target.value)} placeholder="F.eks. Sommersweater, hue til børn..." style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Pindestørrelse brugt">
              <input value={form.needleSize} onChange={e => setF('needleSize', e.target.value)} placeholder={yarn.pindstr || 'mm'} style={inputStyle} />
            </Field>
            <Field label="Strikket sammen med">
              <input value={form.heldWith} onChange={e => setF('heldWith', e.target.value)} placeholder="F.eks. Bella 883174" style={inputStyle} />
            </Field>
          </div>

          <div style={{ borderTop: '1px solid #EDE7D8', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FileUploadField
              label="Billede af projektet"
              accept="image/*"
              preview={imagePreview}
              onChange={handleImage}
              hint="JPG, PNG — vises i arkivet"
            />
            <FileUploadField
              label="Opskrift (PDF)"
              accept=".pdf,application/pdf"
              preview={pdfName}
              onChange={handlePdf}
              hint={pdfName || 'PDF gemmes privat i dit arkiv'}
            />
          </div>

          <Field label="Noter">
            <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} placeholder="Ændringer til opskriften, tips..." style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>

          {error && (
            <div style={{ padding: '10px 14px', background: '#F5E8E0', borderRadius: '8px', fontSize: '12px', color: '#8B3A2A' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#6B5D4F', fontFamily: "'DM Sans', sans-serif" }}>
              Annuller
            </button>
            <button
              onClick={save}
              disabled={saving || !form.quantityUsed}
              style={{ padding: '8px 20px', background: saving ? '#8AAAA0' : '#6A5638', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              {saving ? 'Gemmer...' : 'Arkivér nøgler'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
