/**
 * Arkiv – status gating tests
 *
 * AC 3  NytProjektModal has StatusChips as the first field; status is sent on INSERT.
 * AC 4  DetailModal has StatusChips in edit view.
 * AC 5  "Del med fællesskabet" button is HIDDEN and replaced by italic text when
 *        status !== 'faerdigstrikket'.
 * AC 6  When a shared project is changed to i_gang, is_shared:false is sent in UPDATE.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  fromUsageDb: vi.fn((row: Record<string, unknown>) => ({
    id: row.id ?? 'usage-1',
    yarnName: row.yarn_name ?? '',
    yarnBrand: row.yarn_brand ?? '',
    colorName: row.color_name ?? '',
    colorCode: row.color_code ?? '',
    hex: row.hex ?? '#A8C4C4',
    quantityUsed: row.quantity_used ?? '',
    catalogYarnId: row.catalog_yarn_id ?? null,
    catalogColorId: row.catalog_color_id ?? null,
  })),
  toUsageDb: vi.fn((v: unknown) => v),
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(() => Promise.resolve('https://example.com/file')),
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

/** A project that is finished (faerdigstrikket) and shared */
const sharedFinishedProject = {
  id: 'p-shared',
  title: 'Delt Trøje',
  status: 'faerdigstrikket',
  is_shared: true,
  used_at: '2024-01-01',
  created_at: '2024-01-01',
  needle_size: '4',
  held_with: null,
  notes: null,
  project_image_url: null,
  pattern_pdf_url: null,
  user_id: 'user-1',
}

/** A project that is in progress and NOT shared */
const inProgressProject = {
  id: 'p-inprogress',
  title: 'Igangværende Hue',
  status: 'i_gang',
  is_shared: false,
  used_at: null,
  created_at: '2024-02-01',
  needle_size: null,
  held_with: null,
  notes: null,
  project_image_url: null,
  pattern_pdf_url: null,
  user_id: 'user-1',
}

const usageRow = {
  id: 'usage-1',
  project_id: 'p-shared',
  yarn_name: 'Bella',
  yarn_brand: 'Permin',
  color_name: 'Blå',
  color_code: '883174',
  hex: '#A8C4C4',
  quantity_used: 2,
  catalog_yarn_id: null,
  catalog_color_id: null,
  created_at: '2024-01-01',
}

const inProgressUsageRow = { ...usageRow, id: 'usage-2', project_id: 'p-inprogress' }

function buildSupabaseMock(
  projects: object[],
  usageRows: object[] = [],
  updateResult: object = { data: null, error: null }
) {
  let orderCallCount = 0
  const projectsChain = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockImplementation(() => {
      orderCallCount++
      if (orderCallCount >= 2) {
        return Promise.resolve({ data: projects, error: null })
      }
      return projectsChain
    }),
  }

  const yarnChain = {
    select: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: usageRows, error: null }),
  }

  // Update chain for DetailModal save
  const updateChain = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(updateResult),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'projects') {
        // If there's already been a load, subsequent calls are for update
        return { ...projectsChain, ...updateChain }
      }
      if (table === 'yarn_usage') return yarnChain
      return { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() }
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// AC 3 – NytProjektModal renders StatusChips as first field
// ---------------------------------------------------------------------------

describe('AC3 – NytProjektModal has StatusChips as first labeled field', () => {
  it('shows all three status chip buttons when "Nyt projekt" modal is opened', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(
      buildSupabaseMock([]) as never
    )
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    // Wait for load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ nyt projekt/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /\+ nyt projekt/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /vil gerne strikke/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^i gang$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^færdigstrikket$/i })).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// AC 4 – DetailModal has StatusChips in edit view
// ---------------------------------------------------------------------------

describe('AC4 – DetailModal shows StatusChips when editing', () => {
  it('renders status chip buttons in edit mode for a faerdigstrikket project', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(
      buildSupabaseMock([sharedFinishedProject], [usageRow]) as never
    )
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    // Wait until the card appears
    await waitFor(() => {
      expect(screen.getByText('Delt Trøje')).toBeInTheDocument()
    })

    // Click the project card to open DetailModal
    await user.click(screen.getByText('Delt Trøje'))

    // Click Rediger to enter edit mode — use exact text match to avoid matching
    // the "Rediger deling med fællesskabet" button that also appears in the modal
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    // StatusChips should be visible in edit mode
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /vil gerne strikke/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^i gang$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^færdigstrikket$/i })).toBeInTheDocument()
    })
  })
})

