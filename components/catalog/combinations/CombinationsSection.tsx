import Link from 'next/link'
import { toSlug } from '@/lib/slug'
import { labelThickness, da } from '@/lib/labels'
import type { YarnCombination } from '@/lib/types'

type Props = {
  targetProducer: string
  targetName: string
  targetSeries: string | null
  combinations: YarnCombination[]
}

function formatNeedle(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null
  if (min != null && max != null && min !== max) return `pind ${da(min)}–${da(max)} mm`
  const v = min ?? max
  return v != null ? `pind ${da(v)} mm` : null
}

function formatGauge(g: number | null): string | null {
  if (g == null) return null
  return `~${da(g)} m / 10 cm`
}

export function CombinationsSection({ targetProducer, targetName, targetSeries, combinations }: Props) {
  if (combinations.length === 0) return null

  const targetLabel = `${targetProducer} ${targetName}${targetSeries ? ` — ${targetSeries}` : ''}`

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl text-striq-sage mb-1">Strikkes sammen</h2>
      <p className="text-xs text-striq-muted/70 mb-3">
        Kuraterede kombinationer hvor {targetName} indgår som en af to tråde. Strik altid en prøvelap — held-together-strikkefasthed varierer med opskrift og strikker.
      </p>
      <ul className="divide-y divide-striq-border border border-striq-border rounded-lg overflow-hidden bg-white">
        {combinations.map((c) => {
          const partnerSlug = toSlug(c.partner.producer, c.partner.name, c.partner.series)
          const needleStr = formatNeedle(c.combined_needle_min_mm, c.combined_needle_max_mm)
          const gaugeStr = formatGauge(c.combined_gauge_stitches_10cm)
          const thicknessStr = labelThickness(c.combined_thickness_category)
          const combinedSpecs = [needleStr, gaugeStr, thicknessStr].filter(Boolean).join(' · ')

          return (
            <li key={c.id} className="px-4 py-3">
              <div className="text-xs uppercase tracking-wider text-striq-link">
                {c.isSameYarn ? '2× samme garn' : 'Holdt sammen'}
              </div>
              <div className="mt-1 text-striq-sage">
                {c.isSameYarn ? (
                  <span>2× <span className="italic">{targetLabel}</span></span>
                ) : (
                  <>
                    <span>1× <span className="italic">{targetLabel}</span></span>
                    <span className="mx-2 text-striq-muted">+</span>
                    <span>1× </span>
                    <Link href={`/garn/${partnerSlug}`} className="underline">
                      {c.partner.producer} {c.partner.name}
                      {c.partner.series ? <span className="italic text-striq-muted"> — {c.partner.series}</span> : null}
                    </Link>
                  </>
                )}
              </div>
              {combinedSpecs && (
                <div className="mt-1 text-xs text-striq-muted">
                  {combinedSpecs}
                </div>
              )}
              {c.use_cases.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.use_cases.map((u) => (
                    <span key={u} className="text-[11px] bg-moss/30 text-striq-sage px-2 py-0.5 rounded">{u}</span>
                  ))}
                </div>
              )}
              {c.notes && (
                <p className="mt-2 text-xs text-striq-muted/80 leading-relaxed">{c.notes}</p>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
