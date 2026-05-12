# Kvalitetsgennemgang af maskerummet / STRIQ

**Dato:** 2026-05-12
**Scope:** Hele projektet (~18.6k LOC, 41 features, 59 migrations, 111 test-filer)
**Mål:** Klarhed før testbruger-launch (deadline ~3 uger)
**Output:** Prioriteret rapport med fil:linje-referencer — ingen kode-ændringer foretaget

## TL;DR

**Projektet er teknisk solidt.** Source-kode compilerer rent, RLS er korrekt opsat på alle 14 datatabeller med eksplicitte GRANTs, `service_role` er isoleret server-side, og dansk copy er konsistent og venlig. **Men der er 8 blokerende fund** der skal lukkes før testbrugere får adgang — de fleste kan fixes på 1-2 dage hver.

**Top 3 må-fixes:**
1. **Bump Next.js til 15.5.18** — 7 åbne sårbarheder (2 high DoS, 2 moderate XSS). Patch-bump, ingen breaking changes.
2. **Fjern admin-e-mails fra klient-bundle** — 5 reelle adresser hard-coded i `app/ideer/page.tsx:7` og `app/kontakt-status/page.tsx:16`.
3. **Ret GDPR-konflikt i privatlivspolitik** — påstanden "kun session-cookies" matcher ikke faktisk localStorage-brug.

## 🔴 Blokerende før testbruger-launch (8)

### Sikkerhed
1. **Next.js 15.5.15 har 7 åbne sårbarheder** — `package.json`
   - 2 high (DoS CVSS 7.5): Server Components GHSA-8h8q-6873-q5fj, Connection exhaustion GHSA-mg66-mrh9-m8jx
   - 2 moderate (XSS): GHSA-ffhc-5mcf-pf4q, GHSA-gx5p-jg67-6x7h
   - 1 low cache poisoning, 1 image DoS, 1 sym
   - **Fix:** `npm install next@15.5.18` (patch, ingen breaking)

2. **Admin-e-mails lækket i klient-bundle** — `app/ideer/page.tsx:7` (3 e-mails), `app/kontakt-status/page.tsx:16` (2 e-mails)
   - Hver besøgende kan finde adresserne i devtools → phishing-vektor
   - **Fix:** Konvertér til server component med `isEditorEmail()` fra `lib/editors.ts`, eller flyt hele siderne under `app/admin/`

### Data og compliance
3. **GDPR-konflikt i privatlivspolitik** — `app/privatlivspolitik/page.tsx:44-46`
   - Påstand: "kun en session-cookie fra Supabase Auth"
   - Faktisk: localStorage bruges 2 steder (`app/login/page.tsx:40,57` for email, `components/app/Garnlager.jsx:387,405` for filtre)
   - **Fix:** Opdatér teksten: "session-cookie fra Supabase Auth + lokal browser-lagring (husket e-mail, filtre)"

4. **Manglende in-app data-eksport** — `app/privatlivspolitik/page.tsx:65-78`
   - GDPR-rettighed til dataportabilitet loves, men kun manuel email-flow
   - **Fix:** Tilføj "Download mine data"-knap der dumper user's yarn_items + projects + yarn_usage til JSON

5. **Manglende in-app slet-konto-knap** — samme fil
   - **Fix:** Tilføj knap i indstillinger; kan implementeres som server-action der kalder Supabase auth.admin.deleteUser via service_role

### Kode-kvalitet
6. **4628 linjer utyped JSX i kerne-flow** — `components/app/Arkiv.jsx` (3013) + `Garnlager.jsx` (1615)
   - Type-drift bekræftet i tests (`status: "igangvaerende"` matcher ikke enum)
   - Data-tab-risiko hvis felter omdøbes uden type-vagt
   - **Fix (minimum)**: Skriv vitest-tests for allocate/finalize/revert-funktioner i Arkiv.jsx + DB-mappers i Garnlager.jsx
   - **Fix (ideal)**: Konvertér begge til `.tsx` som dedikeret feature før launch

