/**
 * F5-acceptkriterier for validateForm med status = "Brugt op".
 *
 * AC: validateForm({status:'Brugt op', brugtTilProjekt:''}) → {brugtTilProjekt: '...'}
 * AC: validateForm({status:'Brugt op', brugtTilProjekt:'Sierraknit'}) → {} (forudsat name+brand sat)
 */

import { describe, it, expect } from 'vitest'
import { validateForm } from '@/lib/validators/yarnForm'

const WITH_NAME_BRAND = { name: 'AlpacaGarn', brand: 'Isager' }

describe('F5 validateForm — status Brugt op', () => {
  it('returnerer brugtTilProjekt-fejl når status er "Brugt op" og brugtTilProjekt er tom', () => {
    const errs = validateForm({ ...WITH_NAME_BRAND, status: 'Brugt op', brugtTilProjekt: '' })
    expect(errs).toHaveProperty('brugtTilProjekt')
    expect(typeof errs.brugtTilProjekt).toBe('string')
    expect(errs.brugtTilProjekt!.length).toBeGreaterThan(0)
  })

  it('returnerer brugtTilProjekt-fejl for whitespace-only brugtTilProjekt', () => {
    const errs = validateForm({ ...WITH_NAME_BRAND, status: 'Brugt op', brugtTilProjekt: '   ' })
    expect(errs).toHaveProperty('brugtTilProjekt')
  })

  it('returnerer brugtTilProjekt-fejl for null brugtTilProjekt', () => {
    const errs = validateForm({ ...WITH_NAME_BRAND, status: 'Brugt op', brugtTilProjekt: null })
    expect(errs).toHaveProperty('brugtTilProjekt')
  })

  it('returnerer tomt objekt når status er "Brugt op" og brugtTilProjekt er udfyldt', () => {
    const errs = validateForm({ ...WITH_NAME_BRAND, status: 'Brugt op', brugtTilProjekt: 'Sierraknit' })
    expect(errs).toEqual({})
  })

  it('returnerer tomt objekt for brugtTilProjekt med mellemrum rundt om', () => {
    const errs = validateForm({ ...WITH_NAME_BRAND, status: 'Brugt op', brugtTilProjekt: '  Sierraknit  ' })
    expect(errs).toEqual({})
  })

  it('returnerer INGEN brugtTilProjekt-fejl når status er "På lager" og brugtTilProjekt er tom', () => {
    const errs = validateForm({ ...WITH_NAME_BRAND, status: 'På lager', brugtTilProjekt: '' })
    expect(errs).not.toHaveProperty('brugtTilProjekt')
    expect(errs).toEqual({})
  })

  it('returnerer INGEN brugtTilProjekt-fejl når status er "I brug"', () => {
    const errs = validateForm({ ...WITH_NAME_BRAND, status: 'I brug', brugtTilProjekt: '' })
    expect(errs).not.toHaveProperty('brugtTilProjekt')
  })

  it('returnerer INGEN brugtTilProjekt-fejl når status er "Ønskeliste"', () => {
    const errs = validateForm({ ...WITH_NAME_BRAND, status: 'Ønskeliste', brugtTilProjekt: '' })
    expect(errs).not.toHaveProperty('brugtTilProjekt')
  })

  it('returnerer kun brugtTilProjekt-fejl (ikke name/brand) for katalog-linket garn med Brugt op', () => {
    // catalogYarnId sat → name+brand-validering springes over
    const errs = validateForm({ catalogYarnId: 'cat-1', status: 'Brugt op', brugtTilProjekt: '' })
    expect(errs).toHaveProperty('brugtTilProjekt')
    expect(errs).not.toHaveProperty('name')
    expect(errs).not.toHaveProperty('brand')
  })
})
