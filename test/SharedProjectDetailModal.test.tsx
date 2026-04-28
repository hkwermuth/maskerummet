/**
 * Tests for SharedProjectDetailModal
 *
 * Dækker acceptkriterier B (9-22).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SharedProjectDetailModal } from '@/components/app/SharedProjectDetailModal'
import type { SharedProjectPublic, SharedProjectYarn } from '@/lib/types'

// ---------------------------------------------------------------------------
// Mock ImageCarousel — vi vil bare bekræfte at den modtager rette props
// ---------------------------------------------------------------------------

vi.mock('@/components/app/ImageCarousel', () => ({
  default: ({
    images,
    initialIndex,
    alt,
  }: {
    images: string[]
    initialIndex: number
    alt: string
  }) => (
    <div
      data-testid="image-carousel"
      data-images={JSON.stringify(images)}
      data-initial-index={initialIndex}
      aria-label={alt}
    />
  ),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeYarn = (overrides: Partial<SharedProjectYarn> = {}): SharedProjectYarn => ({
  id: 'yarn-1',
  project_id: 'proj-1',
  yarn_name: 'Soft Merino',
  yarn_brand: 'Isager',
  color_name: 'Blå',
  color_code: '47',
  hex_color: '#4B6FA5',
  catalog_yarn_id: null,
  catalog_color_id: null,
  ...overrides,
})

const makeProject = (overrides: Partial<SharedProjectPublic> = {}): SharedProjectPublic => ({
  id: 'proj-1',
  title: 'Min Trøje',
  project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
  community_primary_image_index: 0,
  project_type: 'sweater',
  community_description: 'En dejlig trøje\nmed linjeskift',
  community_size_shown: 'M',
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
// AC10: dialog role + aria attributes
// ---------------------------------------------------------------------------

describe('AC10 Modal ARIA attributter', () => {
  it('har role="dialog"', () => {
    render(<SharedProjectDetailModal project={makeProject()} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('har aria-modal="true"', () => {
    render(<SharedProjectDetailModal project={makeProject()} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('har aria-labelledby="shared-detail-title"', () => {
    render(<SharedProjectDetailModal project={makeProject()} onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-labelledby', 'shared-detail-title')
  })

  it('overskrift-elementet har id="shared-detail-title"', () => {
    render(<SharedProjectDetailModal project={makeProject()} onClose={vi.fn()} />)
    expect(document.getElementById('shared-detail-title')).toBeInTheDocument()
    expect(document.getElementById('shared-detail-title')?.textContent).toBe('Min Trøje')
  })
})

// ---------------------------------------------------------------------------
// AC11 + AC12: Tilbage-knap touch-target og aria-label
// ---------------------------------------------------------------------------

describe('AC11+AC12 Tilbage-knap', () => {
  it('har aria-label "Tilbage til Fællesskabet"', () => {
    render(<SharedProjectDetailModal project={makeProject()} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tilbage til Fællesskabet' })).toBeInTheDocument()
  })

  it('har minHeight og minWidth >= 44 (touch-target)', () => {
    render(<SharedProjectDetailModal project={makeProject()} onClose={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Tilbage til Fællesskabet' })
    const style = btn.getAttribute('style') || ''
    // Kontroller at inline-style sætter minHeight: 44 og minWidth: 44
    expect(style).toContain('min-height: 44px')
    expect(style).toContain('min-width: 44px')
  })

  it('kald onClose ved klik på tilbage-knap (AC12)', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SharedProjectDetailModal project={makeProject()} onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Tilbage til Fællesskabet' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// AC13: Escape lukker modal
// ---------------------------------------------------------------------------

describe('AC13 Escape lukker modal', () => {
  it('kalder onClose ved Escape-tast', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SharedProjectDetailModal project={makeProject()} onClose={onClose} />)
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// AC14: Backdrop klik lukker modal
// ---------------------------------------------------------------------------

describe('AC14 Backdrop-klik lukker modal', () => {
  it('kalder onClose når bruger klikker på backdrop (e.target === e.currentTarget)', () => {
    const onClose = vi.fn()
    render(<SharedProjectDetailModal project={makeProject()} onClose={onClose} />)
    const dialog = screen.getByRole('dialog')
    // Simuler klik direkte på backdrop (currentTarget = target)
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('kalder IKKE onClose ved klik inde i modal-indholdet', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<SharedProjectDetailModal project={makeProject()} onClose={onClose} />)
    // Klik på titlen (inde i modal) — bør ikke lukke
    await user.click(screen.getByText('Min Trøje'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// AC16: Karrusel rendres med images og initialIndex
// ---------------------------------------------------------------------------

describe('AC16 Karrusel props', () => {
  it('rendres med images={project_image_urls}', () => {
    const project = makeProject({
      project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
      community_primary_image_index: 0,
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    const carousel = screen.getByTestId('image-carousel')
    expect(JSON.parse(carousel.getAttribute('data-images') ?? '[]')).toEqual([
      'https://img.test/a.jpg',
      'https://img.test/b.jpg',
    ])
  })

  it('initialIndex = primary index (0)', () => {
    const project = makeProject({
      project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
      community_primary_image_index: 0,
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    expect(screen.getByTestId('image-carousel').getAttribute('data-initial-index')).toBe('0')
  })

  it('initialIndex = primary index (1)', () => {
    const project = makeProject({
      project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
      community_primary_image_index: 1,
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    expect(screen.getByTestId('image-carousel').getAttribute('data-initial-index')).toBe('1')
  })

  it('initialIndex fallback til 0 når primary index er ud af range', () => {
    const project = makeProject({
      project_image_urls: ['https://img.test/a.jpg'],
      community_primary_image_index: 5, // out-of-range
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    expect(screen.getByTestId('image-carousel').getAttribute('data-initial-index')).toBe('0')
  })

  it('initialIndex fallback til 0 når primary index er null', () => {
    const project = makeProject({
      project_image_urls: ['https://img.test/a.jpg', 'https://img.test/b.jpg'],
      community_primary_image_index: null,
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    expect(screen.getByTestId('image-carousel').getAttribute('data-initial-index')).toBe('0')
  })
})

// ---------------------------------------------------------------------------
// AC17: Ingen billeder → ingen karrusel, vis 🧶-fallback
// ---------------------------------------------------------------------------

describe('AC17 Ingen billeder — fallback', () => {
  it('rendrer IKKE karrusel når project_image_urls er tom', () => {
    const project = makeProject({ project_image_urls: [] })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    expect(screen.queryByTestId('image-carousel')).not.toBeInTheDocument()
  })

  it('viser 🧶-emoji-fallback med aria-label "Ingen billeder"', () => {
    const project = makeProject({ project_image_urls: [] })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    // Emoji-fallback-elementet har aria-label
    expect(screen.getByLabelText('Ingen billeder')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AC18: Forside — PDF-thumbnail foretrækkes frem for pattern_cover_url
// ---------------------------------------------------------------------------

describe('AC18 Forside-visning', () => {
  it('viser ikke forside-sektion når hverken pattern_pdf_thumbnail_url eller pattern_cover_url er sat', () => {
    const project = makeProject({
      pattern_pdf_thumbnail_url: null,
      pattern_cover_url: null,
      pattern_name: 'Mina',
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    // Img med alt "Opskriftens forside" bør ikke eksistere
    expect(screen.queryByAltText('Opskriftens forside')).not.toBeInTheDocument()
  })

  it('viser forside-billede med PDF-thumbnail-url', () => {
    const project = makeProject({
      pattern_pdf_thumbnail_url: 'https://cdn.test/thumb.jpg',
      pattern_cover_url: null,
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    const img = screen.getByAltText('Opskriftens forside') as HTMLImageElement
    expect(img.src).toBe('https://cdn.test/thumb.jpg')
  })

  it('viser forside-billede med pattern_cover_url når pdf-thumb ikke er sat', () => {
    const project = makeProject({
      pattern_pdf_thumbnail_url: null,
      pattern_cover_url: 'https://cdn.test/cover.jpg',
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    const img = screen.getByAltText('Opskriftens forside') as HTMLImageElement
    expect(img.src).toBe('https://cdn.test/cover.jpg')
  })

  it('foretrækker PDF-thumbnail over pattern_cover_url', () => {
    const project = makeProject({
      pattern_pdf_thumbnail_url: 'https://cdn.test/pdf-thumb.jpg',
      pattern_cover_url: 'https://cdn.test/cover.jpg',
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    const img = screen.getByAltText('Opskriftens forside') as HTMLImageElement
    expect(img.src).toBe('https://cdn.test/pdf-thumb.jpg')
  })
})

// ---------------------------------------------------------------------------
// AC19: Forside-link target="_blank" + rel
// ---------------------------------------------------------------------------

describe('AC19 Forside-link target og rel', () => {
  it('forside-link har target="_blank"', () => {
    const project = makeProject({
      pattern_pdf_thumbnail_url: 'https://cdn.test/thumb.jpg',
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    const link = screen.getByRole('link', { name: /åbn opskriftens forside/i })
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('forside-link har rel="noopener noreferrer"', () => {
    const project = makeProject({
      pattern_pdf_thumbnail_url: 'https://cdn.test/thumb.jpg',
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    const link = screen.getByRole('link', { name: /åbn opskriftens forside/i })
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

// ---------------------------------------------------------------------------
// AC20: community_description vises som <p> med whitespace-pre-wrap
// ---------------------------------------------------------------------------

describe('AC20 community_description', () => {
  it('viser community_description som tekst', () => {
    const project = makeProject({ community_description: 'Hej verden\nAndre linje' })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    // Testing Library normaliserer whitespace — brug en funktion-matcher der finder <p> med teksten
    const p = screen.getByText((_content, element) =>
      element?.tagName.toLowerCase() === 'p' &&
      (element.textContent ?? '').includes('Hej verden'),
    )
    expect(p.tagName.toLowerCase()).toBe('p')
    expect(p.textContent).toContain('Hej verden')
  })

  it('<p> har whitespace: pre-wrap via inline style', () => {
    const project = makeProject({ community_description: 'Test\nLinje 2' })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    // Find <p>-elementer der indeholder teksten
    const p = screen.getByText((_content, element) =>
      element?.tagName.toLowerCase() === 'p' &&
      (element.textContent ?? '').includes('Test'),
    )
    expect(p.getAttribute('style')).toContain('white-space: pre-wrap')
  })

  it('viser ikke beskrivelsesblok når community_description er null', () => {
    const project = makeProject({ community_description: null })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    // Ingen <p> med whitespace-pre-wrap (beskrivelse er altid eneste pre-wrap <p>)
    const pElements = document.querySelectorAll('p')
    const preWrapPs = Array.from(pElements).filter(
      el => (el.getAttribute('style') ?? '').includes('pre-wrap'),
    )
    expect(preWrapPs).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// AC21: Garn-liste med farve-swatch og label
// ---------------------------------------------------------------------------

describe('AC21 Garn-liste', () => {
  it('viser garn-label via yarnDisplayLabel', () => {
    const project = makeProject({
      yarns: [makeYarn({ yarn_brand: 'Isager', yarn_name: 'Soft Merino' })],
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    expect(screen.getByText('Isager Soft Merino')).toBeInTheDocument()
  })

  it('viser color_code + color_name når begge er sat', () => {
    const project = makeProject({
      yarns: [makeYarn({ color_code: '47', color_name: 'Blå' })],
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    expect(screen.getByText('47 Blå')).toBeInTheDocument()
  })

  it('viser kun color_name når color_code er null', () => {
    const project = makeProject({
      yarns: [makeYarn({ color_code: null, color_name: 'Rød' })],
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    expect(screen.getByText('Rød')).toBeInTheDocument()
  })

  it('farve-swatch har background svarende til hex_color', () => {
    const project = makeProject({
      yarns: [makeYarn({ hex_color: '#4B6FA5' })],
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    // jsdom konverterer inline hex til rgb() i computed style, men style-attributten bevares.
    // Find swatch-span via aria-hidden og tjek computed backgroundColor
    const swatches = document.querySelectorAll('span[aria-hidden="true"]')
    // Swatch er den span med border-radius: 50% (cirkulær form)
    const swatch = Array.from(swatches).find(el =>
      (el.getAttribute('style') ?? '').includes('50%'),
    ) as HTMLElement | undefined
    expect(swatch).toBeDefined()
    // Computed style vil have rgb(75, 111, 165) fra #4B6FA5
    expect(swatch!.style.background).toMatch(/#4b6fa5|rgb\(75,\s*111,\s*165\)/i)
  })

  it('swatch bruger fallback-farve #E5DDD9 for null hex', () => {
    const project = makeProject({
      yarns: [makeYarn({ hex_color: null })],
    })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    const swatches = document.querySelectorAll('span[aria-hidden="true"]')
    const swatch = Array.from(swatches).find(el =>
      (el.getAttribute('style') ?? '').includes('50%'),
    ) as HTMLElement | undefined
    expect(swatch).toBeDefined()
    // Fallback er #E5DDD9 → rgb(229, 221, 217)
    expect(swatch!.style.background).toMatch(/#e5ddd9|rgb\(229,\s*221,\s*217\)/i)
  })

  it('viser ingen garn-sektion når yarns er tom liste', () => {
    const project = makeProject({ yarns: [] })
    render(<SharedProjectDetailModal project={project} onClose={vi.fn()} />)
    expect(screen.queryByText('Garn brugt')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Titel + autor fallback
// ---------------------------------------------------------------------------

describe('Titel og autor', () => {
  it('viser projekttitlen', () => {
    render(<SharedProjectDetailModal project={makeProject({ title: 'Blå Cardigan' })} onClose={vi.fn()} />)
    expect(screen.getByText('Blå Cardigan')).toBeInTheDocument()
  })

  it('viser "Unavngivet projekt" når title er null', () => {
    render(<SharedProjectDetailModal project={makeProject({ title: null })} onClose={vi.fn()} />)
    expect(screen.getByText('Unavngivet projekt')).toBeInTheDocument()
  })

  it('viser "af [display_name]"', () => {
    render(<SharedProjectDetailModal project={makeProject({ display_name: 'Anna K.' })} onClose={vi.fn()} />)
    expect(screen.getByText('af Anna K.')).toBeInTheDocument()
  })

  it('viser "Anonym strikker" når display_name er null', () => {
    render(<SharedProjectDetailModal project={makeProject({ display_name: null })} onClose={vi.fn()} />)
    expect(screen.getByText('af Anonym strikker')).toBeInTheDocument()
  })
})
