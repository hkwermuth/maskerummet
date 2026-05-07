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

  // Provider-fejl (fx eksisterende email-konto kollision) sendes som ?error=...&error_description=...
  // før koden overhovedet udveksles.
  const providerError = url.searchParams.get('error')
  const providerDesc = url.searchParams.get('error_description') ?? ''
  if (providerError && isIdentityConflict(providerDesc)) {
    return NextResponse.redirect(new URL('/login?error=oauth_account_exists', url.origin))
  }

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error && isIdentityConflict(error.message)) {
      return NextResponse.redirect(new URL('/login?error=oauth_account_exists', url.origin))
    }
    if (!error && data.user) {
      await ensureEditorRole(data.user.id, data.user.email)
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}

function isIdentityConflict(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('already registered') || m.includes('identity') && m.includes('exists')
}
