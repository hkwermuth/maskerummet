/**
 * Tests for det betingede Admin-link i Nav.tsx.
 * Dækker acceptkriterierne: synlighed baseret på editor-status,
 * RPC-fejl som fail-safe og mobil-drawer.
 */
import { describe, it, expect, vi, beforeEach, type MockedFunction } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Supabase mock ─────────────────────────────────────────────────────────────

// Kontrollerbare mock-funktioner per test
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockRpc = vi.fn()
const mockSignOut = vi.fn()

const mockSupabaseInstance = {
  auth: {
    getUser: mockGetUser,
    onAuthStateChange: mockOnAuthStateChange,
    signOut: mockSignOut,
  },
  rpc: mockRpc,
}

vi.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: () => mockSupabaseInstance,
}))

// ── Next.js mocks ─────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    React.createElement('a', { href, ...props }, children),
}))

// ── Lib-mocks ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/buildLoginHref', () => ({
  buildLoginHref: (p: string) => `/login?next=${p}`,
}))

vi.mock('@/lib/hooks/useEscapeKey', () => ({
  useEscapeKey: () => {},
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const FAKE_USER = { id: 'user-1', email: 'test@example.dk' }

/** Sæt auth-state: null = ikke logget ind, FAKE_USER = logget ind */
function setupAuth(user: typeof FAKE_USER | null) {
  mockGetUser.mockResolvedValue({ data: { user } })
  // onAuthStateChange registrerer blot subscriptionen — vi kalder ikke callbacken
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  })
}

// ── Import af Nav (efter mocks er opsat) ──────────────────────────────────────

let Nav: React.ComponentType<{ onRequestLogin?: () => void }>

beforeEach(async () => {
  vi.clearAllMocks()
  const mod = await import('@/components/layout/Nav')
  Nav = mod.Nav
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Nav – betinget Admin-link', () => {
  it('AC1: Ikke logget ind → Admin-link IKKE synligt', async () => {
    setupAuth(null)
    // rpc kaldes aldrig ved null-bruger, men sæt alligevel default
    mockRpc.mockResolvedValue({ data: false, error: null })

    render(<Nav />)

    // Vent på at useEffect har kørt
    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled()
    })

    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('AC2: Logget ind, ikke editor (RPC returnerer false) → Admin-link IKKE synligt', async () => {
    setupAuth(FAKE_USER)
    mockRpc.mockResolvedValue({ data: false, error: null })

    render(<Nav />)

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('is_editor')
    })

    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('AC3: Logget ind, editor (RPC returnerer true) → Admin-link synligt med korrekt href', async () => {
    setupAuth(FAKE_USER)
    mockRpc.mockResolvedValue({ data: true, error: null })

    render(<Nav />)

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Admin' }).length).toBeGreaterThan(0)
    })

    const adminLinks = screen.getAllByRole('link', { name: 'Admin' })
    for (const link of adminLinks) {
      expect(link).toHaveAttribute('href', '/garn/admin')
    }
  })

  it('AC4: RPC fejler → Admin-link IKKE synligt (fail-safe)', async () => {
    setupAuth(FAKE_USER)
    mockRpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    render(<Nav />)

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('is_editor')
    })

    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })

  it('AC5: Mobil drawer med menuOpen=true og isEditor=true → Admin vises i drawer', async () => {
    setupAuth(FAKE_USER)
    mockRpc.mockResolvedValue({ data: true, error: null })

    const user = userEvent.setup()
    render(<Nav />)

    // Vent på editor-state er sat
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Admin' }).length).toBeGreaterThan(0)
    })

    // Åbn mobil-drawer via burger-knappen
    const burgerBtn = screen.getByRole('button', { name: /åbn menu/i })
    await user.click(burgerBtn)

    // Drawer er åben
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    // Admin-link skal nu også eksistere i drawer (dialog-elementet)
    const dialog = screen.getByRole('dialog')
    const adminInDrawer = dialog.querySelector('a[href="/garn/admin"]')
    expect(adminInDrawer).not.toBeNull()
    expect(adminInDrawer).toHaveTextContent('Admin')
  })
})
