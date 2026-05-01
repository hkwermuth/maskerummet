// Kanonisk yarn-weight enum + alias-mapping. Matcher Postgres-typen
// public.yarn_weight (se 20260427000003_yarn_weight_enum.sql).
//
// Mapping-tabellen er identisk med SQL-backfill'en — hold dem i sync ved
// fremtidige ændringer.

export const YARN_WEIGHTS = [
  'lace',
  'fingering',
  'sport',
  'dk',
  'worsted',
  'aran',
  'bulky',
  'super_bulky',
] as const

export type YarnWeight = typeof YARN_WEIGHTS[number]

export const YARN_WEIGHT_LABELS: Record<YarnWeight, string> = {
  lace:        'Lace',
  fingering:   'Fingering',
  sport:       'Sport',
  dk:          'DK',
  worsted:     'Worsted',
  aran:        'Aran',
  bulky:       'Bulky',
  super_bulky: 'Super Bulky',
}

const ALIAS_MAP: Record<string, YarnWeight> = {
  // Lace
  'lace':          'lace',
  'cobweb':        'lace',
  'lace weight':   'lace',
  '1-ply':         'lace',
  '1ply':          'lace',
  // Fingering
  'fingering':     'fingering',
  '4-ply':         'fingering',
  '4ply':          'fingering',
  'sock':          'fingering',
  'sokkegarn':     'fingering',
  'super fine':    'fingering',
  'baby':          'fingering',
  // Sport
  'sport':         'sport',
  '5-ply':         'sport',
  '5ply':          'sport',
  // DK
  'dk':            'dk',
  'double knit':   'dk',
  '8-ply':         'dk',
  '8ply':          'dk',
  'light worsted': 'dk',
  // Worsted
  'worsted':       'worsted',
  '10-ply':        'worsted',
  '10ply':         'worsted',
  'medium':        'worsted',
  'afghan':        'worsted',
  // Aran
  'aran':          'aran',
  '12-ply':        'aran',
  '12ply':         'aran',
  'heavy worsted': 'aran',
  // Bulky
  'bulky':         'bulky',
  'chunky':        'bulky',
  '14-ply':        'bulky',
  '14ply':         'bulky',
  // Super bulky (jumbo merges hertil — ikke en separat enum-værdi)
  'super_bulky':   'super_bulky',
  'super bulky':   'super_bulky',
  'superbulky':    'super_bulky',
  'jumbo':         'super_bulky',
  'roving':        'super_bulky',
}

// Map fri-tekst input til kanonisk YarnWeight, eller null hvis ukendt/tvetydigt.
// Konservativ: tvivl → null. Reviewer kan rette manuelt i admin-editoren.
export function mapToYarnWeight(input: string | null | undefined): YarnWeight | null {
  if (input == null) return null
  const key = input.trim().toLowerCase()
  if (key === '') return null
  return ALIAS_MAP[key] ?? null
}

// Slap normalisering brugt i klient-side filter/sammenligning. Dækker alle
// historiske skrivekonventioner (capitalized 'Lace', lowercase enum 'lace',
// alias som 'sock'/'8-ply' osv.) og returnerer altid den kanoniske lowercase
// enum-værdi — eller en lowercase-trimmet streng hvis intet alias matcher.
// Så `looseWeightKey('Lace') === looseWeightKey('lace')` er altid sandt.
export function looseWeightKey(input: string | null | undefined): string {
  if (input == null) return ''
  const key = String(input).trim().toLowerCase()
  if (key === '') return ''
  return ALIAS_MAP[key] ?? key
}
