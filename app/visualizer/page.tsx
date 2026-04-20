'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSupabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import YarnVisualizer from '@/components/app/YarnVisualizer'
import { buildLoginHref } from '@/lib/auth/buildLoginHref'

const C = {
  text:      '#302218',
  sage:      '#61846D',
  dustyPink: '#D4ADB6',
}

export default function VisualizerPage() {
  const supabase = useSupabase()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoaded(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loaded) return null

  return (
    <div style={{ minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        .hero-login-link:focus-visible {
          outline: 2px solid #302218;
          outline-offset: 3px;
          border-radius: 2px;
        }
      `}</style>
      {/* Hero banner — i samme stil som /om-striq */}
      <div style={{
        background: `linear-gradient(135deg, ${C.dustyPink} 0%, ${C.sage}55 100%)`,
        padding: '48px 24px 40px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(30px, 4vw, 44px)',
          fontWeight: 600,
          color: C.text,
          margin: '0 0 10px',
          letterSpacing: '.01em',
        }}>
          Prøv garn
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(16px, 2vw, 19px)',
          fontStyle: 'italic',
          color: C.text,
          margin: '0 auto', maxWidth: 620, lineHeight: 1.55,
          opacity: 0.9,
        }}>
          Upload et foto og se dit projekt i nye farver — AI-visualisering med garn fra kataloget.
          {!user && (
            <>
              {' '}
              <Link
                href={buildLoginHref('/visualizer')}
                className="hero-login-link"
                style={{
                  color: C.text,
                  textDecoration: 'underline',
                  fontStyle: 'italic',
                }}
              >
                Log ind for at prøve det selv.
              </Link>
            </>
          )}
        </p>
      </div>

      <YarnVisualizer user={user} onRequestLogin={() => router.push('/login?next=/visualizer')} />
    </div>
  )
}
