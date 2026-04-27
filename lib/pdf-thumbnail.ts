/**
 * Render side 1 af en PDF-fil som PNG-blob.
 *
 * Bruges når brugeren uploader en opskrift som PDF: vi gemmer side 1 som
 * thumbnail så vi kan vise et visuelt preview uden at skulle hente og rendere
 * hele PDF'en på opslag.
 *
 * pdfjs-dist lazy-loades så bundle-size for sider uden PDF-flow ikke vokser.
 * Worker'en peger på `/pdf.worker.min.mjs` som kopieres til `public/` via
 * postinstall-scriptet — deterministisk på tværs af Webpack og Turbopack.
 */

const WORKER_SRC = '/pdf.worker.min.mjs'

let workerConfigured = false

export async function renderPdfFirstPage(
  file: File,
  opts: { maxWidth?: number } = {}
): Promise<Blob> {
  const maxWidth = opts.maxWidth ?? 800

  // pdfjs-dist eksporterer ikke stabile TS-typer for legacy-build-pakken
  // (de officielle types peger på den primære build); vi typer det som any.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs: any = await import('pdfjs-dist/legacy/build/pdf.mjs')
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC
    workerConfigured = true
  }

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise
  try {
    const page = await doc.getPage(1)
    const baseViewport = page.getViewport({ scale: 1 })
    const scale = Math.min(maxWidth / baseViewport.width, 2)
    const viewport = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas ikke tilgængelig')

    await page.render({ canvasContext: ctx, viewport, canvas }).promise

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Kunne ikke generere billede fra PDF'))),
        'image/png'
      )
    })
  } finally {
    try { await doc.destroy() } catch { /* ignorér */ }
  }
}
