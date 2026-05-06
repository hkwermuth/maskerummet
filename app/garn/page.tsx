import { Suspense } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Yarn } from '@/lib/types'
import { YarnFilters } from '@/components/catalog/YarnFilters'
import { isEditorEmail } from '@/lib/editors'
import { HeroIllustration, type Variant } from '@/components/layout/HeroIllustration'

export const revalidate = 3600

export const metadata = {
  title: 'Garn-katalog',
  description: 'Dansk garn-katalog med fibre, løbelængde, pinde, strikkefasthed, pleje og oprindelse.',
}

const HERO_VARIANT: Variant = 'garn-typer-trio'

function GarnHero() {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, rgba(97,132,109,.2) 0%, #D9BFC3 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        padding: '36px 24px 32px',
        marginTop: -40,
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        marginBottom: 32,
      }}
    >
      <div
        style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', gap: 28,
          alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1 1 420px', minWidth: 260 }}>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(28px, 4.2vw, 38px)',
              fontWeight: 600, color: '#302218', margin: 0, letterSpacing: '.01em',
            }}
          >
            Find garn i STRIQs garnkatalog
          </h1>
          <p
            style={{
              fontSize: 14.5, color: '#6B5D4F',
              margin: '6px 0 0', maxWidth: 640, lineHeight: 1.55,
            }}
          >
            Søg efter dit yndlingsgarn og se hvilke farver det findes i, eller bliv inspireret til andre garner der kan erstatte det.
          </p>
        </div>
        <div className="garn-hero-art" style={{ flexShrink: 0, width: 220, maxWidth: '100%' }}>
          <HeroIllustration variant={HERO_VARIANT} />
        </div>
      </div>
      <style>{`
        @media (max-width: 640px) {
          .garn-hero-art { display: none !important; }
        }
      `}</style>
    </section>
  )
}

export default async function GarnPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const showEditor = isEditorEmail(user?.email)

  const { data, error } = await supabase
    .from('yarns_full')
    .select('*')
    .order('producer')
    .order('name')

  if (error) {
    return (
      <div className="text-striq-muted">
        <h1 className="font-serif text-3xl text-striq-sage mb-2">Garn-katalog</h1>
        <p>Kunne ikke hente garner: {error.message}</p>
      </div>
    )
  }

  const yarns = (data ?? []) as Yarn[]

  return (
    <div
      style={{
        marginLeft: 'calc(50% - 50vw)',
        marginRight: 'calc(50% - 50vw)',
        paddingLeft: 20,
        paddingRight: 20,
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <GarnHero />
        <Suspense fallback={<div className="text-xs text-striq-muted">Indlæser…</div>}>
          <YarnFilters yarns={yarns} editorHref={showEditor ? '/garn/admin' : undefined} />
        </Suspense>
      </div>
    </div>
  )
}
