import { describe, it, expect } from 'vitest'
import { validateUploadFile } from '@/lib/supabase/storage'

const IMG_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const
const PDF_MIME = ['application/pdf'] as const
const FIVE_MB = 5 * 1024 * 1024
const TWENTY_MB = 20 * 1024 * 1024

function makeFile(size: number, mime: string, name = 'f.bin'): File {
  // jsdom understøtter File; brug en Blob bag det.
  const blob = new Uint8Array(size)
  return new File([blob], name, { type: mime })
}

describe('validateUploadFile', () => {
  it('accepterer gyldigt JPEG under størrelsesgrænse', () => {
    const f = makeFile(1024, 'image/jpeg', 'a.jpg')
    expect(() => validateUploadFile(f, { maxBytes: FIVE_MB, allowedMimes: IMG_MIME })).not.toThrow()
  })

  it('accepterer PNG og WebP', () => {
    expect(() => validateUploadFile(makeFile(2048, 'image/png'), { maxBytes: FIVE_MB, allowedMimes: IMG_MIME })).not.toThrow()
    expect(() => validateUploadFile(makeFile(2048, 'image/webp'), { maxBytes: FIVE_MB, allowedMimes: IMG_MIME })).not.toThrow()
  })

  it('afviser fil over maks-størrelse med dansk besked', () => {
    const f = makeFile(TWENTY_MB, 'image/jpeg')
    expect(() => validateUploadFile(f, { maxBytes: FIVE_MB, allowedMimes: IMG_MIME }))
      .toThrow(/for stor/i)
  })

  it('afviser fil med uventet MIME-type', () => {
    const f = makeFile(1024, 'application/x-evil', 'a.exe')
    expect(() => validateUploadFile(f, { maxBytes: FIVE_MB, allowedMimes: IMG_MIME }))
      .toThrow(/ikke understøttet/i)
  })

  it('afviser PDF når kun billede er tilladt', () => {
    expect(() => validateUploadFile(makeFile(1024, 'application/pdf'), { maxBytes: FIVE_MB, allowedMimes: IMG_MIME }))
      .toThrow(/ikke understøttet/i)
  })

  it('accepterer PDF når PDF er tilladt', () => {
    expect(() => validateUploadFile(makeFile(1024, 'application/pdf'), { maxBytes: FIVE_MB, allowedMimes: PDF_MIME }))
      .not.toThrow()
  })

  it('accepterer fil med tom MIME (browsere giver nogle gange ingen)', () => {
    expect(() => validateUploadFile(makeFile(1024, ''), { maxBytes: FIVE_MB, allowedMimes: IMG_MIME }))
      .not.toThrow()
  })
})
