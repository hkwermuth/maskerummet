// Whitelist af interne stier der må bruges som ?next= efter login.
// Sikkerhedskritisk: beskytter mod open-redirect-phishing.
export const ALLOWED_NEXT_PATHS = new Set([
  '/garnlager', '/projekter', '/visualizer', '/kalender',
  '/ideer', '/opskrifter', '/strikkeskolen', '/find-forhandler',
])

export function resolveNext(raw: string | null): string {
  if (!raw) return '/garnlager'
  // Kun interne absolutte stier. Afvis protocol-relative og absolutte URLs.
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/garnlager'
  // Afmontér query og fragment før whitelist-tjek.
  const [path] = raw.split(/[?#]/)
  return ALLOWED_NEXT_PATHS.has(path) ? raw : '/garnlager'
}
