'use client'

import {
  CSSProperties,
  KeyboardEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

type Props = {
  images: string[]
  alt: string
  initialIndex?: number
  onIndexChange?: (i: number) => void
  className?: string
}

const SWIPE_PX_THRESHOLD = 50
const SWIPE_RATIO_THRESHOLD = 0.30
const SWIPE_VERTICAL_REJECT = 1.5
const TAP_MAX_MOVE = 8

export default function ImageCarousel({
  images,
  alt,
  initialIndex = 0,
  onIndexChange,
  className,
}: Props) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : []
  const total = safeImages.length
  const startIdx = total === 0 ? 0 : Math.min(Math.max(initialIndex, 0), total - 1)

  const [index, setIndex] = useState(startIdx)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const pointerRef = useRef<{
    id: number
    startX: number
    startY: number
    width: number
    cancelled: boolean
    isTap: boolean
  } | null>(null)

  useEffect(() => {
    if (index >= total && total > 0) setIndex(0)
  }, [total, index])

  useEffect(() => {
    onIndexChange?.(index)
  }, [index, onIndexChange])

  if (total === 0) return null

  const goTo = (next: number) => {
    if (total === 0) return
    const wrapped = ((next % total) + total) % total
    setIndex(wrapped)
  }
  const goPrev = () => goTo(index - 1)
  const goNext = () => goTo(index + 1)

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (total <= 1) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        if (typeof window !== 'undefined') window.open(safeImages[index], '_blank', 'noopener,noreferrer')
      }
      return
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      goPrev()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      goNext()
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (typeof window !== 'undefined') window.open(safeImages[index], '_blank', 'noopener,noreferrer')
    }
  }

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect()
    pointerRef.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      width: rect?.width ?? 320,
      cancelled: false,
      isTap: true,
    }
  }

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const ref = pointerRef.current
    if (!ref || ref.id !== e.pointerId || ref.cancelled) return
    const dx = e.clientX - ref.startX
    const dy = e.clientY - ref.startY
    if (Math.abs(dx) > TAP_MAX_MOVE || Math.abs(dy) > TAP_MAX_MOVE) ref.isTap = false
    if (Math.abs(dy) > Math.abs(dx) * SWIPE_VERTICAL_REJECT) {
      ref.cancelled = true
    }
  }

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const ref = pointerRef.current
    if (!ref || ref.id !== e.pointerId) return
    pointerRef.current = null

    if (ref.isTap) {
      if (typeof window !== 'undefined') window.open(safeImages[index], '_blank', 'noopener,noreferrer')
      return
    }

    if (ref.cancelled || total <= 1) return
    const dx = e.clientX - ref.startX
    const dy = e.clientY - ref.startY
    if (Math.abs(dy) > Math.abs(dx) * SWIPE_VERTICAL_REJECT) return
    const ratio = Math.abs(dx) / Math.max(ref.width, 1)
    if (Math.abs(dx) >= SWIPE_PX_THRESHOLD || ratio >= SWIPE_RATIO_THRESHOLD) {
      if (dx < 0) goNext(); else goPrev()
    }
  }

  const handlePointerCancel = () => {
    pointerRef.current = null
  }

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    background: '#1A1410',
    borderRadius: 8,
    overflow: 'hidden',
    touchAction: 'pan-y',
    outline: 'none',
  }

  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
    userSelect: 'none',
    pointerEvents: 'none',
  }

  const navBtnBase: CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    minWidth: 44,
    minHeight: 44,
    width: 44,
    height: 44,
    border: 'none',
    borderRadius: 999,
    background: 'rgba(255,252,247,.92)',
    color: '#2C2018',
    cursor: 'pointer',
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(44,32,24,.18)',
    fontFamily: "'DM Sans', sans-serif",
  }

  const dotsWrapStyle: CSSProperties = {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  }

  const currentUrl = safeImages[index]

  return (
    <div className={className}>
      <div
        ref={containerRef}
        role="group"
        aria-roledescription="karrusel"
        aria-label={`${alt}, billede ${index + 1} af ${total}. Tryk Enter for at åbne i ny fane.`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={containerStyle}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentUrl}
          alt={`${alt} ${index + 1} af ${total}`}
          style={imgStyle}
          draggable={false}
          loading="eager"
        />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              onPointerDown={e => e.stopPropagation()}
              aria-label={`Forrige billede (gå til billede ${((index - 1 + total) % total) + 1} af ${total})`}
              style={{ ...navBtnBase, left: 8 }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goNext}
              onPointerDown={e => e.stopPropagation()}
              aria-label={`Næste billede (gå til billede ${((index + 1) % total) + 1} af ${total})`}
              style={{ ...navBtnBase, right: 8 }}
            >
              ›
            </button>
          </>
        )}

        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={-1}
          aria-hidden="true"
          onPointerDown={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            padding: '4px 10px',
            borderRadius: 999,
            fontSize: 11,
            background: 'rgba(255,252,247,.92)',
            color: '#2C2018',
            textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 1px 3px rgba(44,32,24,.18)',
          }}
        >
          Åbn ↗
        </a>
      </div>

      {/* Pre-load nabo-billeder så bladring føles snappy */}
      {total > 1 && (
        <div aria-hidden="true" style={{ display: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={safeImages[(index + 1) % total]} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={safeImages[(index - 1 + total) % total]} alt="" />
        </div>
      )}

      {total > 1 && (
        <div style={dotsWrapStyle}>
          {safeImages.map((_, i) => {
            const active = i === index
            return (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Gå til billede ${i + 1} af ${total}`}
                aria-current={active ? 'true' : undefined}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  width: 44,
                  height: 44,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'block',
                    width: active ? 12 : 8,
                    height: active ? 12 : 8,
                    borderRadius: '50%',
                    background: active ? '#2C2018' : '#C9BEAF',
                    transition: 'all .15s',
                  }}
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
