# Fase 1 — Statiske checks

**Kørt:** 2026-05-12
**Kommandoer:** `npm run lint`, `npx tsc --noEmit`, `npm run test:run`, `npm outdated --json`, `npm audit`, grep-mønstre.

## Sammenfatning

Produktionskoden compilerer rent (0 tsc-fejl i `app/`, `components/`, `lib/`). 1304 ud af 1412 tests passerer (92%). Største blokerende fund er **7 Next.js-sårbarheder** (2 high CVSS 7.5 — DoS), fixet ved bump fra 15.5.15 → 15.5.18. Tests har 12 ægte fejl + 6 worker-crashes der antagelig stammer fra test-fixtures der er drifted fra typer. `service_role` bruges kun i ét legitimt server-only-modul.

## 🔴 Blokerende før testbruger-launch

- **[Sikkerhed]** Next.js 15.5.15 har 7 åbne sårbarheder — `package.json:next@15.5.15` — 2 high (DoS via Server Components GHSA-8h8q-6873-q5fj, DoS connection exhaustion GHSA-mg66-mrh9-m8jx), 2 moderate (XSS GHSA-ffhc-5mcf-pf4q og GHSA-gx5p-jg67-6x7h), 1 low cache poisoning, 1 image DoS. — Fix: `npm install next@15.5.18` (patch-bump, ingen breaking changes).
- **[Tests]** 12 tests fejler + 6 unhandled worker-errors — tests caught false-positive-risiko. Fra tsc-output ses at fejlene er drifted test-fixtures (`status: "igangvaerende"` matcher ikke længere enum `"vil_gerne"|"i_gang"|"faerdigstrikket"`; `matchKey: string` vs `"color_number"|"barcode"|"articleNumber"`; props `onSelectCatalogYarn`, `favoritesCount`, `onFavoritesRequireLogin` mangler). Skal fixes så CI er grøn før launch. Fil-liste under "Tests".

## 🟡 Bør fixes inden launch

- **[Lint]** ESLint kører ikke — `package.json:scripts.lint = "next lint"` — `next lint` er deprecated i Next 16 og venter på interaktiv konfigurations-prompt. Output: `❯ Strict (recommended) / Base / Cancel`. Migrér til standalone ESLint-config: `npx @next/codemod@canary next-lint-to-eslint-cli .` — så `npm run lint` faktisk kører i CI.
- **[Sikkerhed]** PostCSS XSS-sårbarhed (moderate, GHSA-qx2v-qp2m-jg93) — fix med `npm audit fix` (auto).
- **[Type-sikkerhed]** 9 `any`-brug i source-kode der bør fixes:
  - `app/kontakt-status/page.tsx:139` — `useState<any>(null)` for user-objekt
  - `app/kontakt-status/page.tsx:293` — `setAktivStatus(s as any)`
  - `app/ideer/page.tsx:54` — `useState<any>(null)`
  - `app/ideer/page.tsx:87` — `function IdeerBoard({ user }: { user: any })`
  - `lib/pdf-thumbnail.ts:26` — `const pdfjs: any = await import(...)` (legitim, dynamic import — kan blive)
  - `lib/supabase/mappers.ts:87` — `supabase: any` (kan typeres med `SupabaseClient`)
  - `components/catalog/substitutions/SubstitutionsSection.tsx:346` — `(data ?? []) as any[]`
  - `components/app/BrugNoeglerModal.tsx:112,193-196,343` — 5 forekomster (`usageRow: any`, casting af `p`, catch-block)
  - `app/auth/reset-password/page.tsx:66` — `catch (err: any)` (legitim, men typer kan strammes til `unknown`)
- **[Build hygiejne]** `app/Logoer/Creme_logo_med_hvid_tråd_files/main.tsx` — fremmed `main.tsx` med `dangerouslySetInnerHTML` i ikke-relevant `Logoer/`-mappe. Hvorfor er det committeret? Skal sikkert slettes/.gitignores.

## 🟢 Bør fixes efter launch / vedligeholdelse

