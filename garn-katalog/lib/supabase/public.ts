import { createClient } from '@supabase/supabase-js'

// Build-safe / request-less client. Bruger kun anon key og gemmer ingen
// session. Brug i generateStaticParams, sitemap, og andre steder der køres
// uden for request-scope. Til ægte auth-flows i request-scope, brug
// createSupabaseServerClient (cookie-baseret).
export function createSupabasePublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
