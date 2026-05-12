import { describe, it, expect } from 'vitest'
import {
  mapColorSeedToColorRows,
  normalizeHex,
  summarizeDiff,
} from '../lib/catalog/colorSeed.mjs'
import { ALL_COLOR_SEEDS } from '../lib/data/colorSeeds/index.mjs'
import { PERMIN_BELLA_SEED } from '../lib/data/colorSeeds/permin-bella.mjs'
import { PERMIN_BELLA_COLOR_SEED } from '../lib/data/colorSeeds/permin-bella-color.mjs'

describe('normalizeHex', () => {
  it('returnerer #UPPERCASE-hex hvis gyldigt', () => {
    expect(normalizeHex('#f0a0b0')).toBe('#F0A0B0')
    expect(normalizeHex('F0A0B0')).toBe('#F0A0B0')
    expect(normalizeHex('  #FFFFFF  ')).toBe('#FFFFFF')
  })

  it('returnerer null for ugyldige værdier', () => {
    expect(normalizeHex(null)).toBeNull()
    expect(normalizeHex(undefined)).toBeNull()
    expect(normalizeHex('')).toBeNull()
    expect(normalizeHex('not-a-hex')).toBeNull()
    expect(normalizeHex('#FFF')).toBeNull() // 3-cifret kortform afvises (DB-constraint kræver 6)
    expect(normalizeHex('#FFFFFFF')).toBeNull()
    expect(normalizeHex('#GGGGGG')).toBeNull()
  })
})

describe('mapColorSeedToColorRows — basal mapping', () => {
  const seed = {
    producer: 'Test',
    yarnName: 'Demo',
    series: null,
    matchKey: 'color_number' as const,
    entries: [
      { key: '01', hex: '#FFFFFF' },
      { key: '02', hex: '#000000' },
    ],
  }

  it('opdaterer rækker hvor hex_code er NULL', () => {
    const dbColors = [
      { id: 'a', color_number: '01', hex_code: null, yarn_id: 'y' },
      { id: 'b', color_number: '02', hex_code: null, yarn_id: 'y' },
    ]
    const diff = mapColorSeedToColorRows(seed, dbColors)
    expect(diff.updates).toEqual([
      { id: 'a', hex: '#FFFFFF' },
      { id: 'b', hex: '#000000' },
    ])
    expect(diff.conflicts).toHaveLength(0)
    expect(diff.unmatched).toHaveLength(0)
    expect(diff.unchanged).toBe(0)
  })

  it('skipper rækker hvor hex matcher (idempotens)', () => {
    const dbColors = [
      { id: 'a', color_number: '01', hex_code: '#FFFFFF', yarn_id: 'y' },
      { id: 'b', color_number: '02', hex_code: '#000000', yarn_id: 'y' },
    ]
    const diff = mapColorSeedToColorRows(seed, dbColors)
    expect(diff.updates).toHaveLength(0)
    expect(diff.unchanged).toBe(2)
  })

  it('case-insensitive hex-sammenligning', () => {
    const dbColors = [
      { id: 'a', color_number: '01', hex_code: '#ffffff', yarn_id: 'y' },
    ]
    const diff = mapColorSeedToColorRows(seed, dbColors)
    expect(diff.updates).toHaveLength(0)
    expect(diff.unchanged).toBe(1)
  })
})

describe('mapColorSeedToColorRows — manuel-vinder + force', () => {
  const seed = {
    producer: 'Test',
    yarnName: 'Demo',
    matchKey: 'color_number' as const,
    entries: [{ key: '01', hex: '#FFFFFF' }],
  }
  const dbWithManualHex = [
    { id: 'a', color_number: '01', hex_code: '#AABBCC', yarn_id: 'y' },
  ]

  it('uden force: manuel hex bevares, registreres som konflikt', () => {
    const diff = mapColorSeedToColorRows(seed, dbWithManualHex)
    expect(diff.updates).toHaveLength(0)
    expect(diff.conflicts).toEqual([
      { id: 'a', existing: '#AABBCC', seed: '#FFFFFF' },
    ])
  })

  it('med force=true: manuel hex overskrives', () => {
    const diff = mapColorSeedToColorRows(seed, dbWithManualHex, { force: true })
    expect(diff.updates).toEqual([{ id: 'a', hex: '#FFFFFF' }])
    expect(diff.conflicts).toHaveLength(1)
  })
})

