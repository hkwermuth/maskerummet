import type { SupabaseClient } from '@supabase/supabase-js'
import { savedRecipeKey, type RecipeSource, type SavedRecipeKey } from '@/lib/types-recipes'

type SavedRecipeRow = {
  recipe_source: string
  recipe_external_id: string
}

/** Henter alle favoritter for brugeren som et Set af `${source}:${external_id}`-nøgler. */
export async function fetchSavedRecipes(
  supabase: SupabaseClient,
  userId: string,
): Promise<Set<SavedRecipeKey>> {
  const { data, error } = await supabase
    .from('saved_recipes')
    .select('recipe_source, recipe_external_id')
    .eq('user_id', userId)
  if (error) throw error
  const set = new Set<SavedRecipeKey>()
  for (const row of (data || []) as SavedRecipeRow[]) {
    set.add(savedRecipeKey(row.recipe_source, row.recipe_external_id))
  }
  return set
}

/** Gem en favorit. Idempotent — hvis allerede gemt, kaster ikke. */
export async function saveRecipe(
  supabase: SupabaseClient,
  userId: string,
  source: RecipeSource,
  externalId: string,
): Promise<void> {
  const { error } = await supabase
    .from('saved_recipes')
    .upsert(
      { user_id: userId, recipe_source: source, recipe_external_id: externalId },
      { onConflict: 'user_id,recipe_source,recipe_external_id', ignoreDuplicates: true },
    )
  if (error) throw error
}

/** Fjern en favorit. Idempotent. */
export async function unsaveRecipe(
  supabase: SupabaseClient,
  userId: string,
  source: RecipeSource,
  externalId: string,
): Promise<void> {
  const { error } = await supabase
    .from('saved_recipes')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_source', source)
    .eq('recipe_external_id', externalId)
  if (error) throw error
}
