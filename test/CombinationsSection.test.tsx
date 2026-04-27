/**
 * Component tests for CombinationsSection.
 *
 * Acceptkriterier dækket:
 * - Skjuler sig selv (returnerer null) ved combinations.length === 0.
 * - Viser "2× samme garn" label og format når isSameYarn=true.
 * - Viser "Holdt sammen" label og "1× target + 1× partner" format.
 * - combinedSpecs viser kun de felter der er sat.
 * - use_cases renderes som tags.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CombinationsSection } from '@/components/catalog/combinations/CombinationsSection'
import type { YarnCombination } from '@/lib/types'

// CombinationsSection is a Server Component but has no async data fetching —
// it just renders props. Testing Library can render it synchronously.

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const targetProps = {
  targetProducer: 'Filcolana',
  targetName: 'Alva',
  targetSeries: null,
}

function makeCombo(overrides: Partial<YarnCombination> = {}): YarnCombination {
  return {
    id: 'combo-1',
    partner: {
      id: 'partner-1',
      producer: 'Isager',
      name: 'Silk Mohair',
      series: null,
    },
    isSameYarn: false,
    combined_needle_min_mm: null,
    combined_needle_max_mm: null,
    combined_gauge_stitches_10cm: null,
    combined_thickness_category: null,
    use_cases: [],
    notes: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CombinationsSection', () => {
  it('renders nothing when combinations is empty', () => {
    const { container } = render(
      <CombinationsSection {...targetProps} combinations={[]} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders section heading when combinations exist', () => {
    render(
      <CombinationsSection {...targetProps} combinations={[makeCombo()]} />,
    )
    expect(screen.getByRole('heading', { name: /strikkes sammen/i })).toBeInTheDocument()
  })

  it('shows "Holdt sammen" label when isSameYarn=false', () => {
    render(
      <CombinationsSection {...targetProps} combinations={[makeCombo({ isSameYarn: false })]} />,
    )
    expect(screen.getByText('Holdt sammen')).toBeInTheDocument()
  })

  it('shows "2× samme garn" label when isSameYarn=true', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[makeCombo({ isSameYarn: true })]}
      />,
    )
    expect(screen.getByText('2× samme garn')).toBeInTheDocument()
  })

  it('renders "2× <targetLabel>" text when isSameYarn=true', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[makeCombo({ isSameYarn: true })]}
      />,
    )
    // The outer <span> contains "2× " and a child <span> with the italic label.
    // Use getAllByText since "2×" may appear inside a parent node alongside children.
    const twoTimesNodes = screen.getAllByText(/2×/)
    expect(twoTimesNodes.length).toBeGreaterThanOrEqual(1)
    // The italic target label is in a nested <span>
    expect(screen.getByText('Filcolana Alva')).toBeInTheDocument()
  })

  it('renders "1× target + 1× partner" format when isSameYarn=false', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[
          makeCombo({
            isSameYarn: false,
            partner: { id: 'p1', producer: 'Isager', name: 'Silk Mohair', series: null },
          }),
        ]}
      />,
    )
    // Both "1×" occurrences should appear (one for target, one for partner)
    const ones = screen.getAllByText(/1×/)
    expect(ones.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/Silk Mohair/)).toBeInTheDocument()
  })

  it('shows partner series in italic when present', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[
          makeCombo({
            partner: { id: 'p1', producer: 'Isager', name: 'Silk Mohair', series: 'Deluxe Edition' },
          }),
        ]}
      />,
    )
    expect(screen.getByText(/Deluxe Edition/)).toBeInTheDocument()
  })

  it('shows combinedSpecs with needle when needle is set', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[
          makeCombo({
            combined_needle_min_mm: 4.0,
            combined_needle_max_mm: 5.0,
          }),
        ]}
      />,
    )
    // formatNeedle → "pind 4–5 mm" (with da() giving Danish decimals)
    expect(screen.getByText(/pind/)).toBeInTheDocument()
  })

  it('shows combinedSpecs with gauge when gauge is set', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[
          makeCombo({
            combined_gauge_stitches_10cm: 22,
          }),
        ]}
      />,
    )
    // formatGauge → "~22 m / 10 cm"
    expect(screen.getByText(/22/)).toBeInTheDocument()
    expect(screen.getByText(/10 cm/)).toBeInTheDocument()
  })

  it('shows thickness label in combinedSpecs when thickness is set', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[
          makeCombo({
            combined_thickness_category: 'dk',
          }),
        ]}
      />,
    )
    // labelThickness('dk') → 'DK (medium)'
    expect(screen.getByText(/DK \(medium\)/)).toBeInTheDocument()
  })

  it('does NOT render combinedSpecs section when all spec fields are null', () => {
    const { container } = render(
      <CombinationsSection
        {...targetProps}
        combinations={[
          makeCombo({
            combined_needle_min_mm: null,
            combined_needle_max_mm: null,
            combined_gauge_stitches_10cm: null,
            combined_thickness_category: null,
          }),
        ]}
      />,
    )
    // No "pind", no "cm", no thickness label
    expect(container.querySelector('.text-striq-muted')?.textContent ?? '').not.toMatch(/pind/)
  })

  it('renders use_cases as tags', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[
          makeCombo({ use_cases: ['cardigan', 'tørklæde'] }),
        ]}
      />,
    )
    expect(screen.getByText('cardigan')).toBeInTheDocument()
    expect(screen.getByText('tørklæde')).toBeInTheDocument()
  })

  it('does NOT render use_cases section when use_cases is empty', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[makeCombo({ use_cases: [] })]}
      />,
    )
    // No tag-like spans with bg-moss class
    const tags = document.querySelectorAll('.bg-moss\\/30')
    expect(tags).toHaveLength(0)
  })

  it('renders notes text when present', () => {
    render(
      <CombinationsSection
        {...targetProps}
        combinations={[makeCombo({ notes: 'Prøv med en løsere pind.' })]}
      />,
    )
    expect(screen.getByText('Prøv med en løsere pind.')).toBeInTheDocument()
  })

  it('renders multiple combinations', () => {
    const combos: YarnCombination[] = [
      makeCombo({ id: 'c1', partner: { id: 'p1', producer: 'A', name: 'Alpha', series: null } }),
      makeCombo({ id: 'c2', partner: { id: 'p2', producer: 'B', name: 'Beta', series: null } }),
    ]
    render(<CombinationsSection {...targetProps} combinations={combos} />)
    expect(screen.getByText(/Alpha/)).toBeInTheDocument()
    expect(screen.getByText(/Beta/)).toBeInTheDocument()
  })
})