7. **12 tests fejler + 6 worker-crashes** — `npm run test:run`
   - 1304/1412 tests passerer (92%)
   - Test-fixtures drifted fra typer (jf. fund #6)
   - **Fix:** Bring test-fixtures i takt med types: `ConfirmDeleteProjectModal.test.tsx`, `colorSeed.test.ts`, `community.*.test.ts`, `recipe-ui.test.tsx`, `yarn-allocate.delta.test.ts`, `FindForhandlerClient.test.tsx`, `Garnlager.cardRender.test.tsx`, `GarnLinjeVælger.test.tsx`

### Operationelt
8. **ESLint kører ikke** — `next lint` deprecated, venter på interaktiv prompt → linter er reelt fraværende i CI
   - **Fix:** `npx @next/codemod@canary next-lint-to-eslint-cli .` → standalone ESLint-config

## 🟡 Bør fixes inden launch (16)

### Sikkerhed & auth
9. `user_profiles`-tabel mangler create-migration — kun referencer findes; DB kan ikke recreates from-scratch
10. Password-minimum 6 tegn er for lavt — `app/signup/page.tsx:38`, `app/auth/reset-password/page.tsx:53` → hæv til 8-10
11. Reset-password parser tokens fra URL hash — `app/auth/reset-password/page.tsx:23-36` → forenkle til kun PKCE
12. Edge function logger brugerprompts — `supabase/functions/visualize/index.ts:97`
13. Verificér visualizer API-route auth-gating server-side — `app/visualizer/page.tsx:89`
14. PostCSS XSS sårbarhed (moderate) — `npm audit fix`

### A11y & UX
15. Auth-siderne bruger 100% inline-styles — kan ikke sætte `:focus-visible` → svag tastatur-navigation
   - Påvirker: `app/login/page.tsx`, `app/signup/page.tsx`, `app/auth/reset-password/page.tsx`
16. Stikprøve `aria-label` på ikon-knapper i `Garnlager.jsx`/`Arkiv.jsx`/`BarcodeScanner.jsx` (utyped, ikke gennemgået)
17. Verificér tomme tilstande på `/garnlager`, `/projekter`, `/ideer`, `/opskrifter`, `/faellesskabet` (kun 2 explicit empty-state-patterns fundet)
18. Engelsk fejl-fallback i login — `app/login/page.tsx:54` "Invalid login credentials"

### Kode
19. 9 `any` i source — særligt `app/kontakt-status/page.tsx:139,293`, `app/ideer/page.tsx:54,87`, `components/app/BrugNoeglerModal.tsx:112,193-196,343`
20. `app/Logoer/Creme_logo_med_hvid_tråd_files/main.tsx` — fremmed Vite-template-fil i source → slet eller .gitignore
21. Hard-coded events i `app/kalender/page.tsx:184+` (400+ linjer) → flyt til JSON eller Supabase
22. `app/find-forhandler/varianter/page.tsx` — design-eksplorations-side → slet eller flyt til admin
23. `app/find-forhandler/FindForhandlerClient.tsx:103` — Nominatim uden kontakt-email i User-Agent (kan blive blokeret)
24. `app/find-forhandler/FindForhandlerClient.tsx:111` — ipapi.co rate-limit-risiko (1000 req/dag pr. IP)

## 🟢 Bør fixes efter launch / vedligeholdelse

### Kode
25. `app/garn/[slug]/page.tsx:75-79` — `fetchAllYarns` ineffektiv; refactor til related-yarns
26. Modal-genbrug: 6 forskellige modal-implementeringer → abstrahér til delt `<Modal>`-primitiv
27. `components/app/GarnLinjeVælger.jsx` — special-tegn `æ` i filnavn → rename til `GarnLinjeVaelger.jsx`
28. Konsolidér to FAQ-systemer (`app/faq/` JSON vs `app/garn/faq/` markdown)
29. `app/om-striq/page.tsx:280` — `hannah.jpg.JPEG` dobbelt-extension
30. `app/strikkecafeer/StrikkecafeerClient.tsx:7` — cross-feature type-import; flyt til `lib/types.ts`
31. `app/opskrifter/page.tsx:51-53` — silent catch på saved-recipes
32. `app/kalender/page.tsx:14-146` — flyt 12 inline-SVG-ikoner til `components/icons/`
33. `components/app/Garnlager.jsx:52` — `STASH_FILTERS_KEY` localStorage uden user-namespace

### Sikkerhed (low priority)
34. Rate-limiting på `/api/revalidate` mangler
35. CSP-header ikke sat
36. `xlsx` har 2 high CVE'er men bruges kun i `scripts/` (ingen runtime-risiko)

### Vedligehold
37. Minor-bumps tilgængelige: `@supabase/ssr`, `@supabase/supabase-js`, `jsdom`, `postcss`, `react/react-dom`, `vitest` — alle bagudkompatible
38. Major-overvejelser efter launch: `next 16`, `typescript 6`, `tailwindcss 4`, `pdfjs-dist 5`
39. Test-suite varer 597s = 10 min; environment-setup tager 466s — overvej tunable

## ✅ Hvad er solidt (rør ikke)

### Sikkerhed
- **RLS + GRANTs på alle 14 datatabeller** korrekt opsat (matrix i `02-security.md`)
- **`service_role` korrekt isoleret** — kun i `lib/supabase/admin.ts`, kun importeret af `lib/editors.ts`, kun brugt fra server-routes. 0 klient-bundle-lækage (import-graf verificeret)
- **`resolveNext()` whitelist** mod open-redirect — `lib/auth/resolveNext.ts`
- **API-routes har auth + inputvalidering** — `app/api/revalidate/route.ts`, `app/api/faq/[slug]/route.ts`
- **Column-level GRANTs på fællesskabet** beskytter `notes`/`pattern_pdf_url` mod læk
- **OAuth-callback håndterer identity-konflikter** elegant
- **Editor-rolle via SECURITY DEFINER + service_role** korrekt mønster
- **0 hardcoded secrets, 0 `eval()`, 0 `new Function()`** i source

### Type-sikkerhed
- **Source-kode compilerer rent** — 0 tsc-fejl uden for `test/`
- **0 `@ts-ignore` / `@ts-expect-error`** i hele projektet
- **0 TODO/FIXME/HACK-markører** i source

### Arkitektur
- **`lib/`-strukturen er ren**: `lib/supabase/` (6 fokuserede filer), `lib/data/` (7 moduler), `lib/types.ts` (256 linjer, kompakt)
- **Domæne-typer aligner med DB-skema** (stikprøve)
- **Konsistent navngivning** (PascalCase, camelCase, kebab-case)
- **Genbrug af Supabase-klient via `useSupabase()`-hook**

### UX
- **Dansk copy konsistent og venlig** — kort, handlingsorienteret
- **Bruger-venlige fejlbeskeder** i auth (oversætter Supabase-fejl)
- **Form-felter har eksplicitte `<label>`** + korrekte `autoComplete`-attributter
- **Privatlivspolitik dækker alle GDPR-punkter** (med ovenstående cookie-fejl)
- **Dark mode IKKE halv-implementeret** — konsistent fravalg ✅
- **Loading-state ved kritisk session-etablering** — reset-password
- **1304 grønne tests** — testkultur etableret

### Features klar til launch
- `app/garn/` (katalog + admin) ✅
- `app/faellesskabet/` ✅ (RLS verificeret)
- `app/strikkecafeer/` ✅
- `app/find-forhandler/` ✅ (med fix #23, #24)
- `app/admin/barcode-forslag/` ✅

## Anbefalet launch-plan (3 uger)

### Uge 1 — Sikkerhed & compliance (kritisk path)
- [ ] Fix #1: `npm install next@15.5.18` (1t)
- [ ] Fix #2: flyt admin-e-mail-arrays til server (4t)
- [ ] Fix #3: opdatér privatlivspolitik om localStorage (1t)
- [ ] Fix #4-5: tilføj data-eksport + slet-konto-knap (1-2 dage)
- [ ] Fix #8: migrér ESLint config (2t)
- [ ] Fix #11: forenkle reset-password til kun PKCE (4t)
- [ ] Fix #14: `npm audit fix` (15 min)

### Uge 2 — Test og type-sikkerhed
- [ ] Fix #7: ret 12 fejlende tests + 6 worker-crashes (1-2 dage)
- [ ] Fix #6 (minimum): tilføj vitest-tests for allocate/finalize/revert i Arkiv.jsx og DB-mappers i Garnlager.jsx (2-3 dage)
- [ ] Fix #9: tilføj user_profiles create-migration (1t)
- [ ] Fix #10: hæv password-minimum (15 min)
- [ ] Fix #12-13: log-cleanup edge function + visualizer-gating-verifikation (2-4t)

### Uge 3 — Polering og verifikation
- [ ] Fix #15-18: a11y stikprøver + tomme tilstande (1-2 dage)
- [ ] Fix #19: 9 `any` til konkrete typer (3-4t)
- [ ] Fix #20-24: oprydning (Logoer, varianter-side, kalender-data, Nominatim/ipapi, m.fl.) (1-2 dage)
- [ ] Verifikations-pass: spot-check på mobil (< 640px), tastatur-navigation, alle empty-states
- [ ] Recovery-test: kør `supabase db reset` på dev-DB og verificér at alt funktioner

## Verifikation af denne rapport

For at validere fundene:

1. **Læs delrapporterne** for fuld detalje:
   - `01-static.md` — lint, tsc, tests, deps
   - `02-security.md` — RLS, GRANTs, auth, API
   - `03-arkitektur.md` — komponent-størrelser, struktur, type-coverage
   - `04-ux-tilgaengelighed.md` — a11y, mobile, copy, privatlivspolitik
   - `05-features.md` — alle 41 features med fil:linje-issues

2. **Spot-check 3 issues**:
   - Fund #1: `npm audit` viser 7 next-advisories — ✅ bekræftet
   - Fund #2: åbn `app/ideer/page.tsx:7` — verificer at `ADMIN_EMAILS` er hard-coded
   - Fund #3: åbn `app/privatlivspolitik/page.tsx:44-46` og `app/login/page.tsx:40-57` — verificér cookie-vs-localStorage-konflikt

3. **Spot-check RLS-matrix**:
   - Tag fx `yarn_items` fra Fase 2-matrix
   - Grep i `supabase/migrations/`: både `create policy.*yarn_items` og `grant.*yarn_items.*to.*authenticated`
   - Skal returnere matches i `20260419000001_rls_yarn_items_and_usage.sql`

## Noter til processen

- **Fase 2, 3, 4 baggrunds-agenter hængte efter ~4 timer uden output** og blev erstattet med direkte greps + reads. Lærepenge: store software-reviewer-agenter med 200+-ord-prompts kan hænge på MCP-niveau; foretræk fokuserede greps direkte.
- **Fase 1 og Fase 5 baggrunds-agenter** kørte korrekt (~17 min hver).
- Alle delrapporter er gemt til disk i `docs/kvalitetsreview/` så de kan genbruges hvis sessionen skal genoptages.
