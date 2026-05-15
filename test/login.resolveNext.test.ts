/**
 * Unit-tests for resolveNext() — open-redirect whitelist i login-siden.
 * Sikkerhedskritisk: en fejl her åbner for phishing-angreb.
 */
import { describe, it, expect } from 'vitest'
import { resolveNext } from '@/lib/auth/resolveNext'

describe('resolveNext — open-redirect whitelist', () => {
  it('AC1: null returnerer /garnlager (standard fallback)', () => {
    expect(resolveNext(null)).toBe('/garnlager')
  })

  it('AC1: tom streng returnerer /garnlager', () => {
    expect(resolveNext('')).toBe('/garnlager')
  })

  it('AC2: /visualizer er whitelisted og returneres uændret', () => {
    expect(resolveNext('/visualizer')).toBe('/visualizer')
  })

  it('AC2: /garnlager er whitelisted og returneres uændret', () => {
    expect(resolveNext('/garnlager')).toBe('/garnlager')
  })

  it('AC3: /admin er ikke whitelisted → /garnlager', () => {
    expect(resolveNext('/admin')).toBe('/garnlager')
  })

  it('AC3: /settings er ikke whitelisted → /garnlager', () => {
    expect(resolveNext('/settings')).toBe('/garnlager')
  })

  it('AC4: protocol-relative //evil.com/pwn → /garnlager', () => {
    expect(resolveNext('//evil.com/pwn')).toBe('/garnlager')
  })

  it('AC5: absolut URL https://evil.com → /garnlager', () => {
    expect(resolveNext('https://evil.com')).toBe('/garnlager')
  })

  it('AC6: /visualizer?step=2 — path-del er whitelisted → fuld streng bevares', () => {
    expect(resolveNext('/visualizer?step=2')).toBe('/visualizer?step=2')
  })

  it('AC6: /garnlager?ref=email — path-del er whitelisted → fuld streng bevares', () => {
    expect(resolveNext('/garnlager?ref=email')).toBe('/garnlager?ref=email')
  })

  it('AC7: backslash-injection /\\\\evil.com → /garnlager', () => {
    // Backslash-stier starter med / men er ikke på whitelist
    expect(resolveNext('/\\evil.com')).toBe('/garnlager')
  })

  it('AC7: /\\\\evil.com med dobbelt-backslash → /garnlager', () => {
    expect(resolveNext('/\\\\evil.com')).toBe('/garnlager')
  })

  // AC8–AC10: nye stier tilføjet i 8.11-udvidelsen
  it('AC8: /faq er whitelisted og returneres uændret', () => {
    expect(resolveNext('/faq')).toBe('/faq')
  })

  it('AC9: / (forside) er whitelisted og returneres uændret', () => {
    expect(resolveNext('/')).toBe('/')
  })

  it.each([
    '/',
    '/mit-striq',
    '/opskrifter-og-garn',
    '/striqipedia',
    '/faellesskab',
    '/garnbutikker',
    '/mine-favoritter',
    '/garn',
    '/faq',
    '/faellesskabet',
    '/strikkecafeer',
    '/om-striq',
    '/privatlivspolitik',
    '/min-konto',
  ])('AC10: %s er ny whitelistet sti og returneres uændret', (sti) => {
    expect(resolveNext(sti)).toBe(sti)
  })

  // AC11–AC12: bevidst udeladte stier afvises stadig
  it('AC11: /admin er bevidst udeladt → /garnlager', () => {
    expect(resolveNext('/admin')).toBe('/garnlager')
  })

  it('AC12: /login er bevidst udeladt → /garnlager', () => {
    expect(resolveNext('/login')).toBe('/garnlager')
  })
})
