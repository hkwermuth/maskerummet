import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { loadRecipes } from '@/lib/data/recipes'
import { savedRecipeKey, type Recipe } from '@/lib/types-recipes'
import type { Yarn } from '@/lib/types'
import { HeroIllustration } from '@/components/layout/HeroIllustration'
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
      {/* Hero — matcher find-forhandler/online-forhandlere-mønstret */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(255,252,247,0.82) 0%, rgba(244,239,230,0.82) 55%, rgba(234,217,222,0.82) 100%)',
        padding: '36px 0 32px',
      }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px',
          display: 'flex', gap: 28,
          alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 420px', minWidth: 260 }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(28px, 4.2vw, 38px)',
              fontWeight: 600, color: '#302218', margin: 0, letterSpacing: '.01em',
            }}>
              Mine favoritter
            </h1>
            <p style={{ fontSize: 14.5, color: '#6B5D4F', margin: '6px 0 0', maxWidth: 640, lineHeight: 1.55 }}>
              De garn og opskrifter du har gemt med et hjerte. Find inspiration i{' '}
              <Link href="/garn" style={{ color: '#61846D', fontWeight: 500 }}>
                garn-kataloget
              </Link>{' '}
              eller{' '}
              <Link href="/opskrifter" style={{ color: '#61846D', fontWeight: 500 }}>
                opskrifterne
              </Link>
              {' '}— tryk på hjertet for at gemme.
            </p>
          </div>
          <div className="favoritter-hero-art" style={{ flexShrink: 0, width: 220, maxWidth: '100%' }}>
            <HeroIllustration variant="favoritter-noegle-bog" />
          </div>
        </div>
        <style>{`
          @media (max-width: 640px) {
            .favoritter-hero-art { display: none !important; }
          }
        `}</style>
      </section>

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
