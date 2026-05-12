'use client'

import { useState, useMemo } from 'react'
import {
  FABRIKANTER,
  DESIGNERE,
  KOMMENDE_OPFOLGNINGER,
  STATUS_LABEL,
  STATUS_FARVER,
  type KontaktPost,
  type KontaktStatus,
} from '@/lib/data/kontaktStatus'

const STATUS_REKKEFOLGE: KontaktStatus[] = ['afventer', 'positiv', 'aftale', 'ikke_kontaktet', 'afvist']

function StatusChip({ status }: { status: KontaktStatus }) {
  const f = STATUS_FARVER[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '3px 10px', borderRadius: 20,
      background: f.bg, color: f.txt,
      fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.dot, flexShrink: 0 }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

function PrioritetBadge({ p }: { p: 1 | 2 | 3 | 4 }) {
  const labels = { 1: 'Top', 2: 'Høj', 3: 'Mellem', 4: 'Lav' }
  const farver = {
    1: { bg: '#302218', txt: '#F8F3EE' },
    2: { bg: '#61846D', txt: '#fff' },
    3: { bg: '#E5DDD9', txt: '#8C7E74' },
    4: { bg: '#F2EBE4', txt: '#A09690' },
  }
  const f = farver[p]
  return (
    <span style={{
      background: f.bg, color: f.txt,
      padding: '2px 8px', borderRadius: 4,
      fontSize: 10, fontWeight: 700,
      fontFamily: "'DM Sans', sans-serif",
      letterSpacing: '.04em', textTransform: 'uppercase',
    }}>
      P{p} · {labels[p]}
    </span>
  )
}

function KontaktRaekke({ post }: { post: KontaktPost }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1.1fr) auto minmax(0, 0.8fr) auto',
      gap: 14, alignItems: 'center',
      padding: '14px 18px',
      background: '#fff',
      border: '1px solid #E5DDD9',
      borderRadius: 10,
      marginBottom: 8,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 17, fontWeight: 600, color: '#302218',
          marginBottom: 3,
        }}>
          {post.navn}
        </div>
        {post.noter && (
          <div style={{
            fontSize: 11.5, color: '#8C7E74', lineHeight: 1.45,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {post.noter}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: '#8C7E74', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {post.website ? (
          <a href={`https://${post.website}`} target="_blank" rel="noopener noreferrer"
             style={{ color: '#9B6272', textDecoration: 'none' }}>
            {post.kontakt}
          </a>
        ) : post.kontakt}
      </div>
      <StatusChip status={post.status} />
      <div style={{ fontSize: 11.5, color: '#8C7E74', fontFamily: "'DM Sans', sans-serif" }}>
        {post.sidstKontaktet && (
          <div>Sendt: <strong style={{ color: '#302218' }}>{post.sidstKontaktet}</strong></div>
        )}
        {post.opfolgning && (
          <div>Opfølg: <strong style={{ color: '#9B6272' }}>{post.opfolgning}</strong></div>
        )}
      </div>
      <PrioritetBadge p={post.prioritet} />
    </div>
  )
}

function StatKort({ tal, label, farve }: { tal: number; label: string; farve: string }) {
  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${farve}33`,
      borderTop: `3px solid ${farve}`,
      borderRadius: 10,
      padding: '18px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 32, fontWeight: 600,
        color: '#302218', lineHeight: 1, marginBottom: 4,
      }}>
        {tal}
      </div>
      <div style={{
        fontSize: 11, color: '#8C7E74',
        textTransform: 'uppercase', letterSpacing: '.06em',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {label}
      </div>
    </div>
  )
}

export default function KontaktStatusClient() {
  const [aktivType, setAktivType] = useState<'alle' | 'fabrikanter' | 'designere'>('alle')
  const [aktivStatus, setAktivStatus] = useState<KontaktStatus | 'alle'>('alle')

  const alleposter = useMemo(() => {
    const base = aktivType === 'fabrikanter' ? FABRIKANTER
      : aktivType === 'designere' ? DESIGNERE
      : [...FABRIKANTER, ...DESIGNERE]
    const filtered = aktivStatus === 'alle' ? base : base.filter(p => p.status === aktivStatus)
    return filtered.sort((a, b) => {
      const sDiff = STATUS_REKKEFOLGE.indexOf(a.status) - STATUS_REKKEFOLGE.indexOf(b.status)
      if (sDiff !== 0) return sDiff
      return a.prioritet - b.prioritet
    })
  }, [aktivType, aktivStatus])

  const stats = useMemo(() => {
    const alle = [...FABRIKANTER, ...DESIGNERE]
    const byStatus = (s: KontaktStatus) => alle.filter(p => p.status === s).length
    return {
      ikkeKontaktet: byStatus('ikke_kontaktet'),
      afventer: byStatus('afventer'),
      positiv: byStatus('positiv'),
      aftale: byStatus('aftale'),
      afvist: byStatus('afvist'),
      total: alle.length,
    }
  }, [])

  return (
    <div style={{ minHeight: 'calc(100vh - 74px)', background: '#F8F3EE', fontFamily: "'DM Sans', sans-serif" }}>

      <div style={{
        background: 'linear-gradient(135deg, #D9BFC3 0%, #D4ADB6 100%)',
        padding: '40px 24px 32px', textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 600,
          color: '#302218', margin: '0 0 8px',
        }}>
          Kontakt-status
        </h1>
        <p style={{ fontSize: 14, color: '#6b5850', margin: '0 auto', maxWidth: 520, lineHeight: 1.55 }}>
          Overblik over henvendelser til garnfabrikanter og strikdesignere om tilladelse til brug i STRIQ-kataloget.
        </p>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 64px' }}>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 12, marginBottom: 28,
        }}>
          <StatKort tal={stats.total} label="I alt" farve="#302218" />
          <StatKort tal={stats.ikkeKontaktet} label="Ikke kontaktet" farve="#C8BFB6" />
          <StatKort tal={stats.afventer} label="Afventer svar" farve="#D49840" />
          <StatKort tal={stats.positiv} label="Positiv dialog" farve="#61846D" />
          <StatKort tal={stats.aftale} label="Aftale på plads" farve="#3A6A4A" />
          <StatKort tal={stats.afvist} label="Afvist" farve="#A04040" />
        </div>

        {KOMMENDE_OPFOLGNINGER.length > 0 && (
          <div style={{
            background: '#fff',
            border: '1px solid #E5DDD9',
            borderLeft: '4px solid #9B6272',
            borderRadius: 10,
            padding: '18px 22px',
            marginBottom: 36,
          }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 18, fontWeight: 600, color: '#302218',
              marginBottom: 10,
            }}>
              Kommende opfølgninger
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {KOMMENDE_OPFOLGNINGER.map((o, i) => (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '110px minmax(0, 200px) 1fr',
                  gap: 14, fontSize: 13, color: '#302218',
                  padding: '6px 0',
                  borderBottom: i < KOMMENDE_OPFOLGNINGER.length - 1 ? '1px dashed #E5DDD9' : 'none',
                }}>
                  <div style={{ color: '#9B6272', fontWeight: 600 }}>{o.dato}</div>
                  <div style={{ fontWeight: 500 }}>{o.navn}</div>
                  <div style={{ color: '#8C7E74' }}>{o.handling}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          marginBottom: 12,
        }}>
          {(['alle', 'fabrikanter', 'designere'] as const).map(t => (
            <button key={t} onClick={() => setAktivType(t)} style={{
              padding: '7px 16px', borderRadius: 20,
              border: `1px solid ${aktivType === t ? '#302218' : '#E5DDD9'}`,
              background: aktivType === t ? '#302218' : '#fff',
              color: aktivType === t ? '#F8F3EE' : '#8C7E74',
              fontSize: 13, cursor: 'pointer',
              fontWeight: aktivType === t ? 600 : 400,
              textTransform: 'capitalize',
            }}>
              {t === 'alle' ? 'Alle' : t}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex', gap: 8, flexWrap: 'wrap',
          marginBottom: 24,
        }}>
          {(['alle', 'afventer', 'positiv', 'aftale', 'ikke_kontaktet', 'afvist'] as const).map(s => {
            const aktiv = aktivStatus === s
            const farve = s === 'alle' ? { bg: '#61846D', txt: '#fff', dot: '#61846D' }
              : STATUS_FARVER[s as KontaktStatus]
            return (
              <button key={s} onClick={() => setAktivStatus(s)} style={{
                padding: '5px 12px', borderRadius: 16,
                border: `1px solid ${aktiv ? farve.dot : '#E5DDD9'}`,
                background: aktiv ? farve.dot : '#fff',
                color: aktiv ? (s === 'alle' ? '#fff' : farve.txt === '#8C7E74' ? '#302218' : farve.txt) : '#8C7E74',
                fontSize: 12, cursor: 'pointer',
                fontWeight: aktiv ? 600 : 400,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {s !== 'alle' && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: aktiv ? '#fff' : farve.dot }} />
                )}
                {s === 'alle' ? 'Alle statusser' : STATUS_LABEL[s as KontaktStatus]}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 12, color: '#8C7E74', marginBottom: 10, textAlign: 'right' }}>
          Viser <strong style={{ color: '#302218' }}>{alleposter.length}</strong> af {stats.total}
        </div>

        <div>
          {alleposter.map((p, i) => (
            <KontaktRaekke key={`${p.navn}-${i}`} post={p} />
          ))}
        </div>

        {alleposter.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 24px',
            color: '#8C7E74', fontSize: 14,
            border: '1px dashed #E5DDD9', borderRadius: 10,
          }}>
            Ingen poster matcher de valgte filtre.
          </div>
        )}

        <div style={{
          marginTop: 40, padding: '20px 24px',
          background: '#fff', border: '1px dashed #E5DDD9',
          borderRadius: 10, fontSize: 12, color: '#8C7E74',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: '#302218' }}>Opdatering:</strong> data ligger i{' '}
          <code style={{ background: '#F2EBE4', padding: '2px 6px', borderRadius: 3, color: '#302218' }}>
            lib/data/kontaktStatus.ts
          </code>{' '}
          og skal redigeres manuelt (fx når du får svar). De detaljerede mail-skabeloner findes i{' '}
          <code style={{ background: '#F2EBE4', padding: '2px 6px', borderRadius: 3, color: '#302218' }}>
            content/fabrikanter.md
          </code>{' '}
          og{' '}
          <code style={{ background: '#F2EBE4', padding: '2px 6px', borderRadius: 3, color: '#302218' }}>
            content/designere.md
          </code>.
        </div>
      </div>
    </div>
  )
}
