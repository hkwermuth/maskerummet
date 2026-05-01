// Registry over alle katalog-farve-seeds.
// Tilføj nye producent-seeds her — så bliver de automatisk samlet op af `npm run seed:colors`.

import { PERMIN_BELLA_SEED } from './permin-bella.mjs'
import { PERMIN_BELLA_COLOR_SEED } from './permin-bella-color.mjs'
import { DROPS_KID_SILK_SEED } from './drops-kid-silk.mjs'

/** @type {import('../../catalog/colorSeed.mjs').ColorSeed[]} */
export const ALL_COLOR_SEEDS = [
  PERMIN_BELLA_SEED,
  PERMIN_BELLA_COLOR_SEED,
  DROPS_KID_SILK_SEED,
]
