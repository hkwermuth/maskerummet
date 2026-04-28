/**
 * Tests for FaellesskabClient — Runde 2 af tilretninger
 *
 * Dækker acceptkriterierne 24-29.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FaellesskabClient } from '@/app/faellesskabet/FaellesskabClient'
import type { SharedProjectPublic } from '@/lib/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeProject = (overrides: Partial<SharedProjectPublic> = {}): SharedProjectPublic => ({
  id: 'proj-1',
  title: 'Min Trøje',
  project_image_urls: [],
  community_primary_image_index: null,
  project_type: 'sweater',
  community_description: null,
  community_size_shown: null,
  pattern_name: 'Mina',
  pattern_designer: 'Lene B.',
  pattern_pdf_thumbnail_url: null,
  pattern_cover_url: null,
  shared_at: '2026-01-01T00:00:00Z',
  display_name: 'Anna K.',
  yarns: [],
  ...overrides,
})

// ── AC24: Side-titel/H1 med stort F ──────────────────────────────────────────

describe('AC24 Side-titel med stort F', () => {
  it('viser "Hent inspiration fra Fællesskabet" (stort F) som H1', () => {
    render(<FaellesskabClient initialProjects={[]} />)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1.textContent).toContain('Fællesskabet')
    expect(h1.textContent).toBe('Hent inspiration fra Fællesskabet')
  })
})

// ── AC25: Search aria-label med stort F ──────────────────────────────────────

describe('AC25 Search aria-label med stort F', () => {
  it('søgefeltet har aria-label "Søg i Fællesskabet" (stort F)', () => {
    render(<FaellesskabClient initialProjects={[]} />)
    const searchInput = screen.getByRole('searchbox', { name: 'Søg i Fællesskabet' })
    expect(searchInput).toBeInTheDocument()
  })
})

// ── AC26: Count-label med stort F ────────────────────────────────────────────

describe('AC26 Count-label med stort F', () => {
  it('viser "1 projekt delt af Fællesskabet" for ét projekt', () => {
    render(<FaellesskabClient initialProjects={[makeProject()]} />)
    expect(screen.getByText('1 projekt delt af Fællesskabet')).toBeInTheDocument()
  })

  it('viser "N projekter delt af Fællesskabet" for flere projekter', () => {
    const projects = [
      makeProject({ id: 'p1', title: 'Projekt 1' }),
      makeProject({ id: 'p2', title: 'Projekt 2' }),
      makeProject({ id: 'p3', title: 'Projekt 3' }),
    ]
    render(<FaellesskabClient initialProjects={projects} />)
    expect(screen.getByText('3 projekter delt af Fællesskabet')).toBeInTheDocument()
  })
})

// ── AC27: EmptyState tekst med stort F ───────────────────────────────────────

describe('AC27 EmptyState tekst med stort F', () => {
  it('viser "Del med Fællesskabet" med stort F i empty-state tekst', () => {
    render(<FaellesskabClient initialProjects={[]} />)
    // Kontroller at teksten indeholder "Fællesskabet" med stort F
    const container = screen.getByText(/del med fællesskabet/i)
    expect(container.textContent).toContain('Fællesskabet')
    // Og ikke lille f
    expect(container.textContent).not.toContain('fællesskabet')
  })
})

// ── AC28: Str.-pille vises kun når community_size_shown er udfyldt ────────────

describe('AC28 community_size_shown pille', () => {
  it('viser "str. M" pille når community_size_shown er "M"', () => {
    render(<FaellesskabClient initialProjects={[makeProject({ community_size_shown: 'M' })]} />)
    expect(screen.getByText('str. M')).toBeInTheDocument()
  })

  it('viser "str. 38" pille når community_size_shown er "38"', () => {
    render(<FaellesskabClient initialProjects={[makeProject({ community_size_shown: '38' })]} />)
    expect(screen.getByText('str. 38')).toBeInTheDocument()
  })

  it('viser ingen str.-pille når community_size_shown er null', () => {
    render(<FaellesskabClient initialProjects={[makeProject({ community_size_shown: null })]} />)
    expect(screen.queryByText(/^str\./)).not.toBeInTheDocument()
  })

  it('viser ingen str.-pille når community_size_shown er tom streng', () => {
    // Tom streng er falsy — ingen pille
    render(<FaellesskabClient initialProjects={[makeProject({ community_size_shown: '' as never })]} />)
    expect(screen.queryByText(/^str\./)).not.toBeInTheDocument()
  })
})

// ── AC29: Garn-labels bruger yarnDisplayLabel (ingen duplikering) ─────────────

describe('AC29 garn-labels bruger yarnDisplayLabel', () => {
  it('viser "Drops Air" for {brand:"Drops", name:"Drops Air"} — ingen duplikering', () => {
    const project = makeProject({
      yarns: [{
        id: 'y1',
        project_id: 'proj-1',
        yarn_brand: 'Drops',
        yarn_name: 'Drops Air',
        color_name: null,
        color_code: null,
        hex_color: null,
        catalog_yarn_id: null,
        catalog_color_id: null,
      }],
    })
    render(<FaellesskabClient initialProjects={[project]} />)
    const spans = screen.getAllByText('Drops Air')
    // Mindst én span (garn-chip)
    expect(spans.some(el => el.tagName.toLowerCase() === 'span')).toBe(true)
    // Ingen "Drops Drops Air" duplikering
    expect(screen.queryByText('Drops Drops Air')).not.toBeInTheDocument()
  })

  it('viser "Filcolana Tilia" for {brand:"Filcolana", name:"Filcolana Tilia"}', () => {
    const project = makeProject({
      yarns: [{
        id: 'y2',
        project_id: 'proj-1',
        yarn_brand: 'Filcolana',
        yarn_name: 'Filcolana Tilia',
        color_name: null,
        color_code: null,
        hex_color: null,
        catalog_yarn_id: null,
        catalog_color_id: null,
      }],
    })
    render(<FaellesskabClient initialProjects={[project]} />)
    const spans = screen.getAllByText('Filcolana Tilia')
    expect(spans.some(el => el.tagName.toLowerCase() === 'span')).toBe(true)
    expect(screen.queryByText('Filcolana Filcolana Tilia')).not.toBeInTheDocument()
  })
})
