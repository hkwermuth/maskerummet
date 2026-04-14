'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

type BackgroundCarouselProps = {
  images: { src: string; alt: string }[]
  intervalMs?: number
  fadeMs?: number
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return

    const apply = () => setReduced(!!mq.matches)
    apply()

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }

    // Safari < 14
    ;(mq as MediaQueryList & { addListener?: (cb: () => void) => void }).addListener?.(apply)
    return () => {
      ;(mq as MediaQueryList & { removeListener?: (cb: () => void) => void }).removeListener?.(apply)
    }
  }, [])

  return reduced
}

export function BackgroundCarousel({
  images,
  intervalMs = 14000,
  fadeMs = 1600,
}: BackgroundCarouselProps) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const safeImages = useMemo(() => images.filter(Boolean), [images])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion) return
    if (safeImages.length <= 1) return

    const t = window.setInterval(() => {
      setIdx((prev) => (prev + 1) % safeImages.length)
    }, intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs, prefersReducedMotion, safeImages.length])

  const nextIdx = safeImages.length > 1 ? (idx + 1) % safeImages.length : idx

  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0">
        {safeImages.map((img, i) => {
          const isActive = i === idx
          return (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
              style={{
                opacity: prefersReducedMotion ? (i === 0 ? 1 : 0) : isActive ? 1 : 0,
                transition: prefersReducedMotion ? undefined : `opacity ${fadeMs}ms ease-in-out`,
              }}
            />
          )
        })}

        {/* Preload next image via browser cache (no visual impact) */}
        {safeImages.length > 1 ? (
          <Image
            src={safeImages[nextIdx]?.src}
            alt=""
            fill
            sizes="1px"
            className="opacity-0 pointer-events-none"
            aria-hidden="true"
          />
        ) : null}

        {/* Readability overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(244,239,230,0.68) 0%, rgba(244,239,230,0.78) 100%)',
          }}
        />
      </div>
    </div>
  )
}

