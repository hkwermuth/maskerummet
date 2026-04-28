// Hex-seed for Permin Bella Color (samme komposition som Bella).
//
// DB-mapping (verificeret 2026-04-28):
// - yarns: producer='Permin', name='Bella Color', series='Bella Color by Permin'
// - colors.color_number: 6-cifret med fuldt prefix ('883146'..'883197')
// - articleNumber i kilden: '883146'..'883197'
// → ingen keyTransform nødvendig (1:1).

import { BELLA_COLOR } from '../perminCatalog.js'

/** @type {import('../../catalog/colorSeed.mjs').ColorSeed} */
export const PERMIN_BELLA_COLOR_SEED = {
  producer: 'Permin',
  yarnName: 'Bella Color',
  series: 'Bella Color by Permin',
  matchKey: 'color_number',
  entries: BELLA_COLOR.map((e) => ({
    key: e.articleNumber,
    hex: e.hex ?? null,
    colorNameDa: e.colorName,
  })),
}
