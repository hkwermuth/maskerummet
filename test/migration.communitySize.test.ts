/**
 * Smoke-tests for supabase/migrations/20260428000004_community_size_and_project_types.sql
 *
 * Læser migration-filen som streng og asserter at de forventede sektioner er til stede.
 * Kører IKKE faktisk SQL.
 *
 * Dækker acceptkriterierne 31-34.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260428000004_community_size_and_project_types.sql',
)

const sql = readFileSync(MIGRATION_PATH, 'utf-8')

// ── AC31: DROP+ADD CONSTRAINT med de 4 nye keys ──────────────────────────────

describe('AC31 Migration — DROP+ADD CONSTRAINT med nye projekt-typer', () => {
  it('indeholder DROP CONSTRAINT på projects_project_type_check', () => {
    expect(sql).toContain('drop constraint if exists projects_project_type_check')
  })

  it('indeholder ADD CONSTRAINT på projects_project_type_check', () => {
    expect(sql).toContain('add constraint projects_project_type_check')
  })

  it('constraint indeholder "bluse"', () => {
    expect(sql).toContain("'bluse'")
  })

  it('constraint indeholder "sommerbluse"', () => {
    expect(sql).toContain("'sommerbluse'")
  })

  it('constraint indeholder "babytoej"', () => {
    expect(sql).toContain("'babytoej'")
  })

  it('constraint indeholder "boernetoej"', () => {
    expect(sql).toContain("'boernetoej'")
  })
})

// ── AC32: add column community_size_shown text null ──────────────────────────

describe('AC32 Migration — add column community_size_shown', () => {
  it('indeholder "add column if not exists community_size_shown text null"', () => {
    expect(sql.toLowerCase()).toContain('add column if not exists community_size_shown text null')
  })
})

// ── AC33: GRANT SELECT til anon inkluderer community_size_shown ──────────────

describe('AC33 Migration — GRANT SELECT til anon med community_size_shown', () => {
  it('GRANT SELECT-blokken indeholder community_size_shown', () => {
    // Find grant select-blokken og tjek at community_size_shown er der
    const grantIdx = sql.toLowerCase().indexOf('grant select')
    expect(grantIdx).toBeGreaterThan(-1)
    const grantSection = sql.slice(grantIdx, grantIdx + 600)
    expect(grantSection).toContain('community_size_shown')
  })

  it('GRANT SELECT gives til anon', () => {
    expect(sql.toLowerCase()).toContain('to anon')
  })
})

// ── AC34: DROP+RECREATE public_shared_projects view med community_size_shown ──

describe('AC34 Migration — view public_shared_projects med community_size_shown', () => {
  it('indeholder DROP VIEW public_shared_projects', () => {
    expect(sql.toLowerCase()).toContain('drop view if exists public.public_shared_projects')
  })

  it('indeholder CREATE VIEW public_shared_projects', () => {
    expect(sql.toLowerCase()).toContain('create view public.public_shared_projects')
  })

  it('view-definitionen inkluderer community_size_shown', () => {
    const createViewIdx = sql.toLowerCase().indexOf('create view public.public_shared_projects')
    expect(createViewIdx).toBeGreaterThan(-1)
    const viewSection = sql.slice(createViewIdx, createViewIdx + 500)
    expect(viewSection).toContain('community_size_shown')
  })
})
