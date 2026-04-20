'use client'
import { useEffect, useRef, useState } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import { PROJECT_TYPES, PROJECT_TYPE_LABELS } from '@/lib/types'
import { fetchOwnProfile, shareProject, unshareProject } from '@/lib/community'

const inputStyle = {
  padding: '7px 10px', border: '1px solid #D0C8BA', borderRadius: '6px',
  fontSize: '13px', background: '#F9F6F0', color: '#2C2018',
  fontFamily: "'DM Sans', sans-serif", width: '100%', boxSizing: 'border-box',
}

function Label({ children, required }) {
  return (
    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B', marginBottom: '4px' }}>
      {children}{required && <span style={{ color: '#8B3A2A' }}> *</span>}
    </div>
  )
}

export function DelMedFaellesskabetModal({ project, user, onClose, onShared, onUnshared }) {
  const supabase = useSupabase()
  const dialogRef = useRef(null)
  const [projectType, setProjectType]         = useState(project.project_type || '')
  const [desc, setDesc]                       = useState(project.community_description || '')
  const [patternName, setPatternName]         = useState(project.pattern_name || '')
  const [patternDesigner, setPatternDesigner] = useState(project.pattern_designer || '')
  const [displayName, setDisplayName]         = useState('')
  const [confirmed, setConfirmed]             = useState(false)
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState(null)
  const isAlreadyShared = !!project.is_shared

  useEffect(() => {
    let active = true
    fetchOwnProfile(supabase, user.id).then(p => {
      if (!active) return
      if (p?.display_name) setDisplayName(p.display_name)
    })
    return () => { active = false }
  }, [supabase, user.id])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const root = dialogRef.current
      if (!root) return
      const focusables = root.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last  = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    dialogRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleShare() {
    if (!projectType) { setError('Vælg en projekttype.'); return }
    const pName = patternName.trim()
    const pDesigner = patternDesigner.trim()
    if (!pName) { setError('Indtast opskriftens navn.'); return }
    if (!pDesigner) { setError('Indtast designer.'); return }
    if (!confirmed) { setError('Bekræft at opskriftens navn og designer er korrekte.'); return }

    setSaving(true); setError(null)
    try {
      const cleanDesc = desc.trim() || null
      await shareProject(supabase, project.id, user.id, {
        project_type: projectType,
        community_description: cleanDesc,
        pattern_name: pName,
        pattern_designer: pDesigner,
        display_name: displayName.trim() || null,
      })
      onShared?.({
        ...project,
        is_shared: true,
        shared_at: new Date().toISOString(),
        project_type: projectType,
        community_description: cleanDesc,
        pattern_name: pName,
        pattern_designer: pDesigner,
      })
      onClose()
    } catch (e) {
      setError('Kunne ikke dele: ' + e.message)
    }
    setSaving(false)
  }

  async function handleUnshare() {
    setSaving(true); setError(null)
    try {
      await unshareProject(supabase, project.id)
      onUnshared?.({ ...project, is_shared: false })
      onClose()
    } catch (e) {
      setError('Kunne ikke fjerne: ' + e.message)
    }
    setSaving(false)
  }

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="del-modal-title"
      style={{ position: 'fixed', inset: 0, background: 'rgba(44,32,24,.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1300, overflowY: 'auto', padding: '20px 16px' }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{ background: '#FFFCF7', borderRadius: '14px', width: '520px', maxWidth: '100%', boxShadow: '0 24px 60px rgba(44,32,24,.25)', margin: 'auto', overflow: 'hidden', outline: 'none' }}
      >
        <div style={{ background: '#6A5638', padding: '18px 24px', position: 'relative' }}>
          <button onClick={onClose} aria-label="Luk" style={{ position: 'absolute', top: '12px', right: '16px', background: 'none', border: 'none', color: 'rgba(255,255,255,.7)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
          <div id="del-modal-title" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '20px', fontWeight: 600, color: '#fff' }}>
            {isAlreadyShared ? 'Rediger deling' : 'Del med fællesskabet'}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.72)', marginTop: '2px', lineHeight: 1.5 }}>
            Dit projekt bliver synligt for alle. Dine private noter deles ikke.
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <Label required>Projekttype</Label>
            <select
              value={projectType}
              onChange={e => setProjectType(e.target.value)}
              aria-label="Projekttype"
              style={inputStyle}
            >
              <option value="">Vælg type…</option>
              {PROJECT_TYPES.map(t => (
                <option key={t} value={t}>{PROJECT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>Kort beskrivelse (valgfri)</Label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              placeholder="Fx ændringer, erfaringer, pasform…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <div style={{ fontSize: '10.5px', color: '#8B7D6B', marginTop: '4px', lineHeight: 1.5 }}>
              Dine private noter deles ikke — kun denne beskrivelse vises offentligt.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <Label required>Opskriftens navn</Label>
              <input value={patternName} onChange={e => setPatternName(e.target.value)} placeholder="Fx Sortie" style={inputStyle} />
            </div>
            <div>
              <Label required>Designer</Label>
              <input value={patternDesigner} onChange={e => setPatternDesigner(e.target.value)} placeholder="Fx Isager" style={inputStyle} />
            </div>
          </div>
          <div style={{ fontSize: '10.5px', color: '#8B7D6B', marginTop: '-6px', lineHeight: 1.5 }}>
            Af hensyn til copyright deles kun navnet på opskriften og designeren — ikke selve opskriftens indhold.
          </div>

          <div>
            <Label>Vist som (valgfri)</Label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Fx Marie L."
              style={inputStyle}
            />
            <div style={{ fontSize: '10.5px', color: '#8B7D6B', marginTop: '4px', lineHeight: 1.5 }}>
              Hvis feltet er tomt, vises du som "Anonym strikker".
            </div>
          </div>

          <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', background: '#F4EFE6', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#5A4E42', lineHeight: 1.5 }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Jeg bekræfter at opskriftens navn og designer er korrekte, og at jeg kun deler mit færdige projekt — ikke selve opskriften.</span>
          </label>

          {error && (
            <div role="alert" style={{ padding: '10px 14px', background: '#F5E8E0', borderRadius: '8px', fontSize: '12px', color: '#8B3A2A' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', flexWrap: 'wrap' }}>
            <div>
              {isAlreadyShared && (
                <button
                  onClick={handleUnshare}
                  disabled={saving}
                  style={{ padding: '8px 14px', background: 'transparent', color: '#8B3A2A', border: '1px solid #E6C8C0', borderRadius: '6px', fontSize: '12px', cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Fjern fra fællesskabet
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={onClose}
                style={{ padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#6B5D4F', fontFamily: "'DM Sans', sans-serif" }}
              >
                Annuller
              </button>
              <button
                onClick={handleShare}
                disabled={saving}
                style={{ padding: '8px 20px', background: saving ? '#8AAAA0' : '#6A5638', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                {saving ? 'Gemmer…' : (isAlreadyShared ? 'Opdater deling' : 'Del projekt')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DelMedFaellesskabetModal
