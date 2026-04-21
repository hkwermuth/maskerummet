import { describe, it, expect } from 'vitest'
import { validateForm } from '@/lib/validators/yarnForm'

// ---------------------------------------------------------------------------
// C1-C4: validateForm pure function
// ---------------------------------------------------------------------------

describe('C1 validateForm — name er tom', () => {
  it('returnerer name-fejl når name er tom streng', () => {
    const errs = validateForm({ name: '', brand: 'Isager' })
    expect(errs).toHaveProperty('name')
    expect(typeof errs.name).toBe('string')
    expect(errs.name!.length).toBeGreaterThan(0)
  })

  it('returnerer ingen brand-fejl når brand er udfyldt', () => {
    const errs = validateForm({ name: '', brand: 'Isager' })
    expect(errs).not.toHaveProperty('brand')
  })
})

describe('C2 validateForm — brand er tom', () => {
  it('returnerer brand-fejl når brand er tom streng', () => {
    const errs = validateForm({ name: 'Merinosilke', brand: '' })
    expect(errs).toHaveProperty('brand')
    expect(typeof errs.brand).toBe('string')
    expect(errs.brand!.length).toBeGreaterThan(0)
  })

  it('returnerer ingen name-fejl når name er udfyldt', () => {
    const errs = validateForm({ name: 'Merinosilke', brand: '' })
    expect(errs).not.toHaveProperty('name')
  })
})

describe('C3 validateForm — begge felter udfyldt', () => {
  it('returnerer tomt objekt når name og brand begge er udfyldt', () => {
    const errs = validateForm({ name: 'Merinosilke', brand: 'Isager' })
    expect(errs).toEqual({})
  })

  it('returnerer tomt objekt med ekstra felter i input', () => {
    const errs = validateForm({ name: 'Merinosilke', brand: 'Isager', weight: 'DK', antal: 2 })
    expect(errs).toEqual({})
  })
})

describe('C4 validateForm — whitespace behandles som tomt', () => {
  it('returnerer name-fejl for name kun bestående af mellemrum', () => {
    const errs = validateForm({ name: '   ', brand: 'Isager' })
    expect(errs).toHaveProperty('name')
  })

  it('returnerer brand-fejl for brand kun bestående af mellemrum', () => {
    const errs = validateForm({ name: 'Merinosilke', brand: '  ' })
    expect(errs).toHaveProperty('brand')
  })

  it('returnerer begge fejl når begge felter kun indeholder whitespace', () => {
    const errs = validateForm({ name: '\t', brand: ' ' })
    expect(errs).toHaveProperty('name')
    expect(errs).toHaveProperty('brand')
  })

  it('returnerer ingen fejl for name med indhold omgivet af mellemrum', () => {
    // "  Merino  ".trim() = "Merino" — stadig gyldigt
    const errs = validateForm({ name: '  Merino  ', brand: 'Isager' })
    expect(errs).not.toHaveProperty('name')
  })
})
