import { describe, it, expect } from 'vitest'
import { formatDanish, toISODate } from '@/lib/date/formatDanish'

describe('formatDanish', () => {
  it('formaterer en kendt dato uden punktum efter måned', () => {
    expect(formatDanish('2026-04-27')).toBe('27. apr 2026')
  })

  it('formaterer Date-objekt', () => {
    expect(formatDanish(new Date('2026-12-01T00:00:00Z'))).toBe('1. dec 2026')
  })

  it('intet 0-padding på dag', () => {
    expect(formatDanish('2026-01-05')).toBe('5. jan 2026')
  })

  it('returnerer tom streng for null', () => {
    expect(formatDanish(null)).toBe('')
  })

  it('returnerer tom streng for undefined', () => {
    expect(formatDanish(undefined)).toBe('')
  })

  it('returnerer tom streng for tom streng', () => {
    expect(formatDanish('')).toBe('')
  })

  it('returnerer tom streng for Invalid Date', () => {
    expect(formatDanish('not-a-date')).toBe('')
    expect(formatDanish(new Date('garbage'))).toBe('')
  })

  it('strip kun punktum efter måned, ikke efter dag', () => {
    const result = formatDanish('2026-03-15')
    expect(result).toBe('15. mar 2026')
    expect(result).toMatch(/^\d+\.\s/)
  })

  it('december — intet ekstra punktum', () => {
    // da-DK Intl kan returnere "1. dec. 2026" — vi forventer "1. dec 2026"
    expect(formatDanish('2026-12-01')).toBe('1. dec 2026')
  })

  it('maj — da-DK giver "maj" uden punktum, regex må ikke ødelægge det', () => {
    // Intl returnerer "15. maj 2026" (ikke "15. maj. 2026") — resultat skal stadig være "15. maj 2026"
    const result = formatDanish('2026-05-15')
    expect(result).toBe('15. maj 2026')
    expect(result).not.toMatch(/maj\./)
  })

  it('numerisk timestamp som input', () => {
    // Unix epoch i ms — bruges sjældent men er støttet via DateInput-typen
    const ts = new Date('2026-06-10T00:00:00Z').getTime()
    expect(formatDanish(ts)).toBe('10. jun 2026')
  })
})

describe('toISODate', () => {
  it('returnerer ISO-format', () => {
    expect(toISODate('2026-04-27')).toBe('2026-04-27')
  })

  it('konverterer Date til ISO', () => {
    expect(toISODate(new Date('2026-04-27T12:00:00Z'))).toBe('2026-04-27')
  })

  it('returnerer tom streng for null/undefined/tom', () => {
    expect(toISODate(null)).toBe('')
    expect(toISODate(undefined)).toBe('')
    expect(toISODate('')).toBe('')
  })

  it('returnerer tom streng for Invalid Date', () => {
    expect(toISODate('not-a-date')).toBe('')
  })
})
