/**
 * components/app/ProjectCardPlaceholder — tests
 *
 * AC 8   status='i_gang', yarnHexes=[] → "Projekt i gang" i dustyrose-farve på creme baggrund
 * AC 9   status='vil_gerne' → "Projekt jeg overvejer"
 * AC 10  status='faerdigstrikket' → "Færdigt projekt"
 * AC 11  1 hex → solid baggrundsfarve (ikke gradient, ikke creme)
 * AC 12  3 hex → linear-gradient i style.background
 * AC 13  5 hex → 4 i gradienten + "+1"-overlay
 * AC 14  role="img" og aria-label inkluderer status og garnoplysning
 * AC 15  Tomme/falsy hex-strenge filtreres bort
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ProjectCardPlaceholder from '@/components/app/ProjectCardPlaceholder'

const PLACEHOLDER_NEUTRAL_BG = '#F9F6F0'
const PLACEHOLDER_DUSTYROSE  = '#B58A92'

describe('ProjectCardPlaceholder – tekst-labels', () => {
  it('AC8 – status=i_gang viser "Projekt i gang"', () => {
    render(<ProjectCardPlaceholder status="i_gang" yarnHexes={[]} />)
    expect(screen.getByText('Projekt i gang')).toBeInTheDocument()
  })

  it('AC9 – status=vil_gerne viser "Projekt jeg overvejer"', () => {
    render(<ProjectCardPlaceholder status="vil_gerne" yarnHexes={[]} />)
    expect(screen.getByText('Projekt jeg overvejer')).toBeInTheDocument()
  })

  it('AC10 – status=faerdigstrikket viser "Færdigt projekt"', () => {
    render(<ProjectCardPlaceholder status="faerdigstrikket" yarnHexes={[]} />)
    expect(screen.getByText('Færdigt projekt')).toBeInTheDocument()
  })
})

// jsdom normalizes hex colours to rgb() in style — compare accordingly
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}

describe('ProjectCardPlaceholder – baggrundsstyling', () => {
  it('AC8 – ingen garn → creme baggrund (#F9F6F0)', () => {
    const { container } = render(<ProjectCardPlaceholder status="i_gang" yarnHexes={[]} />)
    const el = container.firstChild as HTMLElement
    // jsdom normaliserer hex til rgb()
    expect(el.style.background).toBe(hexToRgb(PLACEHOLDER_NEUTRAL_BG))
  })

  it('AC8 – ingen garn → dustyrose tekstfarve (#B58A92)', () => {
    const { container } = render(<ProjectCardPlaceholder status="i_gang" yarnHexes={[]} />)
    const el = container.firstChild as HTMLElement
    // jsdom normaliserer hex til rgb()
    expect(el.style.color).toBe(hexToRgb(PLACEHOLDER_DUSTYROSE))
  })

  it('AC11 – 1 hex → solid baggrundsfarve (ikke gradient)', () => {
    const { container } = render(<ProjectCardPlaceholder status="i_gang" yarnHexes={['#3A2A1C']} />)
    const el = container.firstChild as HTMLElement
    // Solid farve: jsdom normaliserer til rgb(), ingen gradient
    expect(el.style.background).toBe(hexToRgb('#3A2A1C'))
    expect(el.style.background).not.toContain('gradient')
  })

  it('AC12 – 3 hex → linear-gradient i background', () => {
    const { container } = render(
      <ProjectCardPlaceholder status="i_gang" yarnHexes={['#3A2A1C', '#B58A92', '#A8C4C4']} />
    )
    const el = container.firstChild as HTMLElement
    expect(el.style.background).toContain('linear-gradient')
  })

  it('AC13 – 5 hex → "+1"-overlay er synlig', () => {
    render(
      <ProjectCardPlaceholder
        status="i_gang"
        yarnHexes={['#3A2A1C', '#B58A92', '#A8C4C4', '#D4ADB6', '#FFFFFF']}
      />
    )
    // Overlay viser +1 (5 hexes - 4 max gradient stops = overflow 1)
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('AC13 – 5 hex → gradient indeholder kun 4 stop', () => {
    const { container } = render(
      <ProjectCardPlaceholder
        status="i_gang"
        yarnHexes={['#3A2A1C', '#B58A92', '#A8C4C4', '#D4ADB6', '#FFFFFF']}
      />
    )
    const el = container.firstChild as HTMLElement
    // Gradienten har 4 stop — #FFFFFF (5. farve) må ikke optræde i gradienten
    expect(el.style.background).toContain('linear-gradient')
    // 4 farver i gradienten → background indeholder ikke den 5. farve (#ffffff)
    expect(el.style.background.toLowerCase()).not.toContain('#ffffff')
  })
})

describe('ProjectCardPlaceholder – role og aria-label', () => {
  it('AC14 – har role="img"', () => {
    render(<ProjectCardPlaceholder status="i_gang" yarnHexes={[]} />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('AC14 – aria-label indeholder status-teksten ved ingen garn', () => {
    render(<ProjectCardPlaceholder status="i_gang" yarnHexes={[]} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toContain('Projekt i gang')
  })

  it('AC14 – aria-label nævner antal garn-farver når hexes er sat', () => {
    render(<ProjectCardPlaceholder status="i_gang" yarnHexes={['#3A2A1C']} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toContain('1 garn-farve')
  })

  it('AC14 – aria-label nævner "Ingen garn valgt" ved tomt array', () => {
    render(<ProjectCardPlaceholder status="vil_gerne" yarnHexes={[]} />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toContain('Ingen garn valgt')
  })
})

describe('ProjectCardPlaceholder – filtrering af falsy hexes', () => {
  it('AC15 – tom streng i array filtreres bort → behandles som 1 farve (solid)', () => {
    // ['#A8C4C4', '', null] → 1 farve → solid (ingen gradient)
    const { container } = render(
      <ProjectCardPlaceholder
        status="i_gang"
        // @ts-expect-error -- tester runtime-filtrering med null
        yarnHexes={['#A8C4C4', '', null]}
      />
    )
    const el = container.firstChild as HTMLElement
    // Kun 1 reel farve → solid baggrund (jsdom normaliserer til rgb)
    expect(el.style.background).toBe(hexToRgb('#A8C4C4'))
    expect(el.style.background).not.toContain('gradient')
  })

  it('AC15 – aria-label nævner korrekt antal (filtrerede) farver', () => {
    render(
      <ProjectCardPlaceholder
        status="i_gang"
        // @ts-expect-error -- tester runtime-filtrering med null
        yarnHexes={['#A8C4C4', '', null]}
      />
    )
    const img = screen.getByRole('img')
    expect(img.getAttribute('aria-label')).toContain('1 garn-farve')
  })
})
