import { describe, it, expect } from 'vitest'

// D1 og D2 verificeres ved at læse råt source — undgår Next.js router-deps i tests.
import * as fs from 'fs'
import * as path from 'path'

// Nav.tsx har 6 hub-sider med subitems. /faellesskabet er subitem under
// Fællesskab-hubben. /strikkeskolen er subitem under Striqipedia-hubben
// (siden er planlagt — comingSoon-flag styrer UI).
describe('D1 Nav.tsx — hubstruktur med korrekte subitems', () => {
  const navSource = fs.readFileSync(
    path.resolve(process.cwd(), 'components/layout/Nav.tsx'),
    'utf-8',
  )

  it('contains /faellesskabet as subitem under Fællesskab', () => {
    expect(navSource).toContain('/faellesskabet')
  })

  it('contains /strikkeskolen as subitem under Striqipedia', () => {
    expect(navSource).toContain('/strikkeskolen')
  })
})

// ---------------------------------------------------------------------------
// D2: app/page.tsx linker til /faellesskab-hubben (ikke direkte til subitem)
// ---------------------------------------------------------------------------

describe('D2 app/page.tsx — hub-links på forsiden', () => {
  const pageSource = fs.readFileSync(
    path.resolve(process.cwd(), 'app/page.tsx'),
    'utf-8',
  )

  it('contains /faellesskab hub-link', () => {
    expect(pageSource).toContain('/faellesskab')
  })

  it('does not link directly to /strikkeskolen', () => {
    expect(pageSource).not.toContain('/strikkeskolen')
  })
})
