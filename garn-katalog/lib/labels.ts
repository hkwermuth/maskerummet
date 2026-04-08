// Danske labels og værdi-formattering for enum-felter fra Supabase.
// Samlet ét sted så UI-ændringer ikke kræver databasemigration.

const THICKNESS: Record<string, string> = {
  lace: 'lace (meget tyndt)',
  light_fingering: 'light fingering (tyndt)',
  fingering: 'fingering (tyndt)',
  sport: 'sport (let)',
  dk: 'DK (medium)',
  worsted: 'worsted (medium)',
  aran: 'aran (kraftigt)',
  bulky: 'bulky (tykt)',
  super_bulky: 'super bulky (meget tykt)',
  jumbo: 'jumbo',
}

const SPIN_TYPE: Record<string, string> = {
  plied: 'snoet',
  singles: 'enkelttrådet',
  brushed_singles: 'børstet singles',
  cabled: 'kablet',
  chainette: 'chainette',
  boucle: 'bouclé',
}

const FINISH: Record<string, string> = {
  mercerised: 'merceriseret',
  superwash: 'superwash',
  brushed: 'børstet',
  gassed: 'gasset',
  none: 'ubehandlet',
}

const WASH_CARE: Record<string, string> = {
  handvask: 'Håndvask',
  maskinvask_30: 'Kan maskinvaskes ved 30°',
  maskinvask_40: 'Kan maskinvaskes ved 40°',
  kun_rens: 'Kun rens',
  ikke_angivet: 'Ikke angivet',
}

const STATUS: Record<string, string> = {
  i_produktion: 'I produktion',
  udgaaet: 'Udgået',
  udgået: 'Udgået',
  pausesret: 'Midlertidigt pauseret',
}

const FIBER: Record<string, string> = {
  merinould: 'merinould',
  uld: 'uld',
  islandsk_uld: 'islandsk uld',
  shetland_uld: 'shetlandsuld',
  silke: 'silke',
  tussah_silke: 'tussah-silke',
  morbaer_silke: 'morbærsilke',
  kid_mohair: 'kidmohair',
  mohair: 'mohair',
  alpaka: 'alpaka',
  baby_alpaka: 'baby-alpaka',
  kashmir: 'kashmir',
  bomuld: 'bomuld',
  merceriseret_bomuld: 'merceriseret bomuld',
  oekologisk_bomuld: 'økologisk bomuld',
  lin: 'lin',
  hamp: 'hamp',
  viskose: 'viskose',
  tencel: 'tencel',
  nylon_polyamid: 'nylon',
  polyester: 'polyester',
  acryl: 'akryl',
  courtelle: 'courtelle',
}

const pretty = (map: Record<string, string>, v: string | null | undefined) =>
  v ? map[v] ?? v.replace(/_/g, ' ') : null

export const labelThickness = (v: string | null | undefined) => pretty(THICKNESS, v)
export const labelSpin = (v: string | null | undefined) => pretty(SPIN_TYPE, v)
export const labelFinish = (v: string | null | undefined) => pretty(FINISH, v)
export const labelWash = (v: string | null | undefined) => pretty(WASH_CARE, v)
export const labelStatus = (v: string | null | undefined) => pretty(STATUS, v)
export const labelFiber = (v: string) => FIBER[v] ?? v.replace(/_/g, ' ')

/** "3.5" -> "3,5" (dansk decimaltegn) */
export const da = (n: number | null | undefined) =>
  n == null ? null : String(n).replace('.', ',')

/** ["a","b","c"] -> "a, b og c" */
export function joinDa(items: string[] | null | undefined): string | null {
  if (!items || items.length === 0) return null
  if (items.length === 1) return items[0]
  return items.slice(0, -1).join(', ') + ' og ' + items[items.length - 1]
}
