import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock pdfjs-dist før vi importerer modulet under test.
const renderMock = vi.fn(() => ({ promise: Promise.resolve() }))
const getPageMock = vi.fn(() => Promise.resolve({
  getViewport: ({ scale }: { scale: number }) => ({ width: 200 * scale, height: 300 * scale }),
  render: renderMock,
}))
const getDocumentMock = vi.fn(() => ({
  promise: Promise.resolve({
    getPage: getPageMock,
    destroy: () => Promise.resolve(),
  }),
}))

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: getDocumentMock,
  GlobalWorkerOptions: { workerSrc: '' },
}))

beforeEach(() => {
  renderMock.mockClear()
  getPageMock.mockClear()
  getDocumentMock.mockClear()
})

// Stub canvas.toBlob/getContext fordi jsdom ikke implementerer dem.
;(HTMLCanvasElement.prototype as unknown as { getContext: () => unknown }).getContext = () => ({})
;(HTMLCanvasElement.prototype as unknown as { toBlob: (cb: (b: Blob) => void) => void }).toBlob = (cb) => {
  cb(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }))
}

import { renderPdfFirstPage } from '@/lib/pdf-thumbnail'

describe('renderPdfFirstPage', () => {
  it('returnerer en image/png blob fra side 1', async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'test.pdf', { type: 'application/pdf' })
    const blob = await renderPdfFirstPage(file)
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('image/png')
    expect(blob.size).toBeGreaterThan(0)
    expect(getDocumentMock).toHaveBeenCalledOnce()
    expect(getPageMock).toHaveBeenCalledWith(1)
  })

  it('respekterer maxWidth-option', async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'test.pdf', { type: 'application/pdf' })
    await renderPdfFirstPage(file, { maxWidth: 400 })
    expect(renderMock).toHaveBeenCalled()
  })

  // AC12: Hvis pdfjs fejler under render, kastes fejlen videre så kald-stedet
  // (Arkiv.jsx) kan gribe den og fortsætte uden thumbnail.
  it('AC12 – kaster fejl videre når pdfjs ikke kan loade dokumentet', async () => {
    getDocumentMock.mockImplementationOnce(() => ({
      promise: Promise.reject(new Error('PDF could not be decoded')),
    }))
    const file = new File([new Uint8Array([0x00, 0x00])], 'broken.pdf', { type: 'application/pdf' })
    await expect(renderPdfFirstPage(file)).rejects.toThrow()
  })

  it('AC12 – kaster fejl videre når getPage fejler', async () => {
    getDocumentMock.mockImplementationOnce(() => ({
      promise: Promise.resolve({
        getPage: vi.fn(() => Promise.reject(new Error('Page not found'))),
        destroy: () => Promise.resolve(),
      }),
    }))
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], 'test.pdf', { type: 'application/pdf' })
    await expect(renderPdfFirstPage(file)).rejects.toThrow()
  })
})
