'use client'

import { useMemo, useRef, useState } from 'react'
import {
  PROJECT_TYPE_LABELS,
  type ProjectType,
  type SharedProjectPublic,
} from '@/lib/types'
import { HeroIllustration } from '@/components/layout/HeroIllustration'
import { yarnDisplayLabel } from '@/lib/yarn-display'
import { SharedProjectDetailModal } from '@/components/app/SharedProjectDetailModal'

const AUTHOR_FALLBACK = 'Anonym strikker'

export function FaellesskabClient({
  initialProjects,
}: {
  initialProjects: SharedProjectPublic[]
}) {
  const [q, setQ] = useState('')
  const [type, setType] = useState<'' | ProjectType>('')
  const [yarnFilter, setYarnFilter] = useState('')
  const [patternFilter, setPatternFilter] = useState('')
  const [active, setActive] = useState<SharedProjectPublic | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  function openDetail(project: SharedProjectPublic, trigger: HTMLElement) {
    triggerRef.current = trigger
    setActive(project)
  }
  function closeDetail() {
    setActive(null)
    // Returnér focus til kortet der åbnede modal'en
    setTimeout(() => triggerRef.current?.focus(), 0)
  }

  const yarnOptions = useMemo(() => {
    const s = new Set<string>()
    for (const p of initialProjects) {
      for (const y of p.yarns) {
        const label = yarnDisplayLabel(y.yarn_brand, y.yarn_name)
        if (label) s.add(label)
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'da'))
  }, [initialProjects])

  const patternOptions = useMemo(() => {
    const s = new Set<string>()
    for (const p of initialProjects) if (p.pattern_name) s.add(p.pattern_name.trim())
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'da'))
  }, [initialProjects])

  const filtered = useMemo(() => {
    const qL = q.trim().toLowerCase()
    return initialProjects.filter(p => {
      if (type && p.project_type !== type) return false
      if (yarnFilter) {
        const has = p.yarns.some(y => yarnDisplayLabel(y.yarn_brand, y.yarn_name) === yarnFilter)
        if (!has) return false
      }
      if (patternFilter && p.pattern_name !== patternFilter) return false
      if (!qL) return true
      const hay: string[] = []
      if (p.title) hay.push(p.title)
      if (p.pattern_name) hay.push(p.pattern_name)
      if (p.pattern_designer) hay.push(p.pattern_designer)
      if (p.display_name) hay.push(p.display_name)
      if (p.community_description) hay.push(p.community_description)
      for (const y of p.yarns) {
        if (y.yarn_brand) hay.push(y.yarn_brand)
        if (y.yarn_name) hay.push(y.yarn_name)
        if (y.color_name) hay.push(y.color_name)
      }
      return hay.some(s => s.toLowerCase().includes(qL))
    })
  }, [initialProjects, q, type, yarnFilter, patternFilter])

  const countLabel = filtered.length === 1
    ? '1 projekt delt af Fællesskabet'
    : `${filtered.length} projekter delt af Fællesskabet`

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F8F3EE', minHeight: 'calc(100vh - 58px - 57px)' }}>
      <section style={{
        background: 'linear-gradient(135deg, #FFFCF7 0%, #F4EFE6 55%, #EAD9DE 100%)',
        padding: '36px 0 32px',
      }}>
        <div style={{
          maxWidth: 1080, margin: '0 auto', padding: '0 24px',
          display: 'flex', gap: 28,
          alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 420px', minWidth: 260 }}>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(28px, 4.2vw, 38px)',
              fontWeight: 600, color: '#302218', margin: 0, letterSpacing: '.01em',
            }}>
              Hent inspiration fra Fællesskabet
            </h1>
            <p style={{ fontSize: 14.5, color: '#6B5D4F', margin: '6px 0 0', maxWidth: 640, lineHeight: 1.55 }}>
              Se andre strikkeres færdige projekter — søg på type, opskrift eller garn, og find dit næste projekt.
            </p>
          </div>
          <div className="faellesskab-hero-art" style={{
            flexShrink: 0, width: 220, maxWidth: '100%',
          }}>
            <HeroIllustration variant="skab-bloed" />
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 24px 4px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 2fr) repeat(3, minmax(130px, 1fr))',
          gap: 10,
        }} className="faellesskab-filter-bar">
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Søg efter projekt, garn, opskrift eller bruger…"
            aria-label="Søg i Fællesskabet"
            style={{
              padding: '11px 16px', border: '1px solid #D0C8BA', borderRadius: 999,
              background: '#FFFCF7', fontSize: 14, color: '#302218', outline: 'none',
              fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <FilterSelect
            label="Filtrer efter type"
            value={type}
            onChange={v => setType(v as '' | ProjectType)}
            placeholder="Alle typer"
            options={Object.entries(PROJECT_TYPE_LABELS).map(([k, label]) => ({ value: k, label }))}
          />
          <FilterSelect
            label="Filtrer efter garn"
            value={yarnFilter}
            onChange={setYarnFilter}
            placeholder="Alle garn"
            options={yarnOptions.map(v => ({ value: v, label: v }))}
          />
          <FilterSelect
            label="Filtrer efter opskrift"
            value={patternFilter}
            onChange={setPatternFilter}
            placeholder="Alle opskrifter"
            options={patternOptions.map(v => ({ value: v, label: v }))}
          />
        </div>
        <div style={{ fontSize: 12.5, color: '#8C7E74', marginTop: 10 }}>{countLabel}</div>
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '10px 24px 60px' }}>
        {filtered.length === 0 ? (
          <EmptyState nothingShared={initialProjects.length === 0} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 18,
          }}>
            {filtered.map(p => (
              <SharedProjectCard key={p.id} project={p} onOpen={openDetail} />
            ))}
          </div>
        )}
      </div>

      {active && (
        <SharedProjectDetailModal project={active} onClose={closeDetail} />
      )}

      <style>{`
        @media (max-width: 640px) {
          .faellesskab-filter-bar {
            grid-template-columns: 1fr 1fr !important;
          }
          .faellesskab-filter-bar > :first-child {
            grid-column: 1 / -1;
          }
          .faellesskab-hero-art {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

function FilterSelect({
  label, value, onChange, placeholder, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label={label}
      style={{
        padding: '11px 14px', border: '1px solid #D0C8BA', borderRadius: 999,
        background: '#FFFCF7', fontSize: 14, color: '#302218', outline: 'none',
        fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
        appearance: 'none', minHeight: 44,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

function SharedProjectCard({
  project,
  onOpen,
}: {
  project: SharedProjectPublic
  onOpen: (project: SharedProjectPublic, trigger: HTMLElement) => void
}) {
  const typeLabel = project.project_type ? PROJECT_TYPE_LABELS[project.project_type] : null
  const author = project.display_name?.trim() || AUTHOR_FALLBACK
  const visibleYarns = project.yarns.slice(0, 3)
  const restCount = project.yarns.length - visibleYarns.length
  const hasPattern = !!(project.pattern_name || project.pattern_designer)

  const images = project.project_image_urls ?? []
  const rawIdx = project.community_primary_image_index
  const primaryIdx = (typeof rawIdx === 'number' && rawIdx >= 0 && rawIdx < images.length) ? rawIdx : 0
  const heroUrl = images[primaryIdx] ?? images[0] ?? null

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen(project, e.currentTarget)
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`${project.title || 'Unavngivet projekt'} af ${author}. Tryk Enter for at se detaljer.`}
      onClick={e => onOpen(project, e.currentTarget)}
      onKeyDown={handleKeyDown}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5DDD9',
        borderRadius: 12,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 4px rgba(48,34,24,.06)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(44,32,24,.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px rgba(48,34,24,.06)' }}
    >
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: '#EDE7D8', overflow: 'hidden' }}>
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt={project.title ?? 'Delt projekt'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0A090', fontSize: 30 }}>
            🧶
          </div>
        )}
        {typeLabel && (
          <span style={{
            position: 'absolute', top: 10, left: 10,
            padding: '4px 10px', borderRadius: 999,
            fontSize: 11, background: 'rgba(255,252,247,0.94)',
            color: '#302218', fontWeight: 500,
            boxShadow: '0 1px 3px rgba(44,32,24,.12)',
          }}>
            {typeLabel}
          </span>
        )}
        {images.length > 1 && (
          <span aria-hidden="true" style={{
            position: 'absolute', bottom: 8, right: 8,
            padding: '3px 9px', borderRadius: 999,
            fontSize: 11, background: 'rgba(44,32,24,.78)',
            color: '#FFFCF7', fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 1px 3px rgba(44,32,24,.18)',
          }}>
            +{images.length - 1}
          </span>
        )}
      </div>
      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 18, fontWeight: 600, color: '#302218', lineHeight: 1.2,
        }}>
          {project.title || 'Unavngivet projekt'}
        </div>
        <div style={{ fontSize: 12.5, color: '#8C7E74' }}>af {author}</div>

        {hasPattern && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#F4EFE6', borderRadius: 8 }}>
            <div aria-hidden="true" style={{
              width: 30, height: 30, borderRadius: 6,
              background: '#EDE7D8', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6A5638" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: '#8B7D6B' }}>Opskrift</div>
              <div style={{ fontSize: 12.5, color: '#302218', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {[project.pattern_name, project.pattern_designer].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
        )}

        {project.community_description && (
          <p style={{ fontSize: 12.5, color: '#6B5D4F', lineHeight: 1.55, margin: 0 }}>
            {project.community_description}
          </p>
        )}

        {project.community_size_shown && (
          <div>
            <span style={{
              display: 'inline-block',
              fontSize: 11, padding: '3px 10px', borderRadius: 999,
              background: '#EDE7D8', color: '#5A4228',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              str. {project.community_size_shown}
            </span>
          </div>
        )}

        {(visibleYarns.length > 0 || restCount > 0) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 'auto', paddingTop: 4 }}>
            {visibleYarns.map(y => {
              const label = yarnDisplayLabel(y.yarn_brand, y.yarn_name) || y.color_name || 'Garn'
              return (
                <span key={y.id} style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 999,
                  background: '#FFFCF7', border: '1px solid #E5DDD9', color: '#5A4E42',
                }}>
                  {label}
                </span>
              )
            })}
            {restCount > 0 && (
              <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#F4EFE6', color: '#8B7D6B' }}>
                +{restCount} mere
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function EmptyState({ nothingShared }: { nothingShared: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B7D6B' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }} aria-hidden="true">🧶</div>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: '#302218' }}>
        {nothingShared ? 'Ingen projekter delt endnu' : 'Ingen resultater'}
      </div>
      <div style={{ fontSize: 13.5, marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
        {nothingShared
          ? 'Vær den første til at dele et færdigt projekt — gå til "Mine projekter" og klik "Del med Fællesskabet" på et projekt.'
          : 'Prøv at ændre dine filtre eller ryd søgefeltet.'}
      </div>
    </div>
  )
}

