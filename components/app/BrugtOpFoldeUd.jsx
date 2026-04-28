'use client'

import { useId } from 'react'
import { toISODate } from '@/lib/date/formatDanish'

// F5: Folde-ud i Tilføj/Rediger garn-formularen der vises når status = "Brugt op".
// Spørger hvad garnet blev brugt til + dato. Visuelt orange via F9 src-warning-tokens.
//
// Projekt-feltet bruger <input list> + <datalist> for native autocomplete på tværs
// af platforme uden ekstra JS — robust på mobil og keyboard-only-brug.

export default function BrugtOpFoldeUd({
  brugtTilProjekt,
  brugtOpDato,
  onChangeProjekt,
  onChangeDato,
  existingProjects = [],
  error,
}) {
  const datalistId = useId()
  const projektInputId = useId()
  const datoInputId = useId()
  const errorId = useId()

  const today = toISODate(new Date())
  const datoValue = brugtOpDato || today

  return (
    <section
      data-testid="brugt-op-folde-ud"
      aria-label="Hvad blev garnet brugt til"
      className="bg-striq-src-warning-bg text-striq-src-warning-fg col-span-full flex flex-col gap-3 rounded-lg px-3.5 py-3"
      style={{ border: '1px solid #E5C896' }}
    >
      <div className="text-[10px] uppercase tracking-[.12em] font-semibold">
        Hvad blev garnet brugt til?
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={projektInputId}
          className="text-[11px] uppercase tracking-[.1em] font-medium opacity-80"
        >
          Projekt
        </label>
        <input
          id={projektInputId}
          type="text"
          value={brugtTilProjekt || ''}
          onChange={e => onChangeProjekt(e.target.value)}
          list={existingProjects.length > 0 ? datalistId : undefined}
          placeholder="Fx Sierraknit Diamond Top"
          aria-required="true"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="bg-white border rounded-md px-2.5 py-2 text-[13px] font-sans text-striq-src-warning-fg"
          style={{ borderColor: error ? '#791F1F' : '#D0C8BA' }}
        />
        {existingProjects.length > 0 && (
          <datalist id={datalistId}>
            {existingProjects.map(p => (
              <option key={p.id} value={p.title || ''} />
            ))}
          </datalist>
        )}
        {error && (
          <div
            id={errorId}
            role="alert"
            className="text-[11px] text-striq-src-error-fg mt-0.5"
          >
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={datoInputId}
          className="text-[11px] uppercase tracking-[.1em] font-medium opacity-80"
        >
          Brugt op den
        </label>
        <input
          id={datoInputId}
          type="date"
          value={datoValue}
          onChange={e => onChangeDato(e.target.value)}
          className="bg-white border border-[#D0C8BA] rounded-md px-2.5 py-2 text-[13px] font-sans text-striq-src-warning-fg"
          style={{ width: 'fit-content', minWidth: 160 }}
        />
      </div>

      <p className="m-0 text-[11px] italic opacity-80">
        Antal nøgler sættes til 0 når du gemmer.
      </p>
    </section>
  )
}
