'use client'

import { useEffect, useState } from 'react'
import { useSupabase } from '@/lib/supabase/client'

type Props = {
  yarnId: string
}

type Status = 'loading' | 'hidden' | 'ready'

function HjerteIkon({ fyldt }: { fyldt: boolean }) {
  const heart = '#C25A6E'
  const muted = '#8C7E74'
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={fyldt ? heart : 'none'}
      stroke={fyldt ? heart : muted}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export function YarnFavoriteButton({ yarnId }: Props) {
  const supabase = useSupabase()
  const [status, setStatus] = useState<Status>('loading')
  const [userId, setUserId] = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        setStatus('hidden')
        return
      }
      const { data } = await supabase
        .from('saved_yarns')
        .select('yarn_id')
        .eq('user_id', user.id)
        .eq('yarn_id', yarnId)
        .maybeSingle()
      if (cancelled) return
      setUserId(user.id)
      setIsFavorite(!!data)
      setStatus('ready')
    }
    load()
    return () => { cancelled = true }
  }, [supabase, yarnId])

  if (status !== 'ready' || !userId) return null

  async function toggle() {
    const wasFavorite = isFavorite
    setIsFavorite(!wasFavorite)
    setPending(true)
    setError(null)
    try {
      if (wasFavorite) {
        const { error } = await supabase
          .from('saved_yarns')
          .delete()
          .eq('user_id', userId)
          .eq('yarn_id', yarnId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('saved_yarns')
          .upsert(
            { user_id: userId, yarn_id: yarnId },
            { onConflict: 'user_id,yarn_id', ignoreDuplicates: true },
          )
        if (error) throw error
      }
    } catch {
      setIsFavorite(wasFavorite)
      setError(wasFavorite ? 'Kunne ikke fjerne favorit. Prøv igen.' : 'Kunne ikke gemme favorit. Prøv igen.')
      setTimeout(() => setError(null), 4000)
    } finally {
      setPending(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? 'Fjern fra favoritter' : 'Tilføj til favoritter'}
        style={{
          background: '#FFFCF7EE',
          border: '1px solid #E5DDD9',
          borderRadius: '50%',
          width: 44,
          height: 44,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: pending ? 'default' : 'pointer',
          boxShadow: '0 1px 4px rgba(48,34,24,.08)',
          opacity: pending ? 0.6 : 1,
          transition: 'opacity .15s, transform .15s',
        }}
      >
        <HjerteIkon fyldt={isFavorite} />
      </button>
      {error && (
        <span
          role="alert"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            background: '#F5E8E0',
            color: '#8B3A2A',
            fontSize: 12,
            padding: '4px 8px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
