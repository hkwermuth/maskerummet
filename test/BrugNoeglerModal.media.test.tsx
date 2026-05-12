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
  const projectsUpdate = vi.fn((_payload: Record<string, unknown>) => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))
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
  const usageInsert = vi.fn((_rows: Record<string, unknown>[]) => ({ select: vi.fn(() => ({ single: usageInsertSingle })) }))

  // yarn_items mock dækker hele allocate-flow (Bug 2 fix 2026-05-05):
  // 1: decrementYarnItemQuantity fetch (select.eq.eq.maybeSingle)
  // 2: decrementYarnItemQuantity update (update.eq.eq.gte.select)
  // 3: findInUseRowMatch (select.eq.eq.ilike.limit) — catalog_color_id=null så kun 1 call
  // 4: createInUseRow fetch source (select.eq.eq.maybeSingle)
  // 5: createInUseRow insert (insert.select.single)
  let yarnItemsCall = 0
  const yarnItemsUpdate = vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          select: vi.fn().mockResolvedValue({ data: [{ id: 'y1', quantity: 0 }], error: null }),
        })),
      })),
    })),
  }))
  const yarnItemsHandler = () => {
    yarnItemsCall++
    if (yarnItemsCall === 1) {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { quantity: 5 }, error: null }),
      }
    }
    if (yarnItemsCall === 2) {
      return { update: yarnItemsUpdate }
    }
    if (yarnItemsCall === 3) {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }
    if (yarnItemsCall === 4) {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: {}, error: null }),
      }
    }
    return {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'y-inuse-new' }, error: null }),
        })),
      })),
    }
  }

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
      if (table === 'yarn_items') return yarnItemsHandler()
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
    const projectsUpdate = vi.fn((_payload: Record<string, unknown>) => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))

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
        if (table === 'yarn_items') {
          // Generisk passthrough-builder der ikke throws — yarn_items-detaljer
          // testes i andre filer; her drejer det sig om project-side adfærd.
          const b: Record<string, unknown> = {}
          for (const m of ['select','eq','neq','in','is','ilike','gte','limit','order','update','insert','delete']) b[m] = vi.fn(() => b)
          b.single = vi.fn().mockResolvedValue({ data: { id: 'y-stub' }, error: null })
          b.maybeSingle = vi.fn().mockResolvedValue({ data: { quantity: 100 }, error: null })
          b.then = (onF: (r: { data: unknown; error: unknown }) => unknown) => Promise.resolve({ data: [{ id: 'y-stub', quantity: 0 }], error: null }).then(onF)
          return b
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

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())

    // Skriv en note i forbrugs-formen
    const notesField = screen.getByPlaceholderText(/ændringer til opskriften/i)
    await user.type(notesField, 'brugte 4 ngl til ærmer')

    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => expect(projectsUpdate).toHaveBeenCalled())
    const updatePayload = projectsUpdate.mock.calls[0]![0]
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
    const projectsUpdate = vi.fn((_payload: Record<string, unknown>) => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }))
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
        if (table === 'yarn_items') {
          // Generisk passthrough-builder der ikke throws — yarn_items-detaljer
          // testes i andre filer; her drejer det sig om project-side adfærd.
          const b: Record<string, unknown> = {}
          for (const m of ['select','eq','neq','in','is','ilike','gte','limit','order','update','insert','delete']) b[m] = vi.fn(() => b)
          b.single = vi.fn().mockResolvedValue({ data: { id: 'y-stub' }, error: null })
          b.maybeSingle = vi.fn().mockResolvedValue({ data: { quantity: 100 }, error: null })
          b.then = (onF: (r: { data: unknown; error: unknown }) => unknown) => Promise.resolve({ data: [{ id: 'y-stub', quantity: 0 }], error: null }).then(onF)
          return b
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
    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText(/ændringer til opskriften/i), 'kort note')
    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => expect(projectsUpdate).toHaveBeenCalled())
    const savedNotes = projectsUpdate.mock.calls[0]![0].notes as string
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

