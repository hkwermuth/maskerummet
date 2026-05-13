import { NextResponse } from 'next/server'

/**
 * Nyhedsbrev-tilmeldings-endpoint.
 *
 * **Status: placeholder.** Validerer email og returnerer success — men
 * gemmer ikke nogen steder endnu. Når Hannah har valgt integration
 * (Mailerlite, Buttondown, Supabase-tabel `newsletter_signups`, ...),
 * hookes den ind her uden at frontend skal ændres.
 *
 * Indtil da: tilmeldinger logges til server-console og brugeren ser
 * en venlig "Tak"-besked. Brugeren bliver henvist til kontakt@striq.dk
 * hvis de vil sikre at de hører fra os.
 */
export async function POST(request: Request) {
  let email: string
  try {
    const body = await request.json()
    email = String(body?.email ?? '').trim().toLowerCase()
  } catch {
    return NextResponse.json({ error: 'Ugyldigt format.' }, { status: 400 })
  }

  // Basal email-validering. Strengere validering hører til når integration er på plads.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Skriv en gyldig e-mail.' }, { status: 400 })
  }

  // TODO: Når integration er valgt, gem her. For nu: log til server-output
  // så Hannah kan se tilmeldinger i Vercel-loggen indtil videre.
  console.log('[newsletter-signup]', email, new Date().toISOString())

  return NextResponse.json({
    success: true,
    message: 'Tak for din tilmelding!',
  })
}
