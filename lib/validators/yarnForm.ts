export type YarnFormErrors = {
  name?: string
  brand?: string
  brugtTilProjekt?: string
}

export type YarnFormInput = {
  name?: string | null
  brand?: string | null
  catalogYarnId?: string | null
  status?: string | null
  brugtTilProjekt?: string | null
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
 * Når status === "Brugt op" kræves brugtTilProjekt — kobling til projekt
 * (F5-subflow). Dato-feltet er valgfrit.
 */
export function validateForm(f: YarnFormInput): YarnFormErrors {
  const errs: YarnFormErrors = {}
  if (!f.catalogYarnId) {
    if (!(f.name || '').trim())  errs.name  = 'Garnnavn er påkrævet'
    if (!(f.brand || '').trim()) errs.brand = 'Mærke er påkrævet'
  }
  if (f.status === 'Brugt op' && !((f.brugtTilProjekt || '').trim())) {
    errs.brugtTilProjekt = 'Vælg eller skriv hvilket projekt garnet blev brugt til'
  }
  return errs
}
