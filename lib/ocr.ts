/**
 * OCR-hjælpere til at læse farvenumre fra banderole-fotos.
 *
 * Bruges som fallback i scanner-flow når stregkoden ikke kan læses eller
 * ikke findes i kataloget. Kører helt klient-side via tesseract.js — fotos
 * sendes ikke til server.
 *
 * tesseract.js lazy-loades så bundle-size for sider uden OCR-flow ikke vokser.
 */

type ColorRow = {
  id: string
  yarn_id: string
  color_number: string | null
  color_name: string | null
  hex_code: string | null
  status: string | null
  barcode: string | null
}

/**
 * Udtræk unikke 2-4 cifrede tal-sekvenser fra en OCR-tekst.
 * Returnerer dem i den rækkefølge de optræder, uden dubletter.
 */
export function extractCandidateNumbers(text: string): string[] {
  const matches = text.match(/\b\d{2,4}\b/g) ?? []
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of matches) {
    if (!seen.has(m)) {
      seen.add(m)
      out.push(m)
    }
  }
  return out
}

/**
 * Filtrér til de farver der har et color_number som matcher mindst ét
 * kandidat-tal. Returnerer kandidaterne ordnet efter den rækkefølge tallet
 * blev fundet i OCR-resultatet.
 */
export function matchCandidatesToColors(
  candidates: string[],
  colors: ColorRow[]
): ColorRow[] {
  const order = new Map(candidates.map((c, i) => [c, i]))
  const matches = colors.filter((c) => {
    const num = (c.color_number ?? '').trim()
    return num && order.has(num)
  })
  matches.sort(
    (a, b) =>
      (order.get((a.color_number ?? '').trim()) ?? 999) -
      (order.get((b.color_number ?? '').trim()) ?? 999)
  )
  return matches
}

/**
 * Pre-processér et image til OCR: konverter til grayscale + threshold for
 * højere kontrast. Returnerer en ny Blob i PNG-format.
 *
 * Threshold (default 128) bestemmer hvad der bliver sort vs hvidt. For
 * banderoler med mørk tekst på lys baggrund er ~128-160 en god default.
 */
export async function preprocessForOcr(
  imageBlob: Blob,
  threshold = 140
): Promise<Blob> {
  const url = URL.createObjectURL(imageBlob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Kunne ikke læse billedet'))
      el.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas ikke tilgængelig')
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const d = imageData.data
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
      const v = gray < threshold ? 0 : 255
      d[i] = v
      d[i + 1] = v
      d[i + 2] = v
      // alpha (d[i+3]) bibeholdes
    }
    ctx.putImageData(imageData, 0, 0)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Kunne ikke generere billede'))), 'image/png')
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Kør OCR på et billede og returnér unikke kandidat-farvenumre fundet i teksten.
 * tesseract.js lazy-loades.
 */
export async function extractColorNumberCandidates(
  imageBlob: Blob,
  opts?: { onProgress?: (p: number) => void }
): Promise<string[]> {
  const processed = await preprocessForOcr(imageBlob).catch(() => imageBlob)
  const tesseract = await import('tesseract.js')
  const result = await tesseract.recognize(processed, 'eng', {
    logger: (m: { status?: string; progress?: number }) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        opts?.onProgress?.(m.progress)
      }
    },
  })
  const text = result.data.text || ''
  return extractCandidateNumbers(text)
}
