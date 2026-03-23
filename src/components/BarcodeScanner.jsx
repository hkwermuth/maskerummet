import { useState, useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/library'
import { lookupByBarcode } from '../data/perminCatalog'
import { lookupTiliaByBarcode } from '../data/filcolanaCatalog'

function lookupAllCatalogs(code) {
  return lookupByBarcode(code) || lookupTiliaByBarcode(code)
}

export default function BarcodeScanner({ onClose, onAddToLager }) {
  const videoRef = useRef(null)
  const readerRef = useRef(null)
  const lastCodeRef = useRef(null)   // debounce: last seen code
  const [result, setResult] = useState(null)
  const [scanning, setScanning] = useState(true)
  const [scanHint, setScanHint] = useState('')  // "Holder stabil..."
  const [error, setError] = useState(null)
  const [manualCode, setManualCode] = useState('')

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

        // Require same code twice in a row to confirm (reduces false reads)
        if (lastCodeRef.current !== code) {
          lastCodeRef.current = code
          setScanHint('Holder stabil...')
          return
        }

        // Confirmed — same code read twice
        reader.reset()
        setScanHint('')
        setScanning(false)
        const found = lookupAllCatalogs(code)
        setResult(found ? { ...found, scannedCode: code } : { notFound: true, scannedCode: code })
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
    const found = lookupAllCatalogs(manualCode.trim())
    setScanning(false)
    if (found) {
      setResult({ ...found, scannedCode: manualCode.trim() })
    } else {
      setResult({ notFound: true, scannedCode: manualCode.trim() })
    }
  }

  function handleAddToLager() {
    if (!result || result.notFound) return
    onAddToLager({
      name:      result.series,
      brand:     result.brand,
      colorName: result.colorName ?? result.colorNameDa,
      colorCode: result.articleNumber,
      weight:    result.weight,
      fiber:     result.fiber,
      metrage:   result.metrage,
      pindstr:   result.pindstr,
      antal:     1,
      status:    'På lager',
      hex:       result.hex,
      noter:     '',
      barcode:   result.scannedCode,
    })
    onClose()
  }

  function rescan() {
    try { readerRef.current?.reset() } catch {}
    setResult(null)
    setScanning(true)
    setScanHint('')
    setManualCode('')
    setTimeout(() => startReader(), 200)
  }

  const textContrast = hex => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) > 160 ? '#2C2018' : '#FFFFFF'
  }

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

        {/* Header */}
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
            style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,.6)',
              fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Camera view */}
        <div style={{ position: 'relative', background: '#000', aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          {/* Scanning overlay */}
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

        {/* Result or manual input */}
        <div style={{ padding: '20px' }}>

          {/* Not found or success */}
          {result && result.notFound && (
            <div style={{
              background: '#FFF3E0', borderRadius: '10px',
              padding: '16px', marginBottom: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '20px', marginBottom: '6px' }}>🔍</div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#7A4A10' }}>
                Garn ikke fundet i kataloget
              </div>
              <div style={{ fontSize: '11px', color: '#9A6A30', marginTop: '4px' }}>
                Skannet kode: <code style={{ background: '#FFE0B0', borderRadius: '3px', padding: '1px 5px' }}>{result.scannedCode}</code>
              </div>
            </div>
          )}

          {result && !result.notFound && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                borderRadius: '10px', overflow: 'hidden',
                border: '1px solid #D0C8BA',
              }}>
                <div style={{
                  height: '80px', background: result.hex,
                  display: 'flex', alignItems: 'flex-end',
                  padding: '10px 14px',
                }}>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    color: textContrast(result.hex),
                    background: 'rgba(0,0,0,.15)', borderRadius: '4px',
                    padding: '2px 7px',
                  }}>
                    {result.articleNumber}
                  </span>
                </div>
                <div style={{ padding: '14px', background: '#FFFCF7' }}>
                  <div style={{ fontSize: '10px', color: '#8B7D6B', textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    {result.brand} · {result.series}
                  </div>
                  <div style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: '20px', fontWeight: 600, color: '#2C2018', margin: '3px 0',
                  }}>
                    {result.colorName ?? result.colorNameDa}
                  </div>
                  {result.colorNameDa && result.colorName !== result.colorNameDa && (
                    <div style={{ fontSize: '12px', color: '#6B5D4F', marginBottom: '6px' }}>
                      {result.colorNameDa}
                    </div>
                  )}
                  <div style={{ fontSize: '11px', color: '#8B7D6B', display: 'flex', gap: '12px' }}>
                    <span>{result.fiber}</span>
                    <span>Løbelængde: {result.metrage} m/50g</span>
                    <span>Pind {result.pindstr}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manual input */}
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
                disabled={!manualCode}
                style={{
                  padding: '8px 14px', background: '#2C4A3E', color: '#fff',
                  border: 'none', borderRadius: '6px', fontSize: '13px',
                  cursor: manualCode ? 'pointer' : 'default',
                  opacity: manualCode ? 1 : 0.5,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Søg
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            {result && (
              <button
                onClick={rescan}
                style={{
                  padding: '8px 14px', border: '1px solid #D0C8BA', borderRadius: '6px',
                  background: 'transparent', fontSize: '13px', cursor: 'pointer',
                  color: '#6B5D4F', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Skann igen
              </button>
            )}
            {result && !result.notFound && (
              <button
                onClick={handleAddToLager}
                style={{
                  padding: '8px 18px', background: '#C16B47', color: '#fff',
                  border: 'none', borderRadius: '6px', fontSize: '13px',
                  fontWeight: 500, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Tilføj til lager
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
