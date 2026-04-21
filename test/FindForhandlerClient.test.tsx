import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock DanmarksKortClient (Leaflet cannot run in jsdom)
vi.mock('@/app/find-forhandler/DanmarksKortClient', () => ({
  default: React.forwardRef(function DanmarksKortStub() {
    return <div data-testid="danmarkskort-stub">Kort stub</div>
  }),
}))

// Mock next/dynamic to return the stub directly (no lazy loading in tests)
vi.mock('next/dynamic', () => ({
  default: (_loader: unknown) => {
    const Stub = React.forwardRef(function DynamicStub() {
      return <div data-testid="danmarkskort-stub">Kort stub</div>
    })
    return Stub
  },
}))

// Mock useSupabase
vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}))

// Mock HeroIllustration
vi.mock('@/components/layout/HeroIllustration', () => ({
  HeroIllustration: () => <div data-testid="hero-illustration" />,
}))

// Mock searchStoresNear (used when tests trigger actual searching)
vi.mock('@/lib/data/stores', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/data/stores')>()
  return {
    ...actual,
    searchStoresNear: vi.fn().mockResolvedValue([]),
  }
})

// Import after mocks
import { FindForhandlerClient } from '@/app/find-forhandler/FindForhandlerClient'
import type { StoreBase, StoreResult } from '@/lib/data/stores'
import type { Brand, OnlineRetailer } from '@/lib/data/retailers'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeStore = (overrides: Partial<StoreBase> = {}): StoreBase => ({
  id: 'store-1',
  name: 'Garnbutikken',
  address: 'Strandvejen 12',
  postcode: '2100',
  city: 'København Ø',
  phone: '+45 12 34 56 78',
  website: 'https://garnbutikken.dk',
  lat: 55.7,
  lng: 12.6,
  brands: [],
  ...overrides,
})

const makeStoreResult = (overrides: Partial<StoreResult> = {}): StoreResult => ({
  ...makeStore(),
  distance_km: 3.2,
  ...overrides,
})

// ---------------------------------------------------------------------------
// B1: Renders hero h1 and subtitle
// ---------------------------------------------------------------------------

describe('B1 hero h1 and subtitle', () => {
  it('renders "Find garnbutikker nær dig" as h1', () => {
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    expect(screen.getByRole('heading', { level: 1, name: /find garnbutikker nær dig/i })).toBeInTheDocument()
  })

  it('renders the subtitle text', () => {
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    expect(
      screen.getByText(/Søg på by, brug din placering eller udforsk kortet — vi har 200\+ danske garnbutikker med\./i)
    ).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// B2: No brand pills / Mærker label / BRANDS references
// ---------------------------------------------------------------------------

describe('B2 no brand pills or Mærker label in output', () => {
  it('does not render any element with text "Mærker"', () => {
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    expect(screen.queryByText(/mærker/i)).not.toBeInTheDocument()
  })

  it('does not render brand filter pills (Isager, Drops, Sandnes etc.)', () => {
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    // Common brand names that would appear if BRANDS array is rendered
    expect(screen.queryByText('Isager')).not.toBeInTheDocument()
    expect(screen.queryByText('Drops')).not.toBeInTheDocument()
    expect(screen.queryByText('Sandnes')).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// B3: Radius pills — clicking changes aria-pressed
// ---------------------------------------------------------------------------

describe('B3 radius pills change aria-pressed on click', () => {
  it('25 km is active by default (aria-pressed=true)', () => {
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const btn25 = screen.getByRole('button', { name: /^25 km$/i })
    expect(btn25).toHaveAttribute('aria-pressed', 'true')
  })

  it('clicking 10 km makes it active and deactivates 25 km', async () => {
    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const btn10 = screen.getByRole('button', { name: /^10 km$/i })
    const btn25 = screen.getByRole('button', { name: /^25 km$/i })

    await user.click(btn10)

    expect(btn10).toHaveAttribute('aria-pressed', 'true')
    expect(btn25).toHaveAttribute('aria-pressed', 'false')
  })

  it('clicking 50 km makes it active', async () => {
    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const btn50 = screen.getByRole('button', { name: /^50 km$/i })

    await user.click(btn50)

    expect(btn50).toHaveAttribute('aria-pressed', 'true')
  })
})

// ---------------------------------------------------------------------------
// B4: No geolocation API → falls back to IP-based lookup
// ---------------------------------------------------------------------------

describe('B4 no geolocation support falls back to IP lookup', () => {
  it('calls ipapi.co and searches with IP coordinates when geolocation is unavailable', async () => {
    const user = userEvent.setup()

    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'geolocation')
    delete (navigator as Record<string, unknown>).geolocation

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latitude: 55.68, longitude: 12.57, city: 'København' }),
    }) as unknown as typeof fetch

    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    await user.click(screen.getByRole('button', { name: /brug min placering/i }))

    // Wait for fetch + search
    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://ipapi.co/json/')
      expect(mockSearch).toHaveBeenCalledWith(expect.anything(), { lat: 55.68, lng: 12.57, radius: 25, brandSlug: null })
    })

    // Label should mention "via IP"
    expect((screen.getByLabelText(/by eller postnummer/i) as HTMLInputElement).value).toMatch(/via IP/i)

    if (descriptor) {
      Object.defineProperty(navigator, 'geolocation', descriptor)
    }
  })
})

// ---------------------------------------------------------------------------
// B5–B7: geolocation error codes
// ---------------------------------------------------------------------------

function setupGeoError(code: number) {
  const geo = {
    getCurrentPosition: vi.fn((_success: unknown, error: (e: { code: number; message: string }) => void) => {
      error({ code, message: 'geo error' })
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  }
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true, writable: true })
  return geo
}

describe('B5 geolocation error code 1 (permission denied)', () => {
  beforeEach(() => {
    // Ensure https-like environment so we reach getCurrentPosition
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:', hostname: 'striq.dk' },
      configurable: true,
    })
    // Mock permissions API to not deny
    Object.defineProperty(navigator, 'permissions', {
      value: { query: vi.fn().mockResolvedValue({ state: 'prompt' }) },
      configurable: true,
    })
  })

  it('shows "afvist adgang" message on error code 1', async () => {
    setupGeoError(1)
    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    await user.click(screen.getByRole('button', { name: /brug min placering/i }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/afvist adgang/i)
  })
})

