'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { OPSKRIFTER_TOKENS as T } from '@/lib/opskrifter-tokens'

type Option = {
  value: string
  label: string
}

type Props = {
  /** Synlig label, fx "Målgruppe" */
  label: string
  options: Option[]
  selected: string[]
  onChange: (next: string[]) => void
  /** Tekst når intet er valgt, fx "alle" */
  placeholder?: string
}

/**
 * Genanvendelig multi-select dropdown med ARIA combobox-pattern.
 * Ingen eksterne deps; tegnes inline. Følger maskerummet'-stilen.
 *
 * Tilgængelighed:
 *  - <button role="combobox" aria-expanded aria-controls aria-haspopup="listbox">
 *  - <ul role="listbox" aria-multiselectable="true">
 *  - <li role="option" aria-selected>
 *  - Escape lukker, Space/Enter toggler, klik udenfor lukker.
 *  - Touch-target ≥ 44px (knap har minHeight 44).
 */
export function MultiSelect({ label, options, selected, onChange, placeholder = 'alle' }: Props) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const listboxId = useId()

  // Luk ved klik udenfor
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Sæt fokus på listen når den åbner — så piletaster virker straks.
  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  function toggleValue(v: string) {
    if (selected.includes(v)) onChange(selected.filter((s) => s !== v))
    else onChange([...selected, v])
  }

  function onTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
      setActiveIdx(0)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function onListKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(options.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIdx(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIdx(options.length - 1)
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      const opt = options[activeIdx]
      if (opt) toggleValue(opt.value)
    }
  }

  const buttonText =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
        : `${selected.length} valgt`

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 4 }}>
      <span
        id={`${listboxId}-label`}
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          color: T.textMuted,
        }}
      >
        {label}
      </span>
      <div style={{ position: 'relative' }}>
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={`${listboxId}-label`}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onTriggerKey}
          style={{
            minHeight: 44,
            minWidth: 140,
            padding: '8px 12px',
            background: T.white,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            fontSize: 13,
            color: T.text,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            fontFamily: 'inherit',
          }}
        >
          <span style={{
            color: selected.length === 0 ? T.textMuted : T.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {buttonText}
          </span>
          <span aria-hidden="true" style={{ fontSize: 10, color: T.textMuted }}>
            {open ? '▲' : '▼'}
          </span>
        </button>

        {open && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={`${listboxId}-label`}
            tabIndex={-1}
            onKeyDown={onListKey}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              minWidth: '100%',
              maxHeight: 280,
              overflowY: 'auto',
              background: T.white,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              boxShadow: '0 4px 14px rgba(40,30,15,.10)',
              listStyle: 'none',
              padding: 4,
              margin: 0,
              zIndex: 30,
            }}
          >
            {options.length === 0 && (
              <li
                role="option"
                aria-selected="false"
                aria-disabled="true"
                style={{ padding: '8px 12px', fontSize: 13, color: T.textMuted }}
              >
                Ingen muligheder
              </li>
            )}
            {options.map((opt, idx) => {
              const isSelected = selected.includes(opt.value)
              const isActive = idx === activeIdx
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleValue(opt.value)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  style={{
                    padding: '8px 10px',
                    fontSize: 13,
                    color: T.text,
                    cursor: 'pointer',
                    borderRadius: 6,
                    background: isActive ? `${T.accent}55` : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 32,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 16, height: 16,
                      border: `1.5px solid ${isSelected ? T.sage : T.border}`,
                      borderRadius: 3,
                      background: isSelected ? T.sage : T.white,
                      color: T.white,
                      fontSize: 11,
                      lineHeight: 1,
                      flexShrink: 0,
                    }}
                  >
                    {isSelected ? '✓' : ''}
                  </span>
                  <span>{opt.label}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
