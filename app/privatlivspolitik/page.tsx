import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privatlivspolitik – STRIQ',
  description: 'Læs om hvordan STRIQ behandler dine personoplysninger.',
}

const C = {
  bg:        '#F8F3EE',
  cardBg:    '#FFFFFF',
  text:      '#302218',
  textMuted: '#8C7E74',
  sage:      '#61846D',
  dustyPink: '#D4ADB6',
  border:    '#E5DDD9',
}

const SEKTIONER = [
  {
    titel: 'Dataansvarlig',
    indhold: (
      <p>STRIQ drives af Hannah Kamstrup Wermuth. Du kan kontakte os på <a href="mailto:kontakt@striq.dk" style={{ color: '#9B6272', textDecoration: 'underline' }}>kontakt@striq.dk</a>.</p>
    ),
  },
  {
    titel: 'Hvilke data indsamler vi',
    indhold: (
      <ul>
        <li><strong>Konto</strong> — e-mailadresse og krypteret adgangskode (håndteret af Supabase Auth).</li>
        <li><strong>Garnlager</strong> — de garner du registrerer: navn, farve, fiber, metrage, noter og billeder.</li>
        <li><strong>Projekter</strong> — dine strikkeprojekter og hvilke garner de bruger.</li>
        <li><strong>Stemmer</strong> — hvis du stemmer på garnalternativer i kataloget.</li>
      </ul>
    ),
  },
  {
    titel: 'Hvorfor indsamler vi data',
    indhold: (
      <p>Vi indsamler kun data for at levere tjenesten til dig: vise dit garnlager, gemme dine projekter og give relevante forslag. Vi sælger aldrig dine data og bruger dem ikke til reklame.</p>
    ),
  },
  {
    titel: 'Cookies og tracking',
    indhold: (
      <p>STRIQ bruger kun en session-cookie fra Supabase Auth til at holde dig logget ind. Vi bruger ingen analytics, ingen tredjeparts-tracking og ingen reklame-cookies.</p>
    ),
  },
  {
    titel: 'Tredjeparter',
    indhold: (
      <ul>
        <li><strong>Supabase</strong> — hosting, database og autentificering. Data opbevares i EU. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#9B6272', textDecoration: 'underline' }}>Supabase Privacy Policy</a>.</li>
        <li><strong>Google Fonts</strong> — skrifttyper indlæses fra Googles servere, hvilket betyder at Google modtager din IP-adresse ved sidevisning. <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#9B6272', textDecoration: 'underline' }}>Google Privacy Policy</a>.</li>
      </ul>
    ),
  },
  {
    titel: 'Opbevaring og sletning',
    indhold: (
      <p>Dine data opbevares så længe du har en konto hos STRIQ. Hvis du ønsker at slette din konto og alle tilhørende data, kan du skrive til <a href="mailto:kontakt@striq.dk" style={{ color: '#9B6272', textDecoration: 'underline' }}>kontakt@striq.dk</a>, så sletter vi alt inden 30 dage.</p>
    ),
  },
  {
    titel: 'Dine rettigheder',
    indhold: (
      <>
        <p>Under GDPR har du ret til:</p>
        <ul>
          <li><strong>Indsigt</strong> — få at vide hvilke data vi har om dig.</li>
          <li><strong>Rettelse</strong> — få rettet forkerte oplysninger.</li>
          <li><strong>Sletning</strong> — få slettet dine data.</li>
          <li><strong>Dataportabilitet</strong> — få dine data udleveret i et læsbart format.</li>
          <li><strong>Klage</strong> — du kan klage til <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer" style={{ color: '#9B6272', textDecoration: 'underline' }}>Datatilsynet</a>.</li>
        </ul>
        <p>Kontakt os på <a href="mailto:kontakt@striq.dk" style={{ color: '#9B6272', textDecoration: 'underline' }}>kontakt@striq.dk</a> for at bruge dine rettigheder.</p>
      </>
    ),
  },
  {
    titel: 'Ændringer',
    indhold: (
      <p>Vi kan opdatere denne privatlivspolitik. Ved væsentlige ændringer giver vi besked via e-mail. Senest opdateret: april 2026.</p>
    ),
  },
]

export default function PrivatlivspolitikPage() {
  return (
    <div style={{ background: C.bg, minHeight: 'calc(100vh - 58px)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, ${C.dustyPink} 0%, ${C.sage}55 100%)`,
        padding: '56px 24px 48px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(32px, 4.5vw, 48px)',
          fontWeight: 600,
          color: C.text,
          margin: '0 0 12px',
          letterSpacing: '.01em',
        }}>
          Privatlivspolitik
        </h1>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 'clamp(16px, 2vw, 20px)',
          fontStyle: 'italic',
          color: C.text,
          margin: '0 auto', maxWidth: 600, lineHeight: 1.55,
          opacity: 0.85,
        }}>
          Vi passer godt på dine data — her kan du læse hvordan.
        </p>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 72px' }}>
        {SEKTIONER.map((s, i) => (
          <section key={i} style={{
            background: C.cardBg,
            border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${i % 2 === 0 ? C.sage : C.dustyPink}`,
            borderRadius: 12,
            padding: '24px 28px',
            marginBottom: 16,
            boxShadow: '0 1px 4px rgba(48,34,24,.04)',
          }}>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22,
              fontWeight: 600,
              color: C.text,
              margin: '0 0 12px',
            }}>
              {s.titel}
            </h2>
            <div style={{ fontSize: 14.5, color: C.text, lineHeight: 1.7 }}>
              {s.indhold}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
