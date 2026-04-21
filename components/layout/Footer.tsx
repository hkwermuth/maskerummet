export function Footer() {
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
        &copy; {new Date().getFullYear()} Striq &mdash; Dit personlige garnunivers
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/privatlivspolitik" style={{ color: '#8C7E74', textDecoration: 'underline' }}>Privatlivspolitik</a>
        <a href="mailto:kontakt@striq.dk" style={{ color: '#8C7E74', textDecoration: 'underline' }}>kontakt@striq.dk</a>
      </div>
    </footer>
  )
}
