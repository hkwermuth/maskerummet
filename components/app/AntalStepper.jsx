'use client'

// −/n/+ stepper til "Antal nøgler".
// Touch-targets ≥ 44px på knapper. Accepterer komma som decimal (da-locale).

export default function AntalStepper({
  value,
  onChange,
  min = 0,
  step = 0.25,
  ariaLabel = 'Antal nøgler',
}) {
  const num = parseDanishNumber(value)
  const safe = Number.isFinite(num) ? num : 0

  function inc() {
    onChange(round(safe + step))
  }

  function dec() {
    onChange(round(Math.max(min, safe - step)))
  }

  function handleInput(e) {
    onChange(e.target.value)
  }

  function handleBlur(e) {
    const n = parseDanishNumber(e.target.value)
    if (Number.isFinite(n)) {
      onChange(round(Math.max(min, n)))
    } else {
      onChange(min)
    }
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'stretch',
        border: '1px solid #D0C8BA',
        borderRadius: 6,
        background: '#F9F6F0',
        overflow: 'hidden',
        height: 44,
      }}
    >
      <button
        type="button"
        onClick={dec}
        disabled={safe <= min}
        aria-label="Mindsk antal nøgler"
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          minHeight: 44,
          padding: 0,
          border: 'none',
          borderRight: '1px solid #D0C8BA',
          background: 'transparent',
          color: '#2C2018',
          fontSize: 18,
          fontFamily: "'DM Sans', sans-serif",
          cursor: safe <= min ? 'not-allowed' : 'pointer',
          opacity: safe <= min ? 0.4 : 1,
        }}
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        lang="da"
        value={value ?? ''}
        onChange={handleInput}
        onBlur={handleBlur}
        aria-label={ariaLabel}
        style={{
          width: 64,
          height: 44,
          padding: '0 8px',
          border: 'none',
          background: 'transparent',
          textAlign: 'center',
          fontSize: 14,
          color: '#2C2018',
          fontFamily: "'DM Sans', sans-serif",
        }}
      />
      <button
        type="button"
        onClick={inc}
        aria-label="Forøg antal nøgler"
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          minHeight: 44,
          padding: 0,
          border: 'none',
          borderLeft: '1px solid #D0C8BA',
          background: 'transparent',
          color: '#2C2018',
          fontSize: 18,
          fontFamily: "'DM Sans', sans-serif",
          cursor: 'pointer',
        }}
      >
        +
      </button>
    </div>
  )
}

function parseDanishNumber(v) {
  if (v == null) return NaN
  if (typeof v === 'number') return v
  const s = String(v).trim().replace(',', '.')
  if (s === '') return NaN
  return Number(s)
}

function round(n) {
  return Math.round(n * 100) / 100
}