describe('mapColorSeedToColorRows — manglende data', () => {
  it('seed-entry med hex=null tæller som missing, opdaterer ikke', () => {
    const seed = {
      producer: 'T', yarnName: 'D', matchKey: 'color_number' as const,
      entries: [{ key: '01', hex: null }],
    }
    const db = [{ id: 'a', color_number: '01', hex_code: null, yarn_id: 'y' }]
    const diff = mapColorSeedToColorRows(seed, db)
    expect(diff.updates).toHaveLength(0)
    expect(diff.missing).toHaveLength(1)
  })

  it('seed-entry uden DB-match tæller som unmatched', () => {
    const seed = {
      producer: 'T', yarnName: 'D', matchKey: 'color_number' as const,
      entries: [{ key: '99', hex: '#FFFFFF' }],
    }
    const db = [{ id: 'a', color_number: '01', hex_code: null, yarn_id: 'y' }]
    const diff = mapColorSeedToColorRows(seed, db)
    expect(diff.updates).toHaveLength(0)
    expect(diff.unmatched).toHaveLength(1)
  })

  it('DB-række uden seed-match tæller som uncovered (kun hvis hex mangler)', () => {
    const seed = {
      producer: 'T', yarnName: 'D', matchKey: 'color_number' as const,
      entries: [{ key: '01', hex: '#FFFFFF' }],
    }
    const db = [
      { id: 'a', color_number: '01', hex_code: null, yarn_id: 'y' },
      { id: 'b', color_number: '02', hex_code: null, yarn_id: 'y' },
      { id: 'c', color_number: '03', hex_code: '#123456', yarn_id: 'y' }, // har hex → ikke uncovered
    ]
    const diff = mapColorSeedToColorRows(seed, db)
    expect(diff.uncovered.map((r) => r.id)).toEqual(['b'])
  })
})

describe('mapColorSeedToColorRows — keyTransform', () => {
  it('anvender keyTransform inden match', () => {
    const seed = {
      producer: 'Permin', yarnName: 'Bella', matchKey: 'color_number' as const,
      keyTransform: (k: string) => k.replace(/^8832/, ''),
      entries: [
        { key: '883247', hex: '#F0A0B0' },
        { key: '8832100', hex: '#2A5A3A' },
      ],
    }
    const db = [
      { id: 'pink', color_number: '47', hex_code: null, yarn_id: 'y' },
      { id: 'gran', color_number: '100', hex_code: null, yarn_id: 'y' },
    ]
    const diff = mapColorSeedToColorRows(seed, db)
    expect(diff.updates).toEqual([
      { id: 'pink', hex: '#F0A0B0' },
      { id: 'gran', hex: '#2A5A3A' },
    ])
  })

  it('kaster ved seed-key-kollision efter transform', () => {
    const seed = {
      producer: 'T', yarnName: 'D', matchKey: 'color_number' as const,
      keyTransform: () => '47',
      entries: [
        { key: '883247', hex: '#FFFFFF' },
        { key: '883247-bis', hex: '#000000' },
      ],
    }
    expect(() => mapColorSeedToColorRows(seed, [])).toThrow(/Seed-kollision/)
  })
})

describe('Permin-seeds matcher faktisk DB-format', () => {
  // Verificerer at keyTransform / direct-match passer mod observerede color_number-formater
  // (snapshot fra MCP-query mod prod 2026-04-28).
  it('Bella articleNumber → 2/3-cifret color_number (drop 8832-prefix)', () => {
    const transform = PERMIN_BELLA_SEED.keyTransform
    if (!transform) throw new Error('PERMIN_BELLA_SEED.keyTransform mangler')
    expect(transform('883201')).toBe('01')
    expect(transform('883247')).toBe('47')
    expect(transform('8832100')).toBe('100')
    expect(transform('8832105')).toBe('105')
  })

  it('Bella Color articleNumber → 6-cifret color_number (ingen transform)', () => {
    expect(PERMIN_BELLA_COLOR_SEED.keyTransform).toBeUndefined()
  })

  it('begge seeds er registreret i ALL_COLOR_SEEDS', () => {
    expect(ALL_COLOR_SEEDS).toContain(PERMIN_BELLA_SEED)
    expect(ALL_COLOR_SEEDS).toContain(PERMIN_BELLA_COLOR_SEED)
  })

  it('Bella seed har Pink (47) → #F0A0B0', () => {
    const transform = PERMIN_BELLA_SEED.keyTransform
    if (!transform) throw new Error('PERMIN_BELLA_SEED.keyTransform mangler')
    const pink = PERMIN_BELLA_SEED.entries.find(
      (e: { key: string }) => transform(e.key) === '47',
    )
    expect(pink).toBeDefined()
    expect(normalizeHex(pink!.hex)).toBe('#F0A0B0')
  })

  it('alle Bella-seed-hex er gyldige #RRGGBB', () => {
    for (const e of PERMIN_BELLA_SEED.entries) {
      expect(normalizeHex(e.hex), `key=${e.key} hex=${e.hex}`).not.toBeNull()
    }
  })

  it('alle Bella Color-seed-hex er gyldige #RRGGBB', () => {
    for (const e of PERMIN_BELLA_COLOR_SEED.entries) {
      expect(normalizeHex(e.hex), `key=${e.key} hex=${e.hex}`).not.toBeNull()
    }
  })
})

