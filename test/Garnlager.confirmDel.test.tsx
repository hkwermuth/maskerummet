/**
 * Tests for bekræftelsesdialog ved sletning i Garnlager.
 * Dækker acceptkriterierne fra feature: "Bekræftelsesdialog ved sletning af garn".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock supabase hook — vi styrer hvad delete() returnerer per test
const mockDelete = vi.fn()
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: [], error: null }),
  delete: vi.fn(() => ({
    eq: mockDelete,
  })),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({ from: mockFrom }),
}))

vi.mock('@/lib/supabase/mappers', () => ({
  toDb: (x: unknown) => x,
  fromDb: (x: unknown) => x,
  toUsageDb: (x: unknown) => x,
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(),
}))

vi.mock('@/lib/catalog', () => ({
  searchYarnsFull: vi.fn().mockResolvedValue([]),
  fetchYarnFullById: vi.fn().mockResolvedValue(null),
  fetchColorsForYarn: vi.fn().mockResolvedValue([]),
  displayYarnName: vi.fn(() => ''),
  applyCatalogYarnOnlyToForm: vi.fn((_, f) => f),
  applyCatalogYarnColorToForm: vi.fn((_, f) => f),
}))

vi.mock('@/lib/data/colorFamilies', () => ({
  detectColorFamily: vi.fn(() => 'neutral'),
  COLOR_FAMILY_LABELS: ['Neutral', 'Rød', 'Blå'],
  COLOR_FAMILY_DEFAULT_HEX: { Neutral: '#ccc', Rød: '#f00', Blå: '#00f' },
  yarnMatchesStashSearch: vi.fn(() => true),
}))

vi.mock('@/lib/export/exportGarnlager', () => ({
  exportGarnlager: vi.fn(),
}))

vi.mock('./BarcodeScanner', () => ({
  default: () => null,
}))

vi.mock('./BrugNoeglerModal', () => ({
  default: () => null,
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_YARN = {
  id: 'yarn-abc',
  name: 'Testgarn',
  brand: 'TestBrand',
  colorName: 'Rød',
  colorCode: '001',
  colorCategory: null,
  fiber: 'Uld',
  weight: 'DK',
  pindstr: '4',
  metrage: 200,
  antal: 3,
  status: 'På lager',
  hex: '#ff0000',
  noter: '',
  barcode: null,
  imageUrl: null,
  catalogYarnId: null,
  catalogColorId: null,
  catalogImageUrl: null,
}

const FAKE_USER = { id: 'user-1', email: 'test@test.dk' }

// Vi importerer komponenten dynamisk EFTER vi har sat mocks op
let Garnlager: React.ComponentType<{ user: unknown; onRequestLogin: () => void }>

beforeEach(async () => {
  vi.clearAllMocks()

  // Reset default delete mock til succes
  mockDelete.mockResolvedValue({ error: null })

  // Reset from mock: første kald (initial fetch) returnerer vores fake garn
  mockFrom.mockImplementation(() => ({
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [FAKE_YARN], error: null }),
    delete: vi.fn(() => ({ eq: mockDelete })),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: FAKE_YARN, error: null }),
  }))

  // Dynamisk import så mocks er aktive inden modulet evalueres
  const mod = await import('@/components/app/Garnlager.jsx')
  Garnlager = mod.default
})

// ── Hjælpefunktion: render og åbn edit-modal ─────────────────────────────────

async function renderAndOpenEdit() {
  const user = userEvent.setup()
  render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

  // Vent på at garnlisten loader
  await waitFor(() => {
    expect(screen.getByText('Testgarn')).toBeInTheDocument()
  })

  // Klik på garnkortet for at åbne edit-modal
  await user.click(screen.getByText('Testgarn'))

  // Vent på at modalen er åben (Gem-knappen er synlig i edit-mode)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
  })

  return { user }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Garnlager – bekræftelsesdialog ved sletning', () => {
  it('AC1: Klik på "Slet" viser "Er du sikker?" og ikke direkte sletning', async () => {
    const { user } = await renderAndOpenEdit()

    const sletBtn = screen.getByRole('button', { name: /^slet$/i })
    await user.click(sletBtn)

    expect(screen.getByText(/er du sikker/i)).toBeInTheDocument()
    // delete() skulle IKKE være kaldt endnu
    expect(mockDelete).not.toHaveBeenCalled()
  })

  it('AC1: "Ja, slet" og "Annuller" vises efter klik på Slet', async () => {
    const { user } = await renderAndOpenEdit()

    await user.click(screen.getByRole('button', { name: /^slet$/i }))

    expect(screen.getByRole('button', { name: /ja, slet/i })).toBeInTheDocument()
    // Der er to Annuller-knapper: én i bekræftelsen og én i modal-footer
    const annullerBtns = screen.getAllByRole('button', { name: /annuller/i })
    expect(annullerBtns.length).toBeGreaterThanOrEqual(1)
  })

  it('AC2: Klik på "Annuller" i bekræftelse lukker bekræftelsen men holder modalen åben', async () => {
    const { user } = await renderAndOpenEdit()

    await user.click(screen.getByRole('button', { name: /^slet$/i }))
    expect(screen.getByText(/er du sikker/i)).toBeInTheDocument()

    // Der er to Annuller-knapper nu (bekræftelse + modal-footer).
    // Vi klikker på den første (i bekræftelsen, uden for modal-footer).
    const annullerBtns = screen.getAllByRole('button', { name: /annuller/i })
    // Den i bekræftelsen er den første
    await user.click(annullerBtns[0])

    // "Er du sikker?" er væk
    expect(screen.queryByText(/er du sikker/i)).not.toBeInTheDocument()
    // Modalen er stadig åben — Gem-knap synlig
    expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
  })

  it('AC3: Klik på "Ja, slet" kalder del() og lukker modal ved succes', async () => {
    mockDelete.mockResolvedValue({ error: null })
    const { user } = await renderAndOpenEdit()

    await user.click(screen.getByRole('button', { name: /^slet$/i }))
    await user.click(screen.getByRole('button', { name: /ja, slet/i }))

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('id', 'yarn-abc')
    })

    // Modal er lukket (Gem-knap forsvundet)
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /gem ændringer/i })).not.toBeInTheDocument()
    })
  })

  it('AC4: Ved fejl vises saveError (rød banner) og modalen forbliver åben', async () => {
    mockDelete.mockResolvedValue({ error: { message: 'DB fejl' } })
    const { user } = await renderAndOpenEdit()

    await user.click(screen.getByRole('button', { name: /^slet$/i }))
    await user.click(screen.getByRole('button', { name: /ja, slet/i }))

    await waitFor(() => {
      expect(screen.getByText(/Kunne ikke slette/i)).toBeInTheDocument()
    })

    // Modal forbliver åben
    expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
  })

  it('AC5: confirmDel nulstilles ved ny modal-åbning (useEffect)', async () => {
    const { user } = await renderAndOpenEdit()

    // Åbn bekræftelse
    await user.click(screen.getByRole('button', { name: /^slet$/i }))
    expect(screen.getByText(/er du sikker/i)).toBeInTheDocument()

    // Luk modalen
    const annullerBtns = screen.getAllByRole('button', { name: /annuller/i })
    await user.click(annullerBtns[annullerBtns.length - 1]) // modal-footer annuller

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /gem ændringer/i })).not.toBeInTheDocument()
    })

    // Åbn modal igen
    await user.click(screen.getByText('Testgarn'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
    })

    // "Er du sikker?" skal IKKE vises — confirmDel er nulstillet
    expect(screen.queryByText(/er du sikker/i)).not.toBeInTheDocument()
    // Original Slet-knap skal vises
    expect(screen.getByRole('button', { name: /^slet$/i })).toBeInTheDocument()
  })

  it('AC6: "Slet"-knap skjules i add-modal', async () => {
    const user = userEvent.setup()
    render(<Garnlager user={FAKE_USER} onRequestLogin={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Testgarn')).toBeInTheDocument()
    })

    // Åbn add-modal via Tilføj-knappen
    const tilfoejBtn = screen.getByRole('button', { name: /tilføj/i })
    await user.click(tilfoejBtn)

    await waitFor(() => {
      // I add-mode hedder gem-knappen "Tilføj til lager" (F3)
      expect(screen.getByRole('button', { name: /tilføj til lager/i })).toBeInTheDocument()
    })

    // Slet-knap må ikke vises
    expect(screen.queryByRole('button', { name: /^slet$/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/er du sikker/i)).not.toBeInTheDocument()
  })

  it('AC7: "Ja, slet"-knap er disabled mens sletning pågår', async () => {
    // Lav et promise vi kan kontrollere
    let resolveDelete!: (val: { error: null }) => void
    mockDelete.mockReturnValue(new Promise(res => { resolveDelete = res }))

    const { user } = await renderAndOpenEdit()

    await user.click(screen.getByRole('button', { name: /^slet$/i }))
    await user.click(screen.getByRole('button', { name: /ja, slet/i }))

    // Mens delete ikke er resolved endnu
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sletter\.\.\./i })).toBeDisabled()
    })

    // Ryd op
    resolveDelete({ error: null })
  })

  it('AC9: "Gem ændringer" og "Annuller" footer-knapper er stadig tilgængelige', async () => {
    await renderAndOpenEdit()

    expect(screen.getByRole('button', { name: /gem ændringer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annuller/i })).toBeInTheDocument()
  })
})
