import type { Metadata } from 'next'
import './globals.css'
import { BackgroundCarousel } from '@/components/layout/BackgroundCarousel'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { HashRedirect } from '@/components/layout/HashRedirect'
import { OnboardingGate } from '@/components/app/OnboardingGate'

export const metadata: Metadata = {
  title: {
    default: 'Striq — Dit personlige garnunivers',
    template: '%s | Striq',
  },
  description:
    'Hold styr på dit garnlager, gem dine projekter, find inspiration og prøv nye farver — alt samlet et sted.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  ),
}

const BG_IMAGES = [
  { src: '/backgrounds/baggrund_1.JPG',      alt: '' },
  { src: '/backgrounds/baggrund_2.JPEG.JPG', alt: '' },
  { src: '/backgrounds/baggrund_3.JPG',      alt: '' },
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="da">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=DM+Sans:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ minHeight: '100vh', background: '#F8F3EE', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <BackgroundCarousel images={BG_IMAGES} />
        <HashRedirect />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Nav />
          <main style={{ minHeight: 'calc(100vh - 58px - 57px)' }}>
            {children}
          </main>
          <Footer />
        </div>
        <OnboardingGate />
      </body>
    </html>
  )
}
