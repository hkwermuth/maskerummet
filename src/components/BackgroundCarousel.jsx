import { useEffect, useMemo, useState } from 'react'

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
    mq.addListener?.(apply)
    return () => mq.removeListener?.(apply)
  }, [])

  return reduced
}

export default function BackgroundCarousel({
  images,
  intervalMs = 14000,
  fadeMs = 1600,
  overlay = 'linear-gradient(180deg, rgba(244,239,230,0.68) 0%, rgba(244,239,230,0.78) 100%)',
}) {
  const prefersReducedMotion = usePrefersReducedMotion()
  const safeImages = useMemo(() => (images ?? []).filter(Boolean), [images])
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion) return
    if (safeImages.length <= 1) return
    const t = window.setInterval(() => {
      setIdx(prev => (prev + 1) % safeImages.length)
    }, intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs, prefersReducedMotion, safeImages.length])

  if (safeImages.length === 0) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      pointerEvents: 'none',
    }}>
      {safeImages.map((src, i) => {
        const isActive = prefersReducedMotion ? i === 0 : i === idx
        return (
          <img
            key={src}
            src={src}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isActive ? 1 : 0,
              transition: prefersReducedMotion ? undefined : `opacity ${fadeMs}ms ease-in-out`,
            }}
          />
        )
      })}

      <div style={{
        position: 'absolute',
        inset: 0,
        background: overlay,
      }} />
    </div>
  )
}

