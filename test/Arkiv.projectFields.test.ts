/**
 * Regression-test: PROJECT_FIELDS i Arkiv.jsx skal indeholde community_size_shown.
 *
 * Denne test ville have fanget bug'en hvor community_size_shown manglede i
 * SELECT-strengen, hvilket betød at feltet aldrig blev hentet fra databasen.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Læs Arkiv.jsx som rå tekst og udpak PROJECT_FIELDS-blokken.
const arkivSource = readFileSync(
  join(process.cwd(), 'components', 'app', 'Arkiv.jsx'),
  'utf-8'
)

// Udpak alle linjer der tilhører PROJECT_FIELDS-definitionen.
// Blokken starter med "const PROJECT_FIELDS =" og slutter ved næste blank linje.
function extractProjectFieldsBlock(source: string): string {
  const lines = source.split('\n')
  const startIdx = lines.findIndex((l) => l.trimStart().startsWith('const PROJECT_FIELDS'))
  if (startIdx === -1) return ''

  const collected: string[] = []
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]
    collected.push(line)
    // Blokken slutter når en linje ikke ender med + eller = og ikke er tom streng
    // (d.v.s. den afsluttende streng uden trailing +)
    if (i > startIdx && !line.trimEnd().endsWith('+') && line.trim() !== '') {
      break
    }
  }
  return collected.join('\n')
}

describe('Arkiv PROJECT_FIELDS regression', () => {
  it('indeholder "community_size_shown" i PROJECT_FIELDS (regression for reviewer-bug)', () => {
    const block = extractProjectFieldsBlock(arkivSource)
    expect(block).not.toBe('')
    expect(block).toContain('community_size_shown')
  })

  it('indeholder alle forventede kerne-felter i PROJECT_FIELDS', () => {
    const block = extractProjectFieldsBlock(arkivSource)
    expect(block).not.toBe('')

    const requiredFields = [
      'id',
      'user_id',
      'title',
      'status',
      'is_shared',
      'community_size_shown',
      'community_description',
      'project_type',
      'pattern_name',
      'pattern_designer',
    ]

    for (const field of requiredFields) {
      expect(block, `Mangler felt: ${field}`).toContain(field)
    }
  })
})
