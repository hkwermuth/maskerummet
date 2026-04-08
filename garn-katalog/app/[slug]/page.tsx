import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { toSlug } from '@/lib/slug'
import { FiberBar } from '@/components/FiberBar'
import type { Yarn, Color } from '@/lib/types'
import { getSubstitutions } from '@/lib/substitutions'
import {
  labelThickness, labelSpin, labelFinish, labelWash, labelStatus,
  da, joinDa,
} from '@/lib/labels'

export const revalidate = 3600
export const dynamicParams = true

async function fetchAllYarns(): Promise<Yarn[]> {
  const supabase = createSupabasePublicClient()
  const { data } = await supabase.from('yarns_full').select('*')
  return (data ?? []) as Yarn[]
}

async function fetchYarnBySlug(slug: string): Promise<{ yarn: Yarn; colors: Color[] } | null> {
  const yarns = await fetchAllYarns()
  const yarn = yarns.find((y) => toSlug(y.producer, y.name, y.series) === slug)
  if (!yarn) return null
  const supabase = createSupabasePublicClient()
  const { data: colors } = await supabase.from('colors').select('*').eq('yarn_id', yarn.id)
  return { yarn, colors: (colors ?? []) as Color[] }
}

export async function generateStaticParams() {
  const yarns = await fetchAllYarns()
  return yarns.map((y) => ({ slug: toSlug(y.producer, y.name, y.series) }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const result = await fetchYarnBySlug(slug)
  if (!result) return { title: 'Garn ikke fundet' }
  const { yarn } = result
  const fiberSummary = yarn.fibers?.map((f) => `${f.percentage}% ${f.fiber.replace(/_/g, ' ')}`).join(', ')
  const description = [yarn.description, fiberSummary].filter(Boolean).join(' · ').slice(0, 160)
  return {
    title: `${yarn.producer} ${yarn.name}`,
    description,
    openGraph: {
      title: `${yarn.producer} ${yarn.name} — Maskerummet`,
      description,
      type: 'website',
    },
    alternates: { canonical: `/${slug}` },
  }
}

export default async function YarnDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const result = await fetchYarnBySlug(slug)
  if (!result) notFound()
  const { yarn, colors } = result
  const substitutions = await getSubstitutions(yarn.id, 8)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${yarn.producer} ${yarn.name}`,
    brand: { '@type': 'Brand', name: yarn.producer },
    description: yarn.description ?? undefined,
    category: yarn.thickness_category ?? undefined,
  }

  return (
    <article className="max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/" className="text-sm text-terracotta">← Tilbage til katalog</Link>
      <div className="mt-3 text-xs uppercase tracking-wider text-terracotta">{yarn.producer}</div>
      <h1 className="font-serif text-4xl text-forest">{yarn.name}</h1>
      {yarn.series && <div className="text-bark italic mt-1">{yarn.series}</div>}

      <section className="mt-6">
        <h2 className="font-serif text-xl text-forest mb-2">Materiale</h2>
        <FiberBar fibers={yarn.fibers} />
      </section>

      {yarn.description && (
        <section className="mt-6">
          {yarn.description.split(/\n\n+/).map((para, i) => (
            <p key={i} className="text-bark leading-relaxed mb-3 last:mb-0">{para}</p>
          ))}
        </section>
      )}

      <section className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Field label="Tykkelse" value={labelThickness(yarn.thickness_category)} />
        <Field
          label="Løbelængde pr. 100 g"
          value={yarn.length_per_100g_m ? `${da(yarn.length_per_100g_m)} m` : null}
        />
        <Field label="Nøglevægt" value={yarn.ball_weight_g ? `${da(yarn.ball_weight_g)} g` : null} />
        <Field
          label="Pindestørrelse"
          value={
            yarn.needle_min_mm && yarn.needle_max_mm
              ? `${da(yarn.needle_min_mm)}–${da(yarn.needle_max_mm)} mm`
              : yarn.needle_min_mm
              ? `${da(yarn.needle_min_mm)} mm`
              : null
          }
        />
        <Field
          label="Strikkefasthed"
          value={
            yarn.gauge_stitches_10cm
              ? `${da(yarn.gauge_stitches_10cm)} m / ${da(yarn.gauge_rows_10cm) ?? '?'} p på 10 cm${
                  yarn.gauge_needle_mm ? ` (pind ${da(yarn.gauge_needle_mm)} mm)` : ''
                }`
              : null
          }
        />
        <Field label="Spinding" value={labelSpin(yarn.spin_type)} />
        <Field label="Tråd" value={yarn.twist_structure} />
        <Field label="Finish" value={labelFinish(yarn.finish)} />
        <Field label="Vaskeanvisning" value={labelWash(yarn.wash_care)} />
        <Field label="Spundet i" value={yarn.origin_country} />
        <Field label="Fiberoprindelse" value={yarn.fiber_origin_country} />
        <Field label="Status" value={labelStatus(yarn.status)} />
      </section>

      {yarn.use_cases && yarn.use_cases.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif text-xl text-forest mb-2">Velegnet til</h2>
          <p className="text-bark">{joinDa(yarn.use_cases)}</p>
        </section>
      )}

      {yarn.certifications && yarn.certifications.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif text-xl text-forest mb-2">Certificeringer</h2>
          <div className="flex flex-wrap gap-2">
            {yarn.certifications.map((c) => (
              <span key={c} className="bg-moss/30 text-forest text-xs px-2 py-1 rounded">{c}</span>
            ))}
          </div>
        </section>
      )}


      {colors.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif text-xl text-forest mb-2">Farver ({colors.length})</h2>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                {c.hex_code && (
                  <span className="w-5 h-5 rounded-full border border-stone" style={{ background: c.hex_code }} />
                )}
                <span>{c.color_name ?? c.color_number}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {substitutions.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-xl text-forest mb-1">Mulige substitutter</h2>
          <p className="text-xs text-bark/70 mb-3">
            Forslagene er automatisk beregnet ud fra garnets tykkelse, løbelængde, strikkefasthed, fiberindhold og vaskeanvisning.
          </p>
          <ul className="divide-y divide-stone border border-stone rounded-lg overflow-hidden">
            {substitutions.map((s) => {
              const slug = toSlug(s.producer, s.name, s.series)
              return (
                <li key={s.yarn_id}>
                  <Link
                    href={`/${slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-cream transition"
                  >
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-wider text-terracotta">{s.producer}</div>
                      <div className="text-forest truncate">
                        {s.name}
                        {s.series ? <span className="italic text-bark"> — {s.series}</span> : null}
                      </div>
                      {s.notes && <div className="text-xs text-bark/80 mt-1">{s.notes}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {s.is_manual && (
                        <span title="Verificeret manuelt" className="text-xs text-forest">✓</span>
                      )}
                      <VerdictBadge verdict={s.verdict} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </article>
  )
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, string> = {
    perfekt: 'bg-moss/40 text-forest',
    god: 'bg-sky-100 text-sky-900',
    forbehold: 'bg-amber-100 text-amber-900',
    virker_ikke: 'bg-red-100 text-red-900',
  }
  const cls = map[verdict] ?? 'bg-stone text-bark'
  return (
    <span className={`text-[11px] uppercase tracking-wider px-2 py-1 rounded ${cls}`}>
      {verdict.replace(/_/g, ' ')}
    </span>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-terracotta">{label}</div>
      <div className="text-forest">{value}</div>
    </div>
  )
}
