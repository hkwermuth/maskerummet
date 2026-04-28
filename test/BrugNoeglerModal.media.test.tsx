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
  existingPdfUrl?: string | null
} = {}) {
  const projectsUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))
  const projectsLoadSingle = vi.fn().mockResolvedValue({
    data: {
      project_image_urls: opts.existingImages ?? [],
      pattern_image_urls: opts.existingPatternImages ?? [],
      pattern_pdf_url: opts.existingPdfUrl ?? null,
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
            // List-load i useEffect: .eq('user_id', uid).in('status', [...]).order().order().limit()
            const limitChain = {
              order: vi.fn().mockReturnThis(),
              limit: projectsListLimit,
            }
            return {
              eq: vi.fn(() => ({
                in: vi.fn(() => limitChain),
              })),
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

describe('BrugNoeglerModal — note appendes til projects.notes med dato-stamp', () => {
  it('eksisterende projekt med eksisterende noter: ny note appendes med dato + separator', async () => {
    const user = userEvent.setup()
    const projectsLoadSingle = vi.fn().mockResolvedValue({
      data: {
        project_image_urls: [],
        pattern_image_urls: [],
        pattern_pdf_url: null,
        notes: 'Eksisterende noter her.',
      },
      error: null,
    })
    const projectsUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn((cols: string) => {
              if (cols.includes('notes')) {
                return { eq: vi.fn(() => ({ single: projectsLoadSingle })) }
              }
              return {
                eq: vi.fn(() => ({
                  in: vi.fn(() => ({
                    order: vi.fn().mockReturnThis(),
                    limit: vi.fn().mockResolvedValue({ data: [existingProject], error: null }),
                  })),
                })),
              }
            }),
            update: projectsUpdate,
          }
        }
        if (table === 'yarn_usage') return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'u' }, error: null }) })) })) }
        if (table === 'yarn_items') return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })) }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(supabaseMock as never)

    render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())

    // Skriv en note i forbrugs-formen
    const notesField = screen.getByPlaceholderText(/ændringer til opskriften/i)
    await user.type(notesField, 'brugte 4 ngl til ærmer')

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => expect(projectsUpdate).toHaveBeenCalled())
    const updatePayload = projectsUpdate.mock.calls[0][0]
    expect(updatePayload).toHaveProperty('notes')
    const savedNotes = updatePayload.notes as string
    expect(savedNotes.startsWith('Eksisterende noter her.')).toBe(true)
    expect(savedNotes).toMatch(/—\s*\d{4}-\d{2}-\d{2}:\s*brugte 4 ngl til ærmer$/m)
    expect(savedNotes).toContain('\n\n')
  })

  it('eksisterende projekt uden tidligere noter: ny note skrives uden separator', async () => {
    const user = userEvent.setup()
    const projectsLoadSingle = vi.fn().mockResolvedValue({
      data: { project_image_urls: [], pattern_image_urls: [], pattern_pdf_url: null, notes: null },
      error: null,
    })
    const projectsUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn((cols: string) => {
              if (cols.includes('notes')) return { eq: vi.fn(() => ({ single: projectsLoadSingle })) }
              return { eq: vi.fn(() => ({ in: vi.fn(() => ({ order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [existingProject], error: null }) })) })) }
            }),
            update: projectsUpdate,
          }
        }
        if (table === 'yarn_usage') return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'u' }, error: null }) })) })) }
        if (table === 'yarn_items') return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })) }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(supabaseMock as never)

    render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText(/ændringer til opskriften/i), 'kort note')
    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => expect(projectsUpdate).toHaveBeenCalled())
    const savedNotes = projectsUpdate.mock.calls[0][0].notes as string
    expect(savedNotes).toMatch(/^—\s*\d{4}-\d{2}-\d{2}:\s*kort note$/)
  })

  it('tom note → projects.notes opdateres ikke', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMock()
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )
    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())
    // Skriv ingen note, klik gem
    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    // Ingen projects-update bør ske (ingen media, ingen note)
    await waitFor(() => {
      expect(mock._usageInsert).toHaveBeenCalled()
    })
    expect(mock._projectsUpdate).not.toHaveBeenCalled()
  })
})

