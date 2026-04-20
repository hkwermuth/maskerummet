import Image from 'next/image'
import type { Yarn } from '@/lib/types'

export function YarnHeroImage({ yarn }: { yarn: Yarn }) {
  if (yarn.hero_image_url) {
    return (
      <div className="relative aspect-[3/4] md:aspect-auto md:h-full w-full rounded-xl overflow-hidden bg-white border border-striq-border">
        <Image
          src={yarn.hero_image_url}
          alt={`${yarn.producer} ${yarn.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
    )
  }
  return (
    <div
      className="relative aspect-[3/4] md:aspect-auto md:h-full w-full rounded-xl border border-dashed border-striq-border bg-white/40 flex flex-col items-center justify-center text-center p-6"
      role="img"
      aria-label={`Billede af ${yarn.producer} ${yarn.name} er endnu ikke tilgængeligt`}
    >
      <div className="text-4xl mb-3" aria-hidden="true">🧶</div>
      <div className="text-sm font-medium text-striq-sage">Billede kommer</div>
      <div className="text-xs text-striq-muted mt-1 max-w-[220px] leading-relaxed">
        Vi afventer tilladelse fra producenten til at vise produktfotos.
      </div>
    </div>
  )
}
