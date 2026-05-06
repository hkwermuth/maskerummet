import Image from 'next/image'
import Link from 'next/link'
import type { Yarn } from '@/lib/types'
import { toSlug } from '@/lib/slug'
import { labelFiber } from '@/lib/labels'

export function YarnCard({ yarn }: { yarn: Yarn }) {
  const slug = toSlug(yarn.producer, yarn.name, yarn.series)
  const fiberText = (yarn.fibers ?? [])
    .map((f) => `${labelFiber(f.fiber)} ${f.percentage}%`)
    .join(' · ')

  return (
    <Link
      href={`/garn/${slug}`}
      className="flex gap-4 bg-cream border border-striq-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-striq-link">{yarn.producer}</div>
        <h3 className="font-serif text-xl text-striq-sage mt-1 truncate">{yarn.name}</h3>
        {yarn.series && <div className="text-xs text-striq-muted italic truncate">{yarn.series}</div>}
        <div className="mt-2 text-xs text-striq-muted flex flex-wrap gap-2">
          {yarn.thickness_category && (
            <span className="bg-striq-border px-2 py-0.5 rounded">{yarn.thickness_category}</span>
          )}
          {yarn.length_per_100g_m && (
            <span className="bg-striq-border px-2 py-0.5 rounded">{yarn.length_per_100g_m} m/100g</span>
          )}
        </div>
        {fiberText && (
          <p className="mt-2 text-xs text-striq-muted leading-relaxed">{fiberText}</p>
        )}
      </div>
      <div className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-white border border-striq-border relative">
        {yarn.hero_image_url ? (
          <Image
            src={yarn.hero_image_url}
            alt={`${yarn.producer} ${yarn.name}`}
            fill
            sizes="112px"
            className="object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl"
            role="img"
            aria-label={`Foto af ${yarn.producer} ${yarn.name} mangler endnu`}
          >
            <span aria-hidden="true">🧶</span>
          </div>
        )}
      </div>
    </Link>
  )
}