describe('summarizeDiff', () => {
  it('producerer label + tællinger', () => {
    const seed = {
      producer: 'Permin', yarnName: 'Bella', series: null,
      matchKey: 'color_number' as const,
      entries: [{ key: '01', hex: '#FFFFFF' }],
    }
    const diff = mapColorSeedToColorRows(seed, [
      { id: 'a', color_number: '01', hex_code: null, yarn_id: 'y' },
    ])
    const s = summarizeDiff(seed, diff)
    expect(s.label).toBe('Permin Bella')
    expect(s.toUpdate).toBe(1)
    expect(s.unchanged).toBe(0)
  })

  it('label uden series (series=null/undefined)', () => {
    const seed = {
      producer: 'Test', yarnName: 'Garn', series: null,
      matchKey: 'color_number' as const,
      entries: [],
    }
    const diff = mapColorSeedToColorRows(seed, [])
    const s = summarizeDiff(seed, diff)
    expect(s.label).toBe('Test Garn')
  })
})

describe('mapColorSeedToColorRows — idempotens round-trip', () => {
  it('2. kørsel efter at updates er applied giver 0 updates og N unchanged', () => {
    const seed = {
      producer: 'T', yarnName: 'D', matchKey: 'color_number' as const,
      entries: [
        { key: '01', hex: '#FFFFFF' },
        { key: '02', hex: '#000000' },
      ],
    }
    // Første kørsel — begge rækker har null hex.
    const dbBefore = [
      { id: 'a', color_number: '01', hex_code: null, yarn_id: 'y' },
      { id: 'b', color_number: '02', hex_code: null, yarn_id: 'y' },
    ]
    const firstDiff = mapColorSeedToColorRows(seed, dbBefore)
    expect(firstDiff.updates).toHaveLength(2)

    // Simulér at DB er opdateret — byg ny dbColors fra updates.
    const dbAfter = dbBefore.map((row) => {
      const update = firstDiff.updates.find((u) => u.id === row.id)
      return update ? { ...row, hex_code: update.hex } : row
    })

    // Anden kørsel — skal give 0 updates og 2 unchanged.
    const secondDiff = mapColorSeedToColorRows(seed, dbAfter)
    expect(secondDiff.updates).toHaveLength(0)
    expect(secondDiff.unchanged).toBe(2)
    expect(secondDiff.conflicts).toHaveLength(0)
  })
})

describe('mapColorSeedToColorRows — kant-tilfælde', () => {
  it('tom dbColors: alle seed-entries er unmatched', () => {
    const seed = {
      producer: 'T', yarnName: 'D', matchKey: 'color_number' as const,
      entries: [
        { key: '01', hex: '#FFFFFF' },
        { key: '02', hex: '#000000' },
      ],
    }
    const diff = mapColorSeedToColorRows(seed, [])
    expect(diff.updates).toHaveLength(0)
    expect(diff.unmatched).toHaveLength(2)
    expect(diff.uncovered).toHaveLength(0)
    expect(diff.unchanged).toBe(0)
  })

  it('seed med 0 entries: alle DB-rækker uden hex er uncovered', () => {
    const seed = {
      producer: 'T', yarnName: 'D', matchKey: 'color_number' as const,
      entries: [],
    }
    const db = [
      { id: 'a', color_number: '01', hex_code: null, yarn_id: 'y' },
      { id: 'b', color_number: '02', hex_code: '#AABBCC', yarn_id: 'y' }, // har hex → ikke uncovered
    ]
    const diff = mapColorSeedToColorRows(seed, db)
    expect(diff.updates).toHaveLength(0)
    expect(diff.uncovered.map((r) => r.id)).toEqual(['a'])
  })

  it('DB-række med color_number=null krasjer ikke og tæller som uncovered hvis hex mangler', () => {
    const seed = {
      producer: 'T', yarnName: 'D', matchKey: 'color_number' as const,
      entries: [{ key: '01', hex: '#FFFFFF' }],
    }
    const db = [
      { id: 'a', color_number: null, hex_code: null, yarn_id: 'y' },
      { id: 'b', color_number: '01', hex_code: null, yarn_id: 'y' },
    ]
    const diff = mapColorSeedToColorRows(seed, db)
    expect(diff.updates).toEqual([{ id: 'b', hex: '#FFFFFF' }])
    expect(diff.uncovered.map((r) => r.id)).toEqual(['a'])
  })

  it('seed-entry med ugyldig (men non-null) hex tæller som missing', () => {
    const seed = {
      producer: 'T', yarnName: 'D', matchKey: 'color_number' as const,
      entries: [{ key: '01', hex: 'not-a-hex' }],
    }
    const db = [{ id: 'a', color_number: '01', hex_code: null, yarn_id: 'y' }]
    const diff = mapColorSeedToColorRows(seed, db)
    expect(diff.updates).toHaveLength(0)
    expect(diff.missing).toHaveLength(1)
  })
})
