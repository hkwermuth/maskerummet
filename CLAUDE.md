# maskerummet / STRIQ

Garn- og strikkeprojekt-håndteringsapp. Dansk UI. Målgruppe: strikke-entusiaster, ofte ikke-teknisk. Brugere betror os deres garnlager og projekter — tillid er kerne-krav.

## Tech stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS 3.4 (se `tailwind.config.ts` for tokens)
- **Backend**: Supabase (SSR + client). Clients i `lib/supabase/`
- **Data**: PostgreSQL via Supabase. Migrations i `supabase/`
- **Test**: Vitest + Testing Library (sættes op af `tester`-agenten ved første behov)

## Kommandoer

```bash
npm run dev           # dev-server
npm run build         # produktionsbuild
npm run lint          # ESLint via next lint
npm run test:run      # kør tests (hvis opsat)
```

## Projektstruktur

```
app/            Next.js App Router sider
  ├── api/             API-routes
  ├── auth/            Login, signup, glemt-password
  └── ...              Feature-mapper (garnlager, projekter, opskrifter, kalender, ...)
components/     Delte React-komponenter (app/, catalog/, layout/)
lib/            Ikke-UI helpers
  ├── supabase/        Client-factories
  ├── data/            Data-access
  ├── types.ts         Delte TypeScript-typer
  └── ...              Domæne-helpers (catalog, editors, labels, slug, ...)
content/        Statisk indhold
supabase/       DB-migrations og RLS-policies
```

## Konventioner

- **Copy på dansk**. Kort, venlig, handlingsorienteret.
- **Tilgængelighed**: WCAG AA minimum. Alle ikon-knapper har `aria-label`.
- **Dark mode**: Via Tailwind `dark:`-varianter. Halv-implementeret dark mode er værre end ingen — gør færdig eller fjern.
- **Mobile-first**: Touch-targets ≥ 44px. Test ved < 640px.
- **Supabase RLS + GRANT**: Alle tabeller med brugerdata SKAL have RLS-policies. **OG eksplicit `GRANT SELECT/INSERT/UPDATE/DELETE` til `anon`/`authenticated`** — RLS alene er ikke nok, PostgREST kræver table-level grants først. Aldrig `service_role` i klient-kode.
- **TypeScript strict**. Ingen `any` uden kommentar der forklarer hvorfor.
- **Commits**: Kort, imperativ, dansk. Fx "Tilføj glemt-password flow".

## Agent-orkester (PÅBUDT)

**Enhver kode-ændring i denne repo der ikke er en triviel rettelse (typo, enkeltlinje-fix, rename) SKAL gå via orkestret.** Auto-mode ophæver ikke dette — auto betyder "udfør planen autonomt", ikke "spring planlægningen over".

- **Ny feature** → `/ny-feature <beskrivelse>` (kører arkitekt → token-opt → UX → implementering → test → review)
- **Mindre ændring** → spawn mindst `software-arkitekt` (plan) → derefter `tester` → derefter `software-reviewer`
- **Backlog-arbejde** → `/backlog [sync | prioriter <milepæl> | nedbryd <titel> | status]`

Plan-mode med Explore-agent tæller IKKE som arkitekt-fasen — `software-arkitekt` har en specifik rolle (decompose + interfaces + acceptkriterier + risici + genbrug).

Hvis brugeren tilføjer scope mid-stream ("og så også X"), STOP og overvej om det udløser en ny `/ny-feature`-cyklus i stedet for at patche videre.

Sub-agenter arver denne fil automatisk som kontekst.

## Backlog

Se `BACKLOG.md` for status over implementeret / i gang / ønsker. Opdateres via `/backlog sync`.

## Nuværende milepæl

**Testbruger-launch** — inden 3 uger. Krav: fungerende auth, RLS på plads, kerne-flows stabile på mobil, data-eksport, privatlivspolitik, tomme tilstande og fejlbeskeder overalt, ingen synlige halv-implementeringer.
