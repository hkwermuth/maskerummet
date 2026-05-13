import { useState, useCallback } from 'react'
import { validateUploadFile } from '@/lib/supabase/storage'
import { renderPdfFirstPage } from '@/lib/pdf-thumbnail'
import type { ValidateUploadOptions } from './useProjectImages'

// PDF + pattern-mode-state delt mellem DetailModal (edit) og NytProjektModal
// (create) i Arkiv.jsx. Hooken ejer alt PDF-state internt og eksponerer
// høj-niveau handlers (handlePdfPick/clearPdf/switchPatternMode).

export type PatternMode = 'pdf' | 'images'

export interface UsePdfPatternOptions {
  initialMode: PatternMode
  /**
   * Existing PDF-URL fra DB (kun DetailModal-edit-mode).
   * Bruges af `switchPatternMode` til at vide om mode-skift skal trigge
   * "slet eksisterende?"-confirm.
   */
  existingPdfUrl?: string | null
  /**
   * Eksisterende thumbnail-URL fra DB (kun DetailModal-edit-mode).
   * Initialiserer preview så vi ikke flickerer ved load.
   */
  existingThumbnailUrl?: string | null
  /**
   * `true` = DetailModal-mode: sætter `removePdf=true` ved clearPdf,
   * så save-flow ved at slette eksisterende PDF fra Storage.
   * `false` = NytProjektModal-mode: ingen "remove pdf"-tracking nødvendig.
   */
  trackRemove?: boolean
  /** Antal pattern-billeder. Bruges til switchPatternMode's "har content?"-check. */
  patternImagesCount: number
  /** Kaldes når brugeren bekræfter mode-switch fra `images` → `pdf` så pattern-images kan nulstilles. */
  clearPatternImages: () => void
  /** Validation-options til PDF-pick. */
  validate: ValidateUploadOptions
  /** Fejl-håndterer (setSaveError/setError fra parent). */
  onError: (msg: string) => void
}

export interface UsePdfPatternResult {
  patternMode: PatternMode
  setPatternMode: (m: PatternMode) => void
  pdfFile: File | null
  pdfFileName: string | null
  pdfThumbnailBlob: Blob | null
  pdfThumbnailPreview: string | null
  removePdf: boolean
  renderingThumb: boolean
  handlePdfPick: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>
  clearPdf: () => void
  switchPatternMode: (next: PatternMode) => void
  /** Nulstil PDF-state efter handleSave eller ved edit-cancel. */
  resetPdfState: () => void
}

export function usePdfPattern(opts: UsePdfPatternOptions): UsePdfPatternResult {
  const {
    initialMode,
    existingPdfUrl = null,
    existingThumbnailUrl = null,
    trackRemove = false,
    patternImagesCount,
    clearPatternImages,
    validate,
    onError,
  } = opts

  const [patternMode, setPatternMode] = useState<PatternMode>(initialMode)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const [pdfThumbnailBlob, setPdfThumbnailBlob] = useState<Blob | null>(null)
  const [pdfThumbnailPreview, setPdfThumbnailPreview] = useState<string | null>(existingThumbnailUrl)
  const [removePdf, setRemovePdf] = useState(false)
  const [renderingThumb, setRenderingThumb] = useState(false)

  const handlePdfPick = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      try {
        validateUploadFile(file, validate)
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err))
        return
      }
      setPdfFile(file)
      setPdfFileName(file.name)
      setRemovePdf(false)
      // Render thumbnail i baggrunden — fejler den, fortsætter vi alligevel.
      setRenderingThumb(true)
      try {
        const blob = await renderPdfFirstPage(file)
        setPdfThumbnailBlob(blob)
        setPdfThumbnailPreview(prev => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
          return blob ? URL.createObjectURL(blob) : null
        })
      } catch {
        setPdfThumbnailBlob(null)
      }
      setRenderingThumb(false)
    },
    [validate, onError],
  )

  const clearPdf = useCallback(() => {
    setPdfFile(null)
    setPdfFileName(null)
    setPdfThumbnailBlob(null)
    setPdfThumbnailPreview(prev => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    if (trackRemove) setRemovePdf(true)
  }, [trackRemove])

  const switchPatternMode = useCallback(
    (next: PatternMode) => {
      if (next === patternMode) return
      const hasPdf =
        patternMode === 'pdf' && (pdfFile != null || (existingPdfUrl != null && !removePdf))
      const hasImages = patternMode === 'images' && patternImagesCount > 0
      if (hasPdf || hasImages) {
        const ok = typeof window === 'undefined'
          ? true
          : window.confirm('Skift af opskrift-format sletter den nuværende opskrift. Fortsæt?')
        if (!ok) return
        if (patternMode === 'pdf') {
          clearPdf()
        } else {
          clearPatternImages()
        }
      }
      setPatternMode(next)
    },
    [patternMode, pdfFile, existingPdfUrl, removePdf, patternImagesCount, clearPdf, clearPatternImages],
  )

  const resetPdfState = useCallback(() => {
    setPdfFile(null)
    setPdfFileName(null)
    if (trackRemove) setRemovePdf(false)
  }, [trackRemove])

  return {
    patternMode,
    setPatternMode,
    pdfFile,
    pdfFileName,
    pdfThumbnailBlob,
    pdfThumbnailPreview,
    removePdf,
    renderingThumb,
    handlePdfPick,
    clearPdf,
    switchPatternMode,
    resetPdfState,
  }
}
