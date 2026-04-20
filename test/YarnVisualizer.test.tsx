/**
 * Tests for YarnVisualizer-komponenten.
 * Dækker: step-flow (3 steps), drop-zone, inline Generér, galleri-rækkefølge.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Stub-katalog (lille, nok til at ColorGrid kan rendere én knap) ─────────────
// Defineret FØR vi.mock-kald, da mocks hoistes men factory-funktionen
// evalueres lazy — så værdier der er initialiseret her er tilgængelige.

const STUB_YARN = [
  {
    articleNumber: '883201',
    colorName: 'White',
    colorNameDa: 'Hvid',
    hex: '#FFFFFF',
    brand: 'Permin',
    series: 'Bella',
    fiber: 'Kid Mohair',
    weight: 'Lace',
    metrage: 145,
  },
  {
    articleNumber: '883210',
    colorName: 'Black',
    colorNameDa: 'Sort',
    hex: '#1A1A1A',
    brand: 'Permin',
    series: 'Bella',
    fiber: 'Kid Mohair',
    weight: 'Lace',
    metrage: 145,
  },
]

const EXAMPLE_VIZ = [
  {
    id: 'ex-1',
    original_url: 'https://example.com/orig.jpg',
    result_url: 'https://example.com/result.jpg',
    yarn_info: { colors: [{ hex: '#fff', colorNameDa: 'Hvid', brand: 'X', series: 'Y' }] },
    created_at: '2025-01-01T00:00:00Z',
    is_example: true,
    user_id: 'system',
  },
]

// ── Supabase mock-fabrik ───────────────────────────────────────────────────────
// Vi bruger en kontrollerbar variabel til at styre hvad der returneres

let supabaseFromImpl: () => unknown

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({
    from: (...args: unknown[]) => (supabaseFromImpl as (...a: unknown[]) => unknown)(...args),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  }),
}))

vi.mock('@/lib/data/perminCatalog', () => ({
  PERMIN_CATALOG: STUB_YARN,
}))

vi.mock('@/lib/data/filcolanaCatalog', () => ({
  FILCOLANA_CATALOG: [],
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadFile: vi.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Byg en Supabase .from() der altid returnerer tom liste */
function makeEmptyFrom() {
  return () => ({
    select: () => ({
      eq: () => ({ order: vi.fn().mockResolvedValue({ data: [] }) }),
      order: vi.fn().mockResolvedValue({ data: [] }),
    }),
  })
}

/** Byg en Supabase .from() der returnerer EXAMPLE_VIZ på is_example=true-query */
function makeExampleFrom() {
  return () => ({
    select: () => ({
      eq: (_col: string, val: unknown) => ({
        order: vi.fn().mockResolvedValue({
          data: val === true ? EXAMPLE_VIZ : [],
        }),
      }),
      order: vi.fn().mockResolvedValue({ data: [] }),
    }),
  })
}

// ── Import af komponenten (én gang — mocks er på plads) ───────────────────────

// Top-level dynamisk import efter mocks er registreret
const { default: YarnVisualizer } = await import('@/components/app/YarnVisualizer.jsx')

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  supabaseFromImpl = makeEmptyFrom()
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
})

// ── Tests: Step-indikator ─────────────────────────────────────────────────────

describe('YarnVisualizer — step-indikator', () => {
  it('AC8: Viser præcis 3 steps (Upload foto / Vælg farve / Resultat)', () => {
    render(<YarnVisualizer user={null} onRequestLogin={() => {}} />)

    expect(screen.getByText('Upload foto')).toBeInTheDocument()
    expect(screen.getByText('Vælg farve')).toBeInTheDocument()
    expect(screen.getByText('Resultat')).toBeInTheDocument()

    // Verificér at der ikke er et 4. step ved at tælle step-label-forekomster
    // Alle tre labels skal findes — og ingen andre step-lignende labels
    const uploadFotoEls = screen.getAllByText('Upload foto')
    const vaelgFarveEls = screen.getAllByText('Vælg farve')
    const resultatEls = screen.getAllByText('Resultat')

    expect(uploadFotoEls).toHaveLength(1)
    expect(vaelgFarveEls).toHaveLength(1)
    expect(resultatEls).toHaveLength(1)
  })

  it('AC9: Initial render: step 1 aktiv — drop-zone vises, step 2-indhold skjult', () => {
    render(<YarnVisualizer user={null} onRequestLogin={() => {}} />)

    // Drop-zone fra step 1
    expect(
      screen.getByText(/Træk et billede hertil eller klik for at uploade/i)
    ).toBeInTheDocument()

    // Step 2-specifikt indhold skal IKKE vises
    expect(screen.queryByText(/Én farve/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Flere farver/i)).not.toBeInTheDocument()
  })
})

