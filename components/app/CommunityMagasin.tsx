import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { fetchSharedProjects } from '@/lib/community'

// Vælg primær-billede via community_primary_image_index, fall back til index 0.
function pickCover(urls: string[], primaryIdx: number | null): string | null {
  if (!urls || urls.length === 0) return null
  const idx = primaryIdx ?? 0
  return urls[idx] ?? urls[0] ?? null
}

// Brugervenligt visnings-navn til ukendt-strikker.
function displayName(name: string | null): string {
  return name?.trim() || 'Anonym strikker'
}

/**
 * Magasin-layout: 1 stort billede til venstre + op til 3 små stablet til højre.
 * Klik fører til /faellesskabet (intet detaljeret modal-flow på forsiden).
 *
 * Server-component — fetcher 4 nyeste public_shared_projects.
 * Bruger view'et som har column-level GRANTs så vi ikke kan ramme private felter.
 */
export async function CommunityMagasin() {
  const supabase = await createSupabaseServerClient()
  const projects = await fetchSharedProjects(supabase)
  const top4 = projects.slice(0, 4)

  // Hvis ingen projekter er delt endnu, skjul sektionen helt — undgår
  // tom-sektion-pinlighed på en frisk testbruger-DB.
  if (top4.length === 0) return null

  const [hero, ...rest] = top4
  const small = rest.slice(0, 3)
  const heroCover = pickCover(hero.project_image_urls, hero.community_primary_image_index)

  return (
    <section style={{ maxWidth: 1320, margin: '0 auto', padding: '0 24px 0', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(24px, 3.2vw, 32px)',
            fontWeight: 600,
            color: '#302218',
            margin: '0 0 6px',
          }}>
            Fra fællesskabet
          </h2>
          <p style={{ fontSize: 14.5, color: '#8C7E74', margin: 0 }}>
            Det nyeste fra andre strikkere.
          </p>
        </div>
        <Link href="/faellesskabet" style={{
          fontSize: 13.5, color: '#9B6272', fontWeight: 500, textDecoration: 'underline',
        }}>
          Se alle delte projekter →
        </Link>
      </div>

      {/* Dynamisk antal grid-rows baseret på antal små kort, så der ikke
          opstår en tom række hvis DB'en har færre end 4 delte projekter. */}
      <div className="magasin-grid" style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: '1fr',
      }}>
        <style>{`
          @media (min-width: 760px) {
            .magasin-grid {
              grid-template-columns: 1.6fr 1fr !important;
              grid-template-rows: repeat(${Math.max(small.length, 1)}, 1fr) !important;
            }
            .magasin-grid > :first-child {
              grid-row: 1 / span ${Math.max(small.length, 1)};
            }
          }
        `}</style>

        {/* Stort kort */}
        <ProjektKort project={hero} cover={heroCover} variant="lg" />

        {/* Små kort */}
        {small.map(p => (
          <ProjektKort
            key={p.id}
            project={p}
            cover={pickCover(p.project_image_urls, p.community_primary_image_index)}
            variant="sm"
          />
        ))}
      </div>
    </section>
  )
}

// ── Projekt-kort med billede + info-overlay ─────────────────────────────────

type Project = Awaited<ReturnType<typeof fetchSharedProjects>>[number]

function ProjektKort({ project, cover, variant }: { project: Project; cover: string | null; variant: 'sm' | 'lg' }) {
  const isLg = variant === 'lg'
  const minHeight = isLg ? 360 : 140

  return (
    <Link
      href="/faellesskabet"
      style={{
        position: 'relative',
        display: 'block',
        borderRadius: 14,
        overflow: 'hidden',
        background: cover ? '#302218' : 'linear-gradient(135deg, #D4ADB6 0%, #D9BFC3 100%)',
        minHeight,
        textDecoration: 'none',
        color: '#FFFCF7',
        boxShadow: '0 1px 4px rgba(48,34,24,.08)',
      }}
      aria-label={`Se ${project.title ?? 'projekt'} af ${displayName(project.display_name)}`}
    >
      {/* Billede */}
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt={project.title ?? 'Strikkeprojekt'}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
        />
      )}

      {/* Gradient-overlay til læsbarhed */}
      <div style={{
        position: 'absolute', inset: 0,
        background: cover
          ? 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.20) 50%, transparent 75%)'
          : 'linear-gradient(to top, rgba(48,34,24,0.45) 0%, transparent 60%)',
      }} />

      {/* Info nederst */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: isLg ? '24px 26px' : '14px 16px',
      }}>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: isLg ? 'clamp(22px, 2.6vw, 28px)' : 16,
          fontWeight: 600,
          color: '#FFFCF7',
          margin: '0 0 4px',
          textShadow: '0 1px 6px rgba(0,0,0,0.40)',
          letterSpacing: '.01em',
        }}>
          {project.title ?? 'Uden titel'}
        </h3>
        <p style={{
          fontSize: isLg ? 13 : 11.5,
          color: 'rgba(255,252,247,0.85)',
          margin: 0,
          textShadow: '0 1px 4px rgba(0,0,0,0.30)',
        }}>
          {displayName(project.display_name)}
        </p>
      </div>
    </Link>
  )
}
