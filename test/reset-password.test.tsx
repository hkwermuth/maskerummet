/**
 * Reset-password (PKCE-only) — acceptkriterier 8.9
 *
 * AC 1  PKCE: ?code= → exchangeCodeForSession kaldt, sessionReady sættes ved succes
 * AC 2  Eksisterende session: getSession returnerer session → PKCE springes over
 * AC 3  Negativ: ingen code, ingen session → "Advarsel: Ingen session fundet" vises
 * AC 4  PASSWORD_RECOVERY event → sessionReady sættes
 * AC 5  Password-validering: < 8 tegn afvises
 * AC 6  Password-validering: mismatch afvises
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: vi.fn(),
}))

import { useSupabase } from '@/lib/supabase/client'
import ResetPasswordPage from '@/app/auth/reset-password/page'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AuthEvent = 'PASSWORD_RECOVERY' | 'SIGNED_IN' | 'SIGNED_OUT'
type AuthStateChangeCallback = (event: AuthEvent, session: object | null) => void

let authStateChangeCallback: AuthStateChangeCallback | null = null

function buildSupabaseMock({
  existingSession = null as object | null,
  exchangeResult = { data: { session: null as object | null }, error: null as Error | null },
  updateUserResult = { error: null as Error | null },
} = {}) {
  authStateChangeCallback = null

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: existingSession } }),
      exchangeCodeForSession: vi.fn().mockResolvedValue(exchangeResult),
      onAuthStateChange: vi.fn().mockImplementation((cb: AuthStateChangeCallback) => {
        authStateChangeCallback = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      updateUser: vi.fn().mockResolvedValue(updateUserResult),
    },
  }
}

function fireAuthStateChange(event: AuthEvent, session: object | null = null) {
  if (authStateChangeCallback) authStateChangeCallback(event, session)
}

// ---------------------------------------------------------------------------
// Helpers: set window.location.search without full reassign
// ---------------------------------------------------------------------------

function setSearch(search: string) {
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    setSearch('')
  })

  it('AC 1 — PKCE: ?code= → exchangeCodeForSession kaldes og formular vises ved succes', async () => {
    setSearch('?code=abc123')

    const mock = buildSupabaseMock({
      existingSession: null,
      exchangeResult: { data: { session: { user: { id: 'u1' } } }, error: null },
    })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(mock.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    })
    // sessionReady=true → formular (ikke advarsel)
    await waitFor(() => {
      expect(screen.queryByText(/Advarsel: Ingen session fundet/)).not.toBeInTheDocument()
    })
    expect(screen.getByText('Gem ny adgangskode')).toBeInTheDocument()
  })

  it('AC 2 — Eksisterende session: getSession returnerer session → exchangeCodeForSession springes over', async () => {
    setSearch('?code=shouldnotbeused')

    const mock = buildSupabaseMock({ existingSession: { user: { id: 'u1' } } })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByText('Gem ny adgangskode')).toBeInTheDocument()
    })
    expect(mock.auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('AC 3 — Negativ: ingen code, ingen session → advarsel vises i formularen', async () => {
    setSearch('')

    const mock = buildSupabaseMock({ existingSession: null })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    render(<ResetPasswordPage />)

    await waitFor(() => {
      expect(screen.getByText(/Advarsel: Ingen session fundet/)).toBeInTheDocument()
    })
  })

  it('AC 4 — PASSWORD_RECOVERY event → formular tilgængelig uden advarsel', async () => {
    setSearch('')

    const mock = buildSupabaseMock({ existingSession: null })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    render(<ResetPasswordPage />)

    // Vent på at initializing stopper (advarsel vises)
    await waitFor(() => {
      expect(screen.getByText(/Advarsel: Ingen session fundet/)).toBeInTheDocument()
    })

    // Udløs PASSWORD_RECOVERY event
    fireAuthStateChange('PASSWORD_RECOVERY', { user: { id: 'u1' } })

    await waitFor(() => {
      expect(screen.queryByText(/Advarsel: Ingen session fundet/)).not.toBeInTheDocument()
    })
  })

  it('AC 5 — Password < 8 tegn afvises med fejlbesked', async () => {
    setSearch('')

    const mock = buildSupabaseMock({ existingSession: { user: { id: 'u1' } } })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const user = userEvent.setup()
    render(<ResetPasswordPage />)

    await waitFor(() => screen.getByText('Gem ny adgangskode'))

    const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••')
    await user.type(pwInput, 'kort')
    await user.type(confirmInput, 'kort')
    await user.click(screen.getByText('Gem ny adgangskode'))

    await waitFor(() => {
      expect(screen.getByText(/mindst 8 tegn/)).toBeInTheDocument()
    })
    expect(mock.auth.updateUser).not.toHaveBeenCalled()
  })

  it('AC 6 — Password mismatch afvises med fejlbesked', async () => {
    setSearch('')

    const mock = buildSupabaseMock({ existingSession: { user: { id: 'u1' } } })
    vi.mocked(useSupabase).mockReturnValue(mock as never)

    const user = userEvent.setup()
    render(<ResetPasswordPage />)

    await waitFor(() => screen.getByText('Gem ny adgangskode'))

    const [pwInput, confirmInput] = screen.getAllByPlaceholderText('••••••••')
    await user.type(pwInput, 'langt-password-1')
    await user.type(confirmInput, 'langt-password-2')
    await user.click(screen.getByText('Gem ny adgangskode'))

    await waitFor(() => {
      expect(screen.getByText(/stemmer ikke overens/)).toBeInTheDocument()
    })
    expect(mock.auth.updateUser).not.toHaveBeenCalled()
  })
})
