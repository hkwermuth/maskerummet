import type { Metadata } from 'next'
import { HeroIllustration, type Variant } from '@/components/layout/HeroIllustration'

export const metadata: Metadata = {
  title: 'Illustration-varianter — Find garnbutikker',
  robots: { index: false, follow: false },
}

const VARIANTS: Array<{ key: Variant; name: string; note: string }> = [
  {
    key: 'forhandler-butik-facade',
    name: 'I — Butik-facade med vinduer',
    note: 'Klassisk butiks-front med skilt, to store vinduer fyldt med garnnøgler og dør i midten. Varm og indbydende.',
  },
  {
    key: 'forhandler-lup-dk',
    name: 'J — Forstørrelsesglas over Danmark',
    note: 'Abstrakt DK-silhouet (Jylland+Fyn+Sjælland+Bornholm) med røde pins, og en stor lup der "søger" over Sjælland. Tydelig "find et sted"-metafor.',
  },
  {
    key: 'forhandler-pin-nogle',
    name: 'K — Stor pin med garnnøgle inde',
    note: 'Klassisk kort-markør som hovedmotiv, med en garnnøgle inde i selve pin-cirklen. Minimalistisk og direkte.',
  },
  {
    key: 'forhandler-lille-butik',
    name: 'L — Lille butik med "Garn"-skilt',
    note: 'Lille butik udefra med skrå tag, ovalt skilt over facaden, åben dør og blomsterkrukke. Nichebutik-stemning.',
  },
]

export default function ForhandlerVarianterPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#F8F3EE', minHeight: 'calc(100vh - 58px - 57px)' }}>
      <section style={{
        background: 'linear-gradient(135deg, rgba(255,252,247,0.85) 0%, rgba(244,239,230,0.85) 55%, rgba(234,217,222,0.85) 100%)',
        padding: '36px 0 28px',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(26px, 4vw, 34px)',
            fontWeight: 600, color: '#302218', margin: 0,
          }}>
            Illustration-varianter — Find garnbutikker
          </h1>
          <p style={{ fontSize: 14.5, color: '#6B5D4F', margin: '6px 0 0', maxWidth: 720, lineHeight: 1.55 }}>
            Fire forslag til hero-illustration til den nye "Find garnbutikker nær dig"-side.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 24px 60px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 20,
        }}>
          {VARIANTS.map(v => (
            <article
              key={v.key}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5DDD9',
                borderRadius: 14,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 1px 4px rgba(48,34,24,.06)',
              }}
            >
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,252,247,0.9) 0%, rgba(244,239,230,0.9) 55%, rgba(234,217,222,0.9) 100%)',
                padding: '20px 18px',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                minHeight: 220,
              }}>
                <div style={{ width: 200 }}>
                  <HeroIllustration variant={v.key} />
                </div>
              </div>
              <div style={{ padding: '14px 16px 18px' }}>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 18, fontWeight: 600, color: '#302218',
                }}>
                  {v.name}
                </div>
                <p style={{ fontSize: 12.5, color: '#6B5D4F', margin: '4px 0 0', lineHeight: 1.5 }}>
                  {v.note}
                </p>
                <div style={{ marginTop: 8, fontSize: 11, color: '#8C7E74', fontFamily: 'monospace' }}>
                  variant=&quot;{v.key}&quot;
                </div>
              </div>
            </article>
          ))}
        </div>

        <p style={{ fontSize: 13, color: '#6B5D4F', marginTop: 28, lineHeight: 1.55 }}>
          Fortæl mig hvilken (I, J, K eller L) du foretrækker. Preview-siden slettes når valget er fast.
        </p>
      </div>
    </div>
  )
}
