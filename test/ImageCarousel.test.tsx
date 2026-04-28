/**
 * components/app/ImageCarousel — tests
 *
 * AC 16  images=[] → null (intet rendret)
 * AC 17  1 billede → ingen pile, ingen prikker
 * AC 18  3 billeder → 2 pile + 3 prikker; klik Næste → billede 2
 * AC 19  Klik på prik nr. 3 → billede 3
 * AC 20  Tastatur ArrowLeft/ArrowRight navigerer
 * AC 21  Pile- og prik-knapper ≥ 44px og dansk aria-label
 * AC 22  "Åbn ↗"-tag har target="_blank" + rel der indeholder "noreferrer" + korrekt href
 * AC 23  Swipe venstre (≥50px) skifter til næste billede
 * AC 24  Swipe højre (≥50px) skifter til forrige billede
 * AC 25  Vertikal swipe afvises (billede skifter ikke)
 * AC 26  Tap (ingen bevægelse) kalder window.open med korrekt URL
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import ImageCarousel from '@/components/app/ImageCarousel'

const THREE_IMAGES = [
  'https://example.com/img1.jpg',
  'https://example.com/img2.jpg',
  'https://example.com/img3.jpg',
]

describe('ImageCarousel – ingen billeder', () => {
  it('AC16 – images=[] renderer intet (null)', () => {
    const { container } = render(<ImageCarousel images={[]} alt="Test" />)
    expect(container.firstChild).toBeNull()
  })
})

describe('ImageCarousel – ét billede', () => {
  it('AC17 – ingen pile ved 1 billede', () => {
    render(<ImageCarousel images={['https://example.com/img1.jpg']} alt="Test" />)
    expect(screen.queryByRole('button', { name: /forrige billede/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /næste billede/i })).not.toBeInTheDocument()
  })

  it('AC17 – ingen prikker ved 1 billede', () => {
    render(<ImageCarousel images={['https://example.com/img1.jpg']} alt="Test" />)
    expect(screen.queryByRole('button', { name: /gå til billede/i })).not.toBeInTheDocument()
  })
})

describe('ImageCarousel – 3 billeder', () => {
  it('AC18 – 2 pile vises', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Test" />)
    expect(screen.getByRole('button', { name: /forrige billede/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /næste billede/i })).toBeInTheDocument()
  })

  it('AC18 – 3 prikker vises', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Test" />)
    const allButtons = screen.getAllByRole('button')
    const dotButtons = allButtons.filter(btn =>
      /^Gå til billede \d+ af \d+$/.test(btn.getAttribute('aria-label') ?? '')
    )
    expect(dotButtons).toHaveLength(3)
  })

  it('AC18 – klik Næste går til billede 2', async () => {
    const user = userEvent.setup()
    render(<ImageCarousel images={THREE_IMAGES} alt="Foto" />)

    const container = screen.getByRole('group', { name: /foto, billede 1 af 3/i })
    expect(container).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /næste billede/i }))

    expect(screen.getByRole('group', { name: /foto, billede 2 af 3/i })).toBeInTheDocument()
  })

  it('AC19 – klik på prik 3 hopper til billede 3', async () => {
    const user = userEvent.setup()
    render(<ImageCarousel images={THREE_IMAGES} alt="Foto" />)

    const allButtons = screen.getAllByRole('button')
    const dot3 = allButtons.find(
      btn => btn.getAttribute('aria-label') === 'Gå til billede 3 af 3'
    )
    expect(dot3).toBeDefined()
    await user.click(dot3!)

    expect(screen.getByRole('group', { name: /foto, billede 3 af 3/i })).toBeInTheDocument()
  })

  it('AC20 – ArrowRight på fokuseret container navigerer til næste', async () => {
    const user = userEvent.setup()
    render(<ImageCarousel images={THREE_IMAGES} alt="Foto" />)

    const container = screen.getByRole('group')
    container.focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('group', { name: /foto, billede 2 af 3/i })).toBeInTheDocument()
  })

  it('AC20 – ArrowLeft på fokuseret container navigerer til forrige (wrap)', async () => {
    const user = userEvent.setup()
    render(<ImageCarousel images={THREE_IMAGES} alt="Foto" />)

    const container = screen.getByRole('group')
    container.focus()

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('group', { name: /foto, billede 3 af 3/i })).toBeInTheDocument()
  })

  it('AC21 – pile-knapper har minHeight og minWidth 44 i style', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Test" />)
    const nextBtn = screen.getByRole('button', { name: /næste billede/i })
    const prevBtn = screen.getByRole('button', { name: /forrige billede/i })

    expect(nextBtn.style.minHeight).toBe('44px')
    expect(nextBtn.style.minWidth).toBe('44px')
    expect(prevBtn.style.minHeight).toBe('44px')
    expect(prevBtn.style.minWidth).toBe('44px')
  })

  it('AC21 – prik-knapper har minHeight og minWidth 44 i style', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Test" />)
    const dots = screen.getAllByRole('button', { name: /gå til billede/i })
    dots.forEach(dot => {
      expect(dot.style.minHeight).toBe('44px')
      expect(dot.style.minWidth).toBe('44px')
    })
  })

  it('AC21 – pile-aria-labels er på dansk', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Test" />)
    expect(screen.getByRole('button', { name: /forrige billede/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /næste billede/i })).toBeInTheDocument()
  })

  it('AC21 – prik-aria-labels er på dansk', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Test" />)
    expect(screen.getByRole('button', { name: /gå til billede 1 af 3/i })).toBeInTheDocument()
  })
})

describe('ImageCarousel – "Åbn ↗"-link (AC22)', () => {
  // Linket er aria-hidden="true" og tabIndex={-1}, så vi henter det direkte via querySelector
  function getAbnLink(container: HTMLElement) {
    return container.querySelector('a[href]') as HTMLAnchorElement | null
  }

  it('AC22 – link har target="_blank"', () => {
    const { container } = render(
      <ImageCarousel images={['https://example.com/img1.jpg']} alt="Test" />
    )
    const link = getAbnLink(container)
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('AC22 – link har rel der indeholder "noreferrer"', () => {
    const { container } = render(
      <ImageCarousel images={['https://example.com/img1.jpg']} alt="Test" />
    )
    const link = getAbnLink(container)
    expect(link).not.toBeNull()
    // "noopener noreferrer" er superset af "noreferrer" — acceptér begge
    expect(link!.getAttribute('rel')).toContain('noreferrer')
  })

  it('AC22 – link href peger på det aktuelle billede', () => {
    const { container } = render(
      <ImageCarousel images={['https://example.com/img1.jpg']} alt="Test" />
    )
    const link = getAbnLink(container)
    expect(link).toHaveAttribute('href', 'https://example.com/img1.jpg')
  })

  it('AC22 – link href opdateres når aktivt billede skifter', async () => {
    const user = userEvent.setup()
    const { container } = render(<ImageCarousel images={THREE_IMAGES} alt="Test" />)

    await user.click(screen.getByRole('button', { name: /næste billede/i }))

    const link = getAbnLink(container)
    expect(link).toHaveAttribute('href', 'https://example.com/img2.jpg')
  })
})

describe('ImageCarousel – pointer-events / swipe / tap (AC23-26)', () => {
  beforeEach(() => {
    vi.stubGlobal('open', vi.fn())
  })

  function getContainer() {
    return screen.getByRole('group')
  }

  /** Hjælper: fire pointerDown → pointerMove → pointerUp */
  function swipe(
    el: HTMLElement,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    pointerId = 1,
  ) {
    fireEvent.pointerDown(el, { pointerId, clientX: startX, clientY: startY })
    fireEvent.pointerMove(el, { pointerId, clientX: endX, clientY: endY })
    fireEvent.pointerUp(el, { pointerId, clientX: endX, clientY: endY })
  }

  it('AC23 – swipe venstre (≥50px horizontal) skifter til næste billede', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Foto" />)
    const container = getContainer()

    // Sæt getBoundingClientRect så width er 320
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      width: 320, height: 180, top: 0, left: 0, right: 320, bottom: 180,
      x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect)

    expect(screen.getByRole('group', { name: /billede 1 af 3/i })).toBeInTheDocument()

    swipe(container, 200, 100, 120, 100) // dx = -80 (venstre = næste)

    expect(screen.getByRole('group', { name: /billede 2 af 3/i })).toBeInTheDocument()
  })

  it('AC24 – swipe højre (≥50px horizontal) skifter til forrige billede (wrap)', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Foto" />)
    const container = getContainer()

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      width: 320, height: 180, top: 0, left: 0, right: 320, bottom: 180,
      x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect)

    swipe(container, 200, 100, 280, 100) // dx = +80 (højre = forrige, wrap til 3)

    expect(screen.getByRole('group', { name: /billede 3 af 3/i })).toBeInTheDocument()
  })

  it('AC25 – vertikal swipe afvises (billede skifter ikke)', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Foto" />)
    const container = getContainer()

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      width: 320, height: 180, top: 0, left: 0, right: 320, bottom: 180,
      x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect)

    // dy=100 >> dx=10*1.5 → vertikal dominerer → afvises
    swipe(container, 200, 100, 210, 200)

    expect(screen.getByRole('group', { name: /billede 1 af 3/i })).toBeInTheDocument()
  })

  it('AC26 – tap (ingen bevægelse) kalder window.open med korrekt URL', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Foto" />)
    const container = getContainer()

    // Tap: pointerDown og pointerUp på nøjagtig samme position (ingen move)
    fireEvent.pointerDown(container, { pointerId: 1, clientX: 160, clientY: 90 })
    fireEvent.pointerUp(container, { pointerId: 1, clientX: 160, clientY: 90 })

    expect(window.open).toHaveBeenCalledWith(
      'https://example.com/img1.jpg',
      '_blank',
      'noopener,noreferrer',
    )
  })

  it('AC26 – tap på billede 2 (efter swipe) kalder window.open med billede 2 URL', () => {
    render(<ImageCarousel images={THREE_IMAGES} alt="Foto" />)
    const container = getContainer()

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      width: 320, height: 180, top: 0, left: 0, right: 320, bottom: 180,
      x: 0, y: 0, toJSON: () => ({}),
    } as DOMRect)

    // Swipe til billede 2
    swipe(container, 200, 100, 120, 100)
    expect(screen.getByRole('group', { name: /billede 2 af 3/i })).toBeInTheDocument()

    // Tap på billede 2
    fireEvent.pointerDown(container, { pointerId: 2, clientX: 160, clientY: 90 })
    fireEvent.pointerUp(container, { pointerId: 2, clientX: 160, clientY: 90 })

    expect(window.open).toHaveBeenLastCalledWith(
      'https://example.com/img2.jpg',
      '_blank',
      'noopener,noreferrer',
    )
  })
})
