import type { SupabaseClient } from '@supabase/supabase-js'
import type { BarcodeSuggestion } from '@/lib/types'

const SELECT_COLS =
  'id,barcode,user_id,suggested_yarn_id,suggested_color_id,suggested_producer,suggested_yarn_name,suggested_color_name,suggested_color_number,banderole_image_url,comment,status,resolved_color_id,resolved_by,resolved_at,created_at,updated_at'

export type CreateBarcodeSuggestionInput = {
  barcode: string
  suggested_yarn_id?: string | null
  suggested_color_id?: string | null
  suggested_producer?: string | null
  suggested_yarn_name?: string | null
  suggested_color_name?: string | null
  suggested_color_number?: string | null
  banderole_image_url?: string | null
  comment?: string | null
}

/** Opret et nyt forslag — bruger skal være authenticated. */
export async function createBarcodeSuggestion(
  client: SupabaseClient,
  input: CreateBarcodeSuggestionInput
): Promise<BarcodeSuggestion> {
  const { data: userData, error: userErr } = await client.auth.getUser()
  if (userErr || !userData.user) {
    throw new Error('Du skal være logget ind for at sende et forslag')
  }
  const payload = {
    barcode: input.barcode.trim(),
    user_id: userData.user.id,
    suggested_yarn_id: input.suggested_yarn_id ?? null,
    suggested_color_id: input.suggested_color_id ?? null,
    suggested_producer: input.suggested_producer ?? null,
    suggested_yarn_name: input.suggested_yarn_name ?? null,
    suggested_color_name: input.suggested_color_name ?? null,
    suggested_color_number: input.suggested_color_number ?? null,
    banderole_image_url: input.banderole_image_url ?? null,
    comment: input.comment ?? null,
    status: 'new' as const,
  }
  const { data, error } = await client
    .from('barcode_suggestions')
    .insert(payload)
    .select(SELECT_COLS)
    .single()
  if (error) throw new Error(error.message)
  return data as BarcodeSuggestion
}

/** List forslag med status='new', nyeste først. Kun synlige for editor (RLS). */
export async function listPendingBarcodeSuggestions(
  client: SupabaseClient
): Promise<BarcodeSuggestion[]> {
  const { data, error } = await client
    .from('barcode_suggestions')
    .select(SELECT_COLS)
    .eq('status', 'new')
    .order('barcode', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) {
    console.error('listPendingBarcodeSuggestions:', error.message)
    return []
  }
  return (data ?? []) as BarcodeSuggestion[]
}

/** Atomic approve via RPC — opdaterer colors.barcode + suggestion-status. */
export async function approveBarcodeSuggestion(
  client: SupabaseClient,
  suggestionId: string,
  colorId: string
): Promise<void> {
  const { error } = await client.rpc('approve_barcode_suggestion', {
    p_suggestion_id: suggestionId,
    p_color_id: colorId,
  })
  if (error) throw new Error(error.message)
}

/** Afvis forslag via RPC — markerer status='rejected'. */
export async function rejectBarcodeSuggestion(
  client: SupabaseClient,
  suggestionId: string
): Promise<void> {
  const { error } = await client.rpc('reject_barcode_suggestion', {
    p_suggestion_id: suggestionId,
  })
  if (error) throw new Error(error.message)
}
