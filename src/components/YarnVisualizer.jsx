import { useState, useEffect, useRef } from 'react'
import { supabase, uploadFile } from '../lib/supabase'
import { PERMIN_CATALOG } from '../data/perminCatalog'
import { FILCOLANA_CATALOG } from '../data/filcolanaCatalog'

const ALL_YARN = [...PERMIN_CATALOG, ...FILCOLANA_CATALOG]

const BRAND_FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'tilia', label: 'Filcolana Tilia' },
  { id: 'bella', label: 'Permin Bella' },
  { id: 'bellacolor', label: 'Permin Bella Color' },
]

function filterByBrand(yarn, brandId) {
  if (brandId === 'all') return yarn
  if (brandId === 'tilia') return yarn.filter(y => y.series === 'Tilia')
  if (brandId === 'bella') return yarn.filter(y => y.series === 'Bella')
  if (brandId === 'bellacolor') return yarn.filter(y => y.series === 'Bella Color')
  return yarn
}

// ─── Yarn search autocomplete ────────────────────────────────────────────────

function YarnSearch({ brandFilter, onSelect, placeholder }) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState([])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const q = (query || '').toLowerCase().trim()
    if (q.length < 1) { setHits([]); setOpen(false); return }
    const pool = filterByBrand(ALL_YARN, brandFilter)
    const results = pool.filter(e =>
      e.colorName?.toLowerCase().includes(q) ||
      e.colorNameDa?.toLowerCase().includes(q) ||
      e.articleNumber.includes(q) ||
      String(e.colorNumber || '').includes(q)
    ).slice(0, 10)
    setHits(results)
    setOpen(results.length > 0)
  }, [query, brandFilter])

  useEffect(() => {
    function handler(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => hits.length > 0 && setOpen(true)}
        placeholder={placeholder || 'Søg farvenavn, nummer eller artikelnr…'}
        style={inputStyle}
      />
      {open && (
        <div style={dropdownStyle}>
          {hits.map((e, i) => (
            <div
              key={`${e.articleNumber}-${i}`}
              onMouseDown={() => { onSelect(e); setQuery(''); setOpen(false) }}
              style={dropdownItemStyle}
              onMouseEnter={el => el.currentTarget.style.background = '#F4EFE6'}
              onMouseLeave={el => el.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: e.hex, border: '1px solid rgba(0,0,0,.1)', flexShrink: 0,
              }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2018' }}>
                  {e.colorNameDa ?? e.colorName}
                </div>
                <div style={{ fontSize: 11, color: '#8B7D6B' }}>
                  {e.brand} {e.series} · {e.articleNumber} · {e.hex}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Mini color grid for picking within a slot ───────────────────────────────

function MiniColorGrid({ brandFilter, onSelect, maxShow = 30 }) {
  const pool = filterByBrand(ALL_YARN, brandFilter).slice(0, maxShow)
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8,
    }}>
      {pool.map((e, i) => (
        <button
          key={`${e.articleNumber}-${i}`}
          onClick={() => onSelect(e)}
          title={`${e.colorNameDa ?? e.colorName} (${e.hex})`}
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: e.hex, border: '2px solid rgba(0,0,0,.08)',
            cursor: 'pointer', transition: 'transform .1s',
            padding: 0,
          }}
          onMouseEnter={el => { el.currentTarget.style.transform = 'scale(1.2)'; el.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.2)' }}
          onMouseLeave={el => { el.currentTarget.style.transform = 'scale(1)'; el.currentTarget.style.boxShadow = 'none' }}
        />
      ))}
    </div>
  )
}

// ─── Full color grid (for single-color mode) ────────────────────────────────

function ColorGrid({ brandFilter, onSelect }) {
  const pool = filterByBrand(ALL_YARN, brandFilter)
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(48px, 1fr))',
      gap: 6, marginTop: 12,
    }}>
      {pool.map((e, i) => (
        <button
          key={`${e.articleNumber}-${i}`}
          onClick={() => onSelect(e)}
          title={`${e.colorNameDa ?? e.colorName} (${e.hex})`}
          style={{
            width: '100%', aspectRatio: '1', borderRadius: 8,
            background: e.hex, border: '2px solid rgba(0,0,0,.08)',
            cursor: 'pointer', transition: 'transform .1s, box-shadow .1s',
            padding: 0,
          }}
          onMouseEnter={el => { el.currentTarget.style.transform = 'scale(1.15)'; el.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.2)' }}
          onMouseLeave={el => { el.currentTarget.style.transform = 'scale(1)'; el.currentTarget.style.boxShadow = 'none' }}
        />
      ))}
    </div>
  )
}

