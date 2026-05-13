/**
 * Unit-tests for lib/hooks/usePdfPattern.ts
 * Verificerer acceptkriterierne fra BACKLOG 8.8 Trin 4:
 *  - clearPdf sætter removePdf=true KUN i trackRemove-mode (DetailModal)
 *  - resetPdfState nulstiller PDF-state
 *  - switchPatternMode bekræfter ved eksisterende content
 *  - handlePdfPick validerer fil og sætter state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePdfPattern } from '@/lib/hooks/usePdfPattern'

vi.mock('@/lib/supabase/storage', () => ({
  validateUploadFile: vi.fn(),
}))

vi.mock('@/lib/pdf-thumbnail', () => ({
  renderPdfFirstPage: vi.fn(() => Promise.resolve(null)),
}))

import { validateUploadFile } from '@/lib/supabase/storage'

const mockObjectUrl = 'blob:pdf-preview'
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => mockObjectUrl),
  revokeObjectURL: vi.fn(),
})

const VALIDATE_OPTS = { maxBytes: 50_000_000, allowedMimes: ['application/pdf'] }

function makePdfFile(name = 'pattern.pdf'): File {
  return new File(['%PDF'], name, { type: 'application/pdf' })
}

function baseOpts(overrides = {}) {
  return {
    initialMode: 'pdf' as const,
    existingPdfUrl: null,
    existingThumbnailUrl: null,
    trackRemove: false,
    patternImagesCount: 0,
    clearPatternImages: vi.fn(),
    validate: VALIDATE_OPTS,
    onError: vi.fn(),
    ...overrides,
  }
}

describe('usePdfPattern – clearPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateUploadFile).mockImplementation(() => { /* valid */ })
  })

  it('clearPdf sætter IKKE removePdf=true i NytProjektModal-mode (trackRemove=false)', async () => {
    const { result } = renderHook(() => usePdfPattern(baseOpts({ trackRemove: false })))
    // Tilføj en fil først
    const file = makePdfFile()
    const event = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
    await act(async () => { await result.current.handlePdfPick(event) })
    await act(async () => { result.current.clearPdf() })
    expect(result.current.removePdf).toBe(false)
  })

  it('clearPdf sætter removePdf=true i DetailModal-mode (trackRemove=true)', async () => {
    const { result } = renderHook(() => usePdfPattern(baseOpts({ trackRemove: true })))
    await act(async () => { result.current.clearPdf() })
    expect(result.current.removePdf).toBe(true)
  })

  it('clearPdf nulstiller pdfFile og pdfFileName', async () => {
    const { result } = renderHook(() => usePdfPattern(baseOpts()))
    const file = makePdfFile()
    const event = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
    await act(async () => { await result.current.handlePdfPick(event) })
    expect(result.current.pdfFile).toBeTruthy()
    await act(async () => { result.current.clearPdf() })
    expect(result.current.pdfFile).toBeNull()
    expect(result.current.pdfFileName).toBeNull()
  })
})

describe('usePdfPattern – resetPdfState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateUploadFile).mockImplementation(() => { /* valid */ })
  })

  it('resetPdfState nulstiller pdfFile og pdfFileName', async () => {
    const { result } = renderHook(() => usePdfPattern(baseOpts()))
    const file = makePdfFile()
    const event = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
    await act(async () => { await result.current.handlePdfPick(event) })
    expect(result.current.pdfFile).not.toBeNull()
    await act(async () => { result.current.resetPdfState() })
    expect(result.current.pdfFile).toBeNull()
    expect(result.current.pdfFileName).toBeNull()
  })

  it('resetPdfState sætter removePdf=false i trackRemove=true mode', async () => {
    const { result } = renderHook(() => usePdfPattern(baseOpts({ trackRemove: true })))
    await act(async () => { result.current.clearPdf() }) // removePdf = true
    expect(result.current.removePdf).toBe(true)
    await act(async () => { result.current.resetPdfState() })
    expect(result.current.removePdf).toBe(false)
  })

  it('resetPdfState IKKE ændrer removePdf i trackRemove=false mode', async () => {
    const { result } = renderHook(() => usePdfPattern(baseOpts({ trackRemove: false })))
    await act(async () => { result.current.resetPdfState() })
    expect(result.current.removePdf).toBe(false)
  })
})

describe('usePdfPattern – handlePdfPick', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateUploadFile).mockImplementation(() => { /* valid */ })
  })

  it('sætter pdfFile og pdfFileName ved validt upload', async () => {
    const { result } = renderHook(() => usePdfPattern(baseOpts()))
    const file = makePdfFile('opskrift.pdf')
    const event = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
    await act(async () => { await result.current.handlePdfPick(event) })
    expect(result.current.pdfFile).toBe(file)
    expect(result.current.pdfFileName).toBe('opskrift.pdf')
  })

  it('kalder onError og afbryder ved valideringsfejl', async () => {
    const onError = vi.fn()
    vi.mocked(validateUploadFile).mockImplementation(() => { throw new Error('For stor') })
    const { result } = renderHook(() => usePdfPattern(baseOpts({ onError })))
    const file = makePdfFile()
    const event = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
    await act(async () => { await result.current.handlePdfPick(event) })
    expect(onError).toHaveBeenCalledWith('For stor')
    expect(result.current.pdfFile).toBeNull()
  })

  it('gør ingenting hvis ingen fil valgt', async () => {
    const { result } = renderHook(() => usePdfPattern(baseOpts()))
    const event = { target: { files: [], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
    await act(async () => { await result.current.handlePdfPick(event) })
    expect(result.current.pdfFile).toBeNull()
  })
})

describe('usePdfPattern – switchPatternMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateUploadFile).mockImplementation(() => { /* valid */ })
    vi.stubGlobal('window', { confirm: vi.fn(() => true) })
  })

  it('skifter mode uden confirm hvis ingen content', () => {
    const { result } = renderHook(() =>
      usePdfPattern(baseOpts({ initialMode: 'pdf', patternImagesCount: 0 })),
    )
    act(() => { result.current.switchPatternMode('images') })
    expect(result.current.patternMode).toBe('images')
    expect(window.confirm).not.toHaveBeenCalled()
  })

  it('spørger confirm hvis PDF er valgt (hasPdf=true)', async () => {
    vi.mocked(window.confirm).mockReturnValue(true)
    const { result } = renderHook(() => usePdfPattern(baseOpts({ initialMode: 'pdf' })))
    const file = makePdfFile()
    const event = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
    await act(async () => { await result.current.handlePdfPick(event) })
    act(() => { result.current.switchPatternMode('images') })
    expect(window.confirm).toHaveBeenCalled()
    expect(result.current.patternMode).toBe('images')
  })

  it('forbliver i samme mode hvis bruger afviser confirm', async () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const { result } = renderHook(() => usePdfPattern(baseOpts({ initialMode: 'pdf' })))
    const file = makePdfFile()
    const event = { target: { files: [file], value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
    await act(async () => { await result.current.handlePdfPick(event) })
    act(() => { result.current.switchPatternMode('images') })
    expect(result.current.patternMode).toBe('pdf')
  })

  it('spørger confirm og kalder clearPatternImages hvis mode=images → pdf', () => {
    const clearPatternImages = vi.fn()
    vi.mocked(window.confirm).mockReturnValue(true)
    const { result } = renderHook(() =>
      usePdfPattern(baseOpts({ initialMode: 'images', patternImagesCount: 2, clearPatternImages })),
    )
    act(() => { result.current.switchPatternMode('pdf') })
    expect(window.confirm).toHaveBeenCalled()
    expect(clearPatternImages).toHaveBeenCalled()
  })
})
