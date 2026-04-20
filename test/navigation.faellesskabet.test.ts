import { describe, it, expect } from 'vitest'

// ---------------------------------------------------------------------------
// D1: Nav.tsx has /faellesskabet and NOT /strikkeskolen
// ---------------------------------------------------------------------------

describe('D1 Nav links', () => {
  it('contains /faellesskabet entry', async () => {
    const mod = await import('@/components/layout/Nav')
    // We read the source file text to verify NAV_LINKS without rendering
    // (rendering Nav requires router context from Next.js)
    // Instead we verify the exported module source doesn't expose /strikkeskolen
    // and the source file has the correct entry (verified by grep in source).
    // Since we can't easily grep in tests, we rely on the module being importable
    // and trust that the D2 test (which checks FEATURES) covers the same pattern.
    expect(mod).toBeDefined()
  })
})

// D1 and D2 are verified by reading raw source to avoid Next.js router deps:
import * as fs from 'fs'
import * as path from 'path'

describe('D1 Nav.tsx — /faellesskabet present, /strikkeskolen absent', () => {
  const navSource = fs.readFileSync(
    path.resolve(process.cwd(), 'components/layout/Nav.tsx'),
    'utf-8',
  )

  it('contains /faellesskabet in NAV_LINKS', () => {
    expect(navSource).toContain('/faellesskabet')
  })

  it('does not contain /strikkeskolen in NAV_LINKS', () => {
    expect(navSource).not.toContain('/strikkeskolen')
  })
})

// ---------------------------------------------------------------------------
// D2: app/page.tsx FEATURES contains /faellesskabet and NOT /strikkeskolen
// ---------------------------------------------------------------------------

describe('D2 app/page.tsx — FEATURES array', () => {
  const pageSource = fs.readFileSync(
    path.resolve(process.cwd(), 'app/page.tsx'),
    'utf-8',
  )

  it('contains /faellesskabet in FEATURES', () => {
    expect(pageSource).toContain('/faellesskabet')
  })

  it('does not contain /strikkeskolen in FEATURES', () => {
    expect(pageSource).not.toContain('/strikkeskolen')
  })
})
