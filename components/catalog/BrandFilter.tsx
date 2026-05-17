'use client'

import type { Brand } from '@/lib/data/retailers'
import { orderBrands, HIDDEN_BRAND_SLUGS } from '@/lib/data/retailers'
import { FilterChip } from './FilterChip'

type Props = {
  brands: Brand[]
  activeBrand: string | null
  onChange: (slug: string | null) => void
  // Valgfri filter — fx kun vis brands der har mindst én forhandler.
  // Forudfiltreres af kalder.
  hideEmptyBrands?: boolean
  labelledById?: string
}

// Chip-baseret brand-filter. "Alle" + featured (Drops/Permin/Filcolana) først,
// resten alfabetisk. Skjulte slugs (HIDDEN_BRAND_SLUGS) filtreres altid fra.
export function BrandFilter({ brands, activeBrand, onChange, labelledById }: Props) {
  const visible = orderBrands(brands.filter(b => !HIDDEN_BRAND_SLUGS.has(b.slug)))

  return (
    <div
      role="group"
      aria-labelledby={labelledById}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        margin: '0 0 18px',
      }}
    >
      <FilterChip
        label="Alle mærker"
        active={activeBrand === null}
        onClick={() => onChange(null)}
      />
      {visible.map(brand => (
        <FilterChip
          key={brand.id}
          label={brand.name}
          active={activeBrand === brand.slug}
          onClick={() => onChange(activeBrand === brand.slug ? null : brand.slug)}
        />
      ))}
    </div>
  )
}