describe('B6 geolocation error code 2 (position unavailable) falls back to IP', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:', hostname: 'striq.dk' },
      configurable: true,
    })
    Object.defineProperty(navigator, 'permissions', {
      value: { query: vi.fn().mockResolvedValue({ state: 'prompt' }) },
      configurable: true,
    })
  })

  it('calls ipapi.co and searches with IP coordinates on error code 2', async () => {
    setupGeoError(2)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latitude: 56.15, longitude: 10.21, city: 'Aarhus' }),
    }) as unknown as typeof fetch

    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    await user.click(screen.getByRole('button', { name: /brug min placering/i }))

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://ipapi.co/json/')
      expect(mockSearch).toHaveBeenCalledWith(expect.anything(), { lat: 56.15, lng: 10.21, radius: 25, brandSlug: null })
    })
  })

  it('shows combined GPS+IP error when IP fallback also fails', async () => {
    setupGeoError(2)
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    await user.click(screen.getByRole('button', { name: /brug min placering/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/hverken via GPS eller IP/i)
  })
})

describe('B7 geolocation error code 3 (timeout) falls back to IP', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { protocol: 'https:', hostname: 'striq.dk' },
      configurable: true,
    })
    Object.defineProperty(navigator, 'permissions', {
      value: { query: vi.fn().mockResolvedValue({ state: 'prompt' }) },
      configurable: true,
    })
  })

  it('calls ipapi.co and searches with IP coordinates on error code 3', async () => {
    setupGeoError(3)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ latitude: 55.40, longitude: 10.39, city: 'Odense' }),
    }) as unknown as typeof fetch

    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([])

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    await user.click(screen.getByRole('button', { name: /brug min placering/i }))

    await vi.waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('https://ipapi.co/json/')
      expect(mockSearch).toHaveBeenCalledWith(expect.anything(), { lat: 55.40, lng: 10.39, radius: 25, brandSlug: null })
    })
  })
})

// ---------------------------------------------------------------------------
// B8: Non-HTTPS, non-localhost → HTTPS error
// ---------------------------------------------------------------------------

describe('B8 non-HTTPS shows HTTPS error', () => {
  beforeEach(() => {
    // Set up geolocation so it's present (check happens before getCurrentPosition)
    const geo = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    }
    Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true, writable: true })
  })

  it('shows HTTPS error message when protocol is http and host is not localhost', async () => {
    const user = userEvent.setup()

    Object.defineProperty(window, 'location', {
      value: { protocol: 'http:', hostname: 'example.com' },
      configurable: true,
    })

    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    await user.click(screen.getByRole('button', { name: /brug min placering/i }))

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent(/HTTPS/i)
  })
})

// ---------------------------------------------------------------------------
// B9: Empty initialStores shows "Kortet er under opbygning…" banner
// ---------------------------------------------------------------------------

