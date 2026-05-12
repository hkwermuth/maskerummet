# Fase 3 — Arkitektur og konventioner

**Kørt:** 2026-05-12 (manuelt — baggrundsagent var hængt efter ~4t)
**Metode:** wc-l på alle komponenter, læsning af `lib/types.ts` + `lib/supabase/*` + `lib/data/*`, krydsreference med Fase 1 og Fase 5.

## Sammenfatning

Strukturen er sund (`lib/` for helpers, `components/` for delte komponenter, `app/` for routes), data-access er korrekt opdelt i 7 fokuserede `lib/data/`-moduler, og Supabase-client-laget er rent (admin/client/public/server/mappers/storage). **Den dominerende arkitekturgæld er 6 massive utyped JSX-filer** på samlet ~7400 linjer (`Arkiv.jsx` 3013, `Garnlager.jsx` 1615, `YarnVisualizer.jsx` 1287, `GarnLinjeVælger.jsx` 608, `BarcodeScanner.jsx` 527, `DelMedFaellesskabetModal.jsx` 331). Disse rummer kerne-flowet (garnlager + projekter), er udenfor TypeScript-coverage, og er sandsynligvis hvor 12 fejlende tests stammer fra.

## 🔴 Blokerende før testbruger-launch

- **[Type-sikkerhed/kerne-flow]** 6 store utyped JSX-filer i datakritisk kode — komponenter under `components/app/`:
  - `Arkiv.jsx` (3013 linjer) — projekter, status-flow, sletning, billed-håndtering
  - `Garnlager.jsx` (1615 linjer) — yarn_items CRUD, brugt-op-flow
  - `YarnVisualizer.jsx` (1287 linjer) — AI-visualizer
  - `GarnLinjeVælger.jsx` (608 linjer) — projektets yarn-linje-editor
  - `BarcodeScanner.jsx` (527 linjer) — kamera-baseret stregkodescanner
  - `DelMedFaellesskabetModal.jsx` (331 linjer) — share-flow
  
  Konsekvens: typer kan drifte uden CI-fejl (fx `status: "igangvaerende"` vs enum `"i_gang"` — den fejl ses faktisk i tests). Data-tab-risiko hvis felter omdøbes i Supabase. Anbefaling før launch: ikke nødvendigvis full TS-konvertering, men **minimum** propTypes eller JSDoc-types på offentlige props + en CI-gate der fanger drift. Ideelt: konverter `Garnlager.jsx` og `Arkiv.jsx` til `.tsx` (de er kerneflowet) som dedikeret feature før launch.

## 🟡 Bør fixes inden launch

- **[Komponent-størrelse]** Top-10 over 400 linjer (TypeScript):
  - `components/layout/HeroIllustration.tsx` (667) — illustration, lav kritikalitet, kan blive
  - `components/catalog/substitutions/SubstitutionsSection.tsx` (623) — kompleks katalog-feature; bør splittes i SubstitutionList + SubstitutionVote + SubstitutionForm
  - `components/app/MarkYarnsBrugtOpModal.tsx` (460) — kerne-modal, bør splittes
  - `components/app/BrugNoeglerModal.tsx` (432) — kerne-modal, bør splittes (har 5 `any`)
  - `components/app/ColorNumberOcr.tsx` (331), `ImageCarousel.tsx` (308), `BarcodeSuggestionForm.tsx` (308) — grænse-tilfælde
  - Bag siderne: `app/kalender/page.tsx` (752), `app/find-forhandler/FindForhandlerClient.tsx` (675) — flagget i Fase 5
- **[Server/client]** 21 sider er klient-komponenter — flere kunne være server-rendret med klient-børn:
  - `app/om-striq/page.tsx` (413 linjer 'use client') — statisk indhold, kan være server
  - `app/visualizer/page.tsx` ('use client') — bør serveren gate-checke auth (jf. Fase 5)
  - `app/garnlager/page.tsx` ('use client') — orchestrator-side; kunne lave server-side data-prefetch
