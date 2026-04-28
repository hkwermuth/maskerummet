/**
 * Smoke-tests for supabase/migrations/20260428000005_community_primary_image_and_cover.sql
 *
 * Læser migration-filen som streng og asserter at de forventede sektioner er til stede.
 * Kører IKKE faktisk SQL.
 *
 * Dækker acceptkriterier D (27-31).
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260428000005_community_primary_image_and_cover.sql',
)

const sql = readFileSync(MIGRATION_PATH, 'utf-8')

// ── AC27: community_primary_image_index integer null default 0 ───────────────

describe('AC27 Migration — community_primary_image_index kolonne', () => {
  it('tilføjer community_primary_image_index med integer null default 0', () => {
    expect(sql.toLowerCase()).toContain('community_primary_image_index integer null default 0')
  })

  it('bruger add column if not exists', () => {
    expect(sql.toLowerCase()).toContain('add column if not exists community_primary_image_index')
  })
})

// ── AC28: CHECK constraint at index >= 0 ─────────────────────────────────────

describe('AC28 Migration — CHECK constraint community_primary_image_index >= 0', () => {
  it('tilføjer en NOT NULL OR >= 0 constraint (ingen øvre grænse)', () => {
    // constraint defineres med community_primary_image_index is null or community_primary_image_index >= 0
    expect(sql.toLowerCase()).toContain('community_primary_image_index is null or community_primary_image_index >= 0')
  })

  it('constraint hedder projects_community_primary_image_index_nonneg', () => {
    expect(sql).toContain('projects_community_primary_image_index_nonneg')
  })

  it('dropper eksisterende constraint før den tilføjer den ny', () => {
    expect(sql.toLowerCase()).toContain('drop constraint if exists projects_community_primary_image_index_nonneg')
  })
})

// ── AC29: GRANT SELECT inkluderer de rette felter ────────────────────────────

describe('AC29 Migration — GRANT SELECT til anon', () => {
  it('GRANT SELECT inkluderer community_primary_image_index', () => {
    const grantIdx = sql.toLowerCase().indexOf('grant select')
    expect(grantIdx).toBeGreaterThan(-1)
    const grantSection = sql.slice(grantIdx, grantIdx + 800)
    expect(grantSection).toContain('community_primary_image_index')
  })

  it('GRANT SELECT inkluderer pattern_pdf_thumbnail_url', () => {
    const grantIdx = sql.toLowerCase().indexOf('grant select')
    expect(grantIdx).toBeGreaterThan(-1)
    const grantSection = sql.slice(grantIdx, grantIdx + 800)
    expect(grantSection).toContain('pattern_pdf_thumbnail_url')
  })

  it('GRANT SELECT ekskluderer pattern_image_urls (beskyttet)', () => {
    // Find grant select-blokken frem til "on public.projects"
    const grantIdx = sql.toLowerCase().indexOf('grant select')
    expect(grantIdx).toBeGreaterThan(-1)
    const onIdx = sql.toLowerCase().indexOf('on public.projects', grantIdx)
    const grantSection = sql.slice(grantIdx, onIdx)
    // pattern_image_urls må ikke eksponeres direkte i grant
    expect(grantSection).not.toContain('pattern_image_urls')
  })
})

// ── AC30: View beregner pattern_cover_url som pattern_image_urls[1] ──────────

describe('AC30 Migration — view computed pattern_cover_url', () => {
  it('view indeholder pattern_image_urls[1] as pattern_cover_url', () => {
    expect(sql.toLowerCase()).toContain('pattern_image_urls[1] as pattern_cover_url')
  })
})

// ── AC31: View indeholder community_primary_image_index og pattern_pdf_thumbnail_url ─

describe('AC31 Migration — view felter', () => {
  it('view inkluderer community_primary_image_index', () => {
    const viewIdx = sql.toLowerCase().indexOf('create view public.public_shared_projects')
    expect(viewIdx).toBeGreaterThan(-1)
    const viewSection = sql.slice(viewIdx, viewIdx + 800)
    expect(viewSection).toContain('community_primary_image_index')
  })

  it('view inkluderer pattern_pdf_thumbnail_url', () => {
    const viewIdx = sql.toLowerCase().indexOf('create view public.public_shared_projects')
    expect(viewIdx).toBeGreaterThan(-1)
    const viewSection = sql.slice(viewIdx, viewIdx + 800)
    expect(viewSection).toContain('pattern_pdf_thumbnail_url')
  })

  it('view dropper og genskaber public_shared_projects', () => {
    expect(sql.toLowerCase()).toContain('drop view if exists public.public_shared_projects')
    expect(sql.toLowerCase()).toContain('create view public.public_shared_projects')
  })

  it('view giver select til anon og authenticated', () => {
    expect(sql.toLowerCase()).toContain('grant select on public.public_shared_projects to anon, authenticated')
  })
})

// ── Security_invoker flag: rettet fra true til false ─────────────────────────
// Reviewer konstaterede at security_invoker = true ville fejle for anon fordi
// computed kolonnen pattern_image_urls[1] kræver SELECT på pattern_image_urls,
// som ikke er granted til anon. Korrekt løsning: security_invoker = false
// (ejer-privilegier), med WHERE is_shared = true som copyright-vagt.

describe('Security_invoker = false (reviewer-rettelse)', () => {
  it('view defineres med security_invoker = false, ikke true', () => {
    expect(sql.toLowerCase()).toContain('security_invoker = false')
    expect(sql.toLowerCase()).not.toContain('security_invoker = true')
  })

  it('kommentar forklarer beslutningen med reference til ejer-privilegier eller copyright', () => {
    // Kommentaren i migrationen skal forklare hvorfor security_invoker = false er valgt.
    // Vi tjekker at enten "ejer-privilegier" eller "copyright" optræder i nærheden
    // af create view-definitionen (inden for 1000 tegn forud for CREATE VIEW).
    const createViewIdx = sql.toLowerCase().indexOf('create view public.public_shared_projects')
    expect(createViewIdx).toBeGreaterThan(-1)
    // Søg i den kommentar-blok der kommer forud for view-definitionen
    const commentWindow = sql.slice(Math.max(0, createViewIdx - 500), createViewIdx + 200)
    const hasExplanation =
      commentWindow.includes('ejer-privilegier') || commentWindow.includes('copyright')
    expect(hasExplanation).toBe(true)
  })

  it('WHERE-klausulen is_shared = true bevares som copyright-vagt', () => {
    const viewIdx = sql.toLowerCase().indexOf('create view public.public_shared_projects')
    expect(viewIdx).toBeGreaterThan(-1)
    const viewSection = sql.slice(viewIdx, viewIdx + 800)
    expect(viewSection.toLowerCase()).toContain('is_shared = true')
  })
})