// ── Tests: Inline Generér-knap (single-color mode) ───────────────────────────

describe('YarnVisualizer — inline Generér-knap (AC10)', () => {
  it('AC10: Generér-knap vises inline på step 2 efter farvevalg — ingen separat step 3', async () => {
    const user = userEvent.setup()
    render(<YarnVisualizer user={null} onRequestLogin={() => {}} />)

    // Upload en fil via det skjulte file-input
    const fileInput = document.querySelector('#viz-upload') as HTMLInputElement
    expect(fileInput).toBeTruthy()

    const fakeFile = new File(['fake'], 'test.png', { type: 'image/png' })
    await user.upload(fileInput, fakeFile)

    // Step 2 skal nu vises
    await screen.findByText(/Én farve/i)

    // Ingen Generér-knap endnu inden farvevalg
    expect(screen.queryByRole('button', { name: /Generér visualisering/i })).not.toBeInTheDocument()

    // Vælg en farve fra ColorGrid (titlen indeholder farvenavnet)
    const hvid = screen.getAllByTitle(/Hvid/i)
    await user.click(hvid[0])

    // Generér-knap skal nu vises INLINE (fortsat på step 2)
    expect(screen.getByRole('button', { name: /Generér visualisering/i })).toBeInTheDocument()

    // Stadig på step 2 — step-indikator "Vælg farve" er synlig
    expect(screen.getByText('Vælg farve')).toBeInTheDocument()

    // Step 3-indlæsnings-tekst IKKE vist
    expect(screen.queryByText(/Genererer visualisering/i)).not.toBeInTheDocument()
  })
})

// ── Tests: Galleri-rækkefølge ─────────────────────────────────────────────────

describe('YarnVisualizer — galleri-rækkefølge', () => {
  it('AC11: user=null → "Se hvad AI kan" vises FØR step-indikatoren (Upload foto)', async () => {
    supabaseFromImpl = makeExampleFrom()

    const { container } = render(<YarnVisualizer user={null} onRequestLogin={() => {}} />)

    // Vent på at galleri-data er hentet
    await screen.findByText('Se hvad AI kan')

    // DOM-rækkefølge: galleri skal komme FØR step-indikatoren
    const allText = container.textContent ?? ''
    const galleriPos = allText.indexOf('Se hvad AI kan')
    const stepPos = allText.indexOf('Upload foto')

    expect(galleriPos).toBeGreaterThanOrEqual(0)
    expect(stepPos).toBeGreaterThanOrEqual(0)
    expect(galleriPos).toBeLessThan(stepPos)
  })

  it('AC12: user={id} → "Upload foto" step vises FØR "Se hvad AI kan"', async () => {
    supabaseFromImpl = makeExampleFrom()

    const { container } = render(
      <YarnVisualizer user={{ id: 'user-x' }} onRequestLogin={() => {}} />
    )

    // Vent på galleri
    await screen.findByText('Se hvad AI kan')

    // DOM-rækkefølge: step-indikatoren skal komme FØR galleriet
    const allText = container.textContent ?? ''
    const stepPos = allText.indexOf('Upload foto')
    const galleriPos = allText.indexOf('Se hvad AI kan')

    expect(stepPos).toBeGreaterThanOrEqual(0)
    expect(galleriPos).toBeGreaterThanOrEqual(0)
    expect(stepPos).toBeLessThan(galleriPos)
  })
})
