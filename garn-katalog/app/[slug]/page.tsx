import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { toSlug } from '@/lib/slug'
import { FiberBar } from '@/components/FiberBar'
import type { Yarn, Color } from '@/lib/types'

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
        <h2 className="font-serif text-xl text-forest mb-2">Fibre</h2>
        <FiberBar fibers={yarn.fibers} />
      </section>

      <section className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Field label="Tykkelse" value={yarn.thickness_category} />
        <Field label="Løbelængde" value={yarn.length_per_100g_m ? `${yarn.length_per_100g_m} m/100g` : null} />
        <Field label="Bolde" value={yarn.ball_weight_g ? `${yarn.ball_weight_g} g` : null} />
        <Field
          label="Pinde"
          value={
            yarn.needle_min_mm && yarn.needle_max_mm
              ? `${yarn.needle_min_mm}–${yarn.needle_max_mm} mm`
              : yarn.needle_min_mm
              ? `${yarn.needle_min_mm} mm`
              : null
          }
        />
        <Field
          label="Strikkefasthed"
          value={
            yarn.gauge_stitches_10cm
              ? `${yarn.gauge_stitches_10cm} m × ${yarn.gauge_rows_10cm ?? '?'} p / 10 cm${
                  yarn.gauge_needle_mm ? ` (pind ${yarn.gauge_needle_mm} mm)` : ''
                }`
              : null
          }
        />
        <Field label="Spinding" value={yarn.spin_type} />
        <Field label="Twist" value={yarn.twist_structure} />
        <Field label="Finish" value={yarn.finish} />
        <Field label="Pleje" value={yarn.wash_care?.replace(/_/g, ' ')} />
        <Field label="Spundet i" value={yarn.origin_country} />
        <Field label="Fiber-oprindelse" value={yarn.fiber_origin_country} />
        <Field label="Status" value={yarn.status} />
      </section>

      {yarn.use_cases && yarn.use_cases.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif text-xl text-forest mb-2">Brug</h2>
          <div className="flex flex-wrap gap-2">
            {yarn.use_cases.map((u) => (
              <span key={u} className="bg-stone text-bark text-xs px-2 py-1 rounded">{u}</span>
            ))}
          </div>
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

      {yarn.description && (
        <section className="mt-6">
          <h2 className="font-serif text-xl text-forest mb-2">Beskrivelse</h2>
          <p className="text-bark leading-relaxed">{yarn.description}</p>
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
    </article>
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
