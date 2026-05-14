/**
 * Tests for IdeerClient a11y-fixes (8.9).
 *
 * AC1 — Annuller-knap har aria-label="Annuller"
 * AC2 — Empty state vises når alle kolonner er tomme (total === 0)
 * AC3 — Empty state vises IKKE når der er kort
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  useSupabase: () => ({ from: mockFrom }),
}))

// Next/link stub
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    React.createElement('a', { href }, children),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockInsert = vi.fn()

function setupSupabase(rows: object[], seedRows: object[] = []) {
  mockOrder.mockResolvedValue({ data: rows, error: null })
  mockSelect.mockReturnValue({ order: mockOrder })
  // insert().select() chain for seed path
  const mockInsertSelect = vi.fn().mockResolvedValue({ data: seedRows, error: null })
  mockInsert.mockReturnValue({ select: mockInsertSelect })
  mockFrom.mockReturnValue({ select: mockSelect, insert: mockInsert })
}

async function renderBoard(isAdmin = false) {
  const { default: IdeerClient } = await import('@/app/ideer/IdeerClient')
  render(<IdeerClient userId="user-1" isAdmin={isAdmin} />)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('IdeerClient a11y (8.9)', () => {
  beforeEach(() => {
    vi.resetModules()
    mockFrom.mockReset()
    mockSelect.mockReset()
    mockOrder.mockReset()
  })

  it('renderer empty state når der ikke er kort', async () => {
    setupSupabase([])
    await renderBoard(false) // non-admin → ingen seed-kald

    await waitFor(() => {
      expect(screen.getByText('Ingen idéer endnu')).toBeInTheDocument()
    })
    expect(screen.getByText(/Vi samler ideer til kommende funktioner/)).toBeInTheDocument()
  })

  it('renderer IKKE empty state når der er kort', async () => {
    setupSupabase([
      { id: '1', column_id: 'garnlager', title: 'Test idé', description: '', position: 0, created_by: 'user-1' },
    ])
    await renderBoard(false)

    await waitFor(() => {
      expect(screen.queryByText('Ingen idéer endnu')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Test idé')).toBeInTheDocument()
  })

  it('annullér-knap har aria-label="Annuller"', async () => {
    // Giv én kortpost så seed-stien springes over (data.length > 0)
    setupSupabase([
      { id: '1', column_id: 'garnlager', title: 'Test idé', description: '', position: 0, created_by: 'user-1' },
    ])
    await renderBoard(true) // admin nødvendig for at "+ Tilføj idé"-knap vises

    // Vent til loading er færdig
    const addButtons = await screen.findAllByText('+ Tilføj idé')
    await userEvent.click(addButtons[0])

    // Nu er annullér-knappen synlig
    const cancelBtn = screen.getByRole('button', { name: 'Annuller' })
    expect(cancelBtn).toBeInTheDocument()
    expect(cancelBtn).toHaveAttribute('aria-label', 'Annuller')
  })
})