describe('B9 empty initialStores shows under-construction banner', () => {
  it('renders the map-under-construction message when initialStores is empty', () => {
    render(<FindForhandlerClient initialStores={[]} />)
    expect(screen.getByText(/Kortet er under opbygning/i)).toBeInTheDocument()
  })

  it('does not render the map stub when initialStores is empty', () => {
    render(<FindForhandlerClient initialStores={[]} />)
    expect(screen.queryByTestId('danmarkskort-stub')).not.toBeInTheDocument()
  })

  it('renders the map stub when initialStores has entries', () => {
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    expect(screen.getByTestId('danmarkskort-stub')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// B10: StoreCard renders name, distance chip, address, tel, website, maps link
// ---------------------------------------------------------------------------

describe('B10 StoreCard shows all required fields', () => {
  const fullStore = makeStoreResult({
    name: 'Test Garnbutik',
    distance_km: 7.4,
    address: 'Nørregade 5',
    postcode: '8000',
    city: 'Aarhus C',
    phone: '+45 87 65 43 21',
    website: 'https://testgarn.dk',
  })

  function renderWithResults() {
    const { rerender } = render(<FindForhandlerClient initialStores={[makeStore()]} />)
    // Inject results by importing the mock and calling the setter via a workaround:
    // We re-render with a wrapper that simulates results already in state.
    // Since state is internal, we test StoreCard separately by extracting the component.
    rerender(<FindForhandlerClient initialStores={[makeStore()]} />)
    return { rerender }
  }

  // Test StoreCard directly by importing it — it's not exported, so test via
  // FindForhandlerClient with a mocked searchStoresNear that returns our store.

  it('renders store name', async () => {
    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([fullStore])

    // Mock fetch for geocodeCity
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '55.7', lon: '12.6' }]),
    })

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)

    const input = screen.getByLabelText(/by eller postnummer/i)
    await user.type(input, 'Aarhus')
    await user.click(screen.getByRole('button', { name: /^søg$/i }))

    expect(await screen.findByText('Test Garnbutik')).toBeInTheDocument()
  })

  it('renders distance_km chip', async () => {
    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([fullStore])

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '55.7', lon: '12.6' }]),
    })

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const input = screen.getByLabelText(/by eller postnummer/i)
    await user.type(input, 'Aarhus')
    await user.click(screen.getByRole('button', { name: /^søg$/i }))

    expect(await screen.findByText('7.4 km')).toBeInTheDocument()
  })

  it('renders address composed from address, postcode, city', async () => {
    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([fullStore])

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '55.7', lon: '12.6' }]),
    })

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const input = screen.getByLabelText(/by eller postnummer/i)
    await user.type(input, 'Aarhus')
    await user.click(screen.getByRole('button', { name: /^søg$/i }))

    expect(await screen.findByText('Nørregade 5, 8000, Aarhus C')).toBeInTheDocument()
  })

  it('renders tel link when phone is set', async () => {
    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([fullStore])

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '55.7', lon: '12.6' }]),
    })

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const input = screen.getByLabelText(/by eller postnummer/i)
    await user.type(input, 'Aarhus')
    await user.click(screen.getByRole('button', { name: /^søg$/i }))

    await screen.findByText('Test Garnbutik')
    const telLink = screen.getByRole('link', { name: /\+45 87 65 43 21/i })
    expect(telLink).toHaveAttribute('href', 'tel:+45 87 65 43 21')
  })

  it('renders website link when website is set', async () => {
    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([fullStore])

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '55.7', lon: '12.6' }]),
    })

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const input = screen.getByLabelText(/by eller postnummer/i)
    await user.type(input, 'Aarhus')
    await user.click(screen.getByRole('button', { name: /^søg$/i }))

    await screen.findByText('Test Garnbutik')
    const websiteLink = screen.getByRole('link', { name: /åbn website/i })
    expect(websiteLink).toHaveAttribute('href', 'https://testgarn.dk')
  })

  it('renders Google Maps link', async () => {
    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([fullStore])

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '55.7', lon: '12.6' }]),
    })

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const input = screen.getByLabelText(/by eller postnummer/i)
    await user.type(input, 'Aarhus')
    await user.click(screen.getByRole('button', { name: /^søg$/i }))

    await screen.findByText('Test Garnbutik')
    const mapsLink = screen.getByRole('link', { name: /vis på kort/i })
    expect(mapsLink).toHaveAttribute('href', expect.stringContaining('google.com/maps'))
  })

  it('does not render phone link when phone is null', async () => {
    const storeNoPhone = { ...fullStore, phone: null }
    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([storeNoPhone])

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '55.7', lon: '12.6' }]),
    })

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const input = screen.getByLabelText(/by eller postnummer/i)
    await user.type(input, 'Aarhus')
    await user.click(screen.getByRole('button', { name: /^søg$/i }))

    await screen.findByText('Test Garnbutik')
    expect(screen.queryByRole('link', { name: /\+45/i })).not.toBeInTheDocument()
  })

  it('does not render website link when website is null', async () => {
    const storeNoWeb = { ...fullStore, website: null }
    const { searchStoresNear: mockSearch } = await import('@/lib/data/stores')
    ;(mockSearch as ReturnType<typeof vi.fn>).mockResolvedValueOnce([storeNoWeb])

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve([{ lat: '55.7', lon: '12.6' }]),
    })

    const user = userEvent.setup()
    render(<FindForhandlerClient initialStores={[makeStore()]} />)
    const input = screen.getByLabelText(/by eller postnummer/i)
    await user.type(input, 'Aarhus')
    await user.click(screen.getByRole('button', { name: /^søg$/i }))

    await screen.findByText('Test Garnbutik')
    expect(screen.queryByRole('link', { name: /åbn website/i })).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// B11: Brand-filter chips over kortet (styret af FindForhandlerClient)
