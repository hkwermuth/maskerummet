'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toSlug } from '@/lib/slug'
import BarcodeScanner from '@/components/app/BarcodeScanner'

/**
 * "Skan banderole"-knap til /garn-listen.
 *
 * Åbner scanner-modal i "find dette garn"-tilstand (uden lager-flow).
 * Ved match navigeres til /garn/<slug>?farve=<color_id>.
 */
export function ScanFraKatalogButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  function handleSelectYarn(yarn: { producer: string; name: string; series: string | null }, color: { id: string }) {
    const slug = toSlug(yarn.producer, yarn.name, yarn.series)
    router.push(`/garn/${slug}?farve=${color.id}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Skan en banderole for at finde garnet i kataloget"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-striq-sage text-striq-sage bg-cream hover:bg-striq-sage hover:text-cream transition-colors text-sm whitespace-nowrap"
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M7 9v6M11 9v6M15 9v6M19 9v6" />
        </svg>
        <span>Skan banderole</span>
      </button>

      {open && (
        <BarcodeScanner
          onClose={() => setOpen(false)}
          onSelectYarn={handleSelectYarn}
        />
      )}
    </>
  )
}
