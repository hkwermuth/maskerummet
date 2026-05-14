'use client'
import { useState, useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { lookupByBarcode } from '@/lib/data/perminCatalog'
import { lookupTiliaByBarcode } from '@/lib/data/filcolanaCatalog'
import { useSupabase } from '@/lib/supabase/client'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import { resolveBarcodeToCatalog, applyCatalogYarnColorToForm, displayYarnName } from '@/lib/catalog'
import BarcodeSuggestionForm from './BarcodeSuggestionForm'
import ColorNumberOcr from './ColorNumberOcr'

function lookupAllCatalogs(code) {
  return lookupByBarcode(code) || lookupTiliaByBarcode(code)
}

/**
 * Scanner-modal til at identificere garn ud fra banderole-stregkode.
 *
 * @param {object} props
 * @param {() => void} props.onClose - luk modal
 * @param {(payload: any) => void} [props.onAddToLager] - hvis givet, viser primær-knap "Tilføj til lager" og kalder med en form-payload (eksisterende garnlager-flow)
 * @param {(yarn: any, color: any) => void} [props.onSelectYarn] - alternativ — hvis givet, viser primær-knap "Åbn i katalog" og kalder med (yarn, color) uden at gå via lager
 */
export default function BarcodeScanner({ onClose, onAddToLager, onSelectYarn }) {
  const supabase = useSupabase()
  useEscapeKey(true, onClose)
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const lastCodeRef = useRef(null)
  const [result, setResult] = useState(null)
  const [scanning, setScanning] = useState(true)
  const [resolving, setResolving] = useState(false)
  const [scanHint, setScanHint] = useState('')
  const [error, setError] = useState(null)
  const [manualCode, setManualCode] = useState('')
  const [fallback, setFallback] = useState(null) // 'ocr' | 'suggest' | null
  const [submittedSuggestion, setSubmittedSuggestion] = useState(false)

  async function resolveCode(code) {
    const trimmed = (code || '').trim()
    if (!trimmed) return
    setResolving(true)
    setResult(null)
    try {
      const cat = await resolveBarcodeToCatalog(supabase, trimmed)
      if (cat) {
        setResult({
          source: 'catalog',
          yarn: cat.yarn,
          color: cat.color,
          scannedCode: trimmed,
        })
        setResolving(false)
        return
      }
      const local = lookupAllCatalogs(trimmed)
      if (local) {
        setResult({ source: 'local', local, scannedCode: trimmed })
      } else {
        setResult({ notFound: true, scannedCode: trimmed })
      }
    } catch (e) {
      console.error(e)
      setResult({ notFound: true, scannedCode: trimmed })
    }
    setResolving(false)
  }

  function startReader() {
    const reader = new BrowserMultiFormatReader()
    readerRef.current = reader
    lastCodeRef.current = null

    reader.decodeFromConstraints(
      { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
      videoRef.current,
      (res) => {
        if (!res) return
        const code = res.getText()

        if (lastCodeRef.current !== code) {
          lastCodeRef.current = code
          setScanHint('Holder stabil...')
          return
        }

        reader.reset()
        setScanHint('')
        setScanning(false)
        resolveCode(code)
      }
    ).catch(e => {
      setError(
        e.name === 'NotAllowedError'
          ? 'Kameraet er ikke tilladt. Tillad kameraadgang i din browser og prøv igen.'
          : e.name === 'NotFoundError'
          ? 'Ingen kamera fundet på denne enhed.'
          : 'Kamera kunne ikke startes: ' + e.message
      )
      setScanning(false)
    })
  }

  useEffect(() => {
    startReader()
    return () => { try { readerRef.current?.reset() } catch {} }
  }, [])

  function handleManualLookup() {
    setScanning(false)
    resolveCode(manualCode.trim())
  }

  function handlePrimary() {
    if (!result || result.notFound || resolving) return
    if (result.source === 'catalog') {
      // Indgang fra garn-katalog: returnér garn+farve direkte uden lager-flow.
      if (onSelectYarn) {
        onSelectYarn(result.yarn, result.color)
        onClose()
        return
      }
      const payload = applyCatalogYarnColorToForm(result.yarn, result.color, {
        antal: 1,
        status: 'På lager',
        noter: '',
        barcode: result.scannedCode,
        imageUrl: null,
      })
      onAddToLager?.(payload)
      onClose()
      return
    }
    if (result.source === 'local' && onAddToLager) {
      const r = result.local
      onAddToLager({
        name:      r.series,
        brand:     r.brand,
        colorName: r.colorName ?? r.colorNameDa,
        colorCode: r.articleNumber,
        weight:    r.weight,
        fiber:     r.fiber,
        metrage:   r.metrage,
        pindstr:   r.pindstr,
        antal:     1,
        status:    'På lager',
        hex:       r.hex,
        noter:     '',
        barcode:   result.scannedCode,
        catalogYarnId: null,
        catalogColorId: null,
        catalogImageUrl: null,
      })
      onClose()
    }
  }

  function handleOcrMatched(yarn, color) {
    // Bruger valgte den rigtige farve fra OCR-kandidatlisten — behandl
    // som et katalog-match (samme flow som EAN-match).
    setFallback(null)
    setResult({
      source: 'catalog',
      yarn,
      color,
      scannedCode: manualCode || result?.scannedCode || '',
    })
  }

  function rescan() {
    try { readerRef.current?.reset() } catch {}
    setResult(null)
    setScanning(true)
    setResolving(false)
    setScanHint('')
    setManualCode('')
    setTimeout(() => startReader(), 200)
  }

  const textContrast = hex => {
    const h = hex || '#A8C4C4'
    const r = parseInt(h.slice(1, 3), 16)
    const g = parseInt(h.slice(3, 5), 16)
    const b = parseInt(h.slice(5, 7), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#2C2018' : '#FFFFFF'
  }

  const catalogHex = result?.source === 'catalog' && result.color?.hex_code
    ? (String(result.color.hex_code).startsWith('#') ? result.color.hex_code : `#${result.color.hex_code}`)
    : '#A8C4C4'

  const isDiscontinued = result?.source === 'catalog' && result.color?.status === 'udgaaet'

  const primaryLabel = onSelectYarn ? 'Åbn i katalog' : 'Tilføj til lager'

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(44,32,24,.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1200, padding: '16px',
      }}
    >
      <div style={{
        background: '#FFFCF7', borderRadius: '14px',
        width: '400px', maxWidth: '100%',
        boxShadow: '0 24px 60px rgba(44,32,24,.3)',
        overflow: 'hidden',
      }}>

        <div style={{
          background: '#2C4A3E', padding: '16px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '20px', fontWeight: 600, color: '#EDF5F0',
            }}>
              Skann garn
            </div>
            <div style={{ fontSize: '11px', color: '#7ABDA0', marginTop: '2px' }}>
              Ret kameraet mod banderolen
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Luk barcode-scanner"
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,.6)',
              fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {scanning && !error && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '12px',
            }}>
              <div style={{
                border: `2px solid ${scanHint ? '#F0C040' : '#C16B47'}`,
                borderRadius: '8px',
                width: '70%', height: '30%',
                boxShadow: '0 0 0 2000px rgba(0,0,0,.4)',
                transition: 'border-color .2s',
              }} />
              <div style={{
                background: 'rgba(0,0,0,.6)', borderRadius: '20px',
                padding: '6px 14px', fontSize: '12px', color: '#EDF5F0',
              }}>
                {scanHint || 'Ret mod stregkoden...'}
              </div>
            </div>
          )}
          {error && (
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,.8)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '24px', textAlign: 'center',
            }}>
              <div style={{ color: '#F5D0C8', fontSize: '13px', lineHeight: '1.5' }}>
                {error}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '20px' }}>

          {resolving && (
            <div style={{ textAlign: 'center', padding: '12px', fontSize: '13px', color: '#6B5D4F' }}>
              Slår op i garn-katalog…
            </div>
          )}

          {result && result.notFound && !resolving && !submittedSuggestion && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                background: '#FFF3E0', borderRadius: '10px',
                padding: '16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔍</div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#7A4A10' }}>
                  Garn ikke fundet i kataloget
                </div>
                <div style={{ fontSize: '11px', color: '#9A6A30', marginTop: '4px' }}>
                  Skannet kode: <code style={{ background: '#FFE0B0', borderRadius: '3px', padding: '1px 5px' }}>{result.scannedCode}</code>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <button
                  onClick={() => setFallback('ocr')}
                  style={{
                    padding: '10px 14px', background: '#C16B47', color: '#fff',
                    border: 'none', borderRadius: '6px', fontSize: '13px',
                    fontWeight: 500, cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Find via farvenummer i stedet
                </button>
                <button
                  onClick={() => setFallback('suggest')}
                  style={{
                    padding: '10px 14px', background: 'transparent', color: '#2C4A3E',
                    border: '1px solid #2C4A3E', borderRadius: '6px', fontSize: '13px',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Hjælp os: registrér denne stregkode
                </button>
                <p style={{ fontSize: '11px', color: '#8B7D6B', margin: '4px 0 0', textAlign: 'center' }}>
                  Tag et foto af banderolen — vi læser farvenummeret automatisk
                </p>
              </div>
            </div>
          )}

          {submittedSuggestion && (
            <div style={{
              background: '#D0E8D4', borderRadius: '10px',
              padding: '16px', marginBottom: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>✓</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#2C4A3E' }}>
                Tak — vi tjekker det og tilføjer det til kataloget
              </div>
              <div style={{ fontSize: '11px', color: '#5A6E5C', marginTop: '4px' }}>
                Du kan stadig tilføje garnet til dit lager nu.
              </div>
            </div>
          )}

          {result && result.source === 'catalog' && !resolving && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                borderRadius: '10px', overflow: 'hidden',
                border: '1px solid #D0C8BA',
              }}>
                <div style={{
                  height: '80px', background: catalogHex,
                  display: 'flex', alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  position: 'relative',
                }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: textContrast(catalogHex),
                    background: 'rgba(0,0,0,.15)', borderRadius: '4px',
                    padding: '2px 7px',
                  }}>
                    {result.color?.color_number}
                  </span>
                  {isDiscontinued && (
                    <span
                      role="status"
                      aria-label="Denne farve er udgået"
                      style={{
                        fontSize: '9px', fontWeight: 700, letterSpacing: '.1em',
                        textTransform: 'uppercase',
                        color: '#FFE0B0',
                        background: '#7A4A10', borderRadius: '4px',
                        padding: '2px 7px',
                      }}
                    >
                      Udgået
                    </span>
                  )}
                </div>
                <div style={{ padding: '14px', background: '#FFFCF7' }}>
                  <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    Garn-katalog
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B5D4F', marginTop: '4px' }}>
                    {result.yarn?.producer}
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '20px', fontWeight: 600, color: '#2C2018', margin: '3px 0',
                  }}>
                    {displayYarnName(result.yarn)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#2C2018' }}>
                    {result.color?.color_name || '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {result && result.source === 'local' && !resolving && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                borderRadius: '10px', overflow: 'hidden',
                border: '1px solid #D0C8BA',
              }}>
                <div style={{
                  height: '80px', background: result.local.hex,
                  display: 'flex', alignItems: 'flex-end',
                  padding: '10px 14px',
                }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: textContrast(result.local.hex),
                    background: 'rgba(0,0,0,.15)', borderRadius: '4px',
                    padding: '2px 7px',
                  }}>
                    {result.local.articleNumber}
                  </span>
                </div>
                <div style={{ padding: '14px', background: '#FFFCF7' }}>
                  <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    Lokalt katalog
                  </div>
                  <div style={{ fontSize: '11px', color: '#8B7D6B' }}>
                    {result.local.brand} · {result.local.series}
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '20px', fontWeight: 600, color: '#2C2018', margin: '3px 0',
                  }}>
                    {result.local.colorName ?? result.local.colorNameDa}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8B7D6B', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>{result.local.fiber}</span>
                    <span>Løbelængde: {result.local.metrage} m/50g</span>
                    <span>Pind {result.local.pindstr}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '6px' }}>
              Eller indtast produktnummer manuelt
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && manualCode && handleManualLookup()}
                placeholder="f.eks. 883150"
                style={{
                  flex: 1, padding: '8px 10px', border: '1px solid #D0C8BA',
                  borderRadius: '6px', fontSize: '13px',
                  background: '#F9F6F0', fontFamily: "'DM Sans', sans-serif",
                }}
              />
              <button
                onClick={handleManualLookup}
                disabled={!manualCode || resolving}
                style={{
                  padding: '8px 14px', background: '#2C4A3E', color: '#fff',
                  border: 'none', borderRadius: '6px', fontSize: '13px',
                  cursor: manualCode && !resolving ? 'pointer' : 'default',
                  opacity: manualCode && !resolving ? 1 : 0.5,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Søg
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {result && (
              <button
                onClick={rescan}
                disabled={resolving}
                style={{
                  padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: '6px',
                  background: 'transparent', fontSize: '13px', cursor: resolving ? 'default' : 'pointer',
                  color: '#6B5D4F', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Skann igen
              </button>
            )}
            {result && !result.notFound && !resolving && (
              <button
                onClick={handlePrimary}
                style={{
                  padding: '8px 18px', background: '#C16B47', color: '#fff',
                  border: 'none', borderRadius: '6px', fontSize: '13px',
                  fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {primaryLabel}
              </button>
            )}
          </div>
        </div>
      </div>

      {fallback === 'ocr' && (
        <ColorNumberOcr
          onMatched={handleOcrMatched}
          onCancel={() => setFallback(null)}
        />
      )}
      {fallback === 'suggest' && (
        <BarcodeSuggestionForm
          scannedCode={result?.scannedCode || manualCode}
          onSubmitted={() => { setFallback(null); setSubmittedSuggestion(true) }}
          onCancel={() => setFallback(null)}
        />
      )}
    </div>
  )
}
