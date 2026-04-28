import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  ProjectType,
  SharedProjectPublic,
  SharedProjectYarn,
} from './types'

// Henter alle delte projekter via offentlige views. Fungerer med både anon og
// authenticated klienter.
export async function fetchSharedProjects(
  supabase: SupabaseClient,
): Promise<SharedProjectPublic[]> {
  const { data: projects, error: pErr } = await supabase
    .from('public_shared_projects')
    .select('id,title,project_image_urls,project_type,community_description,community_size_shown,pattern_name,pattern_designer,shared_at,display_name')
    .order('shared_at', { ascending: false })

  if (pErr) {
    console.error('fetchSharedProjects: kunne ikke hente projekter', pErr)
    return []
  }

  const rows = (projects ?? []) as Array<Omit<SharedProjectPublic, 'yarns'>>
  if (rows.length === 0) return []

  const ids = rows.map(r => r.id)
  const yarnsByProjectId = new Map<string, SharedProjectYarn[]>()

  const { data: yarns, error: yErr } = await supabase
    .from('public_shared_project_yarns')
    .select('id,project_id,yarn_name,yarn_brand,color_name,color_code,hex_color,catalog_yarn_id,catalog_color_id')
    .in('project_id', ids)

  if (yErr) {
    console.error('fetchSharedProjects: kunne ikke hente garn-linjer', yErr)
  } else {
    for (const y of (yarns ?? []) as SharedProjectYarn[]) {
      const arr = yarnsByProjectId.get(y.project_id) ?? []
      arr.push(y)
      yarnsByProjectId.set(y.project_id, arr)
    }
  }

  return rows.map(r => ({ ...r, yarns: yarnsByProjectId.get(r.id) ?? [] }))
}

export type SharePayload = {
  project_type: ProjectType
  community_description: string | null
  community_size_shown: string | null
  pattern_name: string
  pattern_designer: string
  display_name?: string | null
}

export async function shareProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
  payload: SharePayload,
) {
  if (payload.display_name !== undefined) {
    const { error: profErr } = await supabase
      .from('profiles')
      .upsert(
        { id: userId, display_name: payload.display_name },
        { onConflict: 'id' },
      )
    if (profErr) throw profErr
  }

  const { error } = await supabase
    .from('projects')
    .update({
      is_shared: true,
      shared_at: new Date().toISOString(),
      project_type: payload.project_type,
      community_description: payload.community_description,
      community_size_shown: payload.community_size_shown,
      pattern_name: payload.pattern_name,
      pattern_designer: payload.pattern_designer,
    })
    .eq('id', projectId)
  if (error) throw error
}

export async function unshareProject(
  supabase: SupabaseClient,
  projectId: string,
) {
  const { error } = await supabase
    .from('projects')
    .update({ is_shared: false })
    .eq('id', projectId)
  if (error) throw error
}

export async function fetchOwnProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,display_name,onboarded_at,created_at,updated_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    console.error('fetchOwnProfile', error)
    return null
  }
  return data
}

export async function markOnboarded(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, onboarded_at: new Date().toISOString() },
      { onConflict: 'id' },
    )
  if (error) {
    console.error('markOnboarded', error)
  }
}