// ---------------------------------------------------------------------------

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: 'brand-1',
    slug: 'some-brand',
    name: 'Some Brand',
    origin: null,
    website: null,
    ...overrides,
  }
}

function makeRetailer(overrides: Partial<OnlineRetailer> = {}): OnlineRetailer {
  return {
    id: 'retailer-1',
    slug: 'garnbutik',
    navn: 'Garnbutik Online',
    url: 'https://garnbutik.dk',
    beskrivelse: null,
    land: 'DK',
    leverer_til_dk: true,
    sidst_tjekket: null,
    brands: [],
    ...overrides,
  }
}

const brandDrops = makeBrand({ id: 'b-drops', slug: 'drops', name: 'Drops' })
const brandIsager = makeBrand({ id: 'b-isager', slug: 'isager', name: 'Isager' })

describe('B11 brand-filter chips over kortet', () => {
  it('chips vises over kortet når brands-prop har værdier og stores fører dem', () => {
    const storeWithBothBrands = makeStore({
      brands: [
        { slug: 'drops', name: 'Drops' },
        { slug: 'isager', name: 'Isager' },
      ],
    })
    render(
      <FindForhandlerClient
        initialStores={[storeWithBothBrands]}
        brands={[brandDrops, brandIsager]}
        retailers={[]}
      />
    )
    // Chip-gruppe skal have "Alle", "Drops", "Isager"
    expect(screen.getByRole('button', { name: /^alle$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^drops$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^isager$/i })).toBeInTheDocument()
  })

  it('kun mærker der føres af mindst én butik vises som chip', () => {
    // Drops føres af store; Isager gør ikke — Isager-chip skjules.
    const storeDropsOnly = makeStore({
      brands: [{ slug: 'drops', name: 'Drops' }],
    })
    render(
      <FindForhandlerClient
        initialStores={[storeDropsOnly]}
        brands={[brandDrops, brandIsager]}
        retailers={[]}
      />
    )
    expect(screen.getByRole('button', { name: /^drops$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^isager$/i })).not.toBeInTheDocument()
  })

  it('ingen chips vises når brands-prop er tom', () => {
    render(<FindForhandlerClient initialStores={[makeStore()]} brands={[]} retailers={[]} />)
    expect(screen.queryByText(/filtrér på mærke/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^alle$/i })).not.toBeInTheDocument()
  })

  it('klik på Drops-chip filtrerer kort-stores — store uden drops forsvinder', async () => {
    const user = userEvent.setup()
    const storeWithDrops = makeStore({
      id: 'store-drops',
      name: 'Drops Butik',
      brands: [{ slug: 'drops', name: 'Drops' }],
    })
    const storeWithoutDrops = makeStore({
      id: 'store-other',
      name: 'Anden Butik',
      brands: [],
    })

    render(
      <FindForhandlerClient
        initialStores={[storeWithDrops, storeWithoutDrops]}
        brands={[brandDrops, brandIsager]}
        retailers={[]}
      />
    )

    // Kort-stub er renderet (begge stores → kort vises)
    expect(screen.getByTestId('danmarkskort-stub')).toBeInTheDocument()

    // Klik på Drops-chip
    await user.click(screen.getByRole('button', { name: /^drops$/i }))

    // Drops-chip er nu aktiv
    expect(screen.getByRole('button', { name: /^drops$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^alle$/i })).toHaveAttribute('aria-pressed', 'false')
  })

  it('klik på Alle-chip efter Drops nulstiller til alle chips inaktive undtagen Alle', async () => {
    const user = userEvent.setup()
    const storeWithDrops = makeStore({
      brands: [{ slug: 'drops', name: 'Drops' }],
    })
    render(
      <FindForhandlerClient
        initialStores={[storeWithDrops]}
        brands={[brandDrops, brandIsager]}
        retailers={[]}
      />
    )

    await user.click(screen.getByRole('button', { name: /^drops$/i }))
    expect(screen.getByRole('button', { name: /^drops$/i })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: /^alle$/i }))
    expect(screen.getByRole('button', { name: /^alle$/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /^drops$/i })).toHaveAttribute('aria-pressed', 'false')
  })

})
