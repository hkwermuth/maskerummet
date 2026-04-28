/**
 * Tests for PROJECT_TYPES + PROJECT_TYPE_LABELS (lib/types.ts)
 * og TypeScript-type-felter (compile-only checks via runtime duck-typing).
 *
 * Dækker acceptkriterierne 11-15.
 */

import { describe, it, expect } from 'vitest'
import {
  PROJECT_TYPES,
  PROJECT_TYPE_LABELS,
  type Project,
  type SharedProjectPublic,
} from '@/lib/types'

// ── AC11: PROJECT_TYPES indeholder de 4 nye keys ─────────────────────────────

describe('AC11 PROJECT_TYPES — fire nye keys', () => {
  it('indeholder "bluse"', () => {
    expect(PROJECT_TYPES).toContain('bluse')
  })

  it('indeholder "sommerbluse"', () => {
    expect(PROJECT_TYPES).toContain('sommerbluse')
  })

  it('indeholder "babytoej"', () => {
    expect(PROJECT_TYPES).toContain('babytoej')
  })

  it('indeholder "boernetoej"', () => {
    expect(PROJECT_TYPES).toContain('boernetoej')
  })
})

// ── AC12: PROJECT_TYPE_LABELS har alle 15 typer ───────────────────────────────

describe('AC12 PROJECT_TYPE_LABELS — 15 labels', () => {
  it('har præcis 15 entries', () => {
    expect(Object.keys(PROJECT_TYPE_LABELS)).toHaveLength(15)
  })

  it('har dansk label for "bluse"', () => {
    expect(PROJECT_TYPE_LABELS['bluse']).toBeTruthy()
    expect(typeof PROJECT_TYPE_LABELS['bluse']).toBe('string')
  })

  it('har dansk label for "sommerbluse"', () => {
    expect(PROJECT_TYPE_LABELS['sommerbluse']).toBeTruthy()
    expect(typeof PROJECT_TYPE_LABELS['sommerbluse']).toBe('string')
  })

  it('har dansk label for "babytoej"', () => {
    expect(PROJECT_TYPE_LABELS['babytoej']).toBeTruthy()
    expect(typeof PROJECT_TYPE_LABELS['babytoej']).toBe('string')
  })

  it('har dansk label for "boernetoej"', () => {
    expect(PROJECT_TYPE_LABELS['boernetoej']).toBeTruthy()
    expect(typeof PROJECT_TYPE_LABELS['boernetoej']).toBe('string')
  })
})

// ── AC13: Eksisterende keys er bevaret ───────────────────────────────────────

describe('AC13 PROJECT_TYPES — eksisterende keys bevaret', () => {
  const existingKeys = [
    'cardigan', 'sweater', 'top', 'hue', 'sjal',
    'stroemper', 'vest', 'troeje', 'toerklaede', 'taeppe', 'andet',
  ]

  for (const key of existingKeys) {
    it(`bevarer eksisterende type "${key}"`, () => {
      expect(PROJECT_TYPES).toContain(key)
    })
  }
})

// ── AC14: Project har community_size_shown: string | null (runtime duck-test) ─

describe('AC14 Project type — community_size_shown felt', () => {
  it('Project kan oprettes med community_size_shown: null', () => {
    const p: Project = {
      id: 'id-1',
      user_id: 'user-1',
      title: 'Test',
      used_at: null,
      needle_size: null,
      held_with: null,
      notes: null,
      status: 'i_gang',
      project_image_urls: [],
      pattern_pdf_url: null,
      pattern_pdf_thumbnail_url: null,
      pattern_image_urls: [],
      is_shared: false,
      shared_at: null,
      project_type: null,
      pattern_name: null,
      pattern_designer: null,
      community_description: null,
      community_size_shown: null,
      community_primary_image_index: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    expect(p.community_size_shown).toBeNull()
  })

  it('Project kan oprettes med community_size_shown: "M"', () => {
    const p: Project = {
      id: 'id-2',
      user_id: 'user-1',
      title: 'Test',
      used_at: null,
      needle_size: null,
      held_with: null,
      notes: null,
      status: 'faerdigstrikket',
      project_image_urls: [],
      pattern_pdf_url: null,
      pattern_pdf_thumbnail_url: null,
      pattern_image_urls: [],
      is_shared: true,
      shared_at: '2026-01-01T00:00:00Z',
      project_type: 'sweater',
      pattern_name: 'Mina',
      pattern_designer: 'Lene',
      community_description: null,
      community_size_shown: 'M',
      community_primary_image_index: 0,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    expect(p.community_size_shown).toBe('M')
  })
})

// ── AC15: SharedProjectPublic har community_size_shown: string | null ────────

describe('AC15 SharedProjectPublic type — community_size_shown felt', () => {
  it('SharedProjectPublic kan oprettes med community_size_shown: null', () => {
    const sp: SharedProjectPublic = {
      id: 'proj-1',
      title: 'Blå Trøje',
      project_image_urls: [],
      community_primary_image_index: null,
      project_type: 'sweater',
      community_description: null,
      community_size_shown: null,
      pattern_name: 'Mina',
      pattern_designer: 'Lene',
      pattern_pdf_thumbnail_url: null,
      pattern_cover_url: null,
      shared_at: '2026-01-01T00:00:00Z',
      display_name: 'Anna',
      yarns: [],
    }
    expect(sp.community_size_shown).toBeNull()
  })

  it('SharedProjectPublic kan oprettes med community_size_shown: "38"', () => {
    const sp: SharedProjectPublic = {
      id: 'proj-2',
      title: 'Rød Cardigan',
      project_image_urls: [],
      community_primary_image_index: null,
      project_type: 'cardigan',
      community_description: null,
      community_size_shown: '38',
      pattern_name: null,
      pattern_designer: null,
      pattern_pdf_thumbnail_url: null,
      pattern_cover_url: null,
      shared_at: '2026-01-01T00:00:00Z',
      display_name: null,
      yarns: [],
    }
    expect(sp.community_size_shown).toBe('38')
  })
})
