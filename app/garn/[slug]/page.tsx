import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createSupabasePublicClient } from '@/lib/supabase/public'
import { toSlug } from '@/lib/slug'
import { FiberBar } from '@/components/catalog/FiberBar'
import { SubstitutionsSection } from '@/components/catalog/substitutions/SubstitutionsSection'
import { CombinationsSection } from '@/components/catalog/combinations/CombinationsSection'
import type { Yarn, Color } from '@/lib/types'
import { getSubstitutions } from '@/lib/substitutions'
import { getCombinationsForYarn } from '@/lib/combinations'
import {
  labelThickness, labelSpin, labelFinish, labelWash, labelStatus,
  da, joinDa,
} from '@/lib/labels'
import { YarnHeroImage } from '@/components/catalog/YarnHeroImage'
import { KeyFact } from '@/components/catalog/KeyFact'

export const revalidate = 3600
export const dynamicParams = true

// ── Farve-sortering ────────────────────────────────────────────────────────────

function clamp01(n: number) { return Math.min(1, Math.max(0, n)) }

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = (hex || '').trim().replace(/^#/, '')
  if (!/^[0-9A-Fa-f]{6}$/.test(s)) return null
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) }
}

function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }) {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const d = max - min, l = (max + min) / 2
  let h = 0, s = 0
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case rn: h = ((gn - bn) / d) % 6; break
      case gn: h = (bn - rn) / d + 2; break
      default: h = (rn - gn) / d + 4
    }
    h = h * 60; if (h < 0) h += 360
  }
  return { h, s: clamp01(s), l: clamp01(l) }
}

function numericOrInfinity(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : Infinity }

function sortColorsByVisualHue(colors: Color[]) {
  return [...colors].sort((a, b) => {
    const ah = a.hex_code ? rgbToHsl(hexToRgb(a.hex_code) ?? { r: NaN, g: NaN, b: NaN }) : null
    const bh = b.hex_code ? rgbToHsl(hexToRgb(b.hex_code) ?? { r: NaN, g: NaN, b: NaN }) : null
    const aHas = !!(a.hex_code && hexToRgb(a.hex_code)), bHas = !!(b.hex_code && hexToRgb(b.hex_code))
    if (aHas !== bHas) return aHas ? -1 : 1
    if (aHas && bHas && ah && bh) {
      const aGray = ah.s < 0.08, bGray = bh.s < 0.08
      if (aGray !== bGray) return aGray ? 1 : -1
      if (!aGray && !bGray) {
        if (ah.h !== bh.h) return ah.h - bh.h
        if (ah.s !== bh.s) return bh.s - ah.s
        if (ah.l !== bh.l) return ah.l - bh.l
      } else { if (ah.l !== bh.l) return bh.l - ah.l }
    }
    const an = numericOrInfinity(a.color_number), bn2 = numericOrInfinity(b.color_number)
    if (an !== bn2) return an - bn2
    return String(a.color_name ?? '').localeCompare(String(b.color_name ?? ''), 'da')
  })
}

// ── Data-hentning ──────────────────────────────────────────────────────────────

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
  return { yarn, colors: sortColorsByVisualHue((colors ?? []) as Color[]) }
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
      title: `${yarn.producer} ${yarn.name} — Striq`,
      description,
      type: 'website',
      images: yarn.hero_image_url
        ? [{ url: yarn.hero_image_url, width: 1200, height: 1600, alt: `${yarn.producer} ${yarn.name}` }]
        : undefined,
    },
    alternates: { canonical: `/garn/${slug}` },
  }
}

// ── Side ───────────────────────────────────────────────────────────────────────

