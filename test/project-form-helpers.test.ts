/**
 * Unit-tests for lib/project-form-helpers.ts
 * Verificerer acceptkriterierne fra BACKLOG 8.8 Trin 4:
 *  - safeExt
 *  - makeImagePath
 *  - findDuplicateLineIndex
 *  - patchTouchesIdentity
 *  - pathFromUrl (default KNOWN_BUCKETS)
 *  - mergeDuplicateLines
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  safeExt,
  makeImagePath,
  findDuplicateLineIndex,
  patchTouchesIdentity,
  pathFromUrl,
  mergeDuplicateLines,
  type YarnLineIdentity,
} from '@/lib/project-form-helpers'

// ── safeExt ──────────────────────────────────────────────────────────────────
describe('safeExt', () => {
  it('returnerer extension fra filnavn', () => {
    expect(safeExt('photo.JPG')).toBe('jpg')
  })
  it('returnerer fallback for null', () => {
    expect(safeExt(null)).toBe('bin')
  })
  it('returnerer fallback for undefined', () => {
    expect(safeExt(undefined)).toBe('bin')
  })
  it('returnerer fallback for navn uden extension', () => {
    expect(safeExt('noext')).toBe('bin')
  })
  it('accepterer custom fallback', () => {
    expect(safeExt('', 'pdf')).toBe('pdf')
  })
  it('håndterer png, pdf, webp', () => {
    expect(safeExt('img.png')).toBe('png')
    expect(safeExt('doc.pdf')).toBe('pdf')
    expect(safeExt('img.webp')).toBe('webp')
  })
})

// ── makeImagePath ─────────────────────────────────────────────────────────────
describe('makeImagePath', () => {
  it('returnerer en funktion der bygger sti med korrekt prefix og extension', () => {
    const fn = makeImagePath('user-1', 'proj-1')
    const path = fn('jpg')
    expect(path).toMatch(/^user-1\/projects\/proj-1\/.+\.jpg$/)
  })
  it('to kald producerer unikke UUID-stier', () => {
    const fn1 = makeImagePath('user-1', 'proj-1')
    const fn2 = makeImagePath('user-1', 'proj-1')
    expect(fn1('png')).not.toBe(fn2('png'))
  })
})

// ── findDuplicateLineIndex ────────────────────────────────────────────────────
describe('findDuplicateLineIndex', () => {
  type Line = YarnLineIdentity & { name?: string }

  const lines: Line[] = [
    { yarnItemId: 'yi-1', yarnBrand: 'Drops', colorName: 'Rød', colorCode: '01' },
    { yarnItemId: 'yi-2', yarnBrand: 'Drops', colorName: 'Blå', colorCode: '02' },
    { catalogColorId: 'cc-3', yarnBrand: 'Sandnes', colorName: 'Gul', colorCode: '03' },
    { yarnBrand: 'Lang', colorName: 'Sort', colorCode: '04' },
  ]

  it('finder duplikat via yarnItemId', () => {
    expect(findDuplicateLineIndex(lines, { yarnItemId: 'yi-1' }, 2)).toBe(0)
  })
  it('ignorerer current index', () => {
    expect(findDuplicateLineIndex(lines, { yarnItemId: 'yi-1' }, 0)).toBe(-1)
  })
  it('finder duplikat via catalogColorId', () => {
    expect(findDuplicateLineIndex(lines, { catalogColorId: 'cc-3' }, 0)).toBe(2)
  })
  it('finder duplikat via brand+colorName+colorCode (case-insensitiv)', () => {
    const current: Line = { yarnBrand: 'LANG', colorName: 'SORT', colorCode: '04' }
    expect(findDuplicateLineIndex(lines, current, 10)).toBe(3)
  })
  it('returnerer -1 hvis ingen duplikat', () => {
    expect(findDuplicateLineIndex(lines, { yarnItemId: 'yi-99' }, 0)).toBe(-1)
  })
  it('prioriterer yarnItemId over catalogColorId', () => {
    const withBoth: Line[] = [
      { yarnItemId: 'yi-X', catalogColorId: 'cc-X', yarnBrand: 'B', colorName: 'C', colorCode: 'D' },
      { yarnItemId: 'yi-X' },
      { catalogColorId: 'cc-X' },
    ]
    // Fra index 3 (ude af array): finder via yarnItemId = index 0
    expect(findDuplicateLineIndex(withBoth, { yarnItemId: 'yi-X', catalogColorId: 'cc-X' }, 3)).toBe(0)
  })
})

// ── patchTouchesIdentity ──────────────────────────────────────────────────────
describe('patchTouchesIdentity', () => {
  it('returnerer true for yarnItemId', () => {
    expect(patchTouchesIdentity({ yarnItemId: 'x' })).toBe(true)
  })
  it('returnerer true for catalogColorId', () => {
    expect(patchTouchesIdentity({ catalogColorId: 'x' })).toBe(true)
  })
  it('returnerer true for yarnBrand', () => {
    expect(patchTouchesIdentity({ yarnBrand: 'Drops' })).toBe(true)
  })
  it('returnerer true for colorName', () => {
    expect(patchTouchesIdentity({ colorName: 'Rød' })).toBe(true)
  })
  it('returnerer true for colorCode', () => {
    expect(patchTouchesIdentity({ colorCode: '01' })).toBe(true)
  })
  it('returnerer false for kun qty-patch', () => {
    expect(patchTouchesIdentity({ quantityUsed: 5 })).toBe(false)
  })
  it('returnerer false for tomt patch', () => {
    expect(patchTouchesIdentity({})).toBe(false)
  })
})

// ── pathFromUrl ───────────────────────────────────────────────────────────────
describe('pathFromUrl', () => {
  it('parser path fra yarn-images URL uden eksplicit buckets-arg (KNOWN_BUCKETS)', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/yarn-images/user-1/projects/p-1/img.jpg'
    expect(pathFromUrl(url)).toBe('user-1/projects/p-1/img.jpg')
  })
  it('parser path fra patterns URL uden eksplicit buckets-arg', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/patterns/user-1/projects/p-1/doc.pdf'
    expect(pathFromUrl(url)).toBe('user-1/projects/p-1/doc.pdf')
  })
  it('ignorerer query string (signed URL)', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/sign/yarn-images/user-1/img.jpg?token=abc'
    expect(pathFromUrl(url)).toBe('user-1/img.jpg')
  })
  it('returnerer null for null', () => {
    expect(pathFromUrl(null)).toBeNull()
  })
  it('returnerer null for undefined', () => {
    expect(pathFromUrl(undefined)).toBeNull()
  })
  it('returnerer null hvis bucket ikke genkendes', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/unknown-bucket/file.jpg'
    expect(pathFromUrl(url)).toBeNull()
  })
  it('accepterer eksplicit buckets-arg', () => {
    const url = 'https://abc.supabase.co/storage/v1/object/public/my-bucket/file.jpg'
    expect(pathFromUrl(url, ['my-bucket'])).toBe('file.jpg')
  })
  it('returnerer null for ugyldig URL', () => {
    expect(pathFromUrl('not-a-url')).toBeNull()
  })
})

// ── mergeDuplicateLines ───────────────────────────────────────────────────────
describe('mergeDuplicateLines', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      confirm: vi.fn(() => true),
    })
  })

  type Line = YarnLineIdentity & { id?: string }

  it('returnerer original array uændret hvis ingen duplikater', () => {
    const lines: Line[] = [
      { yarnItemId: 'yi-1', quantityUsed: 2 },
      { yarnItemId: 'yi-2', quantityUsed: 3 },
    ]
    const result = mergeDuplicateLines(lines)
    expect(result).toBe(lines) // Same reference — ingen merge sket
  })

  it('merger duplikat-par og lægger qty sammen ved confirm=true', () => {
    vi.mocked(window.confirm).mockReturnValue(true)
    const lines: Line[] = [
      { yarnItemId: 'yi-1', yarnBrand: 'Drops', yarnName: 'Big Merino', quantityUsed: 2 },
      { yarnItemId: 'yi-1', yarnBrand: 'Drops', yarnName: 'Big Merino', quantityUsed: 3 },
    ]
    const result = mergeDuplicateLines(lines)
    expect(result.length).toBe(1)
    expect(result[0].quantityUsed).toBe(5)
  })

  it('returnerer original array hvis bruger afviser merge (confirm=false)', () => {
    vi.mocked(window.confirm).mockReturnValue(false)
    const lines: Line[] = [
      { yarnItemId: 'yi-1', quantityUsed: 2 },
      { yarnItemId: 'yi-1', quantityUsed: 3 },
    ]
    const result = mergeDuplicateLines(lines)
    expect(result).toBe(lines)
  })

  it('springer merge over hvis én linje har qty=0', () => {
    const lines: Line[] = [
      { yarnItemId: 'yi-1', quantityUsed: 0 },
      { yarnItemId: 'yi-1', quantityUsed: 3 },
    ]
    const result = mergeDuplicateLines(lines)
    expect(result).toBe(lines)
    expect(window.confirm).not.toHaveBeenCalled()
  })

  it('bevarer laveste-index-linjen ved merge', () => {
    vi.mocked(window.confirm).mockReturnValue(true)
    const lines: Line[] = [
      { id: 'line-a', yarnItemId: 'yi-5', quantityUsed: 1 },
      { id: 'line-b', yarnItemId: 'yi-5', quantityUsed: 4 },
    ]
    const result = mergeDuplicateLines(lines)
    expect(result[0].id).toBe('line-a')
  })

  it('vises confirm-dialog med korrekt tekst', () => {
    vi.mocked(window.confirm).mockReturnValue(true)
    const lines: Line[] = [
      { yarnItemId: 'yi-1', yarnBrand: 'Drops', yarnName: 'Karisma', quantityUsed: 2 },
      { yarnItemId: 'yi-1', yarnBrand: 'Drops', yarnName: 'Karisma', quantityUsed: 3 },
    ]
    mergeDuplicateLines(lines)
    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('Drops · Karisma'),
    )
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('5 ngl'))
  })

  it('fungerer i server-side miljø (window=undefined) — returnerer original', () => {
    vi.stubGlobal('window', undefined)
    const lines: Line[] = [
      { yarnItemId: 'yi-1', quantityUsed: 2 },
      { yarnItemId: 'yi-1', quantityUsed: 3 },
    ]
    const result = mergeDuplicateLines(lines)
    // In SSR context returns lines unchanged
    expect(result).toBe(lines)
  })
})
