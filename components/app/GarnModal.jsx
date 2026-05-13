'use client'

import { useState, useEffect, useRef } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import {
  searchYarnsFull,
  displayYarnName,
  applyCatalogYarnOnlyToForm,
  applyCatalogYarnColorToForm,
} from '@/lib/catalog'
import { detectColorFamily, COLOR_FAMILY_DEFAULT_HEX } from '@/lib/data/colorFamilies'
import { parseCombinedColorInput, combineColorDisplay } from '@/lib/colorInput'
import { toISODate } from '@/lib/date/formatDanish'
import { PROJECT_STATUS_LABELS } from '@/lib/types'
import KatalogInfoblok from './KatalogInfoblok'
import FarvekategoriCirkler from './FarvekategoriCirkler'
import FlereFarverVælger from './FlereFarverVælger'
import AntalStepper from './AntalStepper'
import BrugtOpFoldeUd from './BrugtOpFoldeUd'
import { isCatalogSwatchUrl } from './GarnKort'

// Modal-lokale konstanter. WEIGHTS/STATUSES/FIBER_PILLS spejles bevidst
// fra Garnlager.jsx (parent bruger samme værdier i filter-dropdownene);
// duplikering er foretrukket frem for ekstra 3 props eller delt modul, så
// modalen kan stå på egne ben uden import-koblinger.
const WEIGHTS = ['Lace', 'Fingering', 'Sport', 'DK', 'Worsted', 'Aran', 'Bulky']
const STATUSES = ['På lager', 'I brug', 'Brugt op', 'Ønskeliste']
const FIBER_PILLS = ['Uld', 'Merino', 'Mohair', 'Alpaka', 'Silke', 'Bomuld', 'Hør', 'Akryl']

const PROJECT_STATUS_BADGE_BG = {
  vil_gerne:       '#E8E0F0',
  i_gang:          '#FFE0C4',
  faerdigstrikket: '#D0E8D4',
}
const PROJECT_STATUS_BADGE_FG = {
  vil_gerne:       '#3C2A5C',
  i_gang:          '#7A3C10',
  faerdigstrikket: '#2A5C35',
}

// Modal-lokale styling-helpers.
const inputStyle = {
  padding: '7px 10px', border: '1px solid #D0C8BA',
  borderRadius: '6px', fontSize: '13px',
  background: '#F9F6F0', color: '#2C2018',
  fontFamily: "'DM Sans', sans-serif",
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

// Katalog-autocomplete: indkapslet i modalen fordi den kun bruges her.
// Holder eget search-state (debounced query, hits, open) — det er ren UI-state,
// ikke form-state, så det smitter ikke af på modalens "pure props"-kontrakt.
function YarnCatalogSearch({ value, onChange, onSelectYarn, placeholder, autoFocus }) {
  const supabase = useSupabase()
  const [open, setOpen] = useState(false)
  const [hits, setHits] = useState([])
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)
  // Kun bruger-initieret input (typing/focus) trigger søgning + dropdown.
  // Programmatisk pre-udfyldning ved redigering må ikke åbne dropdown'en.
  const userInitiatedRef = useRef(false)

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
    if (!userInitiatedRef.current) return
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      const r = await searchYarnsFull(supabase, q)
      setHits(r)
      setOpen(r.length > 0)
      setLoading(false)
    }, 320)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        onChange={e => { userInitiatedRef.current = true; onChange(e.target.value) }}
        onFocus={() => { userInitiatedRef.current = true; if (hits.length > 0) setOpen(true) }}
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

