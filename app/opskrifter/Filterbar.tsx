'use client'

import { OPSKRIFTER_TOKENS as T } from '@/lib/opskrifter-tokens'
import { MultiSelect } from './MultiSelect'
import {
  EMPTY_RECIPE_FILTERS,
  type RecipeFilterOptions,
  type RecipeFilters,
} from '@/lib/types-recipes'
import { isAnyFilterActive } from '@/lib/data/recipes'

type Props = {
  filters: RecipeFilters
  options: RecipeFilterOptions
  total: number
  visible: number
  onChange: (next: RecipeFilters) => void
  /** Antal gemte favoritter (vises som badge på toggle). Null hvis ikke logget ind. */
  favoritesCount: number | null
  /** Hvis ikke logget ind: kalde dette ved klik på favorit-toggle (login-redirect). */
  onFavoritesRequireLogin: () => void
}

function audienceLabel(value: string): string {
  // Kapitaliser dansk-orienteret: 'dame' → 'Dame'
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function Filterbar({
  filters,
  options,
  total,
  visible,
  onChange,
  favoritesCount,
  onFavoritesRequireLogin,
}: Props) {
  const hasActive = isAnyFilterActive(filters)
  const isLoggedIn = favoritesCount !== null

  function toggleFavorites() {
    if (!isLoggedIn) {
      onFavoritesRequireLogin()
      return
    }
    onChange({ ...filters, onlyFavorites: !filters.onlyFavorites })
  }

  return (
    <div
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: '14px 16px',
        marginBottom: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        {/* Søgefelt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 220px', minWidth: 200 }}>
          <label
            htmlFor="opskrift-soeg"
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '.08em',
              color: T.textMuted,
            }}
          >
            Søg
          </label>
          <input
            id="opskrift-soeg"
            type="search"
            value={filters.q}
            onChange={(e) => onChange({ ...filters, q: e.target.value })}
            placeholder="Navn eller fx. cardigan silke pind 5"
            style={{
              minHeight: 44,
              padding: '8px 12px',
              fontSize: 14,
              background: T.white,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.text,
              fontFamily: 'inherit',
            }}
          />
        </div>

        <MultiSelect
          label="Målgruppe"
          options={options.audience.map((v) => ({ value: v, label: audienceLabel(v) }))}
          selected={filters.audience}
          onChange={(next) => onChange({ ...filters, audience: next })}
        />

        <MultiSelect
          label="Type"
          options={options.garment_type.map((v) => ({
            value: v,
            label: options.garment_label_for[v] || audienceLabel(v),
          }))}
          selected={filters.garment_type}
          onChange={(next) => onChange({ ...filters, garment_type: next })}
        />

        <MultiSelect
          label="Sæson"
          options={options.season.map((v) => ({ value: v, label: audienceLabel(v) }))}
          selected={filters.season}
          onChange={(next) => onChange({ ...filters, season: next })}
        />

        <MultiSelect
          label="Fiber"
          options={options.fiber.map((v) => ({ value: v, label: v }))}
          selected={filters.fiber}
          onChange={(next) => onChange({ ...filters, fiber: next })}
        />

        <MultiSelect
          label="Pind"
          options={options.needle.map((v) => ({ value: v, label: v }))}
          selected={filters.needle}
          onChange={(next) => onChange({ ...filters, needle: next })}
        />

        {/* Resultat-tæller — flyttet op, højrestillet ved siden af Mine favoritter */}
        <div
          role="status"
          aria-live="polite"
          style={{
            marginLeft: 'auto',
            alignSelf: 'flex-end',
            paddingBottom: 12,
            fontSize: 13,
            color: T.textMuted,
            whiteSpace: 'nowrap',
          }}
        >
          {visible === total ? (
            <>Viser alle <strong style={{ color: T.text }}>{total}</strong> mønstre</>
          ) : (
            <>Viser <strong style={{ color: T.text }}>{visible}</strong> af {total} mønstre</>
          )}
        </div>

        {/* Favorit-toggle — vises altid; ikke-logget-ind klik → login-redirect */}
        <button
          type="button"
          onClick={toggleFavorites}
          aria-pressed={filters.onlyFavorites}
          aria-label={
            filters.onlyFavorites
              ? 'Vis alle mønstre (slå favorit-filter fra)'
              : 'Vis kun mine favoritter'
          }
          style={{
            minHeight: 44,
            alignSelf: 'flex-end',
            padding: '8px 14px',
            background: filters.onlyFavorites ? `${T.heart}18` : T.white,
            border: `1px solid ${filters.onlyFavorites ? T.heart : T.border}`,
            borderRadius: 8,
            color: filters.onlyFavorites ? T.heart : T.text,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'inherit',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={filters.onlyFavorites ? T.heart : 'none'}
            stroke={filters.onlyFavorites ? T.heart : T.textMuted}
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Mine favoritter
          {isLoggedIn && favoritesCount !== null && favoritesCount > 0 && (
            <span
              style={{
                background: T.heart,
                color: T.white,
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: 999,
                minWidth: 18,
                textAlign: 'center',
              }}
            >
              {favoritesCount}
            </span>
          )}
        </button>

        {/* Nulstil filtre — på samme linje, kun synlig når mindst ét filter er aktivt */}
        {hasActive && (
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY_RECIPE_FILTERS })}
            style={{
              minHeight: 44,
              alignSelf: 'flex-end',
              padding: '8px 14px',
              background: 'transparent',
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.text,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Nulstil filtre
          </button>
        )}
      </div>
    </div>
  )
}
