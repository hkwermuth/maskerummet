'use client'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function GarnLoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const supabase = createSupabaseBrowserClient()
    const canonicalOrigin =
      window.location.hostname === 'garn-katalog.vercel.app'
        ? 'https://maskerummet.vercel.app'
        : window.location.origin
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${canonicalOrigin}/garn/auth/callback` },
    })
    if (error) setErr(error.message)
    else setSent(true)
  }

  return (
    <div className="max-w-md">
      <h1 className="font-serif text-3xl text-striq-sage mb-4">Editor-login</h1>
      {sent ? (
        <p className="text-striq-muted">Tjek din email for et magisk link.</p>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din@email.dk"
            className="w-full px-4 py-2 rounded-lg border border-striq-border bg-cream"
          />
          <button className="bg-striq-sage text-cream px-4 py-2 rounded-lg">
            Send magisk link
          </button>
          {err && <p className="text-striq-link text-sm">{err}</p>}
        </form>
      )}
    </div>
  )
}
