// Dansk datoformat-helper. Bruges til UI-display.
// DB-lagring (CSV-eksport, INSERT) skal fortsat bruge `toISODate()` eller direkte ISO-format.

type DateInput = string | number | Date | null | undefined

function toDate(input: DateInput): Date | null {
  if (input === null || input === undefined || input === '') return null
  const d = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(d.getTime())) return null
  return d
}

const DA_FORMATTER = new Intl.DateTimeFormat('da-DK', {
  day:   'numeric',
  month: 'short',
  year:  'numeric',
})

/**
 * Returnerer en dato i kort dansk format: "27. apr 2026".
 * Intl.DateTimeFormat returnerer "27. apr. 2026" — vi stripper punktummet efter månedsforkortelsen.
 * Returnerer "" for null/undefined/tom streng/Invalid Date.
 */
export function formatDanish(input: DateInput): string {
  const d = toDate(input)
  if (!d) return ''
  const raw = DA_FORMATTER.format(d)
  return raw.replace(/(\d+\.\s*[a-zæøå]+)\.(\s*\d+)/i, '$1$2')
}

/**
 * Returnerer en dato som ISO-streng "2026-04-27" (UTC, samme adfærd som
 * `new Date().toISOString().slice(0, 10)`). Bruges til DB-lagring og
 * eksisterende kontrakter — ændrer ikke tidszone-semantik.
 * Returnerer "" for null/undefined/tom streng/Invalid Date.
 */
export function toISODate(input: DateInput): string {
  const d = toDate(input)
  if (!d) return ''
  return d.toISOString().slice(0, 10)
}