- **[Vedligehold]** Minor-bumps tilgængelige: `@supabase/ssr 0.10.2→0.10.3`, `@supabase/supabase-js 2.103→2.105`, `@types/node 22.19.17→22.19.19`, `jsdom 29.0.2→29.1.1`, `postcss 8.5.8→8.5.14`, `react/react-dom 19.2.5→19.2.6`, `vitest 4.1.4→4.1.6`. Alle kompatible.
- **[Major-overvejelser]** `next 16`, `typescript 6`, `tailwindcss 4`, `pdfjs-dist 5`, `@types/node 25` — breaking changes; planlæg særskilt efter launch.
- **[Sårbarhed med begrænset risiko]** `xlsx` har 2 high sårbarheder (Prototype Pollution GHSA-4r6h-8v6p-xvw6, ReDoS GHSA-5pgg-2g8v-p4x9, ingen fix) — bruges KUN i `scripts/*.mjs` engangs-scripts, **ikke runtime**. Ingen produktionsrisiko, men overvej alternativ pakke (`exceljs`) ved næste større rydde-op.
- **[Logging]** 19 `console.error`/`log` i source. De fleste i `lib/`-data-access er legitime fejl-logs til server-stderr. To kan ryddes:
  - `supabase/functions/visualize/index.ts:97` — `console.log("Prompt:", prompt)` (kan logge brugerdata)
  - `components/app/ColorNumberOcr.tsx:73` — `console.error(e)` uden kontekst
- **[Test-stabilitet]** Test-suite varer 597s = ~10 min. environment-setup tager 466s. Worker-crashes (6 stk) bør undersøges separat.

## ✅ Hvad er solidt

- **Source-kode compilerer rent** — 0 tsc-fejl uden for `test/`-mappen.
- **`service_role` bruges korrekt**: kun ét sted (`lib/supabase/admin.ts`), kun importeret af `lib/editors.ts`, som kun bruges fra server-routes/server-components. Ingen klient-bundle-lækage.
- **0 hardcoded secrets** i source-kode (grep for `sk-`, `Bearer `, `eyJ` gav kun JSON-LD-ID i `app/garn/[slug]/page.tsx:164` — ren).
- **`dangerouslySetInnerHTML`**: kun ét legitimt brug — `app/garn/[slug]/page.tsx:164` (JSON-LD structured data, hardkodet JSON, ingen brugerinput).
- **Ingen `eval()` eller `new Function()`** i source.
- **0 `@ts-ignore` / `@ts-expect-error`** i hele projektet.
- **0 TODO/FIXME/HACK-markører** i source.
- **Solid test-base**: 1304 grønne tests, 86 test-filer grønne — testkulturen er etableret.

## Detaljer

### Lint
```
$ npm run lint
> next lint
`next lint` is deprecated and will be removed in Next.js 16.
? How would you like to configure ESLint?
❯  Strict (recommended)
   Base
   Cancel
```
Kommandoen venter på interaktivt svar og kører IKKE. Migration kræves.

### TypeScript-fejl (alle i `test/`)
255 fejl-linjer i tsc-output, 100% i `test/`-mappen. Filer med fejl:
- `test/Arkiv.vilGerneTransition.test.tsx`
- `test/BrugNoeglerModal.media.test.tsx`
- `test/BrugtOpFoldeUd.test.tsx`
- `test/ConfirmDeleteProjectModal.test.tsx` — `status: "igangvaerende"` skal være `"i_gang"`
- `test/FindForhandlerClient.test.tsx` — `is_strikkecafe` skal være required, `brands` type-clash
- `test/GarnLinjeVælger.fraKatalog.test.tsx` — `onSelectCatalogYarn` prop fjernet
- `test/GarnLinjeVælger.test.tsx` — samme
- `test/Garnlager.cardRender.test.tsx` — `imageUrl`/`catalogImageUrl`/`hexColors`/`catalogYarnId` type-clash
- `test/Garnlager.confirmDel.test.tsx`
- `test/bug3-bug4-gaps.test.tsx`
- `test/colorSeed.test.ts` — `matchKey: string` skal være enum-værdi
- `test/community.markOnboarded.test.ts`
- `test/community.shareProject.test.ts`
- `test/community.test.ts`
- `test/recipe-ui.test.tsx` — `favoritesCount`, `onFavoritesRequireLogin` mangler
- `test/yarn-allocate.delta.test.ts` — `yarnItemId: string | null` skal være `string`

