import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadRecipes } from '@/lib/data/recipes'
import { savedRecipeKey, type Recipe } from '@/lib/types-recipes'
import type { Yarn } from '@/lib/types'
import { FavoriteYarnsSection } from './FavoriteYarnsSection'
import { FavoriteRecipesSection } from './FavoriteRecipesSection'

export const metadata = {
  title: 'Mine favoritter — STRIQ',
  description: 'De garn og opskrifter du har gemt med et hjerte.',
}

export default async function MineFavoritterPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 74px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F3EE', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '48px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💝</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#61846D', margin: '0 0 8px' }}>
            Mine favoritter
          </h2>
          <p style={{ fontSize: 14, color: '#8C7E74', lineHeight: 1.6, margin: '0 0 24px' }}>
            Log ind for at se de garn og opskrifter du har gemt.
          </p>
          <Link href="/login?next=/mine-favoritter" style={{
            display: 'inline-block', padding: '10px 28px',
            background: '#61846D', color: '#fff', borderRadius: 24,
            fontSize: 14, fontWeight: 500, textDecoration: 'none',
          }}>
            Log ind
          </Link>
        </div>
      </div>
    )
  }

  // Garn-favoritter — to-trins fetch fordi saved_yarns har FK på yarns (basistabel),
  // men vi vil have de rige felter fra yarns_full-view'et til YarnCard-visning.
  const { data: savedYarnRows } = await supabase
    .from('saved_yarns')
    .select('yarn_id, saved_at')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  const yarnIds = (savedYarnRows ?? []).map((r) => r.yarn_id as string)
  let favoriteYarns: Yarn[] = []
  if (yarnIds.length > 0) {
    const { data: yarnRows } = await supabase
      .from('yarns_full')
      .select('*')
      .in('id', yarnIds)
    const yarnMap = new Map(((yarnRows ?? []) as Yarn[]).map((y) => [y.id, y]))
    favoriteYarns = (savedYarnRows ?? [])
      .map((r) => yarnMap.get(r.yarn_id as string))
      .filter((y): y is Yarn => !!y)
  }

  // Opskrift-favoritter — JOIN in-memory mod static recipes-data.
  const { data: savedRecipeRows } = await supabase
    .from('saved_recipes')
    .select('recipe_source, recipe_external_id, saved_at')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  const allRecipes = loadRecipes()
  const recipeMap = new Map(allRecipes.map((r) => [savedRecipeKey(r.source, r.external_id), r]))
  const favoriteRecipes: Recipe[] = ((savedRecipeRows ?? []) as Array<{ recipe_source: string; recipe_external_id: string }>)
    .map((r) => recipeMap.get(savedRecipeKey(r.recipe_source, r.recipe_external_id)))
    .filter((r): r is Recipe => !!r)

  const totalCount = favoriteYarns.length + favoriteRecipes.length

  return (
    <div style={{ background: '#F8F3EE', minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #D4ADB6 0%, #D9BFC3 100%)',
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💝</div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 600,
          color: '#302218', margin: '0 0 10px',
        }}>
          Mine favoritter
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(16px, 2vw, 20px)', fontStyle: 'italic',
          color: '#302218', margin: '0 auto', maxWidth: 500,
          lineHeight: 1.55, opacity: 0.85,
        }}>
          De garn og opskrifter du har gemt med et hjerte.
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 72px' }}>
        {totalCount === 0 ? (
          <div style={{
            background: '#FFFFFF', border: '1px solid #E5DDD9',
            borderRadius: 16, padding: '36px 32px', textAlign: 'center',
            boxShadow: '0 2px 10px rgba(48,34,24,.05)',
            maxWidth: 520, margin: '0 auto',
          }}>
            <div style={{ fontSize: 32, marginBottom: 16 }}>🤍</div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22, fontWeight: 600,
              color: '#302218', margin: '0 0 10px',
            }}>
              Ingen favoritter endnu
            </h2>
            <p style={{ fontSize: 14, color: '#8C7E74', lineHeight: 1.65, margin: '0 0 24px' }}>
              Find garn eller opskrifter du kan lide og tryk på hjertet — så samles de her.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/garn" style={{
                display: 'inline-block', padding: '10px 22px',
                background: '#61846D', color: '#fff', borderRadius: 24,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}>
                Udforsk garn →
              </Link>
              <Link href="/opskrifter" style={{
                display: 'inline-block', padding: '10px 22px',
                background: 'transparent', border: '1px solid #61846D',
                color: '#61846D', borderRadius: 24,
                fontSize: 14, fontWeight: 500, textDecoration: 'none',
              }}>
                Udforsk opskrifter →
              </Link>
            </div>
          </div>
        ) : (
          <>
            <FavoriteYarnsSection yarns={favoriteYarns} />
            <FavoriteRecipesSection recipes={favoriteRecipes} userId={user.id} />
          </>
        )}
      </div>
    </div>
  )
}
