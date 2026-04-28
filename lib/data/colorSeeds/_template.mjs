// Skabelon for nye katalog-farve-seeds.
//
// 1. Kopiér denne fil til `<producer>-<yarn>.mjs` (lowercase, kebab-case).
// 2. Udfyld `producer`, `yarnName`, `series` så de matcher EKSAKT værdierne
//    i tabellerne `yarns.producer/name/series`. Verificér via SQL-query.
// 3. `matchKey` siger hvilken kolonne i `colors` seeds-keys matches mod.
//    Vælg 'color_number' (default), 'articleNumber' eller 'barcode'.
// 4. `keyTransform` (valgfri): hvis kilde-formatet afviger fra DB-formatet,
//    transformér rå-key her. Eksempel: strip producent-prefix.
// 5. `entries`: én pr. farve. `hex: null` = farve kendt, men hex mangler endnu.
//    Pipelinen springer dem over og rapporterer dem under "missing" — ikke en fejl.
//
// Tilføj til registry: importér fra `./index.mjs` og put i ALL_COLOR_SEEDS.

/** @type {import('../../catalog/colorSeed.mjs').ColorSeed} */
export const TEMPLATE_SEED = {
  producer: 'Eksempel-producent',
  yarnName: 'Eksempel-garn',
  series: null,
  matchKey: 'color_number',
  // keyTransform: (k) => k.replace(/^prefix/, ''),
  entries: [
    // { key: '01', hex: '#FFFFFF', colorNameDa: 'Hvid' },
    // { key: '02', hex: null,      colorNameDa: 'Mangler hex' },
  ],
}