### Test-resultat
```
Test Files  4 failed | 86 passed (96)
     Tests  12 failed | 1304 passed (1412)
    Errors  6 errors (unhandled worker crashes)
   Duration  597.74s
```

### Dependencies — outdated
| Pakke | Current | Wanted | Latest | Type |
|---|---|---|---|---|
| @supabase/ssr | 0.10.2 | 0.10.3 | 0.10.3 | patch |
| @supabase/supabase-js | 2.103.3 | 2.105.4 | 2.105.4 | minor |
| @types/node | 22.19.17 | 22.19.19 | 25.7.0 | patch (major tilgængelig) |
| jsdom | 29.0.2 | 29.1.1 | 29.1.1 | minor |
| next | 15.5.15 | 15.5.18 | 16.2.6 | **🔴 patch — sikkerhed** |
| pdfjs-dist | 4.10.38 | 4.10.38 | 5.7.284 | (major) |
| postcss | 8.5.8 | 8.5.14 | 8.5.14 | minor |
| react/react-dom | 19.2.5 | 19.2.6 | 19.2.6 | patch |
| tailwindcss | 3.4.19 | 3.4.19 | 4.3.0 | (major) |
| typescript | 5.9.3 | 5.9.3 | 6.0.3 | (major) |
| vitest | 4.1.4 | 4.1.6 | 4.1.6 | patch |

### Dependencies — audit
```
3 vulnerabilities (1 moderate, 2 high)
- next: 7 advisories (2 high, 4 moderate, 1 low) — fix: 15.5.18
- postcss: GHSA-qx2v-qp2m-jg93 (moderate XSS) — fix: npm audit fix
- xlsx: GHSA-4r6h-8v6p-xvw6 + GHSA-5pgg-2g8v-p4x9 (2 high) — no fix; KUN i scripts/
```

### service_role / klient-bundle-lækage
- `lib/supabase/admin.ts:7` — bruger `SUPABASE_SERVICE_ROLE_KEY` (legitim, server-only)
- Importeret af `lib/editors.ts:1` → `createSupabaseAdminClient()`
- `lib/editors.ts` har INTET `'use client'`-direktiv
- Importeret fra: `app/admin/barcode-forslag/page.tsx`, `app/api/revalidate/route.ts`, `app/auth/callback/route.ts`, `app/garn/page.tsx`, `app/garn/admin/page.tsx`, `app/garn/admin/new/page.tsx`, `app/garn/admin/suggestions/page.tsx`, `app/garn/admin/[id]/edit/page.tsx`, `app/garn/auth/callback/route.ts`
- **Verificeret**: ingen af disse filer har `'use client'` ✅
- `lib/` har kun `'use client'` i 2 filer: `lib/hooks/useEscapeKey.ts` og `lib/supabase/client.ts` — ingen import af admin.ts.

### `any`-brug i source (9 forekomster)
Se "Bør fixes inden launch" ovenfor.

### `dangerouslySetInnerHTML`
- `app/garn/[slug]/page.tsx:164` — JSON-LD (sikkert)
- `app/Logoer/Creme_logo_med_hvid_tråd_files/main.tsx` — fremmed Vite-template-fil i Logoer-mappe (bør fjernes/.gitignore)

### console.log/error (19 stk, primært lib/)
Acceptable mønstre:
- `lib/catalog.ts:104,122,146,160,181` — fejl-logging
- `lib/substitutions.ts:14`, `lib/combinations.ts:32,49`, `lib/community.ts:19,35,110,127`
- `lib/data/barcodeSuggestions.ts:61`, `lib/data/stores.ts:84,104`, `lib/data/retailers.ts:51,77`

Til oprydning:
- `supabase/functions/visualize/index.ts:97` — logger user-prompt (privatlivs-risiko hvis prompt indeholder personlige data)
- `components/app/ColorNumberOcr.tsx:73` — `console.error(e)` uden kontekst

### Grep — andre risici
- `eval(`, `new Function(`, `document.write` — **0 forekomster** ✅
- Hardcoded API-keys (`sk-`, `pk_live_`) — **0 forekomster** ✅
