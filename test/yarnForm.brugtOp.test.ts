/**
 * F15 acceptkriterier for validateForm — Brugt op-mode-validering.
 *
 * AC: Status='Brugt op' med mode='none' → ingen fejl (valgfri kobling).
 * AC: Status='Brugt op' med mode='existing' uden brugtOpProjectId → fejl.
 * AC: Status='Brugt op' med mode='new' uden brugtOpNewTitle → fejl.
 * AC: Status='Brugt op' med mode='existing' + projekt valgt → ingen fejl.
 * AC: Status='Brugt op' med mode='new' + titel udfyldt → ingen fejl.
 * AC: Status≠'Brugt op' → mode-fejl ignoreres.
 */

import { describe, it, expect } from 'vitest'
import { validateForm } from '@/lib/validators/yarnForm'

describe('validateForm — Brugt op-mode (F15)', () => {
  const baseValid = { name: 'Garn', brand: 'Mærke' }

  it('mode="none" + status="Brugt op" → ingen brugtOp-fejl', () => {
    const errs = validateForm({ ...baseValid, status: 'Brugt op', brugtOpMode: 'none' })
    expect(errs.brugtOpProjectId).toBeUndefined()
    expect(errs.brugtOpNewTitle).toBeUndefined()
  })

  it('mode default (uden eksplicit værdi) opfører sig som "none"', () => {
    const errs = validateForm({ ...baseValid, status: 'Brugt op' })
    expect(errs.brugtOpProjectId).toBeUndefined()
    expect(errs.brugtOpNewTitle).toBeUndefined()
  })

  it('mode="existing" uden brugtOpProjectId → fejl', () => {
    const errs = validateForm({
      ...baseValid,
      status: 'Brugt op',
      brugtOpMode: 'existing',
      brugtOpProjectId: '',
    })
    expect(errs.brugtOpProjectId).toBe('Vælg et projekt')
  })

  it('mode="existing" med brugtOpProjectId → ingen fejl', () => {
    const errs = validateForm({
      ...baseValid,
      status: 'Brugt op',
      brugtOpMode: 'existing',
      brugtOpProjectId: 'p-1',
    })
    expect(errs.brugtOpProjectId).toBeUndefined()
  })

  it('mode="new" uden brugtOpNewTitle → fejl', () => {
    const errs = validateForm({
      ...baseValid,
      status: 'Brugt op',
      brugtOpMode: 'new',
      brugtOpNewTitle: '',
    })
    expect(errs.brugtOpNewTitle).toBe('Skriv en projekttitel')
  })

  it('mode="new" med whitespace-titel → fejl', () => {
    const errs = validateForm({
      ...baseValid,
      status: 'Brugt op',
      brugtOpMode: 'new',
      brugtOpNewTitle: '   ',
    })
    expect(errs.brugtOpNewTitle).toBe('Skriv en projekttitel')
  })

  it('mode="new" med rigtig titel → ingen fejl', () => {
    const errs = validateForm({
      ...baseValid,
      status: 'Brugt op',
      brugtOpMode: 'new',
      brugtOpNewTitle: 'Sommertop',
    })
    expect(errs.brugtOpNewTitle).toBeUndefined()
  })

  it('status="På lager" ignorerer brugtOp-mode', () => {
    const errs = validateForm({
      ...baseValid,
      status: 'På lager',
      brugtOpMode: 'existing',
      brugtOpProjectId: '',
    })
    expect(errs.brugtOpProjectId).toBeUndefined()
  })

  it('catalogYarnId sat → name/brand-validering springes over', () => {
    const errs = validateForm({
      catalogYarnId: 'cat-1',
      status: 'Brugt op',
      brugtOpMode: 'none',
    })
    expect(errs.name).toBeUndefined()
    expect(errs.brand).toBeUndefined()
  })
})
