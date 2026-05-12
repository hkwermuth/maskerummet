import { NewsletterForm } from './NewsletterForm'

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
      padding: '28px 20px 22px',
      fontSize: 12.5,
      color: '#8C7E74',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Nyhedsbrev */}
      <div style={{
        textAlign: 'center',
        marginBottom: 24,
        paddingBottom: 22,
        borderBottom: '1px solid rgba(48,34,24,0.08)',
      }}>
        <NewsletterForm />
      </div>

      {/* Links + copyright */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 6 }}>
          &copy; {new Date().getFullYear()} STRIQ &mdash; Dit personlige garnunivers
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/om-striq" style={{ color: '#8C7E74', textDecoration: 'underline' }}>Om STRIQ</a>
          <a href="/min-konto" style={{ color: '#8C7E74', textDecoration: 'underline' }}>Min konto</a>
          <a href="/privatlivspolitik" style={{ color: '#8C7E74', textDecoration: 'underline' }}>Privatlivspolitik</a>
          <a href="mailto:kontakt@striq.dk" style={{ color: '#8C7E74', textDecoration: 'underline' }}>kontakt@striq.dk</a>
        </div>
        <div style={{ marginTop: 8, fontSize: 10.5, color: '#B0A599', fontFamily: 'monospace' }}>
          v.{sha}
        </div>
      </div>
    </footer>
  )
}
