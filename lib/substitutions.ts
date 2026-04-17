import { createSupabasePublicClient } from './supabase/public'
import type { SubstitutionCandidate } from './types'

export async function getSubstitutions(
  yarnId: string,
  limit = 10
): Promise<SubstitutionCandidate[]> {
  const supabase = createSupabasePublicClient()
  const { data, error } = await supabase.rpc('get_substitutions', {
    target_yarn: yarnId,
    limit_n: limit,
  })
  if (error) {
    console.error('get_substitutions RPC failed:', error.message)
    return []
  }
  return (data ?? []) as SubstitutionCandidate[]
}
