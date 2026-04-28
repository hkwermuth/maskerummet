/**
 * Tests for FaellesskabClient — Runde 3: detail-modal integration
 *
 * Dækker acceptkriterier:
 *   AC7-9:   SharedProjectCard klikbarhed + modal åbnes
 *   AC23-26: role/tabIndex, hero-billede med primær index, +N-tæller, aria-label
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FaellesskabClient } from '@/app/faellesskabet/FaellesskabClient'
import type { SharedProjectPublic } from '@/lib/types'

// ---------------------------------------------------------------------------
// Mock SharedProjectDetailModal — vi vil verificere at det åbnes, ikke det fulde indhold
// ---------------------------------------------------------------------------

vi.mock('@/components/app/SharedProjectDetailModal', () => ({
  SharedProjectDetailModal: ({ project, onClose }: { project: SharedProjectPublic; onClose: () => void }) => (
    <div data-testid="detail-modal" data-project-id={project.id}>
      <button onClick={onClose}>Luk modal</button>
    </div>
  ),
}))

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

// ---------------------------------------------------------------------------
// AC23: role="button" og tabIndex={0} på kortene
// ---------------------------------------------------------------------------

describe('AC23 SharedProjectCard role og tabIndex', () => {
  it('kortet har role="button"', () => {
    render(<FaellesskabClient initialProjects={[makeProject()]} />)
    // Det er en <article> med role="button"
    const card = screen.getByRole('button', { name: /min trøje/i })
    expect(card).toBeInTheDocument()
  })

  it('kortet har tabIndex={0}', () => {
    render(<FaellesskabClient initialProjects={[makeProject()]} />)
    const card = screen.getByRole('button', { name: /min trøje/i })
    expect(card).toHaveAttribute('tabindex', '0')
  })
})

// ---------------------------------------------------------------------------
// AC24: Hero-billede bruger community_primary_image_index med fallback
// ---------------------------------------------------------------------------

describe('AC24 Hero-billede bruger primary index', () => {
  it('viser project_image_urls[0] som hero når primary index er null', () => {
    const project = makeProject({
      project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
      community_primary_image_index: null,
    })
    render(<FaellesskabClient initialProjects={[project]} />)
    const img = document.querySelector('img[src="https://img.test/a.jpg"]') as HTMLImageElement | null
    expect(img).not.toBeNull()
  })

  it('viser project_image_urls[1] som hero når primary index er 1', () => {
    const project = makeProject({
      project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
      community_primary_image_index: 1,
    })
    render(<FaellesskabClient initialProjects={[project]} />)
    const img = document.querySelector('img[src="https://img.test/b.jpg"]') as HTMLImageElement | null
    expect(img).not.toBeNull()
  })

  it('fallback til index 0 når primary index er out-of-range', () => {
    const project = makeProject({
      project_image_urls: ['https://img.test/a.jpg'],
      community_primary_image_index: 99,
    })
    render(<FaellesskabClient initialProjects={[project]} />)
    const img = document.querySelector('img[src="https://img.test/a.jpg"]') as HTMLImageElement | null
    expect(img).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// AC25: +N-tæller vises i nederste hjørne når der er >1 billede
// ---------------------------------------------------------------------------

describe('AC25 +N-tæller på kort', () => {
  it('viser "+1" overlay når der er 2 billeder', () => {
    const project = makeProject({
      project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
    })
    render(<FaellesskabClient initialProjects={[project]} />)
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('viser "+2" overlay når der er 3 billeder', () => {
    const project = makeProject({
      project_image_urls: [
        'https://img.test/a.jpg',
        'https://img.test/b.jpg',
        'https://img.test/c.jpg',
      ],
    })
    render(<FaellesskabClient initialProjects={[project]} />)
    expect(screen.getByText('+2')).toBeInTheDocument()
  })

  it('viser IKKE +N-tæller når der er 0 billeder', () => {
    const project = makeProject({ project_image_urls: [] })
    render(<FaellesskabClient initialProjects={[project]} />)
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument()
  })

  it('viser IKKE +N-tæller når der er 1 billede', () => {
    const project = makeProject({ project_image_urls: ['https://img.test/a.jpg'] })
    render(<FaellesskabClient initialProjects={[project]} />)
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AC26: aria-label indeholder projekttitel og forfatter
// ---------------------------------------------------------------------------

describe('AC26 Card aria-label med titel og forfatter', () => {
  it('aria-label indeholder projekttitlen', () => {
    render(<FaellesskabClient initialProjects={[makeProject({ title: 'Blå Cardigan' })]} />)
    const card = screen.getByRole('button', { name: /blå cardigan/i })
    expect(card).toBeInTheDocument()
  })

  it('aria-label indeholder forfatternavnet', () => {
    render(<FaellesskabClient initialProjects={[makeProject({ display_name: 'Mette P.' })]} />)
    const card = screen.getByRole('button', { name: /mette p\./i })
    expect(card).toBeInTheDocument()
  })

  it('aria-label siger "Unavngivet projekt" når title er null', () => {
    render(<FaellesskabClient initialProjects={[makeProject({ title: null })]} />)
    const card = screen.getByRole('button', { name: /unavngivet projekt/i })
    expect(card).toBeInTheDocument()
  })

  it('aria-label siger "Anonym strikker" når display_name er null', () => {
    render(<FaellesskabClient initialProjects={[makeProject({ display_name: null })]} />)
    const card = screen.getByRole('button', { name: /anonym strikker/i })
    expect(card).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AC7 + AC9: Klik på kort åbner modal med projektet
// ---------------------------------------------------------------------------

describe('AC7+AC9 Klik på kort åbner detail-modal', () => {
  it('modal rendres ikke ved start', () => {
    render(<FaellesskabClient initialProjects={[makeProject()]} />)
    expect(screen.queryByTestId('detail-modal')).not.toBeInTheDocument()
  })

  it('klik på kort åbner modal med det rette projekt', async () => {
    const project = makeProject({ id: 'proj-42', title: 'Min Hue' })
    const user = userEvent.setup()
    render(<FaellesskabClient initialProjects={[project]} />)
    await user.click(screen.getByRole('button', { name: /min hue/i }))
    const modal = screen.getByTestId('detail-modal')
    expect(modal).toBeInTheDocument()
    expect(modal.getAttribute('data-project-id')).toBe('proj-42')
  })

  it('luk-knap i modal lukker modal igen', async () => {
    const user = userEvent.setup()
    render(<FaellesskabClient initialProjects={[makeProject()]} />)
    await user.click(screen.getByRole('button', { name: /min trøje/i }))
    expect(screen.getByTestId('detail-modal')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /luk modal/i }))
    expect(screen.queryByTestId('detail-modal')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AC8: Enter og Space åbner modal fra fokuseret kort
// ---------------------------------------------------------------------------

describe('AC8 Enter/Space åbner modal', () => {
  it('Enter på fokuseret kort åbner modal', async () => {
    const project = makeProject({ id: 'proj-enter', title: 'Enter Projekt' })
    const user = userEvent.setup()
    render(<FaellesskabClient initialProjects={[project]} />)
    const card = screen.getByRole('button', { name: /enter projekt/i })
    card.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('detail-modal')).toBeInTheDocument()
    expect(screen.getByTestId('detail-modal').getAttribute('data-project-id')).toBe('proj-enter')
  })

  it('Space på fokuseret kort åbner modal', async () => {
    const project = makeProject({ id: 'proj-space', title: 'Space Projekt' })
    const user = userEvent.setup()
    render(<FaellesskabClient initialProjects={[project]} />)
    const card = screen.getByRole('button', { name: /space projekt/i })
    card.focus()
    await user.keyboard(' ')
    expect(screen.getByTestId('detail-modal')).toBeInTheDocument()
  })
})