// ─── Color slot card (for multi-color) ───────────────────────────────────────

function ColorSlot({ slot, index, brandFilter, onUpdate, onRemove, canRemove }) {
  const [showGrid, setShowGrid] = useState(false)

  return (
    <div style={{
      background: '#FFFCF7', borderRadius: 12, padding: 16,
      border: '1px solid #E8E0D4', marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{
          fontSize: 12, fontWeight: 600, color: '#2C4A3E',
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          {index === 0 ? 'Primær farve' : index === 1 ? 'Sekundær farve' : `Farve ${index + 1}`}
        </span>
        {canRemove && (
          <button onClick={onRemove} style={{
            background: 'none', border: 'none', color: '#8B7D6B', fontSize: 18,
            cursor: 'pointer', padding: '0 4px', lineHeight: 1,
          }}>×</button>
        )}
      </div>

      {/* What color to replace */}
      <label style={labelStyle}>Erstatter denne farve i billedet</label>
      <input
        value={slot.replaces}
        onChange={e => onUpdate({ ...slot, replaces: e.target.value })}
        placeholder="f.eks. rød, hvid, lyseblå, stribet…"
        style={{ ...inputStyle, marginBottom: 12 }}
      />

      {/* Selected yarn or picker */}
      {slot.yarn ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#F4EFE6', borderRadius: 8, padding: '8px 12px',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: slot.yarn.hex, border: '1px solid rgba(0,0,0,.1)', flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2018' }}>
              {slot.yarn.colorNameDa ?? slot.yarn.colorName}
            </div>
            <div style={{ fontSize: 11, color: '#8B7D6B' }}>
              {slot.yarn.brand} {slot.yarn.series} · {slot.yarn.hex}
            </div>
          </div>
          <button
            onClick={() => onUpdate({ ...slot, yarn: null })}
            style={linkBtnStyle}
          >
            Skift
          </button>
        </div>
      ) : (
        <div>
          <label style={labelStyle}>Vælg nyt garn</label>
          <YarnSearch
            brandFilter={brandFilter}
            onSelect={yarn => onUpdate({ ...slot, yarn })}
            placeholder="Søg farvenavn…"
          />
          <button
            onClick={() => setShowGrid(!showGrid)}
            style={{ ...linkBtnStyle, marginTop: 8, fontSize: 11 }}
          >
            {showGrid ? 'Skjul palette' : 'Vis farvepalette'}
          </button>
          {showGrid && (
            <MiniColorGrid
              brandFilter={brandFilter}
              onSelect={yarn => { onUpdate({ ...slot, yarn }); setShowGrid(false) }}
              maxShow={60}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function YarnVisualizer({ user, onRequestLogin }) {
  const [step, setStep] = useState(1)

  // Step 1 — upload
  const [uploadedFile, setUploadedFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  // Step 2 — yarn selection
  const [brandFilter, setBrandFilter] = useState('all')
  const [multiColor, setMultiColor] = useState(false)
  // Single-color mode
  const [selectedYarn, setSelectedYarn] = useState(null)
  // Multi-color mode — array of { replaces: string, yarn: catalogEntry | null }
  const [colorSlots, setColorSlots] = useState([
    { replaces: '', yarn: null },
    { replaces: '', yarn: null },
  ])

  // Step 4 — result
  const [generating, setGenerating] = useState(false)
  const [resultImage, setResultImage] = useState(null)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Gallery
  const [savedViz, setSavedViz] = useState([])
  const [exampleViz, setExampleViz] = useState([])
  const [detailViz, setDetailViz] = useState(null)

  // Fetch user's own saved visualizations
  useEffect(() => {
    if (!user) return
    supabase
      .from('visualizations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setSavedViz(data) })
  }, [user])

  // Fetch public example visualizations (visible to everyone)
  useEffect(() => {
    supabase
      .from('visualizations')
      .select('*')
      .eq('is_example', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setExampleViz(data) })
  }, [])

  // ── Handlers ──

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    setUploadedFile(file)
    setPreview(URL.createObjectURL(file))
    setStep(2)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    handleFile(file)
  }

  function handleSingleYarnSelect(yarn) {
    setSelectedYarn(yarn)
    setStep(3)
  }

  function handleMultiConfirm() {
    // Validate: at least one slot has both replaces and yarn
    const filled = colorSlots.filter(s => s.yarn && s.replaces.trim())
    if (filled.length === 0) return
    setStep(3)
  }

  function updateSlot(index, updated) {
    setColorSlots(prev => prev.map((s, i) => i === index ? updated : s))
  }

  function removeSlot(index) {
    setColorSlots(prev => prev.filter((_, i) => i !== index))
  }

  function addSlot() {
    if (colorSlots.length >= 5) return
    setColorSlots(prev => [...prev, { replaces: '', yarn: null }])
  }

  // Build yarn data for the API
  function getYarnPayload() {
    if (!multiColor) {
      return {
        colors: [{
          replaces: 'all colors',
          brand: selectedYarn.brand,
          series: selectedYarn.series,
          colorName: selectedYarn.colorName,
          colorNameDa: selectedYarn.colorNameDa,
          hex: selectedYarn.hex,
          fiber: selectedYarn.fiber,
          weight: selectedYarn.weight,
        }]
      }
    }
    return {
      colors: colorSlots
        .filter(s => s.yarn && s.replaces.trim())
        .map(s => ({
          replaces: s.replaces.trim(),
          brand: s.yarn.brand,
          series: s.yarn.series,
          colorName: s.yarn.colorName,
          colorNameDa: s.yarn.colorNameDa,
          hex: s.yarn.hex,
          fiber: s.yarn.fiber,
          weight: s.yarn.weight,
        }))
    }
  }

  // All yarns that are selected (for display)
  function getSelectedYarns() {
    if (!multiColor) return selectedYarn ? [{ replaces: null, yarn: selectedYarn }] : []
    return colorSlots.filter(s => s.yarn && s.replaces.trim())
  }

  async function handleGenerate() {
    if (!user) { onRequestLogin(); return }
    const yarns = getSelectedYarns()
    if (!uploadedFile || yarns.length === 0) return
    setGenerating(true)
    setError(null)
    setStep(4)

    try {
      const base64 = await fileToBase64(uploadedFile)
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      const res = await fetch(`${supabaseUrl}/functions/v1/visualize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          image: base64,
          yarn: getYarnPayload(),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || err.details || `Fejl ${res.status}`)
      }

      const data = await res.json()
      if (data.format === 'base64') {
        setResultImage(`data:image/png;base64,${data.image}`)
      } else {
        setResultImage(data.image)
      }
    } catch (err) {
      console.error('Visualization error:', err)
      setError(err.message || 'Noget gik galt. Prøv igen.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!user || !resultImage || !uploadedFile) return
    setSaving(true)
    try {
      const ts = Date.now()
      // Upload original
      const origExt = uploadedFile.name.split('.').pop() || 'png'
      const origUrl = await uploadFile('yarn-images', `${user.id}/viz-original-${ts}.${origExt}`, uploadedFile)
      // Upload result (convert data URL or fetch URL to blob)
      let resultBlob
      if (resultImage.startsWith('data:')) {
        const res = await fetch(resultImage)
        resultBlob = await res.blob()
      } else {
        const res = await fetch(resultImage)
        resultBlob = await res.blob()
      }
      const resultUrl = await uploadFile('yarn-images', `${user.id}/viz-result-${ts}.png`, resultBlob)
      // Build yarn info
      const yarnInfo = getYarnPayload()
      // Save record
      const { data: row, error: dbErr } = await supabase.from('visualizations').insert([{
        user_id: user.id,
        original_url: origUrl,
        result_url: resultUrl,
        yarn_info: yarnInfo,
      }]).select().single()
      if (dbErr) throw dbErr
      setSavedViz(prev => [row, ...prev])
      setSaved(true)
    } catch (err) {
      console.error('Save error:', err)
      setError('Kunne ikke gemme: ' + (err.message || 'Ukendt fejl'))
    } finally {
      setSaving(false)
    }
  }

  function resetAll() {
    setStep(1)
    setUploadedFile(null)
    setPreview(null)
    setSelectedYarn(null)
    setColorSlots([{ replaces: '', yarn: null }, { replaces: '', yarn: null }])
    setResultImage(null)
    setError(null)
    setSaved(false)
  }

  function tryAnotherColor() {
    setSelectedYarn(null)
    setColorSlots(prev => prev.map(s => ({ ...s, yarn: null })))
    setResultImage(null)
    setError(null)
    setSaved(false)
    setStep(2)
  }

  async function handleDeleteViz(id) {
    await supabase.from('visualizations').delete().eq('id', id)
    setSavedViz(prev => prev.filter(v => v.id !== id))
    setDetailViz(null)
  }

  const filledSlots = colorSlots.filter(s => s.yarn && s.replaces.trim())
  const canConfirmMulti = filledSlots.length >= 1

  // ── Render ──

  return (
    <div style={{ background: 'transparent', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 16px' }}>

        {/* Header */}
        <h2 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28, fontWeight: 600, color: '#2C4A3E',
          margin: '0 0 4px',
        }}>
          Prøv garn
        </h2>
        <p style={{ fontSize: 13, color: '#8B7D6B', margin: '0 0 24px' }}>
          Upload et foto og se hvordan det ser ud i dit yndlingsgarn.
          {!user && <>{' '}<button onClick={onRequestLogin} style={{ background: 'none', border: 'none', color: '#9B6272', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0, textDecoration: 'underline' }}>Log ind</button> for at generere dine egne.</>}
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[
            { n: 1, label: 'Upload foto' },
            { n: 2, label: 'Vælg garn' },
            { n: 3, label: 'Forhåndsvisning' },
            { n: 4, label: 'Resultat' },
          ].map(s => (
            <div key={s.n} style={{
              flex: 1, textAlign: 'center', padding: '8px 0',
              borderBottom: `3px solid ${step >= s.n ? '#2C4A3E' : '#D0C8BA'}`,
              transition: 'border-color .2s',
            }}>
              <span style={{
                fontSize: 11, fontWeight: step === s.n ? 600 : 400,
                color: step >= s.n ? '#2C4A3E' : '#8B7D6B',
                letterSpacing: '.03em',
              }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* ─── Step 1: Upload ─── */}
        {step === 1 && (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              style={{
                border: `2px dashed ${dragOver ? '#2C4A3E' : '#C0B8A8'}`,
                borderRadius: 16,
                padding: '48px 24px',
                textAlign: 'center',
                background: dragOver ? '#EDF5F0' : '#FFFCF7',
                cursor: 'pointer',
                transition: 'all .2s',
              }}
              onClick={() => document.getElementById('viz-upload').click()}
            >
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>📷</div>
              <p style={{ fontSize: 14, color: '#5A4E42', margin: '0 0 8px', fontWeight: 500 }}>
                Træk et billede hertil eller klik for at uploade
              </p>
              <p style={{ fontSize: 12, color: '#8B7D6B', margin: 0 }}>
                JPG eller PNG — f.eks. et billede af en sweater, hue eller sjal du gerne vil strikke
              </p>
              <input
                id="viz-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])}
              />
            </div>
          </div>
        )}

        {/* ─── Step 2: Select yarn ─── */}
        {step === 2 && (
          <div>
            {/* Photo thumbnail */}
            {preview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <img src={preview} alt="Uploaded" style={{
                  width: 64, height: 64, objectFit: 'cover', borderRadius: 10,
                  border: '1px solid #D0C8BA',
                }} />
                <div>
                  <div style={{ fontSize: 12, color: '#8B7D6B' }}>Dit billede</div>
                  <button onClick={resetAll} style={linkBtnStyle}>Skift billede</button>
                </div>
              </div>
            )}

            {/* Single vs multi-color toggle */}
            <div style={{
              display: 'flex', background: '#E8E0D4', borderRadius: 10, padding: 3,
              marginBottom: 20,
            }}>
              <button
                onClick={() => setMultiColor(false)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  fontWeight: !multiColor ? 600 : 400,
                  background: !multiColor ? '#FFFCF7' : 'transparent',
                  color: !multiColor ? '#2C4A3E' : '#8B7D6B',
                  boxShadow: !multiColor ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                  transition: 'all .15s',
                }}
              >
                Én farve
              </button>
              <button
                onClick={() => setMultiColor(true)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                  border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  fontWeight: multiColor ? 600 : 400,
                  background: multiColor ? '#FFFCF7' : 'transparent',
                  color: multiColor ? '#2C4A3E' : '#8B7D6B',
                  boxShadow: multiColor ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
                  transition: 'all .15s',
                }}
              >
                Flere farver
              </button>
            </div>

            {/* Brand pills */}
            <label style={labelStyle}>Garnmærke</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
              {BRAND_FILTERS.map(b => (
                <button
                  key={b.id}
                  onClick={() => setBrandFilter(b.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12,
                    border: brandFilter === b.id ? '2px solid #2C4A3E' : '1px solid #C0B8A8',
                    background: brandFilter === b.id ? '#2C4A3E' : '#FFFCF7',
                    color: brandFilter === b.id ? '#EDF5F0' : '#5A4E42',
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    fontWeight: brandFilter === b.id ? 500 : 400,
                    transition: 'all .15s',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* ── Single color mode ── */}
            {!multiColor && (
              <div>
                <label style={labelStyle}>Søg farve</label>
                <YarnSearch brandFilter={brandFilter} onSelect={handleSingleYarnSelect} />
                <label style={{ ...labelStyle, marginTop: 20 }}>Eller vælg fra paletten</label>
                <ColorGrid brandFilter={brandFilter} onSelect={handleSingleYarnSelect} />
              </div>
            )}

            {/* ── Multi-color mode ── */}
            {multiColor && (
              <div>
                <p style={{ fontSize: 12, color: '#8B7D6B', margin: '0 0 16px' }}>
                  Angiv hvilke farver i billedet der skal erstattes, og vælg det nye garn for hver.
                </p>

                {colorSlots.map((slot, i) => (
                  <ColorSlot
                    key={i}
                    slot={slot}
                    index={i}
                    brandFilter={brandFilter}
                    onUpdate={updated => updateSlot(i, updated)}
                    onRemove={() => removeSlot(i)}
                    canRemove={colorSlots.length > 1}
                  />
                ))}

                {colorSlots.length < 5 && (
                  <button onClick={addSlot} style={{
                    ...secondaryBtnStyle, width: '100%', marginBottom: 16,
                    padding: '10px', fontSize: 13,
                  }}>
                    + Tilføj farve
                  </button>
                )}

                <button
                  onClick={handleMultiConfirm}
                  disabled={!canConfirmMulti}
                  style={{
                    ...primaryBtnStyle,
                    width: '100%',
                    opacity: canConfirmMulti ? 1 : 0.5,
                    cursor: canConfirmMulti ? 'pointer' : 'not-allowed',
                  }}
                >
                  Fortsæt til forhåndsvisning
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Yarn preview + confirm ─── */}
        {step === 3 && (
          <div>
            {/* Photo + swatches */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' }}>
              {preview && (
                <img src={preview} alt="Uploaded" style={{
                  width: 140, height: 140, objectFit: 'cover', borderRadius: 14,
                  border: '1px solid #D0C8BA',
                }} />
              )}
              {!multiColor && selectedYarn && (
                <SwatchBlock yarn={selectedYarn} />
              )}
              {multiColor && filledSlots.map((slot, i) => (
                <SwatchBlock key={i} yarn={slot.yarn} label={slot.replaces} />
              ))}
            </div>

            {/* Yarn details */}
            {!multiColor && selectedYarn && (
              <YarnDetailCard yarn={selectedYarn} />
            )}
            {multiColor && filledSlots.map((slot, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 11, color: '#8B7D6B', marginBottom: 4,
                  textTransform: 'uppercase', letterSpacing: '.05em',
                }}>
                  Erstatter: {slot.replaces}
                </div>
                <YarnDetailCard yarn={slot.yarn} compact />
              </div>
            ))}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button onClick={handleGenerate} style={primaryBtnStyle}>
                Generér visualisering
              </button>
              <button onClick={tryAnotherColor} style={secondaryBtnStyle}>
                Vælg andre farver
              </button>
            </div>
          </div>
        )}

        {/* ─── Step 4: Result ─── */}
        {step === 4 && (
          <div>
            {generating && (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={spinnerStyle} />
                <p style={{ fontSize: 14, color: '#5A4E42', marginTop: 20 }}>
                  Genererer visualisering…
                </p>
                <p style={{ fontSize: 12, color: '#8B7D6B' }}>
                  Dette kan tage 15–30 sekunder
                </p>
              </div>
            )}

            {error && !generating && (
              <div style={{
                background: '#FFF0F0', border: '1px solid #E8C0C0', borderRadius: 12,
                padding: 20, marginBottom: 20, textAlign: 'center',
              }}>
                <p style={{ fontSize: 14, color: '#8B3A3A', margin: '0 0 12px' }}>{error}</p>
                <button onClick={handleGenerate} style={primaryBtnStyle}>Prøv igen</button>
              </div>
            )}

            {resultImage && !generating && (
              <div>
                {/* Side-by-side comparison */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20,
                }}>
                  <div>
                    <label style={labelStyle}>Original</label>
                    <img src={preview} alt="Original" style={{
                      width: '100%', borderRadius: 12,
                      border: '1px solid #D0C8BA',
                    }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ny farvekombination</label>
                    <img src={resultImage} alt="Visualisering" style={{
                      width: '100%', borderRadius: 12,
                      border: '1px solid #D0C8BA',
                    }} />
                  </div>
                </div>

                {/* Yarn info bar(s) */}
                <div style={{ marginBottom: 20 }}>
                  {!multiColor && selectedYarn && (
                    <YarnInfoBar yarn={selectedYarn} />
                  )}
                  {multiColor && filledSlots.map((slot, i) => (
                    <YarnInfoBar key={i} yarn={slot.yarn} label={slot.replaces} />
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleSave}
                    disabled={saving || saved}
                    style={{
                      ...primaryBtnStyle,
                      background: saved ? '#2C4A3E' : '#C16B47',
                      opacity: saving ? 0.6 : 1,
                      cursor: saving || saved ? 'default' : 'pointer',
                    }}
                  >
                    {saving ? 'Gemmer…' : saved ? 'Gemt!' : 'Gem billeder'}
                  </button>
                  <button onClick={tryAnotherColor} style={secondaryBtnStyle}>
                    Prøv andre farver
                  </button>
                  <button onClick={resetAll} style={secondaryBtnStyle}>
                    Start forfra
                  </button>
                  <button
                    onClick={() => downloadImage(resultImage)}
                    style={secondaryBtnStyle}
                  >
                    Download billede
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Personal inspiration gallery (logged-in, shown first) ─── */}
      {user && savedViz.length > 0 && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 48px' }}>
          <div style={{ borderTop: '1px solid #D0C8BA', paddingTop: 32, marginTop: 12 }}>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22, fontWeight: 600, color: '#2C4A3E',
              margin: '0 0 4px',
            }}>
              Mine inspirationer
            </h3>
            <p style={{ fontSize: 12, color: '#8B7D6B', margin: '0 0 20px' }}>
              Dine gemte visualiseringer — klik for at se detaljer
            </p>
            <VizGrid items={savedViz} onSelect={setDetailViz} />
          </div>
        </div>
      )}

      {/* ─── Example gallery (visible to everyone, below personal if any) ─── */}
      {exampleViz.length > 0 && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px 48px' }}>
          <div style={{ borderTop: '1px solid #D0C8BA', paddingTop: 32, marginTop: 12 }}>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22, fontWeight: 600, color: '#2C4A3E',
              margin: '0 0 4px',
            }}>
              Eksempler
            </h3>
            <p style={{ fontSize: 12, color: '#8B7D6B', margin: '0 0 20px' }}>
              Se hvad AI-visualiseringen kan — klik for detaljer
            </p>
            <VizGrid items={exampleViz} onSelect={setDetailViz} />
          </div>
        </div>
      )}

      {/* ─── Detail modal ─── */}
      {detailViz && (
        <div
          onClick={e => e.target === e.currentTarget && setDetailViz(null)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(44,32,24,.55)',
            zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div style={{
            background: '#FFFCF7', borderRadius: 16, maxWidth: 720,
            width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(44,32,24,.3)',
          }}>
            {/* Images */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <div>
                <img src={detailViz.original_url} alt="Original" style={{
                  width: '100%', borderRadius: '16px 0 0 0', display: 'block',
                }} />
                <div style={{ textAlign: 'center', padding: 6 }}>
                  <span style={labelStyle}>Original</span>
                </div>
              </div>
              <div>
                <img src={detailViz.result_url} alt="Ny farve" style={{
                  width: '100%', borderRadius: '0 16px 0 0', display: 'block',
                }} />
                <div style={{ textAlign: 'center', padding: 6 }}>
                  <span style={labelStyle}>Ny farvekombination</span>
                </div>
              </div>
            </div>

            {/* Yarn info */}
            <div style={{ padding: '16px 20px 20px' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {detailViz.yarn_info?.colors?.map((c, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: '#F4EFE6', borderRadius: 10, padding: '8px 14px',
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 6,
                      background: c.hex, border: '1px solid rgba(0,0,0,.1)', flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#2C2018' }}>
                        {c.colorNameDa || c.colorName}
                      </div>
                      <div style={{ fontSize: 11, color: '#8B7D6B' }}>
                        {c.brand} {c.series} · {c.hex}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: '#8B7D6B', marginBottom: 16 }}>
                Gemt {new Date(detailViz.created_at).toLocaleDateString('da-DK', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => downloadImage(detailViz.result_url)}
                  style={secondaryBtnStyle}
                >
                  Download resultat
                </button>
                <button
                  onClick={() => downloadImage(detailViz.original_url)}
                  style={secondaryBtnStyle}
                >
                  Download original
                </button>
                {user && detailViz.user_id === user.id && (
                  <button
                    onClick={() => { if (confirm('Slet denne inspiration?')) handleDeleteViz(detailViz.id) }}
                    style={{ ...secondaryBtnStyle, color: '#8B3A3A', borderColor: '#D4A0A0' }}
                  >
                    Slet
                  </button>
                )}
                <button
                  onClick={() => setDetailViz(null)}
                  style={{ ...linkBtnStyle, marginLeft: 'auto', alignSelf: 'center' }}
                >
                  Luk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Shared gallery grid ─────────────────────────────────────────────────────

function VizGrid({ items, onSelect }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 14,
    }}>
      {items.map(viz => (
        <div
          key={viz.id}
          onClick={() => onSelect(viz)}
          style={{
            background: '#FFFCF7', borderRadius: 14,
            border: '1px solid #E8E0D4', overflow: 'hidden',
            cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
            boxShadow: '0 1px 4px rgba(44,32,24,.08)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(44,32,24,.13)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(44,32,24,.08)' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <img src={viz.original_url} alt="Original" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
            <img src={viz.result_url} alt="Resultat" style={{ width: '100%', height: 140, objectFit: 'cover' }} />
          </div>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {viz.yarn_info?.colors?.map((c, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, background: '#F4EFE6', borderRadius: 20,
                  padding: '2px 10px 2px 4px',
                }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: 4,
                    background: c.hex, border: '1px solid rgba(0,0,0,.1)',
                    display: 'inline-block', flexShrink: 0,
                  }} />
                  {c.colorNameDa || c.colorName}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#8B7D6B' }}>
              {new Date(viz.created_at).toLocaleDateString('da-DK', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SwatchBlock({ yarn, label }) {
  return (
    <div style={{
      width: 100, height: 140, borderRadius: 14,
      background: yarn.hex,
      border: '1px solid rgba(0,0,0,.1)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      padding: 8, gap: 4,
    }}>
      {label && (
        <span style={{
          fontSize: 9, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.5)',
          textTransform: 'uppercase', letterSpacing: '.05em',
        }}>
          {label}
        </span>
      )}
      <span style={{
        fontSize: 10, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,.5)',
        fontWeight: 500,
      }}>
        {yarn.colorNameDa ?? yarn.colorName}
      </span>
    </div>
  )
}

function YarnDetailCard({ yarn, compact }) {
  return (
    <div style={{
      background: '#FFFCF7', borderRadius: 12, padding: compact ? 12 : 20,
      border: '1px solid #E8E0D4', marginBottom: compact ? 0 : 24,
    }}>
      <h3 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: compact ? 16 : 20, fontWeight: 600, color: '#2C4A3E',
        margin: `0 0 ${compact ? 8 : 12}px`,
      }}>
        {yarn.brand} {yarn.series} — {yarn.colorNameDa ?? yarn.colorName}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        <Detail label="Hex" value={yarn.hex} />
        <Detail label="Artikelnr." value={yarn.articleNumber} />
        <Detail label="Fiber" value={yarn.fiber} />
        <Detail label="Løbelængde" value={`${yarn.metrage}m`} />
        {!compact && <Detail label="Pindstr." value={yarn.pindstr} />}
        {!compact && <Detail label="Vægt" value={yarn.weight} />}
      </div>
    </div>
  )
}

function YarnInfoBar({ yarn, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#FFFCF7', borderRadius: 10, padding: '8px 14px',
      border: '1px solid #E8E0D4', marginBottom: 6,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6,
        background: yarn.hex, border: '1px solid rgba(0,0,0,.1)', flexShrink: 0,
      }} />
      <span style={{ fontSize: 12, color: '#2C2018', fontWeight: 500, flex: 1 }}>
        {yarn.brand} {yarn.series} · {yarn.colorNameDa ?? yarn.colorName} · {yarn.hex}
      </span>
      {label && (
        <span style={{ fontSize: 10, color: '#8B7D6B' }}>
          erstatter {label}
        </span>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Detail({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B' }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#2C2018', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

async function fileToBase64(file) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 1024
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        const ratio = Math.min(MAX / w, MAX / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      const dataUrl = canvas.toDataURL('image/png')
      resolve(dataUrl.split(',')[1])
    }
    img.src = URL.createObjectURL(file)
  })
}

function downloadImage(src) {
  const a = document.createElement('a')
  a.href = src
  a.download = 'garn-visualisering.png'
  a.click()
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '10px 14px', fontSize: 14,
  border: '1px solid #C0B8A8', borderRadius: 10,
  background: '#FFFCF7', color: '#2C2018',
  fontFamily: "'DM Sans', sans-serif",
  outline: 'none', boxSizing: 'border-box',
}

const dropdownStyle = {
  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
  background: '#FFFCF7', border: '1px solid #D0C8BA', borderRadius: 10,
  boxShadow: '0 8px 24px rgba(44,32,24,.15)', marginTop: 2,
  maxHeight: 280, overflowY: 'auto',
}

const dropdownItemStyle = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '10px 14px', cursor: 'pointer',
  borderBottom: '1px solid #F0EAE0',
}

const labelStyle = {
  display: 'block', fontSize: 10, textTransform: 'uppercase',
  letterSpacing: '.1em', color: '#8B7D6B', marginBottom: 6,
}

const primaryBtnStyle = {
  padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 500,
  background: '#C16B47', color: '#fff', border: 'none',
  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  transition: 'background .15s',
}

const secondaryBtnStyle = {
  padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 500,
  background: '#FFFCF7', color: '#5A4E42', border: '1px solid #C0B8A8',
  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  transition: 'background .15s',
}

const linkBtnStyle = {
  background: 'none', border: 'none', color: '#C16B47',
  fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline',
  fontFamily: "'DM Sans', sans-serif",
}

const spinnerStyle = {
  width: 40, height: 40, border: '3px solid #D0C8BA',
  borderTop: '3px solid #2C4A3E', borderRadius: '50%',
  margin: '0 auto',
  animation: 'spin 1s linear infinite',
}

if (typeof document !== 'undefined' && !document.getElementById('viz-spinner-style')) {
  const style = document.createElement('style')
  style.id = 'viz-spinner-style'
  style.textContent = '@keyframes spin { to { transform: rotate(360deg) } }'
  document.head.appendChild(style)
}
