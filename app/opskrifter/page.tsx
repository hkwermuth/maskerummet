import type { Metadata } from 'next'
import DropsKatalog from './DropsKatalog'
import { HeroIllustration } from '@/components/layout/HeroIllustration'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { fetchSavedRecipes } from '@/lib/data/saved-recipes'
import { loadRecipes } from '@/lib/data/recipes'
import { OPSKRIFTER_TOKENS as T } from '@/lib/opskrifter-tokens'
import type { StockYarn } from '@/lib/types-recipes'

export const metadata: Metadata = {
  title: 'Opskrifter — Striq',
  description: 'Strikkeopskrifter fra DROPS Design og flere — søg, filtrér efter garn, fiber og pind.',
}

const PRINCIPPER = [
  {
    emoji: '🔗',
    titel: 'Eksterne opskrifter henvises, ikke kopieres',
    tekst: 'Vi viser titel, billede, garn og pindstørrelse — klik sender dig videre til designerens egen side. Vi republicerer aldrig instruktionsteksten.',
  },
  {
    emoji: '🧵',
    titel: 'Garn kobles til dit lager',
    tekst: 'Når du ser en opskrift viser STRIQ automatisk, om du har det rigtige garn hjemme — og kan foreslå alternativer fra vores katalog.',
  },
  {
    emoji: '🎨',
    titel: 'Egne opskrifter hostes fuldt',
    tekst: 'Har du selv designet — enten som hobby eller professionelt — kan du lægge din opskrift direkte på STRIQ, med eller uden betaling.',
  },
  {
    emoji: '💛',
    titel: 'Kreditering altid synlig',
    tekst: 'Designerens navn, link og eventuelle vilkår står tydeligt på hvert opskriftskort. Altid.',
  },
]

export default async function OpskrifterPage() {
  const recipes = loadRecipes()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let initialSavedKeys: string[] = []
  let stockYarns: StockYarn[] = []

  if (user) {
    try {
      const savedSet = await fetchSavedRecipes(supabase, user.id)
      initialSavedKeys = [...savedSet]
    } catch {
      // Stille fejl — vi viser bare ingen favoritter, brugeren kan stadig browse.
    }
    try {
      const { data } = await supabase
        .from('yarn_items')
        .select('name, brand')
        .eq('user_id', user.id)
      if (data) stockYarns = data as StockYarn[]
    } catch {
      // Stille fejl — bare ingen lager-badges.
    }
  }

  return (
    <div style={{ background: T.bg, minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <section
        style={{
          background: `linear-gradient(135deg, rgba(97,132,109,.2) 0%, ${T.accent} 100%)`,
          padding: '36px 0 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            gap: 28,
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: '1 1 420px', minWidth: 260 }}>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 'clamp(28px, 4.2vw, 38px)',
                fontWeight: 600,
                color: T.text,
                margin: 0,
                letterSpacing: '.01em',
              }}
            >
              Opskrifter
            </h1>
            <p
              style={{
                fontSize: 14.5,
                color: '#6B5D4F',
                margin: '6px 0 0',
                maxWidth: 640,
                lineHeight: 1.55,
              }}
            >
              Find inspiration til dit næste strikkeprojekt. Søg, filtrér efter garn, fiber og pind, og se hvilke opskrifter du kan strikke med dit eget lager. Har du selv opskrifter du gerne vil dele, kan du skrive til{' '}
              <a
                href="mailto:kontakt@striq.dk"
                style={{ color: '#6B5D4F', textDecoration: 'underline' }}
              >
                kontakt@striq.dk
              </a>
              .
            </p>
          </div>
          <div className="opskrifter-hero-art" style={{ flexShrink: 0, width: 220, maxWidth: '100%' }}>
            <HeroIllustration variant="opskrift-kop-strik" />
          </div>
        </div>
        <style>{`
          @media (max-width: 640px) {
            .opskrifter-hero-art { display: none !important; }
          }
        `}</style>
      </section>

      {/* DROPS-katalog: søgning, filtrering, favoritter */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 24px' }}>
        <DropsKatalog
          recipes={recipes}
          initialSavedKeys={initialSavedKeys}
          stockYarns={stockYarns}
          userId={user?.id ?? null}
        />
      </div>

      {/* Principper */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 24px' }}>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(22px, 3vw, 28px)',
            fontWeight: 600,
            color: T.text,
            margin: '0 0 24px',
            textAlign: 'center',
          }}
        >
          Sådan tænker vi opskrifter i STRIQ
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {PRINCIPPER.map((p, i) => (
            <div
              key={i}
              style={{
                background: T.white,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ fontSize: 26 }}>{p.emoji}</div>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: T.text,
                  margin: 0,
                  lineHeight: 1.35,
                }}
              >
                {p.titel}
              </h3>
              <p
                style={{
                  fontSize: 13.5,
                  color: T.textMuted,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {p.tekst}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Til designere og fabrikanter */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '24px 24px 56px' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${T.sage} 0%, ${T.sageDark} 100%)`,
            borderRadius: 16,
            padding: '36px 32px',
            color: T.white,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 10 }}>✨</div>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 'clamp(22px, 3vw, 28px)',
              fontWeight: 600,
              margin: '0 0 12px',
            }}
          >
            Er du designer eller garnfabrikant?
          </h2>
          <p
            style={{
              fontSize: 14.5,
              lineHeight: 1.7,
              margin: '0 auto 20px',
              maxWidth: 560,
              opacity: 0.95,
            }}
          >
            Vi vil rigtig gerne vise dine opskrifter i STRIQ — på den måde, der passer dig bedst.
            Har du allerede dine opskrifter liggende på din egen side, sender vi bare brugerne direkte til dig.
            Vil du gerne sælge eller dele dine opskrifter gennem STRIQ, kan vi også det.
          </p>
          <a
            href="mailto:kontakt@striq.dk?subject=Samarbejde%20om%20opskrifter%20i%20STRIQ"
            style={{
              display: 'inline-block',
              background: T.white,
              color: T.sageDark,
              fontSize: 14,
              fontWeight: 600,
              padding: '12px 22px',
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Skriv til os på kontakt@striq.dk
          </a>
        </div>
      </div>

      {/* Til brugere */}
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '0 24px 72px' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${T.accent} 0%, ${T.dustyPink}66 100%)`,
            borderRadius: 12,
            padding: '24px 28px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 14, color: T.text, margin: '0 0 8px', lineHeight: 1.6 }}>
            Har du en opskrift-favorit, vi bør kende? Eller en idé til hvad du savner?
          </p>
          <a
            href="mailto:kontakt@striq.dk"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: T.sage,
              textDecoration: 'underline',
            }}
          >
            Skriv til os på kontakt@striq.dk
          </a>
        </div>
      </div>
    </div>
  )
}
