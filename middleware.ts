import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const CANONICAL_HOST = 'maskerummet.vercel.app'
const NON_CANONICAL_HOST = 'garn-katalog.vercel.app'

export async function middleware(request: NextRequest) {
  const { nextUrl } = request

  // Redirect ikke-kanonisk host i produktion.
  if (nextUrl.hostname === NON_CANONICAL_HOST) {
    const url = nextUrl.clone()
    url.hostname = CANONICAL_HOST
    url.protocol = 'https:'
    return NextResponse.redirect(url, 308)
  }

  // Refresh Supabase session på hvert request.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Kald getUser() for at refreshe session-tokenet hvis det er ved at udløbe.
  await supabase.auth.getUser()

  return supabaseResponse
}

export const config = {
  matcher: [
    // Kør på alle requests undtagen Next.js internals og statiske filer.
    '/((?!_next/static|_next/image|favicon.ico|brand/|backgrounds/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
