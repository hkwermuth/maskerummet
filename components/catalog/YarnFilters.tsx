'use client'
import { useMemo, useState } from 'react'
import type { Yarn } from '@/lib/types'
import { YarnCard } from './YarnCard'
import { ScanFraKatalogButton } from './ScanFraKatalogButton'

export function YarnFilters({ yarns }: { yarns: Yarn[] }) {
  const [q, setQ] = useState('')
  const [thickness, setThickness] = useState<string>('')

  const thicknesses = useMemo(
    () => Array.from(new Set(yarns.map((y) => y.thickness_category).filter(Boolean))) as string[],
    [yarns]
  )

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return yarns.filter((y) => {
      if (thickness && y.thickness_category !== thickness) return false
      if (!ql) return true
      const hay = [
        y.producer, y.name, y.series, y.fiber_main, y.description,
        ...(y.fibers?.map((f) => f.fiber) ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(ql)
    })
  }, [yarns, q, thickness])

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søg producent, navn, fiber…"
          className="flex-1 min-w-[220px] px-4 py-2 rounded-lg border border-striq-border bg-cream focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
        />
        <select
          value={thickness}
          onChange={(e) => setThickness(e.target.value)}
          className="px-3 py-2 rounded-lg border border-striq-border bg-cream"
        >
          <option value="">Alle tykkelser</option>
          {thicknesses.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <div className="w-full sm:w-auto">
          <ScanFraKatalogButton />
        </div>
      </div>
      <div className="text-xs text-striq-muted mb-3">{filtered.length} garner</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((y) => (
          <YarnCard key={y.id} yarn={y} />
        ))}
      </div>
    </div>
  )
}
