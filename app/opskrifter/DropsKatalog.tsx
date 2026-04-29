'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/client'
import { buildLoginHref } from '@/lib/auth/buildLoginHref'
import { OPSKRIFTER_TOKENS as T } from '@/lib/opskrifter-tokens'
import {
  EMPTY_RECIPE_FILTERS,
  savedRecipeKey,
  type Recipe,
  type RecipeFilters,
} from '@/lib/types-recipes'
import {
  deriveFilterOptions,
  filterRecipes,
  parseFiltersFromSearchParams,
  serializeFilters,
} from '@/lib/data/recipes'
import { saveRecipe, unsaveRecipe } from '@/lib/data/saved-recipes'
import { Filterbar } from './Filterbar'
import { DropsKort } from './DropsKort'

type Props = {
  recipes: Recipe[]
  initialSavedKeys: string[]
  userId: string | null
}

export default function DropsKatalog({ recipes, initialSavedKeys, userId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const supabase = useSupabase()

  // Initial filtre fra URL — sker on-mount så server og klient er konsistente.
  const [filters, setFilters] = useState<RecipeFilters>(EMPTY_RECIPE_FILTERS)
  const [filtersHydrated, setFiltersHydrated] = useState(false)

  useEffect(() => {
    const sp = new URLSearchParams(searchParams?.toString() || '')
    setFilters(parseFiltersFromSearchParams(sp))
    setFiltersHydrated(true)
    // Vi læser KUN ved mount; herefter er filters lokal state og skriver til URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set(initialSavedKeys))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const options = useMemo(() => deriveFilterOptions(recipes), [recipes])
  const visibleRecipes = useMemo(() => {
    const base = filterRecipes(recipes, filters)
    if (filters.onlyFavorites && userId) {
      return base.filter((r) => savedKeys.has(savedRecipeKey(r.source, r.external_id)))
    }
    return base
  }, [recipes, filters, savedKeys, userId])

  // URL-sync: skriv filter-state til URL ved hver ændring (efter hydration).
  useEffect(() => {
    if (!filtersHydrated) return
    const qs = serializeFilters(filters)
    const next = qs ? `${pathname}?${qs}` : pathname
    // replace + scroll:false så ikke history-spam og ikke jumper til top
    router.replace(next, { scroll: false })
  }, [filters, filtersHydrated, pathname, router])

  function buildReturnHref(): string {
    const sp = new URLSearchParams(searchParams?.toString() || '')
    const qs = sp.toString()
    return qs ? `${pathname}?${qs}` : pathname || '/opskrifter'
  }

  async function handleToggleFavorite(recipe: Recipe) {
    if (!userId) {
      // Ikke logget ind — send brugeren til login med return-URL inkl. filtre.
      router.push(buildLoginHref(buildReturnHref()))
      return
    }
    const key = savedRecipeKey(recipe.source, recipe.external_id)
    const wasSaved = savedKeys.has(key)

    // Optimistic update
    setSavedKeys((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(key)
      else next.add(key)
      return next
    })

    try {
      if (wasSaved) {
        await unsaveRecipe(supabase, userId, recipe.source, recipe.external_id)
      } else {
        await saveRecipe(supabase, userId, recipe.source, recipe.external_id)
      }
    } catch (err) {
      // Rollback
      setSavedKeys((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(key)
        else next.delete(key)
        return next
      })
      setErrorMessage(
        wasSaved
          ? 'Kunne ikke fjerne favorit. Prøv igen.'
          : 'Kunne ikke gemme favorit. Prøv igen.'
      )
      // eslint-disable-next-line no-console
      console.error('[DropsKatalog] favorit-fejl:', err)
    }
  }

  return (
    <div>
      <Filterbar
        filters={filters}
        options={options}
        total={recipes.length}
        visible={visibleRecipes.length}
        onChange={setFilters}
        favoritesCount={userId ? savedKeys.size : null}
        onFavoritesRequireLogin={() => router.push(buildLoginHref(buildReturnHref()))}
      />

      {errorMessage && (
        <div
          role="alert"
          style={{
            margin: '0 0 16px',
            padding: '10px 14px',
            background: '#FFF6E6',
            border: '1px solid #F0DBA8',
            borderRadius: 8,
            fontSize: 13,
            color: '#5B4A1C',
          }}
        >
          {errorMessage}{' '}
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.sage,
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            Luk
          </button>
        </div>
      )}

      {visibleRecipes.length === 0 ? (
        <div
          style={{
            padding: '40px 20px',
            textAlign: 'center',
            background: T.white,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            color: T.textMuted,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Ingen mønstre matcher dine filtre.{' '}
          <button
            type="button"
            onClick={() => setFilters({ ...EMPTY_RECIPE_FILTERS })}
            style={{
              background: 'transparent',
              border: 'none',
              color: T.sage,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            Nulstil filtre
          </button>{' '}
          for at se alle.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 22,
          }}
        >
          {visibleRecipes.map((r) => {
            const key = savedRecipeKey(r.source, r.external_id)
            return (
              <DropsKort
                key={key}
                recipe={r}
                isFavorite={savedKeys.has(key)}
                onToggleFavorite={() => handleToggleFavorite(r)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
