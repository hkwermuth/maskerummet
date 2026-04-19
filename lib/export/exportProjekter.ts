import type { SupabaseClient } from '@supabase/supabase-js'
import { generateCsv, downloadBlob, todayString } from './csv'

interface ProjectRow {
  projektnavn: string
  dato: string
  pindestørrelse: string
  strikketMed: string
  noter: string
  garnnavn: string
  garnmærke: string
  farvenavn: string
  farvekode: string
  antalBrugt: number | null
}

export async function exportProjekter(supabase: SupabaseClient): Promise<{ success: boolean; count: number; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, count: 0, error: 'Ikke logget ind.' }

  const { data: projects, error: pErr } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .order('used_at', { ascending: false })

  if (pErr) return { success: false, count: 0, error: pErr.message }
  if (!projects || projects.length === 0) return { success: false, count: 0, error: 'Du har ingen projekter — der er intet at eksportere.' }

  const projectIds = projects.map(p => p.id)
  const { data: usages } = await supabase
    .from('yarn_usage')
    .select('*')
    .in('project_id', projectIds)

  const usagesByProject = new Map<string, typeof usages>()
  for (const u of usages ?? []) {
    const list = usagesByProject.get(u.project_id) ?? []
    list.push(u)
    usagesByProject.set(u.project_id, list)
  }

  const rows: ProjectRow[] = []
  for (const p of projects) {
    const pUsages = usagesByProject.get(p.id)
    if (pUsages && pUsages.length > 0) {
      for (const u of pUsages) {
        rows.push({
          projektnavn: p.title ?? '',
          dato: p.used_at ?? '',
          pindestørrelse: p.needle_size ?? '',
          strikketMed: p.held_with ?? '',
          noter: p.notes ?? '',
          garnnavn: u.yarn_name ?? '',
          garnmærke: u.yarn_brand ?? '',
          farvenavn: u.color_name ?? '',
          farvekode: u.color_code ?? '',
          antalBrugt: u.quantity_used,
        })
      }
    } else {
      rows.push({
        projektnavn: p.title ?? '',
        dato: p.used_at ?? '',
        pindestørrelse: p.needle_size ?? '',
        strikketMed: p.held_with ?? '',
        noter: p.notes ?? '',
        garnnavn: '',
        garnmærke: '',
        farvenavn: '',
        farvekode: '',
        antalBrugt: null,
      })
    }
  }

  const blob = generateCsv(rows, [
    { header: 'Projektnavn', value: r => r.projektnavn },
    { header: 'Dato', value: r => r.dato },
    { header: 'Pindestørrelse', value: r => r.pindestørrelse },
    { header: 'Strikket med', value: r => r.strikketMed },
    { header: 'Noter', value: r => r.noter },
    { header: 'Garnnavn', value: r => r.garnnavn },
    { header: 'Garnmærke', value: r => r.garnmærke },
    { header: 'Farvenavn', value: r => r.farvenavn },
    { header: 'Farvekode', value: r => r.farvekode },
    { header: 'Antal brugt', value: r => r.antalBrugt },
  ])

  downloadBlob(blob, `projekter-${todayString()}.csv`)
  return { success: true, count: projects.length }
}
