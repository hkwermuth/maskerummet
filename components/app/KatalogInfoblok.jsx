'use client'

import { displayYarnName, metrageFromYarn, pindstrFromYarn } from '@/lib/catalog'
import { YARN_WEIGHT_LABELS } from '@/lib/yarn-weight'

// Read-only info-blok der viser felter fra det offentlige garn-katalog.
// Visuelt grøn (datakilde-token "src-catalog") for at signalere "katalog-data — kan ikke redigeres".

export default function KatalogInfoblok({ yarn, onClearLink }) {
  const rows = yarn ? buildRows(yarn) : []

  return (
    <section
      aria-label="Information fra garn-kataloget"
      data-testid="katalog-infoblok"
      className="bg-striq-src-catalog-bg text-striq-src-catalog-fg border border-striq-sage rounded-lg col-span-full flex flex-col gap-2.5 px-3.5 py-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[.12em] font-semibold">
          Importeret fra katalog
        </span>
        {onClearLink && (
          <button
            type="button"
            onClick={onClearLink}
            className="text-xs font-medium bg-white text-striq-src-catalog-fg border border-striq-sage rounded-full cursor-pointer px-4 py-1.5 min-h-[36px] font-sans"
          >
            Skift
          </button>
        )}
      </div>

      {yarn ? (
        <>
          <dl className="m-0 grid gap-x-4 gap-y-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
            {rows.map(([label, val]) => (
              <div key={label} className="flex flex-col gap-0.5 min-w-0">
                <dt className="text-[10px] uppercase tracking-[.1em] font-medium opacity-80">
                  {label}
                </dt>
                <dd className="m-0 text-[13px] font-medium break-words">
                  {val}
                </dd>
              </div>
            ))}
          </dl>
          <p className="m-0 text-[11px] italic opacity-80">
            Disse felter er låste og styres fra dit garn-katalog.
          </p>
        </>
      ) : (
        <p className="m-0 text-xs italic opacity-80">
          Henter katalog-data…
        </p>
      )}
    </section>
  )
}

function buildRows(yarn) {
  const weightLabel = (yarn.yarn_weight && YARN_WEIGHT_LABELS[yarn.yarn_weight])
    || yarn.thickness_category
    || ''
  const metrage = metrageFromYarn(yarn)
  const pindstr = pindstrFromYarn(yarn)
  const fiber = (yarn.fiber_main || '').trim()
  const ballWeight = yarn.ball_weight_g != null ? `${yarn.ball_weight_g} g` : ''
  const gaugeNeedle = yarn.gauge_needle_mm != null ? `${yarn.gauge_needle_mm} mm` : ''

  return [
    ['Mærke', yarn.producer || ''],
    ['Garnnavn', displayYarnName(yarn)],
    ['Fiber', fiber],
    ['Vægt', weightLabel],
    ['Løbelængde/nøgle', metrage ? `${metrage} m` : ''],
    ['Pindstørrelse', pindstr],
    ['Ball-vægt', ballWeight],
    ['Gauge-pind', gaugeNeedle],
  ].filter(([, v]) => v != null && String(v).trim() !== '')
}
