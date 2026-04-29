'use client'

import { useId } from 'react'
import { toISODate } from '@/lib/date/formatDanish'

// F15: Folde-ud i Tilføj/Rediger garn-formularen der vises når status = "Brugt op".
// Tre tilstande for projekt-kobling:
//   - 'none'     → bare brugt op, ingen yarn_usage oprettes
//   - 'existing' → vælg fra brugerens egne projekter; yarn_usage oprettes
//   - 'new'      → opret nyt projekt + yarn_usage
//
// Default = 'none' (mest valgfri — matcher at det ofte er gamle rester).
// Pill-tabs ligner BrugNoeglerModal-projekt-vælgeren for UX-konsistens.

const MODE_LABELS = {
  none:     'Intet projekt',
  existing: 'Eksisterende projekt',
  new:      'Nyt projekt',
}

export default function BrugtOpFoldeUd({
  mode,
  onChangeMode,
  selectedProjectId,
  onChangeProjectId,
  newProjectTitle,
  onChangeNewProjectTitle,
  brugtOpDato,
  onChangeDato,
  existingProjects = [],
  errors = {},
}) {
  const datoInputId = useId()
  const selectInputId = useId()
  const newTitleInputId = useId()
  const projectErrorId = useId()
  const titleErrorId = useId()

  const today = toISODate(new Date())
  const datoValue = brugtOpDato || today
  const activeMode = mode || 'none'

  const projectError = errors.brugtOpProjectId
  const titleError = errors.brugtOpNewTitle

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

      <div
        role="tablist"
        aria-label="Vælg projekt-kobling"
        className="flex flex-wrap gap-1.5"
      >
        {(['none', 'existing', 'new']).map(m => {
          const active = activeMode === m
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`brugt-op-mode-${m}`}
              onClick={() => onChangeMode(m)}
              className="font-sans text-[12px] cursor-pointer"
              style={{
                minHeight: 44,
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid',
                background: active ? '#FFFFFF' : 'transparent',
                color: '#633806',
                borderColor: active ? '#633806' : '#D0C8BA',
                fontWeight: active ? 500 : 400,
              }}
            >
              {MODE_LABELS[m]}
            </button>
          )
        })}
      </div>

      {activeMode === 'existing' && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={selectInputId}
            className="text-[11px] uppercase tracking-[.1em] font-medium opacity-80"
          >
            Vælg projekt
          </label>
          <select
            id={selectInputId}
            value={selectedProjectId || ''}
            onChange={e => onChangeProjectId(e.target.value)}
            aria-invalid={Boolean(projectError)}
            aria-describedby={projectError ? projectErrorId : undefined}
            className="bg-white border rounded-md px-2.5 py-2 text-[13px] font-sans text-striq-src-warning-fg"
            style={{ borderColor: projectError ? '#791F1F' : '#D0C8BA', minHeight: 44 }}
          >
            <option value="">— Vælg —</option>
            {existingProjects.map(p => (
              <option key={p.id} value={p.id}>
                {p.title || 'Unavngivet projekt'}
              </option>
            ))}
          </select>
          {existingProjects.length === 0 && (
            <p className="m-0 text-[11px] italic opacity-80">
              Du har ingen projekter endnu — vælg "Nyt projekt" for at oprette ét.
            </p>
          )}
          {projectError && (
            <div
              id={projectErrorId}
              role="alert"
              className="text-[11px] text-striq-src-error-fg mt-0.5"
            >
              {projectError}
            </div>
          )}
        </div>
      )}

      {activeMode === 'new' && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor={newTitleInputId}
            className="text-[11px] uppercase tracking-[.1em] font-medium opacity-80"
          >
            Projekttitel
          </label>
          <input
            id={newTitleInputId}
            type="text"
            value={newProjectTitle || ''}
            onChange={e => onChangeNewProjectTitle(e.target.value)}
            placeholder="Fx Sierraknit Diamond Top"
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? titleErrorId : undefined}
            className="bg-white border rounded-md px-2.5 py-2 text-[13px] font-sans text-striq-src-warning-fg"
            style={{ borderColor: titleError ? '#791F1F' : '#D0C8BA' }}
          />
          <p className="m-0 text-[11px] italic opacity-80">
            Projektet oprettes med status "I gang" — du kan markere det færdigt i Arkiv.
          </p>
          {titleError && (
            <div
              id={titleErrorId}
              role="alert"
              className="text-[11px] text-striq-src-error-fg mt-0.5"
            >
              {titleError}
            </div>
          )}
        </div>
      )}

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
