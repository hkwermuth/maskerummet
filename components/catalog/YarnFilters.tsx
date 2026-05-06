'use client'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Yarn } from '@/lib/types'
import { YarnCard } from './YarnCard'
import {
  THICKNESS_ORDER,
  labelThickness,
  normalizeCertification,
} from '@/lib/labels'
import { matchesQuery, normalizeForSearch } from '@/lib/searchMatch'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'

type Props = {
  yarns: Yarn[]
  editorHref?: string
}

const KENDTE_CERTIFICERINGER = [
  'Oeko-Tex Standard 100',
  'GOTS',
  'OCS',
  'RWS',
  'RMS',
  'RAS',
] as const

export function YarnFilters({ yarns, editorHref }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Initialiser fra URL — så søgning bevares ved tilbage-navigation fra et garn.
  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [thickness, setThickness] = useState<string>(() => searchParams.get('tykkelse') ?? '')
  const [certification, setCertification] = useState<string>(() => searchParams.get('certificering') ?? '')

  // Skriv tilbage til URL (uden nye history-entries — bevarer kun ét katalog-entry).
  useEffect(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (thickness) params.set('tykkelse', thickness)
    if (certification) params.set('certificering', certification)
    const qs = params.toString()
    router.replace(qs ? `/garn?${qs}` : '/garn', { scroll: false })
  }, [q, thickness, certification, router])

  // Synkronisér URL → state ved tilbage-navigation. Hvis Next.js' router-cache genbruger
  // komponent-instansen efter tilbage-navigation fra /garn/[slug], rammer useState's init
  // ikke igen. Dette effekt sikrer at filtre matcher URL'en uanset.
  useEffect(() => {
    const newQ = searchParams.get('q') ?? ''
    const newT = searchParams.get('tykkelse') ?? ''
    const newC = searchParams.get('certificering') ?? ''
    setQ((prev) => (prev === newQ ? prev : newQ))
    setThickness((prev) => (prev === newT ? prev : newT))
    setCertification((prev) => (prev === newC ? prev : newC))
  }, [searchParams])

  // Tykkelser vises i kanonisk tynd→tyk rækkefølge. Alle standardværdier er altid valgbare,
  // så kataloget signalerer at der er flere tykkelses-typer end blot dem der lige nu er importeret.
  const thicknesses = useMemo(() => {
    const present = new Set(yarns.map((y) => y.thickness_category).filter(Boolean) as string[])
    const inOrder = THICKNESS_ORDER.filter((t) => present.has(t) || ['light_fingering', 'super_bulky', 'jumbo'].includes(t))
    const extra = Array.from(present).filter((t) => !THICKNESS_ORDER.includes(t))
    return [...inOrder, ...extra]
  }, [yarns])

  // Certificeringer normaliseres så inkonsistente skrivemåder (Oeko-Tex 100 vs Standard 100…) samles.
  const certifications = useMemo(() => {
    const present = new Set<string>()
    for (const y of yarns) {
      for (const c of y.certifications ?? []) present.add(normalizeCertification(c))
    }
    const known = KENDTE_CERTIFICERINGER.filter((c) => present.has(c))
    const extra = Array.from(present).filter((c) => !KENDTE_CERTIFICERINGER.includes(c as typeof KENDTE_CERTIFICERINGER[number]))
    return [...known, ...extra]
  }, [yarns])

  // Pre-normalisér søge-haystack pr. garn — laves kun når yarns ændrer sig.
  // Søg kun i fakta-felter, ikke fritekst-beskrivelser eller use_cases.
  const haystacks = useMemo(() => {
    const map = new Map<string, string>()
    for (const y of yarns) {
      const hay = [
        y.producer, y.name, y.series, y.fiber_main, y.thickness_category,
        ...(y.fibers?.map((f) => f.fiber) ?? []),
        ...(y.certifications ?? []).map(normalizeCertification),
      ]
        .filter(Boolean)
        .join(' ')
      map.set(y.id, normalizeForSearch(hay))
    }
    return map
  }, [yarns])

  const filtered = useMemo(() => {
    const nq = normalizeForSearch(q)
    const matches = yarns.filter((y) => {
      if (thickness && y.thickness_category !== thickness) return false
      if (certification) {
        const yarnCerts = (y.certifications ?? []).map(normalizeCertification)
        if (!yarnCerts.includes(certification)) return false
      }
      if (!nq) return true
      const hay = haystacks.get(y.id) ?? ''
      return matchesQuery(nq, hay)
    })
    const withPhoto = matches.filter((y) => y.hero_image_url)
    const withoutPhoto = matches.filter((y) => !y.hero_image_url)
    return [...withPhoto, ...withoutPhoto]
  }, [yarns, q, thickness, certification, haystacks])

  const filterAktivt = q.trim().length > 0 || !!thickness || !!certification

  function nulstil() {
    setQ('')
    setThickness('')
    setCertification('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3 items-end">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Søg producent, navn, fiber…"
          className="flex-1 min-w-[220px] px-4 py-2 rounded-lg border border-striq-border bg-cream focus:outline-none focus:ring-2 focus:ring-striq-sage/30"
        />

        <div className="flex flex-col gap-1">
          <InfoPopover
            triggerLabel="ⓘ Hvad betyder certificering?"
            title="Certificeringer"
          >
            <p>
              <strong>Certificeringer</strong> garanterer at garnet er produceret efter visse
              standarder — fx miljø, dyrevelfærd eller fri for skadelige stoffer.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Oeko-Tex Standard 100</strong> — testet fri for sundhedsskadelige stoffer</li>
              <li><strong>GOTS</strong> (Global Organic Textile Standard) — økologisk fra fiber til færdigt produkt</li>
              <li><strong>OCS</strong> (Organic Content Standard) — verificerer økologisk fiber-indhold</li>
              <li><strong>RWS</strong> (Responsible Wool Standard) — dyrevelfærd og bæredygtig drift af fåreavl</li>
              <li><strong>RMS</strong> (Responsible Mohair Standard) — samme princip for mohairgeder</li>
              <li><strong>RAS</strong> (Responsible Alpaca Standard) — samme princip for alpakaer</li>
            </ul>
            <p className="text-xs text-striq-muted/80">
              Manglende certificering betyder ikke nødvendigvis at garnet er problematisk —
              mange små producenter er ikke certificerede pga. omkostninger.
            </p>
          </InfoPopover>
          <select
            value={certification}
            onChange={(e) => setCertification(e.target.value)}
            aria-label="Filtrér på certificering"
            className="px-3 py-2 rounded-lg border border-striq-border bg-cream"
          >
            <option value="">Alle certificeringer</option>
            {certifications.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <InfoPopover
            triggerLabel="ⓘ Hvad betyder tykkelse?"
            title="Garnets tykkelse"
          >
            <p>
              <strong>Tykkelse</strong> beskriver hvor meget garn der er per maske, og bestemmer
              hvor mange masker du strikker per cm samt hvilke pinde der passer.
            </p>
            <p>
              Tyndt garn (lace, fingering) bruges typisk til sjaler, sokker og lette bluser.
              Medium garn (DK, worsted) er det mest alsidige — godt til sweatre og cardigans.
              Kraftige og tykke garner (aran, bulky, jumbo) giver hurtige projekter og varme strik
              som tæpper og vintertrøjer.
            </p>
            <p className="text-xs text-striq-muted/80">
              Tykkelsen er kun vejledende — to garner i samme kategori kan stadig give forskellig
              strikkefasthed.
            </p>
          </InfoPopover>
          <select
            value={thickness}
            onChange={(e) => setThickness(e.target.value)}
            aria-label="Filtrér på tykkelse"
            className="px-3 py-2 rounded-lg border border-striq-border bg-cream"
          >
            <option value="">Alle tykkelser</option>
            {thicknesses.map((t) => (
              <option key={t} value={t}>{labelThickness(t)}</option>
            ))}
          </select>
        </div>

        {filterAktivt && (
          <button
            type="button"
            onClick={nulstil}
            className="inline-flex items-center bg-cream border border-striq-border text-striq-sage px-4 py-2 rounded-lg text-sm hover:bg-striq-border/40 whitespace-nowrap"
          >
            Nulstil søgning
          </button>
        )}

        {editorHref ? (
          <Link
            href={editorHref}
            className="inline-flex items-center bg-striq-sage text-cream px-4 py-2 rounded-lg text-sm hover:opacity-95 whitespace-nowrap"
          >
            Editor
          </Link>
        ) : null}
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

function InfoPopover({
  triggerLabel,
  title,
  children,
}: {
  triggerLabel: string
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEscapeKey(open, () => setOpen(false))

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs text-striq-link underline hover:text-striq-sage text-left"
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="absolute z-20 bottom-full mb-2 left-0 w-[min(360px,calc(100vw-2rem))] bg-cream border border-striq-border rounded-xl shadow-lg p-4 text-sm text-striq-muted space-y-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div id={titleId} className="font-serif text-base text-striq-sage">{title}</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Luk"
              className="text-striq-muted/70 hover:text-striq-muted -mt-1 -mr-1 px-2 leading-none text-xl"
            >×</button>
          </div>
          <div className="space-y-2 leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  )
}
