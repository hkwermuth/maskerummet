export type YarnFormErrors = {
  name?: string
  brand?: string
}

export type YarnFormInput = {
  name?: string | null
  brand?: string | null
  [key: string]: unknown
}

/**
 * Validerer garn-formularen. Returnerer et objekt med fejlbeskeder
 * for hvert ugyldigt felt. Tomt objekt = ingen fejl.
 */
export function validateForm(f: YarnFormInput): YarnFormErrors {
  const errs: YarnFormErrors = {}
  if (!(f.name || '').trim())  errs.name  = 'Garnnavn er påkrævet'
  if (!(f.brand || '').trim()) errs.brand = 'Mærke er påkrævet'
  return errs
}
