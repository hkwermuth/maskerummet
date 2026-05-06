export function Footer() {
  // Vercel injicerer VERCEL_GIT_COMMIT_SHA på build. Server-komponent kan
  // læse den direkte uden NEXT_PUBLIC-prefix. Lokal dev → 'dev'.
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7) || 'dev'
  return (
    <footer style={{
      background: 'rgba(244, 239, 230, 0.78)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(48,34,24,0.08)',
      textAlign: 'center',
      padding: '18px 20px',
      fontSize: 12.5,
      color: '#8C7E74',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ marginBottom: 6 }}>
        &copy; {new Date().getFullYear()} STRIQ &mdash; Dit personlige garnunivers
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/privatlivspolitik" style={{ color: '#8C7E74', textDecoration: 'underline' }}>Privatlivspolitik</a>
        <a href="mailto:kontakt@striq.dk" style={{ color: '#8C7E74', textDecoration: 'underline' }}>kontakt@striq.dk</a>
      </div>
      <div style={{ marginTop: 8, fontSize: 10.5, color: '#B0A599', fontFamily: 'monospace' }}>
        v.{sha}
      </div>
    </footer>
  )
}
