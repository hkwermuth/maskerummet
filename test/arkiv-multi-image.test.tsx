/**
 * Arkiv – multi-billed-upload tests
 *
 * AC1  Max 6 strik-billeder: "Tilføj billede(r)"-knappen er SKJULT når 6 slots
 *      er fyldt. Knappen er synlig og aktiv når der er færre end 6.
 * AC1b Det første billede i MultiImageGrid markeres med "Cover"-badge.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: vi.fn(),
  createSupabaseBrowserClient: vi.fn(),
}))

vi.mock('@/lib/catalog', () => ({
  displayYarnName: vi.fn((y: { name: string }) => y.name),
  fetchColorsByIds: vi.fn(() => Promise.resolve(new Map())),
  fetchColorsForYarn: vi.fn(() => Promise.resolve([])),
  searchYarnsFull: vi.fn(() => Promise.resolve([])),
}))

vi.mock('@/lib/supabase/mappers', () => ({
  fromUsageDb: vi.fn((row: Record<string, unknown>) => row),
  toUsageDb: vi.fn((v: unknown) => v),
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(() => Promise.resolve('https://example.com/file')),
  uploadFilesParallel: vi.fn(() => Promise.resolve([])),
  deleteFiles: vi.fn(() => Promise.resolve()),
  validateUploadFile: vi.fn(),
}))

vi.mock('@/lib/pdf-thumbnail', () => ({
  renderPdfFirstPage: vi.fn(() => Promise.resolve(new Blob(['png'], { type: 'image/png' }))),
}))

vi.mock('@/lib/export/exportProjekter', () => ({
  exportProjekter: vi.fn(() => Promise.resolve({ success: true })),
}))

vi.mock('@/components/app/DelMedFaellesskabetModal', () => ({
  DelMedFaellesskabetModal: () => null,
}))

import { useSupabase } from '@/lib/supabase/client'
import Arkiv from '@/components/app/Arkiv'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser = { id: 'user-1' }

/** 6 dummy image URLs – formateret som echte Supabase public URLs */
const SIX_IMAGE_URLS = Array.from({ length: 6 }, (_, i) =>
  `https://example.supabase.co/storage/v1/object/public/yarn-images/user-1/projects/p-full/img-${i}.jpg`
)

const ONE_IMAGE_URL = [SIX_IMAGE_URLS[0]]

const projectWith6Images = {
  id: 'p-full',
  title: 'Fyldt Projekt',
  status: 'faerdigstrikket',
  is_shared: false,
  used_at: '2024-01-01',
  created_at: '2024-01-01',
  needle_size: null,
  held_with: null,
  notes: null,
  project_image_urls: SIX_IMAGE_URLS,
  pattern_pdf_url: null,
  pattern_pdf_thumbnail_url: null,
  pattern_image_urls: [],
  user_id: 'user-1',
}

const projectWith1Image = {
  ...projectWith6Images,
  id: 'p-partial',
  title: 'Delvist Projekt',
  project_image_urls: ONE_IMAGE_URL,
}

function buildSupabaseMock(projects: object[]) {
  let orderCallCount = 0
  const projectsChain: {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
  } = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn(),
    order: vi.fn().mockImplementation(() => {
      orderCallCount++
      if (orderCallCount >= 2) {
        return Promise.resolve({ data: projects, error: null })
      }
      return projectsChain
    }),
  }
  projectsChain.eq.mockImplementation(() => projectsChain)

  const yarnChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') return projectsChain
      if (table === 'yarn_usage') return yarnChain
      return { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() }
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// AC1 – Max 6 strik-billeder håndhævet i UI
// ---------------------------------------------------------------------------

describe('AC1 – "Tilføj billede(r)"-knap skjules når 6 billeder er uploadet', () => {
  it('knappen er IKKE til stede i redigeringsvisning med 6 eksisterende billeder', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWith6Images]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Fyldt Projekt')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Fyldt Projekt'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    // Når alle 6 slots er fyldt, er der ingen "Tilføj billede(r)"-knap synlig
    await waitFor(() => {
      // "6 / 6" tæller-tekst skal ses
      expect(screen.getByText('6 / 6')).toBeInTheDocument()
    })

    // Ingen tilføj-knap (remaining = 0)
    expect(screen.queryByRole('button', { name: /tilføj billede/i })).not.toBeInTheDocument()
  })

  it('knappen er synlig i redigeringsvisning med færre end 6 billeder', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWith1Image]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Delvist Projekt')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Delvist Projekt'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    await waitFor(() => {
      expect(screen.getByText('1 / 6')).toBeInTheDocument()
    })

    // Med 1 billede ud af 6: knappen er der (remaining = 5 > 1, dvs. "Tilføj billeder")
    expect(screen.getByRole('button', { name: /tilføj billeder/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AC1b – Cover-mærket vises på første billede
// ---------------------------------------------------------------------------

describe('AC1b – Cover-badge på første billede i redigeringsvisning', () => {
  it('viser "Cover"-badge på det første billede', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(buildSupabaseMock([projectWith1Image]) as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Delvist Projekt')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Delvist Projekt'))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    await waitFor(() => {
      expect(screen.getByText('Cover')).toBeInTheDocument()
    })
  })
})
