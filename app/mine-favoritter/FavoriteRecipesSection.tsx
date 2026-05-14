'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DropsKort } from '@/app/opskrifter/DropsKort'
import { useSupabase } from '@/lib/supabase/client'
import { unsaveRecipe } from '@/lib/data/saved-recipes'
import type { Recipe } from '@/lib/types-recipes'

type Props = {
  recipes: Recipe[]
  userId: string
}

const INITIAL = 3

export function FavoriteRecipesSection({ recipes: initialRecipes, userId }: Props) {
  const supabase = useSupabase()
  const [recipes, setRecipes] = useState(initialRecipes)
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const visible = showAll ? recipes : recipes.slice(0, INITIAL)

  async function handleToggle(recipe: Recipe) {
    const snapshot = recipes
    setRecipes((prev) => prev.filter((r) => !(r.source === recipe.source && r.external_id === recipe.external_id)))
    try {
      await unsaveRecipe(supabase, userId, recipe.source, recipe.external_id)
    } catch {
      setRecipes(snapshot)
      setError('Kunne ikke fjerne favorit. Prøv igen.')
      setTimeout(() => setError(null), 4000)
    }
  }

  return (
    <section>
      <h2 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 24, fontWeight: 600, color: '#302218',
        margin: '0 0 16px',
      }}>
        Mine opskrift-favoritter ({recipes.length})
      </h2>

      {error && (
        <div role="alert" style={{
          margin: '0 0 12px', padding: '8px 12px',
          background: '#FFF6E6', border: '1px solid #F0DBA8',
          borderRadius: 8, fontSize: 13, color: '#5B4A1C',
        }}>
          {error}
        </div>
      )}

      {recipes.length === 0 ? (
        <div style={{
          background: '#FFFFFF', border: '1px solid #E5DDD9',
          borderRadius: 12, padding: '24px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📖</div>
          <p style={{ fontSize: 14, color: '#8C7E74', margin: '0 0 16px' }}>
            Ingen opskrift-favoritter endnu. Tryk på hjertet på en opskrift for at gemme den.
          </p>
          <Link href="/opskrifter" style={{
            display: 'inline-block', padding: '8px 20px',
            background: '#61846D', color: '#fff', borderRadius: 24,
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
          }}>
            Udforsk opskrifter →
          </Link>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 22,
          }}>
            {visible.map((r) => (
              <DropsKort
                key={`${r.source}:${r.external_id}`}
                recipe={r}
                isFavorite={true}
                onToggleFavorite={() => handleToggle(r)}
              />
            ))}
          </div>
          {recipes.length > INITIAL && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                style={{
                  background: 'transparent', border: '1px solid #61846D',
                  color: '#61846D', borderRadius: 24,
                  padding: '8px 22px', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {showAll ? 'Vis færre' : `Vis alle ${recipes.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
