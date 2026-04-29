export type YarnFormErrors = {
  name?: string
  brand?: string
  brugtOpProjectId?: string
  brugtOpNewTitle?: string
}

export type YarnFormInput = {
  name?: string | null
  brand?: string | null
  catalogYarnId?: string | null
  status?: string | null
  // F15: 3-mode projekt-kobling. 'none' = ingen yarn_usage, 'existing' = vælg, 'new' = opret.
  brugtOpMode?: 'none' | 'existing' | 'new' | null
  brugtOpProjectId?: string | null
  brugtOpNewTitle?: string | null
  [key: string]: unknown
}

/**
 * Validerer garn-formularen. Returnerer et objekt med fejlbeskeder
 * for hvert ugyldigt felt. Tomt objekt = ingen fejl.
 *
 * Når et katalog-garn er linket (`catalogYarnId` sat), springes name/brand-
 * validering over: felterne styres af kataloget og applyCatalogYarnOnlyToForm
 * fylder dem automatisk.
 *
 * Status="Brugt op" + brugtOpMode:
 *   - 'none'     → ingen krav (valgfri kobling).
 *   - 'existing' → kræver brugtOpProjectId.
 *   - 'new'      → kræver brugtOpNewTitle (trim-non-empty).
 */
export function validateForm(f: YarnFormInput): YarnFormErrors {
  const errs: YarnFormErrors = {}
  if (!f.catalogYarnId) {
    if (!(f.name || '').trim())  errs.name  = 'Garnnavn er påkrævet'
    if (!(f.brand || '').trim()) errs.brand = 'Mærke er påkrævet'
  }
  if (f.status === 'Brugt op') {
    const mode = f.brugtOpMode || 'none'
    if (mode === 'existing' && !((f.brugtOpProjectId || '').trim())) {
      errs.brugtOpProjectId = 'Vælg et projekt'
    }
    if (mode === 'new' && !((f.brugtOpNewTitle || '').trim())) {
      errs.brugtOpNewTitle = 'Skriv en projekttitel'
    }
  }
  return errs
}
