'use client'

import { useEffect, useRef, useState } from 'react'
import { useSupabase } from '@/lib/supabase/client'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import { searchYarnsFull, displayYarnName } from '@/lib/catalog'
import { uploadFile } from '@/lib/supabase/storage'
import { createBarcodeSuggestion } from '@/lib/data/barcodeSuggestions'

type YarnRow = {
  id: string
  producer: string
  name: string
  series: string | null
  full_name?: string
}

type Props = {
  scannedCode: string
  onSubmitted: () => void
  onCancel: () => void
}

/**
 * Modal-form til at registrere en ukendt EAN-kobling.
 *
 * Brugeren udfylder producent + (valgfrit) garn + farveinfo + valgfrit foto.
 * Forslag gemmes i `barcode_suggestions` med status='new' indtil en editor
 * godkender koblingen.
 */
export default function BarcodeSuggestionForm({ scannedCode, onSubmitted, onCancel }: Props) {
  const supabase = useSupabase()
  useEscapeKey(true, onCancel)

  const [producer, setProducer] = useState('')
  const [yarnQuery, setYarnQuery] = useState('')
  const [yarnResults, setYarnResults] = useState<YarnRow[]>([])
  const [selectedYarn, setSelectedYarn] = useState<YarnRow | null>(null)
  const [colorName, setColorName] = useState('')
  const [colorNumber, setColorNumber] = useState('')
  const [comment, setComment] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (yarnQuery.trim().length < 2 || selectedYarn) {
      setYarnResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = (await searchYarnsFull(supabase, yarnQuery)) as YarnRow[]
        const filtered = producer
          ? results.filter((r) => (r.producer || '').toLowerCase().includes(producer.toLowerCase()))
          : results
        setYarnResults(filtered.slice(0, 8))
      } catch (e) {
        console.error('searchYarnsFull:', e)
      }
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [yarnQuery, producer, selectedYarn, supabase])

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function handlePickYarn(y: YarnRow) {
    setSelectedYarn(y)
    setYarnQuery(displayYarnName(y))
    setYarnResults([])
    if (y.producer) setProducer(y.producer)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!producer.trim() && !selectedYarn) {
      setError('Angiv mindst producent eller vælg garn fra listen')
      return
    }
    setSubmitting(true)
    try {
      let imageUrl: string | null = null
      if (photoFile) {
        const { data: userData } = await supabase.auth.getUser()
        const uid = userData.user?.id
        if (!uid) throw new Error('Du skal være logget ind for at uploade foto')
        const ext = (photoFile.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        imageUrl = await uploadFile(supabase, 'banderole-suggestions', path, photoFile)
      }
      await createBarcodeSuggestion(supabase, {
        barcode: scannedCode,
        suggested_yarn_id: selectedYarn?.id ?? null,
        suggested_producer: producer.trim() || null,
        suggested_yarn_name: selectedYarn ? null : yarnQuery.trim() || null,
        suggested_color_name: colorName.trim() || null,
        suggested_color_number: colorNumber.trim() || null,
        banderole_image_url: imageUrl,
        comment: comment.trim() || null,
      })
      onSubmitted()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Kunne ikke sende forslag. Prøv igen.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      className="fixed inset-0 bg-black/60 z-[1300] flex items-center justify-center p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-cream rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto"
      >
        <header className="bg-striq-sage text-cream px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-serif text-xl">Registrér stregkode</h2>
            <p className="text-xs opacity-80 mt-0.5">Hjælp os med at fylde kataloget</p>
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
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-striq-muted font-medium">
              Stregkode
            </span>
            <div className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 bg-striq-input border border-striq-border rounded-md">
              <code className="text-sm">{scannedCode}</code>
            </div>
          </div>

          <div>
            <label htmlFor="bsf-producer" className="block text-[10px] uppercase tracking-wider text-striq-muted font-medium mb-1">
              Producent <span aria-hidden className="text-striq-link">*</span>
            </label>
            <input
              id="bsf-producer"
              type="text"
              value={producer}
              onChange={(e) => setProducer(e.target.value)}
              required
              aria-required="true"
              placeholder="f.eks. Filcolana"
              className="w-full px-3 py-2 border border-striq-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
            />
          </div>

          <div className="relative">
            <label htmlFor="bsf-yarn" className="block text-[10px] uppercase tracking-wider text-striq-muted font-medium mb-1">
              Garn
            </label>
            <input
              id="bsf-yarn"
              type="text"
              value={yarnQuery}
              onChange={(e) => { setYarnQuery(e.target.value); setSelectedYarn(null) }}
              placeholder="Søg garn-navn — vælg fra listen hvis det findes"
              className="w-full px-3 py-2 border border-striq-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
            />
            {yarnResults.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-striq-border rounded-md shadow-lg max-h-48 overflow-y-auto">
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="bsf-color-number" className="block text-[10px] uppercase tracking-wider text-striq-muted font-medium mb-1">
                Farvekode
              </label>
              <input
                id="bsf-color-number"
                type="text"
                value={colorNumber}
                onChange={(e) => setColorNumber(e.target.value)}
                placeholder="f.eks. 286"
                className="w-full px-3 py-2 border border-striq-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
              />
            </div>
            <div>
              <label htmlFor="bsf-color-name" className="block text-[10px] uppercase tracking-wider text-striq-muted font-medium mb-1">
                Farvenavn
              </label>
              <input
                id="bsf-color-name"
                type="text"
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="f.eks. Sand"
                className="w-full px-3 py-2 border border-striq-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
              />
            </div>
          </div>

          <div>
            <span className="block text-[10px] uppercase tracking-wider text-striq-muted font-medium mb-1">
              Foto af banderolen <span className="text-striq-muted normal-case tracking-normal">(valgfrit)</span>
            </span>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center px-3 py-2 bg-striq-input border border-striq-border rounded-md text-sm cursor-pointer hover:bg-moss/40 min-h-[44px]">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoChange}
                  className="sr-only"
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                />
                <span>Vælg foto</span>
              </label>
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Forhåndsvisning af banderole"
                  className="w-12 h-12 rounded-md object-cover border border-striq-border"
                />
              )}
            </div>
            <p className="text-[11px] text-striq-muted mt-1">
              Bruges kun til at verificere koblingen. Tag kun foto af banderolen — undgå navne og adresser.
            </p>
          </div>

          <div>
            <label htmlFor="bsf-comment" className="block text-[10px] uppercase tracking-wider text-striq-muted font-medium mb-1">
              Kommentar <span className="text-striq-muted normal-case tracking-normal">(valgfrit)</span>
            </label>
            <textarea
              id="bsf-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={2000}
              className="w-full px-3 py-2 border border-striq-border rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
            />
          </div>

          {error && (
            <div role="alert" className="text-sm text-striq-link bg-striq-link/10 border border-striq-link/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <footer className="px-5 py-4 border-t border-striq-border flex justify-end gap-2 bg-striq-input/40 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm border border-striq-border rounded-md text-striq-muted hover:bg-striq-border/30 disabled:opacity-50"
          >
            Tilbage
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm text-cream rounded-md hover:opacity-95 disabled:opacity-50"
            style={{ background: '#C16B47' }}
          >
            {submitting ? 'Sender…' : 'Send forslag'}
          </button>
        </footer>
      </form>
    </div>
  )
}
