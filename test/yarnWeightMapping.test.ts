import { describe, it, expect } from 'vitest'
import { mapToYarnWeight, YARN_WEIGHTS, YARN_WEIGHT_LABELS } from '@/lib/yarn-weight'

describe('mapToYarnWeight — kanoniske enum-værdier', () => {
  it('mapper alle 8 kanoniske keys til sig selv', () => {
    for (const w of YARN_WEIGHTS) {
      expect(mapToYarnWeight(w)).toBe(w)
    }
  })

  it('har en label for hver enum-værdi', () => {
    for (const w of YARN_WEIGHTS) {
      expect(YARN_WEIGHT_LABELS[w]).toBeTruthy()
    }
  })
})

describe('mapToYarnWeight — case + whitespace', () => {
  it('case-insensitive', () => {
    expect(mapToYarnWeight('Fingering')).toBe('fingering')
    expect(mapToYarnWeight('FINGERING')).toBe('fingering')
    expect(mapToYarnWeight('DK')).toBe('dk')
  })

  it('trimmer whitespace', () => {
    expect(mapToYarnWeight('  fingering  ')).toBe('fingering')
    expect(mapToYarnWeight('\tlace\n')).toBe('lace')
  })
})

describe('mapToYarnWeight — engelske aliasser', () => {
  it('cobweb og lace weight → lace', () => {
    expect(mapToYarnWeight('cobweb')).toBe('lace')
    expect(mapToYarnWeight('lace weight')).toBe('lace')
  })

  it('sock, super fine og baby → fingering', () => {
    expect(mapToYarnWeight('sock')).toBe('fingering')
    expect(mapToYarnWeight('super fine')).toBe('fingering')
    expect(mapToYarnWeight('baby')).toBe('fingering')
  })

  it('double knit og light worsted → dk', () => {
    expect(mapToYarnWeight('double knit')).toBe('dk')
    expect(mapToYarnWeight('light worsted')).toBe('dk')
  })

  it('chunky → bulky', () => {
    expect(mapToYarnWeight('chunky')).toBe('bulky')
  })

  it('jumbo og roving → super_bulky', () => {
    expect(mapToYarnWeight('jumbo')).toBe('super_bulky')
    expect(mapToYarnWeight('roving')).toBe('super_bulky')
  })

  it('heavy worsted → aran', () => {
    expect(mapToYarnWeight('heavy worsted')).toBe('aran')
  })

  it('medium og afghan → worsted', () => {
    expect(mapToYarnWeight('medium')).toBe('worsted')
    expect(mapToYarnWeight('afghan')).toBe('worsted')
  })
})

describe('mapToYarnWeight — n-ply-notation', () => {
  it('1-ply / 1ply → lace', () => {
    expect(mapToYarnWeight('1-ply')).toBe('lace')
    expect(mapToYarnWeight('1ply')).toBe('lace')
  })

  it('4-ply / 4ply → fingering', () => {
    expect(mapToYarnWeight('4-ply')).toBe('fingering')
    expect(mapToYarnWeight('4ply')).toBe('fingering')
  })

  it('5-ply / 5ply → sport', () => {
    expect(mapToYarnWeight('5-ply')).toBe('sport')
    expect(mapToYarnWeight('5ply')).toBe('sport')
  })

  it('8-ply / 8ply → dk', () => {
    expect(mapToYarnWeight('8-ply')).toBe('dk')
    expect(mapToYarnWeight('8ply')).toBe('dk')
  })

  it('10-ply / 10ply → worsted', () => {
    expect(mapToYarnWeight('10-ply')).toBe('worsted')
    expect(mapToYarnWeight('10ply')).toBe('worsted')
  })

  it('12-ply / 12ply → aran', () => {
    expect(mapToYarnWeight('12-ply')).toBe('aran')
    expect(mapToYarnWeight('12ply')).toBe('aran')
  })

  it('14-ply / 14ply → bulky', () => {
    expect(mapToYarnWeight('14-ply')).toBe('bulky')
    expect(mapToYarnWeight('14ply')).toBe('bulky')
  })
})

describe('mapToYarnWeight — danske aliasser', () => {
  it('sokkegarn → fingering', () => {
    expect(mapToYarnWeight('sokkegarn')).toBe('fingering')
    expect(mapToYarnWeight('Sokkegarn')).toBe('fingering')
  })
})

describe('mapToYarnWeight — super_bulky-varianter', () => {
  it('super_bulky, super bulky, superbulky alle → super_bulky', () => {
    expect(mapToYarnWeight('super_bulky')).toBe('super_bulky')
    expect(mapToYarnWeight('super bulky')).toBe('super_bulky')
    expect(mapToYarnWeight('superbulky')).toBe('super_bulky')
  })
})

describe('mapToYarnWeight — ukendte input → null', () => {
  it('returnerer null for tom streng', () => {
    expect(mapToYarnWeight('')).toBeNull()
    expect(mapToYarnWeight('   ')).toBeNull()
  })

  it('returnerer null for null/undefined', () => {
    expect(mapToYarnWeight(null)).toBeNull()
    expect(mapToYarnWeight(undefined)).toBeNull()
  })

  it('returnerer null for unspun (proces, ikke vægt)', () => {
    expect(mapToYarnWeight('unspun')).toBeNull()
  })

  it('returnerer null for tvetydige danske termer', () => {
    expect(mapToYarnWeight('tynd')).toBeNull()
    expect(mapToYarnWeight('tyk')).toBeNull()
  })

  it('returnerer null for ukendte strenge', () => {
    expect(mapToYarnWeight('foobar')).toBeNull()
    expect(mapToYarnWeight('extra fluffy')).toBeNull()
  })
})

describe('mapToYarnWeight — BC Garn Luxor case', () => {
  // SQL'en har en eksplicit override for BC Garn Luxor (uafhængigt af thickness_category).
  // Vi tester her at hvis thickness_category var 'lace' (gammel forkert værdi),
  // ville mapToYarnWeight returnere 'lace' — men SQL'ens eksplicitte UPDATE
  // efter backfill sætter den til 'fingering'.
  it('thickness_category="lace" alene mappes til lace (override sker i SQL)', () => {
    expect(mapToYarnWeight('lace')).toBe('lace')
  })

  it('thickness_category="fingering" mappes korrekt til fingering', () => {
    expect(mapToYarnWeight('fingering')).toBe('fingering')
  })
})