describe('BrugNoeglerModal — yarn_items status-opdatering ved forbrug', () => {
  it('sætter status til "I brug" når antal stadig er > 0', async () => {
    const user = userEvent.setup()
    const yarnItemsUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))
    const onSaved = vi.fn()

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn((cols: string) => {
              if (cols.includes('project_image_urls')) {
                return { eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { project_image_urls: [], pattern_image_urls: [], pattern_pdf_url: null }, error: null }) })) }
              }
              return { eq: vi.fn(() => ({ in: vi.fn(() => ({ order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [existingProject], error: null }) })) })) }
            }),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          }
        }
        if (table === 'yarn_usage') return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'u' }, error: null }) })) })) }
        if (table === 'yarn_items') return { update: yarnItemsUpdate }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(supabaseMock as never)

    render(
      <BrugNoeglerModal
        yarn={{ ...sampleYarn, antal: 5, status: 'På lager' }}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    )

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())
    // Default form.quantityUsed = 1 → 5 - 1 = 4 → "I brug"
    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => expect(yarnItemsUpdate).toHaveBeenCalled())
    const updatePayload = yarnItemsUpdate.mock.calls[0][0]
    expect(updatePayload.status).toBe('I brug')
    expect(updatePayload.quantity).toBe(4)
    expect(onSaved).toHaveBeenCalledWith(expect.anything(), 4, 'I brug')
  })

  it('sætter status til "Brugt op" når antal når 0', async () => {
    const user = userEvent.setup()
    const yarnItemsUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))
    const onSaved = vi.fn()

    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn((cols: string) => {
              if (cols.includes('project_image_urls')) {
                return { eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { project_image_urls: [], pattern_image_urls: [], pattern_pdf_url: null }, error: null }) })) }
              }
              return { eq: vi.fn(() => ({ in: vi.fn(() => ({ order: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue({ data: [existingProject], error: null }) })) })) }
            }),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          }
        }
        if (table === 'yarn_usage') return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'u' }, error: null }) })) })) }
        if (table === 'yarn_items') return { update: yarnItemsUpdate }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(supabaseMock as never)

    render(
      <BrugNoeglerModal
        yarn={{ ...sampleYarn, antal: 1, status: 'På lager' }}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    )

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())
    // antal=1, brug 1 → 0 → "Brugt op"
    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => expect(yarnItemsUpdate).toHaveBeenCalled())
    const updatePayload = yarnItemsUpdate.mock.calls[0][0]
    expect(updatePayload.status).toBe('Brugt op')
    expect(updatePayload.quantity).toBe(0)
    expect(onSaved).toHaveBeenCalledWith(expect.anything(), 0, 'Brugt op')
  })
})

describe('BrugNoeglerModal — projekt-liste-filtrering (sikkerhed + UX)', () => {
  it('liste-load filtrerer på user_id (ingen andre brugeres delte projekter)', async () => {
    const user = userEvent.setup()
    const eqSpy = vi.fn(() => ({
      in: vi.fn(() => ({
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [existingProject], error: null }),
      })),
    }))
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn(() => ({ eq: eqSpy })),
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'p-new' }, error: null }) })) })),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          }
        }
        if (table === 'yarn_usage') return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'u' }, error: null }) })) })) }
        if (table === 'yarn_items') return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })) }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(supabaseMock as never)

    render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-42' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => expect(eqSpy).toHaveBeenCalled())
    expect(eqSpy).toHaveBeenCalledWith('user_id', 'user-42')
  })

  it('liste-load filtrerer status til kun vil_gerne + i_gang', async () => {
    const inSpy = vi.fn(() => ({
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [existingProject], error: null }),
    }))
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn(() => ({ eq: vi.fn(() => ({ in: inSpy })) })),
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'p-new' }, error: null }) })) })),
            update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
          }
        }
        if (table === 'yarn_usage') return { insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'u' }, error: null }) })) })) }
        if (table === 'yarn_items') return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })) }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(supabaseMock as never)

    render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    await waitFor(() => expect(inSpy).toHaveBeenCalled())
    const [col, statuses] = inSpy.mock.calls[0]
    expect(col).toBe('status')
    expect(statuses).toEqual(['vil_gerne', 'i_gang'])
    expect(statuses).not.toContain('faerdigstrikket')
  })

  it('skifter automatisk til "Opret nyt projekt"-mode hvis listen er tom', async () => {
    const supabaseMock = {
      from: vi.fn((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                in: vi.fn(() => ({
                  order: vi.fn().mockReturnThis(),
                  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
            insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'p-new' }, error: null }) })) })),
          }
        }
        return {}
      }),
    }
    vi.mocked(useSupabase).mockReturnValue(supabaseMock as never)

    render(
      <BrugNoeglerModal
        yarn={sampleYarn}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />
    )

    // Når listen er tom skifter mode til 'new' → "Projektnavn"-felt vises
    await waitFor(() => expect(screen.getByText(/^projektnavn$/i)).toBeInTheDocument())
  })
})

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

  it('Fjern-knap rydder valgt PDF efter konflikt-besked så brugeren kan komme videre', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMock({
      existingPdfUrl: 'https://example.com/old.pdf',
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

    // Upload PDF og prøv at gemme → får konflikt-besked
    const pdfInput = container.querySelector('input[type="file"][accept*="pdf"]') as HTMLInputElement
    await user.upload(pdfInput, new File(['x'], 'min.pdf', { type: 'application/pdf' }))
    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(screen.getByText(/allerede en opskrift som PDF/i)).toBeInTheDocument()
    })

    // Fjern-knap skal være tilgængelig
    const clearBtn = screen.getByRole('button', { name: /fjern valgt pdf/i })
    expect(clearBtn).toBeInTheDocument()

    // Klik fjerner PDF og fejlbesked
    await user.click(clearBtn)
    expect(screen.queryByText(/allerede en opskrift som PDF/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /fjern valgt pdf/i })).not.toBeInTheDocument()
  })

  it('blokerer PDF-upload hvis projektet allerede har en PDF (forhindrer overskrivning)', async () => {
    const user = userEvent.setup()
    const mock = buildSupabaseMock({
      existingPdfUrl: 'https://example.com/old.pdf',
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
    await user.upload(pdfInput, new File(['x'], 'ny.pdf', { type: 'application/pdf' }))

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => {
      expect(screen.getByText(/allerede en opskrift som PDF/i)).toBeInTheDocument()
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
