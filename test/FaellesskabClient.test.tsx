import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const makeYarn = (overrides = {}) => ({
  id: 'yarn-1',
  project_id: 'proj-1',
  yarn_name: 'Soft Merino',
  yarn_brand: 'Isager',
  color_name: 'Blue',
  color_code: '47',
  hex_color: null,
  catalog_yarn_id: null,
  catalog_color_id: null,
  ...overrides,
})

// ---------------------------------------------------------------------------
// B1: Project card rendering
// ---------------------------------------------------------------------------

describe('B1 SharedProjectCard renders title, author, pattern info, yarn chips', () => {
  it('renders project title', () => {
    render(<FaellesskabClient initialProjects={[makeProject()]} />)
    expect(screen.getByText('Min Trøje')).toBeInTheDocument()
  })

  it('renders "af [display_name]"', () => {
    render(<FaellesskabClient initialProjects={[makeProject()]} />)
    expect(screen.getByText('af Anna K.')).toBeInTheDocument()
  })

  it('renders opskrift-info when both pattern_name and pattern_designer are set', () => {
    render(<FaellesskabClient initialProjects={[makeProject()]} />)
    // Should show pattern_name and designer combined
    expect(screen.getByText('Mina · Lene B.')).toBeInTheDocument()
  })

  it('renders yarn chips', () => {
    const project = makeProject({ yarns: [makeYarn()] })
    render(<FaellesskabClient initialProjects={[project]} />)
    // The chip is a <span>; use getAllByText to handle duplicate in filter dropdown
    const matches = screen.getAllByText('Isager Soft Merino')
    expect(matches.some(el => el.tagName.toLowerCase() === 'span')).toBe(true)
  })

  it('does not render opskrift block (label "Opskrift" in uppercase) when both pattern fields are null', () => {
    const project = makeProject({ pattern_name: null, pattern_designer: null })
    render(<FaellesskabClient initialProjects={[project]} />)
    // The pattern card shows a label with text "Opskrift" in a small uppercase div.
    // Check that no element with exactly that text exists as a standalone label.
    const labels = screen.queryAllByText('Opskrift')
    expect(labels).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// B2: Search filter
// ---------------------------------------------------------------------------

describe('B2 search filter', () => {
  const projects = [
    makeProject({ id: 'p1', title: 'Blå Cardigan', display_name: 'Mette', pattern_name: 'Oslo', pattern_designer: 'Arne & Carlos' }),
    makeProject({ id: 'p2', title: 'Rød Sweater', display_name: 'Karen', pattern_name: 'Sortie', pattern_designer: 'Isager' }),
  ]

  it('filters on title', async () => {
    const user = userEvent.setup()
    render(<FaellesskabClient initialProjects={projects} />)
    await user.type(screen.getByRole('searchbox', { name: /søg/i }), 'Blå')
    expect(screen.getByText('Blå Cardigan')).toBeInTheDocument()
    expect(screen.queryByText('Rød Sweater')).not.toBeInTheDocument()
  })

  it('filters on pattern name', async () => {
    const user = userEvent.setup()
    render(<FaellesskabClient initialProjects={projects} />)
    await user.type(screen.getByRole('searchbox', { name: /søg/i }), 'Sortie')
    expect(screen.getByText('Rød Sweater')).toBeInTheDocument()
    expect(screen.queryByText('Blå Cardigan')).not.toBeInTheDocument()
  })

  it('filters on designer', async () => {
    const user = userEvent.setup()
    render(<FaellesskabClient initialProjects={projects} />)
    await user.type(screen.getByRole('searchbox', { name: /søg/i }), 'Arne')
    expect(screen.getByText('Blå Cardigan')).toBeInTheDocument()
    expect(screen.queryByText('Rød Sweater')).not.toBeInTheDocument()
  })

  it('filters on display_name', async () => {
    const user = userEvent.setup()
    render(<FaellesskabClient initialProjects={projects} />)
    await user.type(screen.getByRole('searchbox', { name: /søg/i }), 'Karen')
    expect(screen.getByText('Rød Sweater')).toBeInTheDocument()
    expect(screen.queryByText('Blå Cardigan')).not.toBeInTheDocument()
  })

  it('filters on yarn name', async () => {
    const user = userEvent.setup()
    const projectsWithYarn = [
      makeProject({ id: 'p1', title: 'Med Alpaka', yarns: [makeYarn({ id: 'y1', project_id: 'p1', yarn_name: 'Alpaka', yarn_brand: 'Hjertegarn' })] }),
      makeProject({ id: 'p2', title: 'Uden specielt garn', yarns: [] }),
    ]
    render(<FaellesskabClient initialProjects={projectsWithYarn} />)
    await user.type(screen.getByRole('searchbox', { name: /søg/i }), 'Alpaka')
    expect(screen.getByText('Med Alpaka')).toBeInTheDocument()
    expect(screen.queryByText('Uden specielt garn')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// B3: Type filter
// ---------------------------------------------------------------------------

describe('B3 type filter', () => {
  it('shows only projects matching selected project_type', async () => {
    const user = userEvent.setup()
    const projects = [
      makeProject({ id: 'p1', title: 'En sweater', project_type: 'sweater' }),
      makeProject({ id: 'p2', title: 'En hue', project_type: 'hue' }),
    ]
    render(<FaellesskabClient initialProjects={projects} />)
    await user.selectOptions(screen.getByRole('combobox', { name: /filtrer efter type/i }), 'sweater')
    expect(screen.getByText('En sweater')).toBeInTheDocument()
    expect(screen.queryByText('En hue')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// B4: Yarn and pattern filter
// ---------------------------------------------------------------------------

describe('B4 yarn and pattern filter', () => {
  it('yarn filter shows only matching projects', async () => {
    const user = userEvent.setup()
    const projects = [
      makeProject({
        id: 'p1',
        title: 'Isager projekt',
        yarns: [makeYarn({ id: 'y1', project_id: 'p1', yarn_brand: 'Isager', yarn_name: 'Soft Merino' })],
      }),
      makeProject({ id: 'p2', title: 'Intet garn projekt', yarns: [] }),
    ]
    render(<FaellesskabClient initialProjects={projects} />)
    await user.selectOptions(screen.getByRole('combobox', { name: /filtrer efter garn/i }), 'Isager Soft Merino')
    expect(screen.getByText('Isager projekt')).toBeInTheDocument()
    expect(screen.queryByText('Intet garn projekt')).not.toBeInTheDocument()
  })

  it('pattern filter shows only projects with matching pattern', async () => {
    const user = userEvent.setup()
    const projects = [
      makeProject({ id: 'p1', title: 'Mina projekt', pattern_name: 'Mina' }),
      makeProject({ id: 'p2', title: 'Oslo projekt', pattern_name: 'Oslo' }),
    ]
    render(<FaellesskabClient initialProjects={projects} />)
    await user.selectOptions(screen.getByRole('combobox', { name: /filtrer efter opskrift/i }), 'Mina')
    expect(screen.getByText('Mina projekt')).toBeInTheDocument()
    expect(screen.queryByText('Oslo projekt')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// B5: Empty state — no projects
// ---------------------------------------------------------------------------

describe('B5 empty state when no projects', () => {
  it('shows "Ingen projekter delt endnu" when initialProjects is empty', () => {
    render(<FaellesskabClient initialProjects={[]} />)
    expect(screen.getByText('Ingen projekter delt endnu')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// B6: Empty state — filter miss
// ---------------------------------------------------------------------------

describe('B6 empty state on filter miss', () => {
  it('shows "Ingen resultater" when filter matches nothing', async () => {
    const user = userEvent.setup()
    render(<FaellesskabClient initialProjects={[makeProject()]} />)
    await user.type(screen.getByRole('searchbox', { name: /søg/i }), 'xyzINGENMATCH')
    expect(screen.getByText('Ingen resultater')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// B7: Anonymous display name fallback
// ---------------------------------------------------------------------------

describe('B7 anonymous fallback', () => {
  it('shows "Anonym strikker" when display_name is null', () => {
    render(<FaellesskabClient initialProjects={[makeProject({ display_name: null })]} />)
    expect(screen.getByText('af Anonym strikker')).toBeInTheDocument()
  })

  it('shows "Anonym strikker" when display_name is empty string', () => {
    render(<FaellesskabClient initialProjects={[makeProject({ display_name: '' })]} />)
    expect(screen.getByText('af Anonym strikker')).toBeInTheDocument()
  })
})
