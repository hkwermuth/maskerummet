import Link from 'next/link'

export const metadata = {
  title: 'Konto slettet – STRIQ',
  robots: { index: false, follow: false },
}

export default function KontoSlettetPage() {
  return (
    <div style={{ minHeight: 'calc(100vh - 74px)', background: '#F8F3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{
        background: '#FFFCF7',
        borderRadius: 16,
        padding: '48px 40px',
        width: 420,
        maxWidth: '100%',
        boxShadow: '0 8px 40px rgba(48,34,24,.12)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>👋</div>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 28, fontWeight: 600, color: '#61846D',
          margin: '0 0 12px',
        }}>
          Din konto er slettet
        </h1>
        <p style={{ fontSize: 14, color: '#5C5048', lineHeight: 1.65, margin: '0 0 24px' }}>
          Alle dine data er fjernet permanent fra STRIQ. Tak fordi du brugte tjenesten — du er altid velkommen tilbage med en ny konto, hvis du får lyst.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#61846D',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Tilbage til forsiden
        </Link>
      </div>
    </div>
  )
}
