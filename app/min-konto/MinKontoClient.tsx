'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSupabase } from '@/lib/supabase/client'
import { exportAlleMineData } from '@/lib/export/exportAlleMineData'

type Status =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; tabeller: Record<string, number> }
  | { type: 'error'; message: string }

export default function MinKontoClient({ email }: { email: string }) {
  const supabase = useSupabase()
  const [status, setStatus] = useState<Status>({ type: 'idle' })

  async function handleDownload() {
    setStatus({ type: 'loading' })
    const result = await exportAlleMineData(supabase)
    if (result.success) {
      setStatus({ type: 'success', tabeller: result.tabeller ?? {} })
    } else {
      setStatus({ type: 'error', message: result.error ?? 'Der skete en fejl.' })
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 74px)', background: '#F8F3EE', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{
        background: 'linear-gradient(135deg, #D4ADB6 0%, #61846D55 100%)',
        padding: '48px 24px 40px', textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600,
          color: '#302218', margin: '0 0 8px',
        }}>
          Min konto
        </h1>
        <p style={{ fontSize: 14, color: '#302218', opacity: 0.75, margin: '0 auto', maxWidth: 520, lineHeight: 1.55 }}>
          Logget ind som <strong>{email}</strong>
        </p>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 72px' }}>

        {/* Data-eksport-sektion */}
        <section style={{
          background: '#fff',
          border: '1px solid #E5DDD9',
          borderLeft: '4px solid #61846D',
          borderRadius: 12,
          padding: '28px 28px 24px',
          marginBottom: 20,
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22, fontWeight: 600, color: '#302218',
            margin: '0 0 10px',
          }}>
            Download dine data
          </h2>
          <p style={{ fontSize: 14, color: '#5C5048', lineHeight: 1.6, margin: '0 0 18px' }}>
            Ifølge GDPR har du ret til at få udleveret alle de data, STRIQ har om dig, i et maskinlæsbart format.
            Klik på knappen for at downloade en JSON-fil der indeholder dit garnlager, dine projekter,
            stemmer på substitutions-forslag, gemte opskrifter og andre data knyttet til din konto.
          </p>

          <button
            onClick={handleDownload}
            disabled={status.type === 'loading'}
            style={{
              padding: '12px 24px',
              background: status.type === 'loading' ? '#8C7E74' : '#61846D',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              cursor: status.type === 'loading' ? 'default' : 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {status.type === 'loading' ? 'Henter dine data...' : 'Download mine data (JSON)'}
          </button>

          {status.type === 'success' && (
            <div role="status" style={{
              marginTop: 16,
              padding: '12px 14px',
              background: '#EAF3DE',
              color: '#173404',
              borderRadius: 6,
              fontSize: 13,
              lineHeight: 1.55,
            }}>
              ✓ Din fil er downloadet. Den indeholder:
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                {Object.entries(status.tabeller).map(([tabel, antal]) => (
                  <li key={tabel}>
                    <strong>{antal}</strong> {labelForTabel(tabel)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {status.type === 'error' && (
            <div role="alert" style={{
              marginTop: 16,
              padding: '12px 14px',
              background: '#FCEBEB',
              color: '#791F1F',
              borderRadius: 6,
              fontSize: 13,
            }}>
              {status.message}
            </div>
          )}

          <div style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px dashed #E5DDD9',
            fontSize: 12,
            color: '#8C7E74',
            lineHeight: 1.6,
          }}>
            Du kan også downloade specifikke dele af dine data direkte:
            {' '}<Link href="/garnlager" style={{ color: '#61846D', textDecoration: 'underline' }}>Garnlager som CSV</Link>
            {' · '}<Link href="/projekter" style={{ color: '#61846D', textDecoration: 'underline' }}>Projekter som CSV</Link>
          </div>
        </section>

        {/* Slet-konto-sektion — placeholder, implementeres i 8.5 */}
        <section style={{
          background: '#fff',
          border: '1px solid #E5DDD9',
          borderLeft: '4px solid #D4ADB6',
          borderRadius: 12,
          padding: '28px 28px 24px',
          marginBottom: 20,
        }}>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22, fontWeight: 600, color: '#302218',
            margin: '0 0 10px',
          }}>
            Slet min konto
          </h2>
          <p style={{ fontSize: 14, color: '#5C5048', lineHeight: 1.6, margin: '0 0 12px' }}>
            Hvis du vil slette din konto og alle tilhørende data, kan du skrive til{' '}
            <a href="mailto:kontakt@striq.dk" style={{ color: '#9B6272', textDecoration: 'underline' }}>kontakt@striq.dk</a>.
            Vi sletter alt inden 30 dage.
          </p>
          <p style={{ fontSize: 12, color: '#8C7E74', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
            En in-app slet-knap er på vej — indtil videre håndteres sletning manuelt.
          </p>
        </section>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href="/privatlivspolitik" style={{ fontSize: 13, color: '#8C7E74', textDecoration: 'underline' }}>
            Læs vores privatlivspolitik
          </Link>
        </div>
      </div>
    </div>
  )
}

function labelForTabel(tabel: string): string {
  const labels: Record<string, string> = {
    yarn_items: 'garn i dit lager',
    projects: 'projekter',
    yarn_usage: 'garn-linjer i projekter',
    profiles: 'profil-oplysninger',
    substitution_votes: 'substitutions-stemmer',
    substitution_suggestions: 'substitutions-forslag',
    saved_recipes: 'gemte opskrifter',
    barcode_suggestions: 'stregkode-bidrag',
  }
  return labels[tabel] ?? tabel
}
