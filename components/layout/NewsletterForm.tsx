'use client'

import { useState } from 'react'

type Status =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }

export function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ type: 'idle' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status.type === 'loading') return
    setStatus({ type: 'loading' })

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus({ type: 'error', message: data?.error ?? 'Der skete en fejl. Prøv igen.' })
        return
      }
      setStatus({ type: 'success', message: data?.message ?? 'Tak for din tilmelding!' })
      setEmail('')
    } catch {
      setStatus({ type: 'error', message: 'Kunne ikke forbinde. Prøv igen.' })
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
        margin: '0 auto',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <label htmlFor="newsletter-email" style={{
        fontSize: 12, color: '#8C7E74', textAlign: 'left',
      }}>
        Få besked når STRIQ får nye funktioner
      </label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="din@email.dk"
          disabled={status.type === 'loading'}
          autoComplete="email"
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid rgba(48,34,24,0.15)',
            borderRadius: 6,
            background: '#FFFCF7',
            color: '#302218',
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            outline: 'none',
            minWidth: 0,
          }}
        />
        <button
          type="submit"
          disabled={status.type === 'loading' || !email}
          style={{
            padding: '8px 16px',
            background: status.type === 'loading' ? '#8C7E74' : '#61846D',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: status.type === 'loading' ? 'default' : 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            whiteSpace: 'nowrap',
          }}
        >
          {status.type === 'loading' ? 'Tilmelder…' : 'Tilmeld'}
        </button>
      </div>
      {status.type === 'success' && (
        <div role="status" style={{
          fontSize: 12, color: '#173404',
          background: 'rgba(234, 243, 222, 0.7)',
          padding: '6px 10px', borderRadius: 4,
          textAlign: 'left',
        }}>
          ✓ {status.message}
        </div>
      )}
      {status.type === 'error' && (
        <div role="alert" style={{
          fontSize: 12, color: '#791F1F',
          background: 'rgba(252, 235, 235, 0.7)',
          padding: '6px 10px', borderRadius: 4,
          textAlign: 'left',
        }}>
          {status.message}
        </div>
      )}
    </form>
  )
}
