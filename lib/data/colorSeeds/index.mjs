// Registry over alle katalog-farve-seeds.
// Tilføj nye producent-seeds her — så bliver de automatisk samlet op af `npm run seed:colors`.

import { PERMIN_BELLA_SEED } from './permin-bella.mjs'
import { PERMIN_BELLA_COLOR_SEED } from './permin-bella-color.mjs'
import { DROPS_KID_SILK_SEED } from './drops-kid-silk.mjs'
import { DROPS_AIR_SEED } from './drops-air.mjs'
import { DROPS_ALASKA_SEED } from './drops-alaska.mjs'
import { DROPS_ALPACA_SEED } from './drops-alpaca.mjs'
import { DROPS_BABY_MERINO_SEED } from './drops-baby-merino.mjs'
import { DROPS_BRUSHED_ALPACA_SILK_SEED } from './drops-brushed-alpaca-silk.mjs'
import { DROPS_FLORA_SEED } from './drops-flora.mjs'
import { DROPS_KARISMA_SEED } from './drops-karisma.mjs'
import { DROPS_MERINO_EXTRA_FINE_SEED } from './drops-merino-extra-fine.mjs'
import { DROPS_SAFRAN_SEED } from './drops-safran.mjs'

/** @type {import('../../catalog/colorSeed.mjs').ColorSeed[]} */
export const ALL_COLOR_SEEDS = [
  PERMIN_BELLA_SEED,
  PERMIN_BELLA_COLOR_SEED,
  DROPS_KID_SILK_SEED,
  DROPS_AIR_SEED,
  DROPS_ALASKA_SEED,
  DROPS_ALPACA_SEED,
  DROPS_BABY_MERINO_SEED,
  DROPS_BRUSHED_ALPACA_SILK_SEED,
  DROPS_FLORA_SEED,
  DROPS_KARISMA_SEED,
  DROPS_MERINO_EXTRA_FINE_SEED,
  DROPS_SAFRAN_SEED,
]
