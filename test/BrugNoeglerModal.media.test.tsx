/**
 * Regression: BrugNoeglerModal skal gemme uploadede billeder/PDF på
 * projects-tabellen (project_image_urls + pattern_pdf_url), IKKE på
 * yarn_usage (gamle, ubrugte kolonner). Bug før fix: Arkiv-visningen
 * læser fra projects.project_image_urls, så billeder uploadet via
 * "Brug nøgler" var usynlige i Arkiv selvom filen var i Storage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/supabase/client', () => ({ useSupabase: vi.fn() }))
vi.mock('@/lib/supabase/mappers', () => ({
  toUsageDb: vi.fn((v: Record<string, unknown>) => ({ ...v, held_with: v.heldWith ?? null })),
}))
vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn((_s, bucket: string, path: string) =>
    Promise.resolve(`https://example.com/${bucket}/${path}`),
  ),
}))
vi.mock('@/lib/pdf-thumbnail', () => ({
  renderPdfFirstPage: vi.fn(() => Promise.resolve(new Blob(['thumb'], { type: 'image/png' }))),
}))
vi.mock('@/lib/hooks/useEscapeKey', () => ({ useEscapeKey: vi.fn() }))

import { useSupabase } from '@/lib/supabase/client'
import BrugNoeglerModal from '@/components/app/BrugNoeglerModal'

const sampleYarn = {
  id: 'y1', name: 'Bella', brand: 'Permin',
  colorName: 'Rosa', colorCode: '883174', hex: '#E1A1B0',
  antal: 5, status: 'På lager', pindstr: '3.5',
  catalogYarnId: null, catalogColorId: null,
}

const existingProject = {
  id: 'p1', title: 'Sommersweater',
  used_at: '2024-01-01', created_at: '2024-01-01',
}

function buildSupabaseMock(opts: {
  existingImages?: string[]
  existingPatternImages?: string[]
} = {}) {
  const projectsUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))
  const projectsLoadSingle = vi.fn().mockResolvedValue({
    data: {
      project_image_urls: opts.existingImages ?? [],
      pattern_image_urls: opts.existingPatternImages ?? [],
    },
    error: null,
  })
  const projectsListLimit = vi.fn().mockResolvedValue({ data: [existingProject], error: null })
  const projectsInsertSingle = vi.fn().mockResolvedValue({ data: { id: 'p-new' }, error: null })

  const usageInsertSingle = vi.fn().mockResolvedValue({ data: { id: 'usage-new' }, error: null })
  const usageInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: usageInsertSingle })) }))

  const yarnItemsUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))

  const supabaseMock = {
    from: vi.fn((table: string) => {
      if (table === 'projects') {
        return {
          // Initial liste-load (FIRST .select call går her)
          select: vi.fn((cols: string) => {
            // Konflikt-check ved eksisterende projekt: select('project_image_urls,pattern_image_urls')
            if (cols.includes('project_image_urls')) {
              return {
                eq: vi.fn(() => ({ single: projectsLoadSingle })),
              }
            }
            // List-load i useEffect: select('id,title,used_at,created_at')
            return {
              order: vi.fn().mockReturnThis(),
              limit: projectsListLimit,
            }
          }),
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: projectsInsertSingle })) })),
          update: projectsUpdate,
        }
      }
      if (table === 'yarn_usage') return { insert: usageInsert }
      if (table === 'yarn_items') return { update: yarnItemsUpdate }
      return {}
    }),
    _projectsUpdate: projectsUpdate,
    _usageInsert: usageInsert,
  }
  return supabaseMock
}

beforeEach(() => vi.clearAllMocks())

describe('BrugNoeglerModal — media gemmes på projects-tabellen', () => {
  it('eksisterende projekt: billede appendes til projects.project_image_urls', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMock({ existingImages: ['https://example.com/old.jpg'] })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const { container } = render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement
    const file = new File(['imgbytes'], 'foto.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput, file)

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(mock._projectsUpdate).toHaveBeenCalled()
    })
    const updatePayload = mock._projectsUpdate.mock.calls[0][0]
    expect(updatePayload).toHaveProperty('project_image_urls')
    expect(updatePayload.project_image_urls).toHaveLength(2)
    expect(updatePayload.project_image_urls[0]).toBe('https://example.com/old.jpg')
    expect(updatePayload.project_image_urls[1]).toMatch(/yarn-images/)
  })

  it('eksisterende projekt: PDF gemmes på projects.pattern_pdf_url med thumbnail', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMock()
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const { container } = render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())

    const pdfInput = container.querySelector('input[type="file"][accept*="pdf"]') as HTMLInputElement
    const file = new File(['pdfbytes'], 'opskrift.pdf', { type: 'application/pdf' })
    await user.upload(pdfInput, file)

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(mock._projectsUpdate).toHaveBeenCalled()
    })
    const updatePayload = mock._projectsUpdate.mock.calls[0][0]
    expect(updatePayload).toHaveProperty('pattern_pdf_url')
    expect(updatePayload.pattern_pdf_url).toMatch(/patterns/)
    expect(updatePayload).toHaveProperty('pattern_pdf_thumbnail_url')
    expect(updatePayload.pattern_pdf_thumbnail_url).toMatch(/thumb\.png$/)
  })

  it('yarn_usage insert indeholder IKKE de gamle media-felter', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMock()
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const { container } = render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement
    await user.upload(fileInput, new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => expect(mock._usageInsert).toHaveBeenCalled())
    const insertPayload = mock._usageInsert.mock.calls[0][0][0]
    expect(insertPayload).not.toHaveProperty('project_image_url')
    expect(insertPayload).not.toHaveProperty('pattern_pdf_url')
  })

  it('blokerer billede-upload hvis projektet allerede har 6 billeder', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMock({
      existingImages: ['a', 'b', 'c', 'd', 'e', 'f'],
    })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const { container } = render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"][accept*="image"]') as HTMLInputElement
    await user.upload(fileInput, new File(['x'], 'foto.jpg', { type: 'image/jpeg' }))

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(screen.getByText(/allerede 6 billeder/i)).toBeInTheDocument()
    })
    expect(mock._projectsUpdate).not.toHaveBeenCalled()
  })

  it('blokerer PDF-upload hvis projektet allerede har en billed-kæde', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMock({
      existingPatternImages: ['https://example.com/page1.jpg'],
    })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const { container } = render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())

    const pdfInput = container.querySelector('input[type="file"][accept*="pdf"]') as HTMLInputElement
    await user.upload(pdfInput, new File(['x'], 'opskrift.pdf', { type: 'application/pdf' }))

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(screen.getByText(/billed-kæde/i)).toBeInTheDocument()
    })
    expect(mock._projectsUpdate).not.toHaveBeenCalled()
  })
})
