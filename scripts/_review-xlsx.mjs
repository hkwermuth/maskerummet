/**
 * Fælles helpers for generate-yarn-review.mjs og import-yarn-review.mjs.
 *
 * Review-arket bruges til et roundtrip hvor brugeren manuelt bekræfter
 * "rigtigt pind + masker + omgange" pr. garn. AI-erstatningsmodulet (RPC
 * get_substitutions) bliver kun pålideligt når disse felter er udfyldt.
 */

export const REVIEW_SHEET_NAME = 'yarns_review'

// Read-only kolonner (info til brugeren) + tre 'bekræftet_*' der importeres
export const REVIEW_COLUMNS = [
  // Identifikation (read-only, kun visning)
  'id',
  'producer',
  'name',
  'series',
  'full_name',

  // Nuværende data (read-only, kun visning)
  'needle_min_mm',
  'needle_max_mm',
  'gauge_stitches_10cm',
  'gauge_rows_10cm',
  'gauge_needle_mm',

  // Heuristik-output (read-only)
  'foreslået_primær_pind',
  'bør_kigges_på',

  // Bruger-noter (read-only ved import — bare et arbejdsfelt)
  'noter',

  // Felter brugeren udfylder — DISSE importeres tilbage
  'bekræftet_primær_pind',
  'bekræftet_gauge_st',
  'bekræftet_gauge_omg',
]

/** Runder en pind til nærmeste 0.5 mm (2.0, 2.5, 3.0, …). */
export function roundToHalfNeedle(n) {
  if (n == null || !Number.isFinite(n)) return null
  return Math.round(n * 2) / 2
}

/**
 * Heuristik for "den pind flest vil strikke garnet i":
 * 1) gauge_needle_mm hvis producent har angivet det (77 garner pt.)
 * 2) midt af [needle_min, needle_max] rundet til nærmeste halve pind
 * 3) null hvis hverken pind eller interval er sat
 */
export function suggestPrimaryNeedle(yarn) {
  if (yarn.gauge_needle_mm != null) return Number(yarn.gauge_needle_mm)
  const min = yarn.needle_min_mm != null ? Number(yarn.needle_min_mm) : null
  const max = yarn.needle_max_mm != null ? Number(yarn.needle_max_mm) : null
  if (min == null && max == null) return null
  if (min != null && max != null) return roundToHalfNeedle((min + max) / 2)
  return roundToHalfNeedle(min ?? max)
}

/**
 * Returnerer komma-separeret liste af flags for hvad der bør gennemgås.
 * Tom streng betyder "ingen åbenlyse problemer".
 *
 * Flag-typer:
 *  - mangler_pind        gauge_needle_mm er NULL OG pind-intervallet er ikke entydigt
 *                        (needle_min ≠ needle_max). Ved entydig pind ved vi at
 *                        strikkefastheden er målt på den ene pind, så vi flagger ikke.
 *  - mangler_omg         gauge_rows_10cm er NULL
 *  - mangler_gauge       gauge_stitches_10cm er NULL helt
 *  - pind_uden_for_interval gauge_needle_mm ligger uden for [needle_min, needle_max]
 *  - ekstrem_gauge       gauge_stitches_10cm > 40 eller < 8
 *  - bred_pind           needle_max - needle_min ≥ 1.5 mm (heuristik er kun et gæt)
 */
export function computeFlags(yarn) {
  const flags = []
  const min = yarn.needle_min_mm != null ? Number(yarn.needle_min_mm) : null
  const max = yarn.needle_max_mm != null ? Number(yarn.needle_max_mm) : null
  const gPind = yarn.gauge_needle_mm != null ? Number(yarn.gauge_needle_mm) : null
  const gSt = yarn.gauge_stitches_10cm != null ? Number(yarn.gauge_stitches_10cm) : null
  const gOmg = yarn.gauge_rows_10cm

  // Entydig pind-anbefaling (needle_min = needle_max): gauge er målt på den
  // ene pind, så vi behøver ikke flagge gauge_needle_mm som manglende.
  const entydigPind = min != null && max != null && min === max
  if (gPind == null && !entydigPind) flags.push('mangler_pind')
  if (gOmg == null) flags.push('mangler_omg')
  if (gSt == null) flags.push('mangler_gauge')
  if (gPind != null && min != null && max != null && (gPind < min || gPind > max)) {
    flags.push('pind_uden_for_interval')
  }
  if (gSt != null && (gSt > 40 || gSt < 8)) flags.push('ekstrem_gauge')
  if (min != null && max != null && max - min >= 1.5) flags.push('bred_pind')

  return flags.join(',')
}

