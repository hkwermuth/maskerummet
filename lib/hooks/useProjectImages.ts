import { useState, useCallback } from 'react'
import { validateUploadFile } from '@/lib/supabase/storage'

// Spejler det inline-type i storage.ts:validateUploadFile-signaturen.
// Eksporteres ikke fra storage.ts, så vi gentager det her.
export interface ValidateUploadOptions {
  maxBytes: number
  allowedMimes: readonly string[]
}

// Image-grid-state delt mellem DetailModal (edit) og NytProjektModal (create)
// i Arkiv.jsx. Hooken ejer state internt — modaler får ikke setters, men
// dedikerede handlers (addImages/removeImage/reorderImage) der kapsler
// validering, blob-URL-revocation og isExisting-tracking.

export interface ProjectImage {
  url: string
  pendingFile?: File | null
  isExisting: boolean
  _key: string
}

export interface UseProjectImagesOptions {
  /**
   * Initial-images (typisk mappet fra `entry.project_image_urls`).
   * Default: tom liste (create-mode).
   */
  initial?: ProjectImage[]
  /** Maks antal billeder, fx MAX_PROJECT_IMAGES eller MAX_PATTERN_IMAGES. */
  max: number
  /**
   * `true` = DetailModal-mode: spor slettede existing-URLs i `removedUrls`
   * så save-flow kan deletere fra Storage. `false` = NytProjektModal-mode:
   * der findes ingen existing images at slette.
   */
  trackRemoved?: boolean
  /** Præfix til genererede React-keys (fx 'n-' for project-grid, 'pn-' for pattern-grid). */
  keyPrefix?: string
  /** Validation-options til validateUploadFile (maxBytes, allowedMimes). */
  validate: ValidateUploadOptions
  /** Kaldes med fejl-besked når en fil afvises af validateUploadFile. */
  onError: (msg: string) => void
}

export interface UseProjectImagesResult {
  images: ProjectImage[]
  /** Eksponeret til avancerede flows (fx mode-switch der nulstiller alt). */
  setImages: React.Dispatch<React.SetStateAction<ProjectImage[]>>
  removedUrls: string[]
  /** Nulstil `removedUrls` (bruges efter handleSave har deleteret fra Storage). */
  resetRemovedUrls: () => void
  addImages: (files: FileList | File[]) => void
  removeImage: (index: number) => void
  reorderImage: (from: number, to: number) => void
  /**
   * Fjern alle billeder ad én gang. Respekterer `trackRemoved`: existing-URLs
   * pushes til `removedUrls`, pending blob-URLs revokes. Bruges fra mode-skift
   * (images → pdf) hvor hele grid'et nulstilles. Atomar — ikke 1-pr-tick.
   */
  clearAll: () => void
}

export function useProjectImages(opts: UseProjectImagesOptions): UseProjectImagesResult {
  const {
    initial = [],
    max,
    trackRemoved = false,
    keyPrefix = 'n-',
    validate,
    onError,
  } = opts

  const [images, setImages] = useState<ProjectImage[]>(initial)
  const [removedUrls, setRemovedUrls] = useState<string[]>([])

  const addImages = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files)
      const accepted: ProjectImage[] = []
      for (const file of list) {
        try {
          validateUploadFile(file, validate)
        } catch (e) {
          onError(e instanceof Error ? e.message : String(e))
          return
        }
        accepted.push({
          url: URL.createObjectURL(file),
          pendingFile: file,
          isExisting: false,
          _key: `${keyPrefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        })
      }
      setImages(prev => [...prev, ...accepted].slice(0, max))
    },
    [validate, onError, keyPrefix, max],
  )

  const removeImage = useCallback(
    (index: number) => {
      setImages(prev => {
        const next = [...prev]
        const [removed] = next.splice(index, 1)
        if (!removed) return prev
        if (removed.isExisting) {
          if (trackRemoved) setRemovedUrls(rs => [...rs, removed.url])
        } else {
          URL.revokeObjectURL(removed.url)
        }
        return next
      })
    },
    [trackRemoved],
  )

  const reorderImage = useCallback((from: number, to: number) => {
    setImages(prev => {
      const next = [...prev]
      const [it] = next.splice(from, 1)
      if (!it) return prev
      next.splice(to, 0, it)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setImages(prev => {
      // Atomar mode-skift: existing URLs til removed-trackeren (hvis enabled),
      // pending blob URLs revokes. Original-koden gjorde dette inline i
      // switchPatternMode-handleren — bevaret 1:1 i hooken.
      const toRemove: string[] = []
      for (const it of prev) {
        if (it.isExisting) {
          if (trackRemoved) toRemove.push(it.url)
        } else {
          URL.revokeObjectURL(it.url)
        }
      }
      if (toRemove.length > 0) setRemovedUrls(rs => [...rs, ...toRemove])
      return []
    })
  }, [trackRemoved])

  const resetRemovedUrls = useCallback(() => setRemovedUrls([]), [])

  return {
    images,
    setImages,
    removedUrls,
    resetRemovedUrls,
    addImages,
    removeImage,
    reorderImage,
    clearAll,
  }
}
