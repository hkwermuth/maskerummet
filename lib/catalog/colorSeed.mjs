// Generisk hex-import-pipeline for katalog-farver.
// Holdt pure (ingen I/O) så den er fuldt testbar via Vitest.
//
// Kontrakter:
// - Input: én ColorSeed (rå data fra producent) + array af DbColorRow (eksisterende rækker for det yarn).
// - Output: SeedDiff med opdateringer, konflikter, manglende matches og uændrede rækker.
// - Manuel hex i DB beskyttes: kun NULL/tom hex_code opdateres, medmindre force=true.

/**
 * @typedef {Object} ColorSeedEntry
 * @property {string} key            Rå nøgle som den findes i kilde-data (fx Permins articleNumber).
 * @property {string|null} hex       Hex-kode i format #RRGGBB. null hvis ukendt.
 * @property {string} [colorNameDa]  Dansk farvenavn (informativt).
 * @property {string} [status]
 */

/**
 * @typedef {Object} ColorSeed
 * @property {string} producer
 * @property {string} yarnName       Værdi der matches mod yarns.name.
 * @property {string|null} [series]  Værdi der matches mod yarns.series. null = match hvor series IS NULL.
 * @property {'color_number'|'articleNumber'|'barcode'} matchKey
 * @property {(rawKey: string) => string} [keyTransform]
 * @property {ColorSeedEntry[]} entries
 */

/**
 * @typedef {Object} DbColorRow
 * @property {string} id
 * @property {string|null} color_number
 * @property {string|null} hex_code
 * @property {string} yarn_id
 */

/**
 * @typedef {Object} SeedDiff
 * @property {{id: string, hex: string}[]} updates           Rækker der skal opdateres.
 * @property {ColorSeedEntry[]} unmatched                    Seeds uden DB-match.
 * @property {ColorSeedEntry[]} missing                      Seed-entries med hex=null/ugyldig.
 * @property {DbColorRow[]} uncovered                        DB-rækker uden hex og uden seed-match.
 * @property {{id: string, existing: string, seed: string}[]} conflicts  DB-hex afviger fra seed-hex.
 * @property {number} unchanged                              DB-hex matcher seed-hex (no-op).
 */

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

/** Normaliserer hex til #RRGGBB med uppercase, eller returnerer null hvis ugyldig. */
export function normalizeHex(value) {
  if (value === null || value === undefined) return null
  const v = String(value).trim()
  if (!v) return null
  const withHash = v.startsWith('#') ? v : `#${v}`
  return HEX_RE.test(withHash) ? withHash.toUpperCase() : null
}

/** Identitets-transform — bruges som default når seed ikke har egen keyTransform. */
const identity = (k) => k

/**
 * Match seed mod eksisterende `colors`-rækker for ét yarn.
 * Pure: ingen I/O, ingen sideeffekter.
 *
 * @param {ColorSeed} seed
 * @param {DbColorRow[]} dbColors
 * @param {{ force?: boolean }} [opts]
 * @returns {SeedDiff}
 */
export function mapColorSeedToColorRows(seed, dbColors, opts = {}) {
  if (!seed || !Array.isArray(seed.entries)) {
    throw new Error('mapColorSeedToColorRows: seed.entries skal være et array')
  }
  const transform = seed.keyTransform ?? identity
  const seedByKey = new Map()
  for (const entry of seed.entries) {
    if (!entry || typeof entry.key !== 'string') {
      throw new Error('mapColorSeedToColorRows: hver entry skal have en string-key')
    }
    const dbKey = transform(entry.key)
    if (seedByKey.has(dbKey)) {
      throw new Error(
        `Seed-kollision i ${seed.producer}/${seed.yarnName}: nøglen "${dbKey}" findes 2x`,
      )
    }
    seedByKey.set(dbKey, entry)
  }

  const updates = []
  const conflicts = []
  const uncovered = []
  const seenSeedKeys = new Set()
  let unchanged = 0

  for (const row of dbColors) {
    const rowKey = row.color_number ?? ''
    const seedEntry = seedByKey.get(rowKey)
    if (!seedEntry) {
      if (!normalizeHex(row.hex_code)) uncovered.push(row)
      continue
    }
    seenSeedKeys.add(rowKey)
    const seedHex = normalizeHex(seedEntry.hex)
    if (!seedHex) continue
    const dbHex = normalizeHex(row.hex_code)
    if (!dbHex) {
      updates.push({ id: row.id, hex: seedHex })
      continue
    }
    if (dbHex === seedHex) {
      unchanged += 1
      continue
    }
    conflicts.push({ id: row.id, existing: dbHex, seed: seedHex })
    if (opts.force) {
      updates.push({ id: row.id, hex: seedHex })
    }
  }

  const unmatched = []
  const missing = []
  for (const entry of seed.entries) {
    const dbKey = transform(entry.key)
    if (!seenSeedKeys.has(dbKey)) {
      unmatched.push(entry)
      continue
    }
    if (!normalizeHex(entry.hex)) {
      missing.push(entry)
    }
  }

  return { updates, unmatched, missing, uncovered, conflicts, unchanged }
}

/**
 * Bygger en oversigts-rapport over en SeedDiff til human-readable output.
 * @param {ColorSeed} seed
 * @param {SeedDiff} diff
 */
export function summarizeDiff(seed, diff) {
  const label = `${seed.producer} ${seed.yarnName}${seed.series ? ` (${seed.series})` : ''}`
  return {
    label,
    toUpdate: diff.updates.length,
    unchanged: diff.unchanged,
    conflicts: diff.conflicts.length,
    unmatchedSeeds: diff.unmatched.length,
    missingHex: diff.missing.length,
    uncoveredDbRows: diff.uncovered.length,
  }
}
