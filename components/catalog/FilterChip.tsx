'use client'

// Genbrugbar chip-knap til filtre. Minimumshøjde 44px (touch-target).
export function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        minHeight: 44,
        padding: '8px 16px',
        borderRadius: 999,
        border: '1px solid',
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        background: active ? '#61846D' : '#FFFCF7',
        color: active ? '#FFFCF7' : '#302218',
        borderColor: active ? '#61846D' : '#D0C8BA',
        fontWeight: active ? 500 : 400,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}
