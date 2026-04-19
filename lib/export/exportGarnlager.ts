import type { SupabaseClient } from '@supabase/supabase-js'
import { fromDb } from '@/lib/supabase/mappers'
import { generateCsv, downloadBlob, todayString } from './csv'

export async function exportGarnlager(supabase: SupabaseClient): Promise<{ success: boolean; count: number; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, count: 0, error: 'Ikke logget ind.' }

  const { data, error } = await supabase
    .from('yarn_items')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (error) return { success: false, count: 0, error: error.message }
  if (!data || data.length === 0) return { success: false, count: 0, error: 'Dit garnlager er tomt — der er intet at eksportere.' }

  const rows = data.map(fromDb)

  const blob = generateCsv(rows, [
    { header: 'Garnnavn', value: r => r.name },
    { header: 'Mærke', value: r => r.brand },
    { header: 'Farvenavn', value: r => r.colorName },
    { header: 'Farvekode', value: r => r.colorCode },
    { header: 'Fiber', value: r => r.fiber },
    { header: 'Garntykkelse', value: r => r.weight },
    { header: 'Pindestr.', value: r => r.pindstr },
    { header: 'Metrage (m)', value: r => r.metrage },
    { header: 'Antal', value: r => r.antal },
    { header: 'Status', value: r => r.status },
    { header: 'Hexfarve', value: r => r.hex },
    { header: 'Noter', value: r => r.noter },
    { header: 'Stregkode', value: r => r.barcode },
  ])

  downloadBlob(blob, `garnlager-${todayString()}.csv`)
  return { success: true, count: rows.length }
}
