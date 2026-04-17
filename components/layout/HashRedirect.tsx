'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

// Legacy Vite-SPA hash-URLs mapped til nye Next.js-ruter.
const HASH_MAP: Record<string, string> = {
  '#hjem':            '/',
  '#garnlager':       '/garnlager',
  '#tab=garnlager':   '/garnlager',
  '#arkiv':           '/projekter',
  '#tab=arkiv':       '/projekter',
  '#projekter':       '/projekter',
  '#ideer':           '/ideer',
  '#visualizer':      '/visualizer',
  '#kalender':        '/kalender',
  '#findgarn':        '/find-forhandler',
  '#find-forhandler': '/find-forhandler',
  '#opskrifter':      '/opskrifter',
  '#strikkeskolen':   '/strikkeskolen',
  '#om-striq':        '/om-striq',
  '#om-maskerummet':  '/om-striq',
  '#faq':             '/faq',
}

export function HashRedirect() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash
    if (!hash) return
    const target = HASH_MAP[hash]
    if (target && target !== pathname) {
      // Fjern hash og naviger.
      history.replaceState(null, '', window.location.pathname)
      router.replace(target)
    }
  }, [pathname, router])

  return null
}
