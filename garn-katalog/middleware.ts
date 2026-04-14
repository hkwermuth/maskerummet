import { NextResponse, type NextRequest } from 'next/server'

const CANONICAL_HOST = 'maskerummet.vercel.app'
const NON_CANONICAL_HOST = 'garn-katalog.vercel.app'

export function middleware(request: NextRequest) {
  const { nextUrl } = request

  // Only enforce canonical host in production domains.
  // In dev (localhost) we should not redirect.
  if (nextUrl.hostname === NON_CANONICAL_HOST) {
    const url = nextUrl.clone()
    url.hostname = CANONICAL_HOST
    url.protocol = 'https:'
    return NextResponse.redirect(url, 308)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/garn/:path*'],
}
