'use client'

import { useEffect, useRef, useState } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import {
  searchYarnsFull,
  fetchColorsForYarn,
  fetchYarnFullById,
  displayYarnName,
} from '@/lib/catalog'
import { extractColorNumberCandidates, matchCandidatesToColors } from '@/lib/ocr'

type YarnRow = {
  id: string
  producer: string
  name: string
  series: string | null
  full_name?: string
}

type ColorRow = {
  id: string
  yarn_id: string
  color_number: string | null
  color_name: string | null
  hex_code: string | null
  status: string | null
  barcode: string | null
}

type Props = {
  initialYarn?: YarnRow | null
  onMatched: (yarn: YarnRow, color: ColorRow) => void
  onCancel: () => void
}

type Step = 1 | 2 | 3 | 4

/**
 * 4-trins fallback-flow når stregkoden ikke kan dekodes/findes:
 * 1. Vælg producent
 * 2. Vælg garn fra producentens katalog
 * 3. Tag foto af banderolen
 * 4. Vælg det rigtige farvenummer fra kandidat-listen OCR fandt
 */
export default function ColorNumberOcr({ initialYarn, onMatched, onCancel }: Props) {
  const supabase = useSupabase()
  useEscapeKey(true, onCancel)

  const [step, setStep] = useState<Step>(initialYarn ? 3 : 1)
  const [pickedYarn, setPickedYarn] = useState<YarnRow | null>(initialYarn ?? null)
  const [yarnQuery, setYarnQuery] = useState(initialYarn ? displayYarnName(initialYarn) : '')
  const [yarnResults, setYarnResults] = useState<YarnRow[]>([])
  const [colors, setColors] = useState<ColorRow[]>([])
  const [, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [ocrProgress, setOcrProgress] = useState<number | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<ColorRow[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fase 1: producent-søg debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (yarnQuery.trim().length < 2 || pickedYarn) return
    debounceRef.current = setTimeout(async () => {
      try {
        const results = (await searchYarnsFull(supabase, yarnQuery)) as YarnRow[]
        setYarnResults(results.slice(0, 8))
      } catch (e) {
        console.error(e)
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [yarnQuery, pickedYarn, supabase])

  // Fase 2 → 3: hent farver for valgte garn (inkluder udgåede så lager-farver kan matches)
  useEffect(() => {
    if (!pickedYarn) return
    fetchColorsForYarn(supabase, pickedYarn.id, { includeDiscontinued: true }).then(
      (rows) => setColors(rows as ColorRow[])
    )
  }, [pickedYarn, supabase])

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function handlePickYarn(y: YarnRow) {
    setPickedYarn(y)
    setYarnQuery(displayYarnName(y))
    setYarnResults([])
    setStep(3)
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pickedYarn) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setOcrError(null)
    setOcrProgress(0)
    try {
      const found = await extractColorNumberCandidates(file, {
        onProgress: (p) => setOcrProgress(p),
      })
      const matched = matchCandidatesToColors(found, colors)
      setCandidates(matched)
      setOcrProgress(null)
      setStep(4)
    } catch (err) {
      setOcrProgress(null)
      const msg = err instanceof Error ? err.message : 'Vi kunne ikke læse banderolen.'
      setOcrError(msg + ' Prøv et nyt foto med bedre lys.')
    }
  }

  async function handlePickColor(c: ColorRow) {
    // Sikrer at parent får et fuldt yarn-objekt (full_name etc) — vi fetcher altid frisk.
    const yarnFull = (await fetchYarnFullById(supabase, c.yarn_id)) as YarnRow | null
    if (yarnFull) onMatched(yarnFull, c)
    else if (pickedYarn) onMatched(pickedYarn, c)
  }

  function resetPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoFile(null)
    setPhotoPreview(null)
    setCandidates([])
    setStep(3)
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="fixed inset-0 bg-black/60 z-[1300] flex items-center justify-center p-4"
    >
      <div className="bg-cream rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <header className="bg-striq-sage text-cream px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-serif text-xl">Find via farvenummer</h2>
            <p className="text-xs opacity-80 mt-0.5">Trin {step} af 4</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Luk"
            className="text-cream/70 hover:text-cream text-xl leading-none"
          >
            ✕
          </button>
        </header>

        <div className="px-5 py-4 space-y-4">
          {(step === 1 || step === 2) && (
            <div className="relative">
              <label htmlFor="ocr-yarn" className="block text-[10px] uppercase tracking-wider text-striq-muted font-medium mb-1">
                Vælg garn
              </label>
              <input
                id="ocr-yarn"
                type="text"
                value={yarnQuery}
                onChange={(e) => { setYarnQuery(e.target.value); setPickedYarn(null) }}
                placeholder="Skriv producent eller garnnavn"
                className="w-full px-3 py-2 border border-striq-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
                autoFocus
              />
              {yarnQuery.trim().length < 2 && (
                <p className="text-xs text-striq-muted mt-1">Skriv mindst 2 bogstaver</p>
              )}
              {yarnResults.length > 0 && (
                <ul className="mt-2 bg-white border border-striq-border rounded-md shadow-sm max-h-72 overflow-y-auto">
                  {yarnResults.map((y) => (
                    <li key={y.id}>
                      <button
                        type="button"
                        onClick={() => handlePickYarn(y)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-moss/40 min-h-[44px]"
                      >
                        <div className="text-xs text-striq-muted">{y.producer}</div>
                        <div className="text-striq-sage">{displayYarnName(y)}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {yarnQuery.trim().length >= 2 && yarnResults.length === 0 && (
                <p className="text-xs text-striq-muted mt-2">
                  Vi fandt ikke noget. Prøv at stave anderledes, eller registrér garnet manuelt via &ldquo;Hjælp os&rdquo;-knappen.
                </p>
              )}
            </div>
          )}

          {step === 3 && pickedYarn && (
            <div className="space-y-3">
              <div className="bg-striq-input/40 border border-striq-border rounded-md px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-striq-muted">Valgt garn</div>
                <div className="text-sm text-striq-sage font-medium">{displayYarnName(pickedYarn)}</div>
                <button
                  type="button"
                  onClick={() => { setPickedYarn(null); setStep(1); setColors([]) }}
                  className="text-xs text-striq-link underline mt-1"
                >
                  Vælg et andet garn
                </button>
              </div>

              <label className="block">
                <span className="block text-[10px] uppercase tracking-wider text-striq-muted font-medium mb-1">
                  Tag foto af banderolen
                </span>
                <span className="block text-xs text-striq-muted mb-2">
                  Hold kameraet stille og sørg for at farvenummeret er læseligt.
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="sr-only"
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                  aria-describedby="ocr-photo-help"
                />
                <span className="block w-full text-center px-4 py-3 text-cream rounded-md cursor-pointer hover:opacity-95 min-h-[56px] flex items-center justify-center" style={{ background: '#C16B47' }}>
                  📷 Tag foto
                </span>
              </label>

              {ocrProgress !== null && (
                <div className="space-y-1">
                  <p className="text-xs text-striq-muted">Læser farvenummer…</p>
                  <div className="h-2 bg-striq-input rounded-full overflow-hidden">
                    <div
                      className="h-full bg-striq-sage transition-[width] duration-200"
                      style={{ width: `${Math.round(ocrProgress * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {ocrError && (
                <div role="alert" className="text-sm text-striq-link bg-striq-link/10 border border-striq-link/30 rounded-md px-3 py-2">
                  {ocrError}
                </div>
              )}
            </div>
          )}

          {step === 4 && pickedYarn && (
            <div className="space-y-3">
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Banderole-foto"
                  className="w-full max-h-48 object-cover rounded-md border border-striq-border"
                />
              )}
              <div>
                <h3 className="text-sm font-medium text-striq-sage">Vælg det rigtige farvenummer</h3>
                <p className="text-xs text-striq-muted mt-1">
                  {candidates.length > 0
                    ? 'Vi fandt disse tal på banderolen — vælg det der matcher farvekoden.'
                    : 'Vi fandt ingen matchende farvenumre på dette garn.'}
                </p>
              </div>

              {candidates.length > 0 && (
                <ul className="space-y-2">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => handlePickColor(c)}
                        className="w-full flex items-center gap-3 px-3 py-3 border border-striq-border rounded-md bg-white hover:bg-moss/30 min-h-[56px] text-left"
                      >
                        <span
                          className="w-10 h-10 rounded shrink-0 border border-striq-border"
                          style={{ background: c.hex_code ?? '#A8C4C4' }}
                          aria-hidden
                        />
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-striq-sage">
                            {c.color_number ?? '?'}
                            {c.status === 'udgaaet' && (
                              <span className="ml-2 text-[10px] uppercase tracking-wider bg-striq-link/20 text-striq-link px-1.5 py-0.5 rounded">
                                Udgået
                              </span>
                            )}
                          </span>
                          <span className="block text-xs text-striq-muted">{c.color_name ?? ''}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-striq-border">
                <button
                  type="button"
                  onClick={resetPhoto}
                  className="px-4 py-2 text-sm border border-striq-border rounded-md text-striq-muted hover:bg-striq-border/30"
                >
                  Prøv et nyt foto
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="px-5 py-4 border-t border-striq-border flex justify-end gap-2 bg-striq-input/40 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-striq-border rounded-md text-striq-muted hover:bg-striq-border/30"
          >
            Tilbage til scanner
          </button>
        </footer>
      </div>
    </div>
  )
}
