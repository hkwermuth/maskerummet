/**
 * Unit-tests for buildLoginHref.
 * Dækker alle 12 acceptkriterier for "Return-to-page efter login"-featuren.
 */
import { describe, it, expect } from 'vitest'
import { buildLoginHref } from '@/lib/auth/buildLoginHref'

describe('buildLoginHref', () => {
  // AC1: null → /login
  it('AC1: null returnerer /login', () => {
    expect(buildLoginHref(null)).toBe('/login')
  })

  // AC2: undefined → /login
  it('AC2: undefined returnerer /login', () => {
    expect(buildLoginHref(undefined)).toBe('/login')
  })

  // AC3: Tom streng → /login
  it('AC3: tom streng returnerer /login', () => {
    expect(buildLoginHref('')).toBe('/login')
  })

  // AC4: Whitelistet sti /visualizer → /login?next=%2Fvisualizer
  it('AC4: /visualizer returnerer /login?next=%2Fvisualizer', () => {
    expect(buildLoginHref('/visualizer')).toBe('/login?next=%2Fvisualizer')
  })

  // AC5: Whitelistet sti /garnlager → /login?next=%2Fgarnlager
  it('AC5: /garnlager returnerer /login?next=%2Fgarnlager', () => {
    expect(buildLoginHref('/garnlager')).toBe('/login?next=%2Fgarnlager')
  })

  // AC6: Ikke-whitelistet sti /admin → /login
  it('AC6: /admin returnerer /login (ikke whitelistet)', () => {
    expect(buildLoginHref('/admin')).toBe('/login')
  })

  // AC7: Ikke-whitelistet sti /om-striq → /login
  it('AC7: /om-striq returnerer /login (ikke whitelistet)', () => {
    expect(buildLoginHref('/om-striq')).toBe('/login')
  })

  // AC8: Protocol-relative //evil.com → /login
  it('AC8: //evil.com returnerer /login (protocol-relative afvises)', () => {
    expect(buildLoginHref('//evil.com')).toBe('/login')
  })

  // AC9: Absolut URL https://evil.com → /login
  it('AC9: https://evil.com returnerer /login (absolut URL afvises)', () => {
    expect(buildLoginHref('https://evil.com')).toBe('/login')
  })

  // AC10: Whitelistet sti med query /visualizer?step=2 → /login?next=%2Fvisualizer%3Fstep%3D2
  it('AC10: /visualizer?step=2 returnerer /login?next=%2Fvisualizer%3Fstep%3D2', () => {
    expect(buildLoginHref('/visualizer?step=2')).toBe(
      '/login?next=%2Fvisualizer%3Fstep%3D2'
    )
  })

  // AC11: Whitelistet sti med fragment /visualizer#foo → /login?next=%2Fvisualizer%23foo
  it('AC11: /visualizer#foo returnerer /login?next=%2Fvisualizer%23foo', () => {
    expect(buildLoginHref('/visualizer#foo')).toBe(
      '/login?next=%2Fvisualizer%23foo'
    )
  })

  // AC12: Backslash-injection /\evil.com → /login
  it('AC12: /\\evil.com returnerer /login (backslash-injection afvises)', () => {
    expect(buildLoginHref('/\\evil.com')).toBe('/login')
  })
})
