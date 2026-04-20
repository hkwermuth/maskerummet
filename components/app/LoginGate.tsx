'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSupabase } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { buildLoginHref } from '@/lib/auth/buildLoginHref'

type Props = {
  title: string
  desc: string
  icon: ReactNode
  children: (user: User) => ReactNode
}

export function LoginGate({ title, desc, icon, children }: Props) {
  const supabase = useSupabase()
  const router = useRouter()
  const pathname = usePathname()
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
  if (!user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 74px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent' }}>
        <div style={{ textAlign: 'center', maxWidth: 400, padding: '48px 24px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid #E5DDD9' }}>
            {icon}
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#61846D', margin: '0 0 8px' }}>{title}</h2>
          <p style={{ fontSize: 14, color: '#8C7E74', lineHeight: 1.6, margin: '0 0 24px' }}>{desc}</p>
          <button onClick={() => router.push(buildLoginHref(pathname))} style={{
            background: '#61846D', color: '#fff', border: 'none', borderRadius: 24,
            padding: '10px 28px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>Log ind</button>
        </div>
      </div>
    )
  }
  return <>{children(user)}</>
}
