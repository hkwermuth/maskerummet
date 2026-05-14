'use client'

import { useState } from 'react'
import Link from 'next/link'
import { YarnCard } from '@/components/catalog/YarnCard'
import type { Yarn } from '@/lib/types'

type Props = {
  yarns: Yarn[]
}

const INITIAL = 3

export function FavoriteYarnsSection({ yarns }: Props) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? yarns : yarns.slice(0, INITIAL)

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 24, fontWeight: 600, color: '#302218',
        margin: '0 0 16px',
      }}>
        Mine garn-favoritter ({yarns.length})
      </h2>

      {yarns.length === 0 ? (
        <div style={{
          background: '#FFFFFF', border: '1px solid #E5DDD9',
          borderRadius: 12, padding: '24px 20px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🧶</div>
          <p style={{ fontSize: 14, color: '#8C7E74', margin: '0 0 16px' }}>
            Ingen garn-favoritter endnu. Tryk på hjertet på et garn for at gemme det.
          </p>
          <Link href="/garn" style={{
            display: 'inline-block', padding: '8px 20px',
            background: '#61846D', color: '#fff', borderRadius: 24,
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
          }}>
            Udforsk garn-kataloget →
          </Link>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {visible.map((yarn) => (
              <YarnCard key={yarn.id} yarn={yarn} />
            ))}
          </div>
          {yarns.length > INITIAL && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                style={{
                  background: 'transparent', border: '1px solid #61846D',
                  color: '#61846D', borderRadius: 24,
                  padding: '8px 22px', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {showAll ? 'Vis færre' : `Vis alle ${yarns.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
