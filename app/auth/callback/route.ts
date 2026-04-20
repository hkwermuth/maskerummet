import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureEditorRole } from '@/lib/editors'
import { resolveNext } from '@/lib/auth/resolveNext'

// Generel auth-callback for magic links og OAuth på hoved-appen.
// /garn/auth/callback håndterer separat callback for kataloget.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  // Valider next mod whitelist — defense-in-depth mod open-redirect-phishing.
  const next = resolveNext(url.searchParams.get('next'))

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      await ensureEditorRole(data.user.id, data.user.email)
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