- **[Type-drift]** Test-fixtures bekræfter at typer er drifted fra koden — `app/projekter/page.tsx` (eller relateret) sender `status: "igangvaerende"` mens type er `"vil_gerne"|"i_gang"|"faerdigstrikket"`. Skal afgøres: hvilket er korrekt? Skal types eller koden bringes i takt? Test-failure er et symptom, ikke kun en test-fix.
- **[Genbrug]** Modal-mønster: projektet har mindst 6 forskellige modal-implementeringer (`MarkYarnsBrugtOpModal`, `BrugNoeglerModal`, `ReturnYarnConfirmModal`, `ConfirmDeleteProjectModal`, `SharedProjectDetailModal`, `DelMedFaellesskabetModal`). Stikprøve viser ad-hoc backdrop + onClose-pattern hver gang. Bør abstraheres til én delt `Modal.tsx` med `<Modal isOpen onClose>{...}</Modal>` — eller migrere til Radix Dialog / shadcn (eksterne dependencies).

## 🟢 Bør fixes efter launch / vedligeholdelse

- **[Naming]** `GarnLinjeVælger.jsx` har special-tegnet `æ` i filnavnet — kan give problemer på case-insensitive filsystemer og i Vercel-builds. Overvej at rename til `GarnLinjeVaelger.jsx` ved næste touch.
- **[Genbrug]** Fejlhåndterings-pattern i `lib/data/*.ts` er konsistent (`console.error('funcName:', err)` + return tom liste / null). Det er fint, men kunne abstraheres til en `wrapDataCall(name, fn)`-helper for bedre observability.
- **[Server/client-mønster]** Komponenter under `components/app/` er en blanding af klient-komponenter med 'use client' og serveruvist (impliceret klient). Tilføj eksplicit `'use client'`-direktiv øverst i alle filer for at undgå tvetydighed.
- **[Mapper-konvention]** `components/` har 3 underdirectories (`app/`, `catalog/`, `layout/`) — fornuftig opdeling. Men `app/` indeholder både forretnings-komponenter og UI-primitiver. Overvej `components/ui/` (knapper, modaler) vs `components/features/` (kerne-flow-komponenter) ved næste rydde-op.

## ✅ Hvad er solidt

- **`lib/`-strukturen er ren**: 
  - `lib/supabase/` — 6 fokuserede filer (admin, client, public, server, mappers, storage) ✅
  - `lib/data/` — 7 datadrevne moduler (barcodeSuggestions, kontaktStatus, recipe-query, recipe-synonyms, recipes, retailers, saved-recipes, stores) ✅
  - `lib/types.ts` — 256 linjer, kompakt domæne-modellering med en god type-grænse (Yarn, SubstitutionCandidate, YarnPartner, YarnCombination, SubstitutionVoteRow, SubstitutionSuggestionRow) ✅
- **Domæne-typer matcher Supabase-skema** — manuelt verificeret stikprøve: `Yarn`-typen aligner med kolonnerne i `yarns_full`-view.
- **Genbrug af Supabase-klienter** — `useSupabase()`-hook i `lib/supabase/client.ts` (16 linjer) bruges konsistent på tværs af klient-komponenter.
- **Server-side data-access**: 16 server-komponenter/-routes importerer Supabase direkte (sitemap, route handlers, server-pages) — korrekt SSR-pattern, ingen blind klient-roundtrip.
- **0 `@ts-ignore` / `@ts-expect-error`** i hele projektet — ingen suppressed type-errors.
- **0 TODO/FIXME/HACK** i source-kode.
- **Test-coverage er meget høj for ikke-JSX**: 111 test-filer fokuseret på `.ts`-helpers og `.tsx`-komponenter (test-suite mangler tests for de 6 store `.jsx`-filer — sammenfaldende med arkitektur-gælden).
- **Konsistent navngivning** i `.tsx`-filer (PascalCase for komponenter, camelCase for helpers, kebab-case for routes).