export default function GarnModal({
  // State
  modal,
  form,
  yarns,
  fieldErrors,
  saveError,
  isFormValid,
  confirmDel,
  deleting,
  imagePreview,
  imageOpen,
  catalogQuery,
  selectedYarn,
  colorsForYarn,
  projects,
  activeProjects,
  // Handlers
  onClose,
  onSetForm,
  onSetF,
  onSetFieldErrors,
  onSave,
  onDel,
  onConfirmDel,
  onSetImageOpen,
  onImageFile,
  onRemoveImage,
  onCatalogQueryChange,
  onSelectCatalogYarn,
  onClearCatalogLink,
  onToggleFiber,
  onOpenBrugModal,
  onOpenProject,
}) {
  if (!modal) return null
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
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
                onChange={onCatalogQueryChange}
                onSelectYarn={onSelectCatalogYarn}
                placeholder="Skriv mærke eller garnnavn fra garn-kataloget…"
                autoFocus={!form.catalogYarnId}
              />
            </Field>
          </div>

          {form.catalogYarnId && (
            <KatalogInfoblok yarn={selectedYarn} onClearLink={onClearCatalogLink} />
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
                    onSetForm(f => applyCatalogYarnOnlyToForm(selectedYarn, { ...f, antal: f.antal || 1 }))
                    return
                  }
                  const c = colorsForYarn.find(x => x.id === id)
                  if (c) {
                    onSetForm(f => {
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
                    onSetF(k, e.target.value)
                    if (err) onSetFieldErrors(prev => { const n = { ...prev }; delete n[k]; return n })
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
                onChange={e => onSetF('fiber', e.target.value)}
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
                      onClick={() => onToggleFiber(f)}
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
                onSetForm(p => {
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
                onSetForm(p => ({ ...p, colorCategory, hex }))
              }}
              onExactHexChange={hex => onSetF('hex', hex)}
            />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <FlereFarverVælger
              hexColors={form.hexColors}
              onChange={hexColors => onSetF('hexColors', hexColors)}
            />
          </div>

          {!form.catalogYarnId && (
            <Field label="Garnvægt">
              <select value={form.weight} onChange={e => onSetF('weight', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {WEIGHTS.map(w => <option key={w}>{w}</option>)}
              </select>
            </Field>
          )}

          <Field label="Status">
            <select
              value={form.status}
              onChange={e => {
                const next = e.target.value
                onSetForm(p => ({
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
              onChange={v => onSetF('antal', v)}
            />
          </Field>

          {/* Brugt op-folde-ud — vises kun når status = "Brugt op" (F15: 3-mode kobling) */}
          {form.status === 'Brugt op' && (
            <BrugtOpFoldeUd
              mode={form.brugtOpMode || 'none'}
              onChangeMode={v => {
                onSetF('brugtOpMode', v)
                onSetFieldErrors(prev => {
                  const n = { ...prev }
                  delete n.brugtOpProjectId
                  delete n.brugtOpNewTitle
                  return n
                })
              }}
              selectedProjectId={form.brugtOpProjectId}
              onChangeProjectId={v => {
                onSetF('brugtOpProjectId', v)
                if (fieldErrors.brugtOpProjectId) {
                  onSetFieldErrors(prev => { const n = { ...prev }; delete n.brugtOpProjectId; return n })
                }
              }}
              newProjectTitle={form.brugtOpNewTitle}
              onChangeNewProjectTitle={v => {
                onSetF('brugtOpNewTitle', v)
                if (fieldErrors.brugtOpNewTitle) {
                  onSetFieldErrors(prev => { const n = { ...prev }; delete n.brugtOpNewTitle; return n })
                }
              }}
              brugtOpDato={form.brugtOpDato}
              onChangeDato={v => onSetF('brugtOpDato', v)}
              existingProjects={projects}
              errors={fieldErrors}
            />
          )}

          {/* Billede upload — kollapset bag toggle indtil bruger åbner */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {!imageOpen ? (
              <button
                type="button"
                onClick={() => onSetImageOpen(true)}
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
                      onClick={() => onSetImageOpen(false)}
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
                  <input type="file" accept="image/*" onChange={onImageFile} style={{ display: 'none' }} />
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
                    Katalogbilledet er en lille farveprøve (100×100). Upload et foto, hvis du vil gemme et billede sammen med dit garn.
                  </div>
                )}
                {imagePreview && (
                  <button
                    type="button"
                    onClick={onRemoveImage}
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
              onChange={e => onSetF('noter', e.target.value)}
              rows={3}
              placeholder="Projekter, ideer, specielle egenskaber..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          {modal !== 'add' && activeProjects.length > 0 && (
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Label>Bruges i projekter</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activeProjects.map(p => (
                  <button
                    key={p.yarnUsageId}
                    type="button"
                    onClick={() => onOpenProject(p.projectId)}
                    aria-label={`Åbn projekt ${p.title || 'Unavngivet'}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', textAlign: 'left',
                      border: '1px solid #EDE7D8', background: '#F9F6F0',
                      borderRadius: 8, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                      color: '#302218', minHeight: 44,
                    }}
                  >
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 10,
                      fontWeight: 500, letterSpacing: '.05em',
                      background: PROJECT_STATUS_BADGE_BG[p.status] ?? '#EDE7D8',
                      color: PROJECT_STATUS_BADGE_FG[p.status] ?? '#302218',
                      flexShrink: 0,
                    }}>
                      {PROJECT_STATUS_LABELS[p.status] ?? p.status}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.title || 'Unavngivet projekt'}
                    </span>
                    <span style={{ color: '#8B7D6B', fontSize: 11, flexShrink: 0 }}>
                      {p.quantityUsed} ngl
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
                <button onClick={() => onConfirmDel(false)} disabled={deleting} style={{ padding: '8px 12px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", color: '#6B5D4F' }}>Annuller</button>
                <button onClick={onDel} disabled={deleting} style={{ padding: '8px 14px', background: '#8B3A2A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: deleting ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  {deleting ? 'Sletter...' : 'Ja, slet'}
                </button>
              </div>
            ) : (
              <button onClick={() => onConfirmDel(true)} style={{ padding: '8px 14px', background: '#F0E8E0', color: '#8B3A2A', border: 'none', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', marginRight: 'auto', fontFamily: "'DM Sans', sans-serif" }}>
                Slet
              </button>
            )
          )}
          {modal !== 'add' && Number(form.antal) > 0 && (
            <button
              onClick={() => onOpenBrugModal(yarns.find(y => y.id === modal))}
              style={{ padding: '8px 14px', background: '#F4EFE6', color: '#6A5638', border: '1px solid #C8B89A', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Brug nøgler
            </button>
          )}
          <button onClick={onClose} style={{ padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: '6px', background: 'transparent', fontSize: '13px', cursor: 'pointer', color: '#6B5D4F', fontFamily: "'DM Sans', sans-serif" }}>
            Annuller
          </button>
          <button
            onClick={onSave}
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
  )
}