// ---------------------------------------------------------------------------
// AC 5 – Del-button hidden for non-faerdigstrikket projects
// ---------------------------------------------------------------------------

describe('AC5 – Del button hidden when project is not færdigstrikket', () => {
  it('shows "Del er mulig" text and hides Del button for i_gang project', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(
      buildSupabaseMock([inProgressProject], [inProgressUsageRow]) as never
    )
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    // Switch to i_gang tab first
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /i gang/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('tab', { name: /i gang/i }))

    await waitFor(() => {
      expect(screen.getByText('Igangværende Hue')).toBeInTheDocument()
    })

    // Open detail modal
    await user.click(screen.getByText('Igangværende Hue'))

    await waitFor(() => {
      expect(screen.getByText(/del er mulig når projektet er færdigstrikket/i)).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /del med fællesskabet/i })).not.toBeInTheDocument()
  })

  it('shows Del button for faerdigstrikket project', async () => {
    const user = userEvent.setup()
    vi.mocked(useSupabase).mockReturnValue(
      buildSupabaseMock([sharedFinishedProject], [usageRow]) as never
    )
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Delt Trøje')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Delt Trøje'))

    await waitFor(() => {
      // The button exists – for a shared project the aria-label is
      // "Rediger deling med fællesskabet"; for unshared it is "Del med fællesskabet"
      expect(
        screen.getByRole('button', { name: /rediger deling med fællesskabet|del med fællesskabet/i })
      ).toBeInTheDocument()
    })

    // The italic "Del er mulig" text should NOT be visible
    expect(screen.queryByText(/del er mulig når projektet er færdigstrikket/i)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// AC 6 – Changing shared project to i_gang sends is_shared:false in UPDATE
// ---------------------------------------------------------------------------

describe('AC6 – Saving status change from faerdigstrikket to i_gang unshares the project', () => {
  it('includes is_shared:false in the UPDATE payload when project is shared and status changes to i_gang', async () => {
    const user = userEvent.setup()

    // We need to capture the update() call to verify the payload
    const updateMock = vi.fn().mockReturnThis()
    const eqMock = vi.fn().mockReturnThis()
    const selectMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({
      data: { ...sharedFinishedProject, status: 'i_gang', is_shared: false },
      error: null,
    })

    let orderCallCount = 0
    const projectsChain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(() => {
        orderCallCount++
        if (orderCallCount >= 2) {
          return Promise.resolve({ data: [sharedFinishedProject], error: null })
        }
        return projectsChain
      }),
      update: updateMock,
      eq: eqMock,
      single: singleMock,
    }
    // Make update chain chainable
    updateMock.mockReturnValue({ eq: eqMock })
    eqMock.mockReturnValue({ select: selectMock })
    selectMock.mockReturnValue({ single: singleMock })

    const yarnChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [usageRow], error: null }),
    }

    const supabaseMock = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'projects') return projectsChain
        if (table === 'yarn_usage') return yarnChain
        return { select: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis() }
      }),
    }

    vi.mocked(useSupabase).mockReturnValue(supabaseMock as never)
    render(<Arkiv user={mockUser} onRequestLogin={vi.fn()} />)

    // Open project card
    await waitFor(() => {
      expect(screen.getByText('Delt Trøje')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Delt Trøje'))

    // Enter edit mode – use exact text to avoid "Rediger deling med fællesskabet"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Rediger$/ })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^Rediger$/ }))

    // Change status to "I gang"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^i gang$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^i gang$/i }))

    // Save
    await user.click(screen.getByRole('button', { name: /gem ændringer/i }))

    // Verify update was called with is_shared: false in the payload
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ is_shared: false })
      )
    })
  })
})
