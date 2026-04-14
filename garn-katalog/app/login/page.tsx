'use client'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/garn/auth/callback` },
    })
    if (error) setErr(error.message)
    else setSent(true)
  }

  return (
    <div className="max-w-md">
      <h1 className="font-serif text-3xl text-forest mb-4">Log ind</h1>
      {sent ? (
        <p className="text-bark">Tjek din email for et magisk link.</p>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="din@email.dk"
            className="w-full px-4 py-2 rounded-lg border border-stone bg-cream"
          />
          <button className="bg-forest text-cream px-4 py-2 rounded-lg">Send magisk link</button>
          {err && <p className="text-terracotta text-sm">{err}</p>}
        </form>
      )}
    </div>
  )
}
