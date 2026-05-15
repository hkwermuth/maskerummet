// Whitelist af interne stier der må bruges som ?next= efter login.
// Sikkerhedskritisk: beskytter mod open-redirect-phishing.
export const ALLOWED_NEXT_PATHS = new Set([
  // Forside og hub-sider (topnav)
  '/', '/mit-striq', '/opskrifter-og-garn', '/striqipedia',
  '/faellesskab', '/garnbutikker',
  // Mit STRIQ
  '/garnlager', '/projekter', '/mine-favoritter',
  // Opskrifter & garn
  '/opskrifter', '/garn', '/visualizer',
  // Striqipedia
  '/faq', '/strikkeskolen',
  // Fællesskab
  '/faellesskabet', '/kalender', '/ideer',
  // Garnbutikker & caféer
  '/find-forhandler', '/strikkecafeer',
  // Øvrige offentlige sider
  '/om-striq', '/privatlivspolitik', '/min-konto',
])

export function resolveNext(raw: string | null): string {
  if (!raw) return '/garnlager'
  // Kun interne absolutte stier. Afvis protocol-relative og absolutte URLs.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/garnlager'
  // Afmontér query og fragment før whitelist-tjek.
  const [path] = raw.split(/[?#]/)
  return ALLOWED_NEXT_PATHS.has(path) ? raw : '/garnlager'
}
