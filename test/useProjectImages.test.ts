/**
 * Unit-tests for lib/hooks/useProjectImages.ts
 * Verificerer hook-state-strategi fra BACKLOG 8.8 Trin 4:
 *  - initial-option (DetailModal vs NytProjektModal)
 *  - trackRemoved differentiering
 *  - addImages (validering + max)
 *  - removeImage (blob-revocation, trackRemoved)
 *  - reorderImage
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProjectImages, type ProjectImage } from '@/lib/hooks/useProjectImages'

// Mock validateUploadFile fra storage
vi.mock('@/lib/supabase/storage', () => ({
  validateUploadFile: vi.fn(),
}))

import { validateUploadFile } from '@/lib/supabase/storage'

// Mock URL.createObjectURL + URL.revokeObjectURL
const mockObjectUrl = 'blob:mock-url'
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => mockObjectUrl),
  revokeObjectURL: vi.fn(),
})

const VALIDATE_OPTS = { maxBytes: 10_000_000, allowedMimes: ['image/jpeg', 'image/png'] }

function makeFile(name = 'test.jpg', type = 'image/jpeg', size = 1000): File {
  const f = new File(['x'.repeat(size)], name, { type })
  return f
}

function makeExistingImage(i: number): ProjectImage {
  return { url: `https://example.com/img${i}.jpg`, pendingFile: null, isExisting: true, _key: `e-${i}` }
}

describe('useProjectImages – NytProjektModal mode (initial=[], trackRemoved=false)', () => {
  const defaultOpts = {
    initial: [] as ProjectImage[],
    max: 5,
    trackRemoved: false,
    validate: VALIDATE_OPTS,
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateUploadFile).mockImplementation(() => { /* no-op = valid */ })
  })

  it('starter med tom images-liste', () => {
    const { result } = renderHook(() => useProjectImages(defaultOpts))
    expect(result.current.images).toHaveLength(0)
  })

  it('addImages tilføjer pending-billeder', async () => {
    const { result } = renderHook(() => useProjectImages(defaultOpts))
    const file = makeFile()
    await act(async () => {
      result.current.addImages([file])
    })
    expect(result.current.images).toHaveLength(1)
    expect(result.current.images[0].pendingFile).toBe(file)
    expect(result.current.images[0].isExisting).toBe(false)
  })

  it('addImages respekterer max', async () => {
    const opts = { ...defaultOpts, max: 2 }
    const { result } = renderHook(() => useProjectImages(opts))
    await act(async () => {
      result.current.addImages([makeFile('a.jpg'), makeFile('b.jpg'), makeFile('c.jpg')])
    })
    // Slices til max=2
    expect(result.current.images).toHaveLength(2)
  })

  it('addImages kalder onError og afbryder ved valideringsfejl', async () => {
    const onError = vi.fn()
    vi.mocked(validateUploadFile).mockImplementation(() => { throw new Error('For stor') })
    const { result } = renderHook(() => useProjectImages({ ...defaultOpts, onError }))
    await act(async () => {
      result.current.addImages([makeFile()])
    })
    expect(onError).toHaveBeenCalledWith('For stor')
    expect(result.current.images).toHaveLength(0)
  })

  it('removeImage revokerer blob-URL for pending (ikke-existing) billede', async () => {
    const { result } = renderHook(() => useProjectImages(defaultOpts))
    await act(async () => { result.current.addImages([makeFile()]) })
    await act(async () => { result.current.removeImage(0) })
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockObjectUrl)
    expect(result.current.images).toHaveLength(0)
  })

  it('removeImage IKKE trackerer removed-URL (trackRemoved=false)', async () => {
    const opts = { ...defaultOpts, trackRemoved: false }
    const initial = [makeExistingImage(0)]
    const { result } = renderHook(() => useProjectImages({ ...opts, initial }))
    await act(async () => { result.current.removeImage(0) })
    expect(result.current.removedUrls).toHaveLength(0)
  })

  it('reorderImage bytter om på elementer', async () => {
    const { result } = renderHook(() => useProjectImages(defaultOpts))
    await act(async () => {
      result.current.addImages([makeFile('a.jpg'), makeFile('b.jpg')])
    })
    const firstKey = result.current.images[0]._key
    const secondKey = result.current.images[1]._key
    await act(async () => { result.current.reorderImage(0, 1) })
    expect(result.current.images[0]._key).toBe(secondKey)
    expect(result.current.images[1]._key).toBe(firstKey)
  })
})

describe('useProjectImages – DetailModal mode (initial fra entry, trackRemoved=true)', () => {
  const existingImages = [makeExistingImage(0), makeExistingImage(1)]
  const defaultOpts = {
    initial: existingImages,
    max: 5,
    trackRemoved: true,
    validate: VALIDATE_OPTS,
    onError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(validateUploadFile).mockImplementation(() => { /* valid */ })
  })

  it('initialiseres med existing images fra entry', () => {
    const { result } = renderHook(() => useProjectImages(defaultOpts))
    expect(result.current.images).toHaveLength(2)
    expect(result.current.images[0].isExisting).toBe(true)
  })

  it('removeImage tilføjer existing URL til removedUrls (trackRemoved=true)', async () => {
    const { result } = renderHook(() => useProjectImages(defaultOpts))
    await act(async () => { result.current.removeImage(0) })
    expect(result.current.removedUrls).toContain(existingImages[0].url)
  })

  it('removeImage IKKE revokerer URL for existing billede', async () => {
    const { result } = renderHook(() => useProjectImages(defaultOpts))
    await act(async () => { result.current.removeImage(0) })
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
  })

  it('resetRemovedUrls rydder listen', async () => {
    const { result } = renderHook(() => useProjectImages(defaultOpts))
    await act(async () => { result.current.removeImage(0) })
    expect(result.current.removedUrls).toHaveLength(1)
    await act(async () => { result.current.resetRemovedUrls() })
    expect(result.current.removedUrls).toHaveLength(0)
  })
})
