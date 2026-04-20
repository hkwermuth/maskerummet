import { ALLOWED_NEXT_PATHS } from './resolveNext'

// Byg en login-URL der bevarer en gyldig return-path.
// Kun whitelistede paths gives som ?next= — andre returnerer /login uden param,
// så vi undgår at forme misvisende URLs der alligevel ville blive afvist af resolveNext.
export function buildLoginHref(pathname: string | null | undefined): string {
  if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//')) {
    return '/login'
  }
  const [path] = pathname.split(/[?#]/)
  if (!ALLOWED_NEXT_PATHS.has(path)) return '/login'
  return `/login?next=${encodeURIComponent(pathname)}`
}
