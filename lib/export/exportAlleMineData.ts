import type { SupabaseClient } from '@supabase/supabase-js'
import { downloadBlob, todayString } from './csv'

type ExportResult = {
  success: boolean
  error?: string
  tabeller?: Record<string, number>
}

/**
 * GDPR art. 20 dataportabilitet: dumper alle brugerens data fra Supabase
 * til én JSON-fil. RLS sørger for at kun brugerens egne rækker returneres.
 *
 * Inkluderede tabeller (alle med user_id):
 *  - yarn_items, projects, yarn_usage (kerne-data)
 *  - profiles (offentlig profil hvis sat)
 *  - substitution_votes, substitution_suggestions (substitutions-stemmer/forslag)
 *  - saved_recipes (gemte opskrifter)
 *  - barcode_suggestions (EAN-bidrag)
 */
export async function exportAlleMineData(supabase: SupabaseClient): Promise<ExportResult> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Ikke logget ind.' }

  const tabeller: Record<string, number> = {}
  const data: Record<string, unknown[]> = {}

  // Hent alle bruger-specifikke tabeller. RLS-policies sørger for at kun ens egne rækker kommer tilbage.
  const queries = [
    'yarn_items',
    'projects',
    'yarn_usage',
    'profiles',
    'substitution_votes',
    'substitution_suggestions',
    'saved_recipes',
    'barcode_suggestions',
  ] as const

  for (const tabel of queries) {
    const { data: rows, error } = await supabase.from(tabel).select('*')
    if (error) {
      // Hvis én tabel fejler (fx tabel findes ikke), fortsæt med de øvrige.
      // Brugeren får stadig så mange data som muligt ud.
      data[tabel] = []
      tabeller[tabel] = 0
      continue
    }
    data[tabel] = rows ?? []
    tabeller[tabel] = rows?.length ?? 0
  }

  const eksport = {
    eksporteret_af: user.email,
    bruger_id: user.id,
    eksport_dato: new Date().toISOString(),
    schema_version: 1,
    data,
  }

  const json = JSON.stringify(eksport, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  downloadBlob(blob, `striq-mine-data-${todayString()}.json`)

  return { success: true, tabeller }
}
