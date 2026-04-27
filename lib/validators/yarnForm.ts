export type YarnFormErrors = {
  name?: string
  brand?: string
}

export type YarnFormInput = {
  name?: string | null
  brand?: string | null
  catalogYarnId?: string | null
  [key: string]: unknown
}

/**
 * Validerer garn-formularen. Returnerer et objekt med fejlbeskeder
 * for hvert ugyldigt felt. Tomt objekt = ingen fejl.
 *
 * Når et katalog-garn er linket (`catalogYarnId` sat), springes name/brand-
 * validering over: felterne styres af kataloget og applyCatalogYarnOnlyToForm
 * fylder dem automatisk.
 */
export function validateForm(f: YarnFormInput): YarnFormErrors {
  const errs: YarnFormErrors = {}
  if (f.catalogYarnId) return errs
  if (!(f.name || '').trim())  errs.name  = 'Garnnavn er påkrævet'
  if (!(f.brand || '').trim()) errs.brand = 'Mærke er påkrævet'
  return errs
}
