import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pressEscape() {
  fireEvent.keyDown(document, { key: 'Escape' })
}

function pressEnter() {
  fireEvent.keyDown(document, { key: 'Enter' })
}

// ---------------------------------------------------------------------------
// B1: useEscapeKey — active=false: onEscape ikke kaldt
// ---------------------------------------------------------------------------

describe('B1 useEscapeKey(false, fn) — kalder ikke fn', () => {
  it('kalder ikke onEscape når active=false og Escape trykkes', () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(false, onEscape))

    pressEscape()

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('kalder ikke onEscape for andre taster når active=false', () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(false, onEscape))

    pressEnter()

    expect(onEscape).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// B2: useEscapeKey — active=true: onEscape kaldt ved Escape
// ---------------------------------------------------------------------------

describe('B2 useEscapeKey(true, fn) — kalder fn ved Escape', () => {
  it('kalder onEscape præcis én gang når Escape trykkes og active=true', () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(true, onEscape))

    pressEscape()

    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('kalder onEscape for hvert Escape-tryk', () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(true, onEscape))

    pressEscape()
    pressEscape()

    expect(onEscape).toHaveBeenCalledTimes(2)
  })

  it('kalder ikke onEscape for andre taster end Escape', () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(true, onEscape))

    pressEnter()
    fireEvent.keyDown(document, { key: 'a' })

    expect(onEscape).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// B3: useEscapeKey — cleaner listener ved unmount
// ---------------------------------------------------------------------------

describe('B3 useEscapeKey — cleaner listener ved unmount', () => {
  it('kalder ikke onEscape efter unmount', () => {
    const onEscape = vi.fn()
    const { unmount } = renderHook(() => useEscapeKey(true, onEscape))

    unmount()
    pressEscape()

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('cleaner listener når active skifter fra true til false', () => {
    const onEscape = vi.fn()
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) => useEscapeKey(active, onEscape),
      { initialProps: { active: true } },
    )

    // Verificér at den virker mens active=true
    pressEscape()
    expect(onEscape).toHaveBeenCalledTimes(1)

    // Skift til false — listener skal fjernes
    rerender({ active: false })
    pressEscape()

    // Stadig kun ét kald
    expect(onEscape).toHaveBeenCalledTimes(1)
  })
})
