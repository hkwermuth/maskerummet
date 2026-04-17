export function Footer() {
  return (
    <footer style={{
      background: '#E8DADC',
      borderTop: '1px solid #E5DDD9',
      textAlign: 'center',
      padding: '18px 20px',
      fontSize: 12.5,
      color: '#8C7E74',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      &copy; {new Date().getFullYear()} Striq &mdash; Dit personlige garnunivers
    </footer>
  )
}