## Detaljer

### Top-20 komponentstørrelser
| Linjer | Fil | Sprog |
|---|---|---|
| 3013 | `components/app/Arkiv.jsx` | JSX |
| 1615 | `components/app/Garnlager.jsx` | JSX |
| 1287 | `components/app/YarnVisualizer.jsx` | JSX |
| 752 | `app/kalender/page.tsx` | TSX (page) |
| 675 | `app/find-forhandler/FindForhandlerClient.tsx` | TSX |
| 667 | `components/layout/HeroIllustration.tsx` | TSX |
| 623 | `components/catalog/substitutions/SubstitutionsSection.tsx` | TSX |
| 608 | `components/app/GarnLinjeVælger.jsx` | JSX |
| 527 | `components/app/BarcodeScanner.jsx` | JSX |
| 510 | `app/strikkecafeer/StrikkecafeerClient.tsx` | TSX |
| 460 | `components/app/MarkYarnsBrugtOpModal.tsx` | TSX |
| 432 | `components/app/BrugNoeglerModal.tsx` | TSX |
| 413 | `app/om-striq/page.tsx` | TSX (page) |
| 378 | `app/faellesskabet/FaellesskabClient.tsx` | TSX |
| 350 | `components/app/BarcodeForslagListe.tsx` (i app/admin/barcode-forslag/) | TSX |
| 349 | `components/app/ReturnYarnConfirmModal.tsx` | TSX |
| 331 | `components/app/DelMedFaellesskabetModal.jsx` | JSX |
| 331 | `components/app/ColorNumberOcr.tsx` | TSX |
| 308 | `components/app/ImageCarousel.tsx` | TSX |
| 308 | `components/app/BarcodeSuggestionForm.tsx` | TSX |

**Sum JSX-filer (utyped)**: ~7381 linjer (Arkiv 3013 + Garnlager 1615 + YarnVisualizer 1287 + GarnLinjeVælger 608 + BarcodeScanner 527 + DelMedFaellesskabetModal 331)

### `lib/`-strukturen
```
lib/
├── types.ts                256 linjer   ← domæne-typer
├── supabase/
│   ├── admin.ts             10 linjer   ← service_role (server-only)
│   ├── client.ts            16 linjer   ← klient-hook
│   ├── public.ts            13 linjer   ← anon client
│   ├── server.ts            26 linjer   ← SSR client
│   ├── mappers.ts          169 linjer   ← DB-row → domæne (har 1 `any` på arg)
│   └── storage.ts           71 linjer   ← upload-helpers
└── data/
    ├── barcodeSuggestions.ts  89 linjer
    ├── kontaktStatus.ts       80 linjer
    ├── recipe-query.ts        95 linjer
    ├── recipe-synonyms.ts    205 linjer
    ├── recipes.ts            221 linjer
    ├── retailers.ts           81 linjer
    ├── saved-recipes.ts       56 linjer
    └── stores.ts             132 linjer
```
✅ Klar opdeling. Hver fil har en fokuseret rolle.

### Server vs. client component-balance
- **21 sider med `'use client'`** under `app/` — fuld liste i Fase 5
- **16 server-pages/routes** der direkte importerer Supabase
- Mange klient-sider kunne være server med klient-børn — flagget under "Bør fixes".

### Modal-genbrug-issue (eksempel)
Stikprøve af 3 modaler:
- `ConfirmDeleteProjectModal.tsx` — egen backdrop, egen z-index, egen onClose
- `MarkYarnsBrugtOpModal.tsx` — egen backdrop, egen z-index, egen onClose
- `BrugNoeglerModal.tsx` — egen backdrop, egen z-index, egen onClose

Ingen delt Modal-primitiv. Forventet API:
```tsx
<Modal isOpen={isOpen} onClose={onClose} title="..." >
  ...
</Modal>
```
Ville reducere ~300 linjer på tværs af komponenterne og sikre konsistent fokus-håndtering (a11y-vinkel — jf. Fase 4).