/** Bygger en review-række til Excel-format. Alle tomme værdier bliver til ''. */
export function yarnRowToReviewCells(yarn) {
  const flags = computeFlags(yarn)
  const suggested = suggestPrimaryNeedle(yarn)
  const row = {
    id: yarn.id,
    producer: yarn.producer ?? '',
    name: yarn.name ?? '',
    series: yarn.series ?? '',
    full_name: yarn.full_name ?? '',
    needle_min_mm: yarn.needle_min_mm ?? '',
    needle_max_mm: yarn.needle_max_mm ?? '',
    gauge_stitches_10cm: yarn.gauge_stitches_10cm ?? '',
    gauge_rows_10cm: yarn.gauge_rows_10cm ?? '',
    gauge_needle_mm: yarn.gauge_needle_mm ?? '',
    foreslået_primær_pind: suggested ?? '',
    bør_kigges_på: flags,
    noter: '',
    bekræftet_primær_pind: '',
    bekræftet_gauge_st: '',
    bekræftet_gauge_omg: '',
  }
  return row
}

/**
 * Parser en bekræftet review-række. Returnerer { id, payload, status }.
 *
 * Det er valgfrit hvor brugeren skriver sine bekræftede værdier:
 *  a) `bekræftet_primær_pind` / `bekræftet_gauge_st` / `bekræftet_gauge_omg`
 *     (oprindeligt design — bevarer DB-værdierne synlige i deres egne kolonner)
 *  b) `gauge_needle_mm` / `gauge_stitches_10cm` / `gauge_rows_10cm` direkte
 *     (mere intuitivt — skriv hvor data hører hjemme)
 *
 * Hvis bekræftet_* er udfyldt, vinder de. Ellers læses de direkte kolonner.
 * Pr.-felt fallback (felt-for-felt), så brugeren kan blande.
 *
 *  - status 'tom': intet at opdatere
 *  - status 'partial': nogle felter er udfyldt; opdaterer KUN dem (de andre forbliver
 *    som i DB pga. COALESCE i UPDATE-statement i import-scriptet)
 *  - status 'komplet': alle tre felter har en værdi
 *  - status 'ugyldig': talværdier er ikke numeriske eller ligger uden for rimelige intervaller
 */
export function parseReviewRow(row) {
  const id = row.id ? String(row.id).trim() : null
  if (!id) return { id: null, payload: null, status: 'ugyldig', reason: 'mangler id' }

  const isEmpty = (v) => v === undefined || v === null || v === ''
  const pick = (confirmed, fallback) => (!isEmpty(confirmed) ? confirmed : fallback)

  const pindRaw = pick(row.bekræftet_primær_pind, row.gauge_needle_mm)
  const stRaw = pick(row.bekræftet_gauge_st, row.gauge_stitches_10cm)
  const omgRaw = pick(row.bekræftet_gauge_omg, row.gauge_rows_10cm)

  const filled = [pindRaw, stRaw, omgRaw].filter((v) => !isEmpty(v)).length
  if (filled === 0) return { id, payload: null, status: 'tom', reason: 'ingen gauge-felter udfyldt' }

  const payload = {}

  if (!isEmpty(pindRaw)) {
    const pindNum = Number(pindRaw)
    if (!Number.isFinite(pindNum) || pindNum <= 0 || pindNum > 25) {
      return { id, payload: null, status: 'ugyldig', reason: `pind ude af interval: ${pindRaw}` }
    }
    payload.gauge_needle_mm = pindNum
  }
  if (!isEmpty(stRaw)) {
    const stNum = Number(stRaw)
    if (!Number.isFinite(stNum) || stNum <= 0 || stNum > 100) {
      return { id, payload: null, status: 'ugyldig', reason: `masker ude af interval: ${stRaw}` }
    }
    payload.gauge_stitches_10cm = stNum
  }
  if (!isEmpty(omgRaw)) {
    const omgNum = Number(omgRaw)
    if (!Number.isFinite(omgNum) || omgNum <= 0 || omgNum > 200) {
      return { id, payload: null, status: 'ugyldig', reason: `omgange ude af interval: ${omgRaw}` }
    }
    payload.gauge_rows_10cm = omgNum
  }

  return {
    id,
    payload,
    status: filled === 3 ? 'komplet' : 'partial',
    reason: filled === 3 ? '' : `kun ${filled}/3 felter udfyldt — kun de udfyldte opdateres`,
  }
}