export default async function YarnDetailPage(
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const result = await fetchYarnBySlug(slug)
  if (!result) notFound()
  const { yarn, colors } = result
  const [substitutions, combinations] = await Promise.all([
    getSubstitutions(yarn.id, 8),
    getCombinationsForYarn(yarn.id),
  ])

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maskerummet.vercel.app'
  const absoluteHeroImage = yarn.hero_image_url ? `${siteUrl}${yarn.hero_image_url}` : undefined

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${yarn.producer} ${yarn.name}`,
    brand: { '@type': 'Brand', name: yarn.producer },
    description: yarn.description ?? undefined,
    category: yarn.thickness_category ?? undefined,
    image: absoluteHeroImage ? [absoluteHeroImage] : undefined,
  }

  const pindestrValue =
    yarn.needle_min_mm && yarn.needle_max_mm
      ? `${da(yarn.needle_min_mm)}–${da(yarn.needle_max_mm)} mm`
      : yarn.needle_min_mm ? `${da(yarn.needle_min_mm)} mm` : null

  const strikkefasthedValue = yarn.gauge_stitches_10cm
    ? `${da(yarn.gauge_stitches_10cm)} m / ${da(yarn.gauge_rows_10cm) ?? '?'} p på 10 cm${yarn.gauge_needle_mm ? ` (pind ${da(yarn.gauge_needle_mm)} mm)` : ''}`
    : null

  return (
    <article className="max-w-5xl bg-cream border border-striq-border rounded-2xl shadow-sm p-6 sm:p-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href="/garn" className="text-sm text-striq-link">← Tilbage til katalog</Link>

      {/* Hero: billede-venstre, titel + nøgle-specs til højre */}
      <div className="mt-4 grid md:grid-cols-2 gap-6 md:gap-8">
        <YarnHeroImage yarn={yarn} />

        <div className="flex flex-col">
          <div className="text-xs uppercase tracking-wider text-striq-link">{yarn.producer}</div>
          <h1 className="font-serif text-3xl sm:text-4xl text-striq-sage mt-1">{yarn.name}</h1>
          {yarn.series && <div className="text-striq-muted italic mt-1">{yarn.series}</div>}

          <dl className="mt-5 space-y-2.5 text-sm">
            <KeyFact label="Indhold" value={yarn.fiber_main} />
            <KeyFact label="Vægt / længde" value={
              yarn.ball_weight_g && yarn.length_per_100g_m
                ? `${da(yarn.ball_weight_g)} g = ca. ${da(Math.round((yarn.ball_weight_g * yarn.length_per_100g_m) / 100))} meter`
                : null
            } />
            <KeyFact label="Anbefalede pinde" value={pindestrValue} />
            <KeyFact label="Strikkefasthed" value={strikkefasthedValue} />
            <KeyFact label="Vaskeanvisning" value={labelWash(yarn.wash_care)} />
            <KeyFact label="Tykkelse" value={labelThickness(yarn.thickness_category)} />
          </dl>
        </div>
      </div>

      {/* Fiberbar — full width under hero */}
      <section className="mt-8">
        <h2 className="font-serif text-xl text-striq-sage mb-2">Materiale</h2>
        <FiberBar fibers={yarn.fibers} />
      </section>

      {yarn.description && (
        <section className="mt-6">
          {yarn.description.split(/\n\n+/).map((para, i) => (
            <p key={i} className="text-striq-muted leading-relaxed mb-3 last:mb-0">{para}</p>
          ))}
        </section>
      )}

      {/* Øvrige specs */}
      <section className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <Field label="Spinding" value={labelSpin(yarn.spin_type)} />
        <Field label="Tråd" value={yarn.twist_structure} />
        <Field label="Finish" value={labelFinish(yarn.finish)} />
        <Field label="Spundet i" value={yarn.origin_country} />
        <Field label="Fiberoprindelse" value={yarn.fiber_origin_country} />
        <Field label="Status" value={labelStatus(yarn.status)} />
      </section>

      {yarn.use_cases && yarn.use_cases.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif text-xl text-striq-sage mb-2">Velegnet til</h2>
          <p className="text-striq-muted">{joinDa(yarn.use_cases)}</p>
        </section>
      )}

      {yarn.certifications && yarn.certifications.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif text-xl text-striq-sage mb-2">Certificeringer</h2>
          <div className="flex flex-wrap gap-2">
            {yarn.certifications.map((c) => (
              <span key={c} className="bg-moss/30 text-striq-sage text-xs px-2 py-1 rounded">{c}</span>
            ))}
          </div>
        </section>
      )}

      {colors.length > 0 && (
        <section className="mt-6">
          <h2 className="font-serif text-xl text-striq-sage mb-2">Farver ({colors.length})</h2>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                {c.image_url ? (
                  <img src={c.image_url} alt="" className="w-8 h-8 rounded object-cover border border-striq-border shrink-0" />
                ) : c.hex_code ? (
                  <span className="w-5 h-5 rounded-full border border-striq-border shrink-0" style={{ background: c.hex_code }} />
                ) : null}
                <span>{c.color_name ?? c.color_number}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <CombinationsSection
        targetProducer={yarn.producer}
        targetName={yarn.name}
        targetSeries={yarn.series}
        combinations={combinations}
      />

      {substitutions.length > 0 && (
        <SubstitutionsSection yarnId={yarn.id} substitutions={substitutions} />
      )}
    </article>
  )
}


function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-striq-link">{label}</div>
      <div className="text-striq-sage">{value}</div>
    </div>
  )
}
