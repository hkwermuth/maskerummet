// Hex-seed for Permin Bella (75% Kid Mohair, 20% Uld, 5% Polyamid).
// Genbruger BELLA-arrayet fra det eksisterende katalog så hex-værdier
// kun lever ét sted i kodebasen.
//
// DB-mapping (verificeret 2026-04-28):
// - yarns: producer='Permin', name='Bella', series='by Permin'
// - colors.color_number: 2-3 cifret uden prefix ('01'..'99', '100'..'105')
// - articleNumber i kilden: '883201'..'883299', '8832100'..'8832105'
// → keyTransform: drop "8832"-prefix.

import { BELLA } from '../perminCatalog.js'

const STRIP_BELLA_PREFIX = (key) => String(key).replace(/^8832/, '')

/** @type {import('../../catalog/colorSeed.mjs').ColorSeed} */
export const PERMIN_BELLA_SEED = {
  producer: 'Permin',
  yarnName: 'Bella',
  series: 'by Permin',
  matchKey: 'color_number',
  keyTransform: STRIP_BELLA_PREFIX,
  entries: BELLA.map((e) => ({
    key: e.articleNumber,
    hex: e.hex ?? null,
    colorNameDa: e.colorNameDa,
  })),
}
