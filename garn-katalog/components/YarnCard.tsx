import Link from 'next/link'
import type { Yarn } from '@/lib/types'
import { toSlug } from '@/lib/slug'
import { FiberBar } from './FiberBar'

export function YarnCard({ yarn }: { yarn: Yarn }) {
  const slug = toSlug(yarn.producer, yarn.name, yarn.series)
  return (
    <Link
      href={`/${slug}`}
      className="block bg-cream border border-stone rounded-2xl p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
    >
      <div className="text-xs uppercase tracking-wider text-terracotta">{yarn.producer}</div>
      <h3 className="font-serif text-xl text-forest mt-1">{yarn.name}</h3>
      {yarn.series && <div className="text-xs text-bark italic">{yarn.series}</div>}
      <div className="mt-3 text-xs text-bark flex flex-wrap gap-2">
        {yarn.thickness_category && (
          <span className="bg-stone px-2 py-0.5 rounded">{yarn.thickness_category}</span>
        )}
        {yarn.length_per_100g_m && (
          <span className="bg-stone px-2 py-0.5 rounded">{yarn.length_per_100g_m} m/100g</span>
        )}
      </div>
      <div className="mt-3">
        <FiberBar fibers={yarn.fibers} />
      </div>
    </Link>
  )
}