describe('BrugNoeglerModal — yarn_items status-opdatering ved forbrug (POST-FIX 2026-05-05)', () => {
  it('Bug 2 fix: source-rækkens status forbliver "På lager" (allokering går via shared yarn-allocate)', async () => {
    // Pre-fix: source-rækken fik status='I brug' med restantal — det brød
    // yarn-allocation-system'ets invariant. Post-fix: allocateYarnToProject
    // decrementer kun quantity og opretter separat I-brug-række.
    // Dækkes detaljeret i BrugNoeglerModal.statusFix.test.tsx — denne test
    // verificerer kun at source-status IKKE skiftes via update-call.
    const user = userEvent.setup()
    const mock = buildSupabaseMock()
    vi.mocked(useSupabase).mockReturnValue(mock as never)
    const onSaved = vi.fn()

    render(
      <BrugNoeglerModal
        yarn={{ ...sampleYarn, antal: 5, status: 'På lager' }}
        user={{ id: 'user-1' }}
        onClose={vi.fn()}
        onSaved={onSaved}
      />
    )

    await waitFor(() => expect(screen.getByText(/pindestørrelse brugt/i)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /arkivér nøgler/i }))

    await waitFor(() => expect(onSaved).toHaveBeenCalled())
    // onSaved tilbagerapporterer source-status (skal være 'På lager', ikke 'I brug')
    const [, , reportedStatus] = onSaved.mock.calls[0]!
    expect(reportedStatus).toBe('På lager')
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
        if (table === 'yarn_items') {
          // Generisk passthrough-builder der ikke throws — yarn_items-detaljer
          // testes i andre filer; her drejer det sig om project-side adfærd.
          const b: Record<string, unknown> = {}
          for (const m of ['select','eq','neq','in','is','ilike','gte','limit','order','update','insert','delete']) b[m] = vi.fn(() => b)
          b.single = vi.fn().mockResolvedValue({ data: { id: 'y-stub' }, error: null })
          b.maybeSingle = vi.fn().mockResolvedValue({ data: { quantity: 100 }, error: null })
          b.then = (onF: (r: { data: unknown; error: unknown }) => unknown) => Promise.resolve({ data: [{ id: 'y-stub', quantity: 0 }], error: null }).then(onF)
          return b
        }
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
    const inSpy = vi.fn((_col: string, _statuses: string[]) => ({
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
        if (table === 'yarn_items') {
          // Generisk passthrough-builder der ikke throws — yarn_items-detaljer
          // testes i andre filer; her drejer det sig om project-side adfærd.
          const b: Record<string, unknown> = {}
          for (const m of ['select','eq','neq','in','is','ilike','gte','limit','order','update','insert','delete']) b[m] = vi.fn(() => b)
          b.single = vi.fn().mockResolvedValue({ data: { id: 'y-stub' }, error: null })
          b.maybeSingle = vi.fn().mockResolvedValue({ data: { quantity: 100 }, error: null })
          b.then = (onF: (r: { data: unknown; error: unknown }) => unknown) => Promise.resolve({ data: [{ id: 'y-stub', quantity: 0 }], error: null }).then(onF)
          return b
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

    await waitFor(() => expect(inSpy).toHaveBeenCalled())
    const [col, statuses] = inSpy.mock.calls[0]!
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
    const updatePayload = mock._projectsUpdate.mock.calls[0]![0]
    expect(updatePayload).toHaveProperty('project_image_urls')
    const imageUrls = updatePayload.project_image_urls as string[]
    expect(imageUrls).toHaveLength(2)
    expect(imageUrls[0]).toBe('https://example.com/old.jpg')
    expect(imageUrls[1]).toMatch(/yarn-images/)
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
    const updatePayload = mock._projectsUpdate.mock.calls[0]![0]
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
    const insertPayload = mock._usageInsert.mock.calls[0]![0][0]
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
