// Kun http(s) tillades — beskytter mod javascript:/data:/vbscript:-URL'er hvis
// seed eller admin-UI ved uheld lader en ondsindet URL slippe igennem.
export function safeWebUrl(raw: string): URL | null {
  try {
    const parsed = new URL(raw)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed
    return null
  } catch {
    return null
  }
}
