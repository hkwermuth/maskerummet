import './globals.css'
import type { Metadata } from 'next'
import { SiteTopNav } from '@/components/SiteTopNav'
import { BackgroundCarousel } from '@/components/BackgroundCarousel'

export const metadata: Metadata = {
  title: {
    default: 'Maskerummet — Garn-katalog',
    template: '%s — Maskerummet',
  },
  description:
    'Dansk garn-katalog med fibre, løbelængde, pinde, strikkefasthed, pleje og oprindelse for hvert garn.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://maskerummet.vercel.app'),
  // Blokér indeksering indtil siden er klar. Fjern dette felt for at åbne for Google.
  robots: { index: false, follow: false, nocache: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="da">
      <body>
        <BackgroundCarousel
          images={[
            { src: '/garn/backgrounds/baggrund_1.JPG', alt: 'Baggrundsbillede 1' },
            { src: '/garn/backgrounds/baggrund_2.JPEG.JPG', alt: 'Baggrundsbillede 2' },
            { src: '/garn/backgrounds/baggrund_3.JPG', alt: 'Baggrundsbillede 3' },
          ]}
        />
        <div className="relative z-10 min-h-screen">
          <header>
            <SiteTopNav />
          </header>
          <main className="max-w-5xl mx-auto px-5 py-10">{children}</main>
          <footer className="max-w-5xl mx-auto px-5 py-10 text-xs text-bark">
            © Maskerummet
          </footer>
        </div>
      </body>
    </html>
  )
}
