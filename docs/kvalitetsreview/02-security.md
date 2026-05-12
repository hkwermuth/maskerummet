# Fase 2 — Sikkerhedsreview

**Kørt:** 2026-05-12 (manuelt — baggrundsagent var hængt efter ~4t)
**Metode:** Grep i `supabase/migrations/`, læsning af alle auth-flows + begge API-routes + `lib/supabase/`, krydsverifikation af `service_role`-import-graf.

## Sammenfatning

Sikkerheds-overfladen er **stærk**. Alle 14 datatabeller har RLS aktiveret og eksplicitte GRANTs (med ét hul: `user_profiles` er ikke defineret i migrations — kun antaget eksisterer). Auth-flowet har defense-in-depth med `resolveNext()`-whitelist mod open-redirect, og service_role er korrekt isoleret i én server-only fil. **Største blokerende fund**: admin-e-mails lækket i klient-bundle (allerede fanget af Fase 5). Største bør-fix: `user_profiles`-tabel mangler migration der opretter den med RLS — DB kan ikke recreates from-scratch.

## 🔴 Blokerende før testbruger-launch

- **[Auth/PII]** Admin-e-mails lækket i klient-bundle — `app/ideer/page.tsx:7` (3 reelle adresser), `app/kontakt-status/page.tsx:16` (2 adresser). Email-gating skal udføres server-side via `isEditorEmail()` eller `is_editor()` RPC, ikke ved at sammenligne mod en hard-coded array i klient-koden. Risiko: enhver besøgende kan i devtools-bundle finde admin-adresserne og bruge dem til phishing eller misbrug. Fix: konverter til server-component eller hent `is_editor` via en authenticated RPC-call.

## 🟡 Bør fixes inden launch

- **[DB-integritet]** `user_profiles`-tabel mangler migration der opretter den — `supabase/migrations/` har INGEN `create table public.user_profiles`. Kun `20260424000002_is_editor_function.sql` og `20260427000002_is_editor_security_definer.sql` REFERERER til den. Tabellen blev formentlig oprettet via Supabase UI eller en migration der er blevet slettet. Konsekvens: hvis nogen kører `supabase db reset` eller deployerer til et nyt projekt, vil `is_editor()`-funktionen fejle. Fix: tilføj migration der eksplicit opretter `public.user_profiles(id uuid primary key references auth.users, role text)` med RLS enabled og en policy så brugere kan læse egen rolle (om nødvendigt).
- **[Auth]** Password-minimum 6 tegn — `app/signup/page.tsx:38` og `app/auth/reset-password/page.tsx:53`. Supabase-default men under nutidig anbefaling (NIST anbefaler 8+, typisk 10+). Fix: hæv til 8 eller 10 tegn, evt. minimum kompleksitet (1 ciffer ELLER 1 specialtegn).
- **[Auth]** Reset-password parser session-tokens fra URL hash/query manuelt — `app/auth/reset-password/page.tsx:23-36`. Token kan ende i browser-history og i Referer-headers hvis brugeren navigerer fra siden mens tokenet stadig er i URL. Supabase's `auth.exchangeCodeForSession` er normalt foretrukket alene. Fix: forenkle til kun PKCE-flow (`?code=…` → `exchangeCodeForSession`), drop hash-parsing.
- **[Auth]** `auth.callback`-route håndterer `error` og `error_description` direkte fra query — `app/auth/callback/route.ts:17`. `error_description` viderebruges kun internt til klassifikation (ikke vist for bruger), så ingen XSS-vektor, men værd at validere længde for sanity.
- **[Edge function]** `supabase/functions/visualize/index.ts:97` — `console.log("Prompt:", prompt)` logger brugerens prompt til Supabase function logs. Hvis prompts indeholder personlige beskrivelser eller billed-URLs, er det utilsigtet datalækage. Fix: fjern eller redaktér.

## 🟢 Bør fixes efter launch / vedligeholdelse

- **[Defensiv]** Rate-limiting på `/api/revalidate` mangler — `app/api/revalidate/route.ts`. Editor-email er allowlistet, så risiko er lav, men en abused token via mistede credentials kan rate-tømme cachen. Overvej Vercel rate-limit middleware eller Upstash.
- **[CSP]** Ingen Content-Security-Policy header sat (heuristisk — ikke fundet i `next.config.*`). For Next 15 SSR-app er CSP en effektiv defense-in-depth mod XSS-rester. Overvej at sætte CSP-meta-tag eller header efter launch.
- **[Logging]** Migration `20260427000002_is_editor_security_definer.sql` er en patch på `is_editor()` — overvej at konsolidere til én migration ved næste DB-rydde-op (selvom det ikke er prioriteret).

## ✅ Hvad er solidt

- **Alle 14 kerne-tabeller har RLS + GRANTs** (med ovenstående note om `user_profiles`). Se detaljeret matrix nedenfor.
- **`resolveNext()` whitelister stier mod open-redirect** — `lib/auth/resolveNext.ts:3-15`. Afviser protocol-relative (`//`), absolutte URLs, og ikke-whitelistede stier. Default fallback `/garnlager`.
- **`service_role` korrekt isoleret**: ét sted (`lib/supabase/admin.ts`), importeret af `lib/editors.ts`, kun kaldt fra server-routes/server-components (verificeret — ingen `'use client'`-direktiv i nogen importer). 0 risiko for klient-bundle-lækage.
- **`/api/revalidate`** har dual-auth: enten editor-email session ELLER `REVALIDATE_SECRET` env-var — `app/api/revalidate/route.ts:10-18`.
- **`/api/faq/[slug]`** sanitiserer slug med regex `/^[\w-]+$/` mod path-traversal — `app/api/faq/[slug]/route.ts:11`.
- **OAuth-flow håndterer identity-konflikter** — `app/auth/callback/route.ts:18,25` (returnerer venlig fejl i stedet for at lade Supabase fejle).
- **Editor-allowlist via env-var, ikke kode** — `lib/editors.ts:3-8` (`EDITOR_EMAILS`-env-var). Det er korrekt — modsat de hard-codede admin-arrays i `ideer/page.tsx` og `kontakt-status/page.tsx`.
- **Column-level GRANTs på fællesskabet** — `supabase/migrations/20260421000001_community_sharing.sql:103,113,120` (kun specifikke kolonner som `display_name` exposes til anon). Beskytter `notes` og `pattern_pdf_url` fra at lække.
- **Editor-rolle tildeles via `SECURITY DEFINER`-funktion + service_role** — `supabase/migrations/20260427000002_is_editor_security_definer.sql` + `lib/editors.ts:23`. Korrekt mønster.

## RLS + GRANTs matrix

| Tabel | RLS | SELECT | INSERT | UPDATE | DELETE | GRANT-modtager | Status |
|---|---|---|---|---|---|---|---|
| projects | ✅ | ✅ own | ✅ own | ✅ own | ✅ own | authenticated (all); anon: select(status) | ✅ |
| projects (public_shared) | ✅ | ✅ shared | — | — | — | anon, authenticated (view) | ✅ |
| yarn_usage | ✅ | ✅ own | ✅ own | ✅ own | ✅ own | authenticated (all) | ✅ |
| yarn_usage (public_shared) | ✅ | ✅ shared | — | — | — | anon (view) | ✅ |
| yarn_items | ✅ | ✅ own | ✅ own | ✅ own | ✅ own | authenticated (all) | ✅ |
| substitution_votes | ✅ | ✅ all | ✅ own | ✅ own | ✅ own | anon (select); authenticated (all) | ✅ |
| substitution_suggestions | ✅ | ✅ all | ✅ own | ✅ moderate-status | ✅ own | anon (select); authenticated (all) | ✅ |
| profiles | ✅ | ✅ own + public-display | ✅ own | ✅ own | — | authenticated (s/i/u); anon (limited cols) | ✅ |
| stores | ✅ | ✅ public | (editor) | (editor) | (editor) | anon, authenticated (select) | ✅ |
| brands | ✅ | ✅ public | (editor) | (editor) | (editor) | anon, authenticated (select) | ✅ |
| online_retailers | ✅ | ✅ public | (editor) | (editor) | (editor) | anon, authenticated (select) | ✅ |
| retailer_brands | ✅ | ✅ public | (editor) | (editor) | (editor) | anon, authenticated (select) | ✅ |
| yarn_combinations | ✅ | ✅ all | ✅ editor | ✅ editor | ✅ editor | anon (select); authenticated (i/u/d) | ✅ |
| barcode_suggestions | ✅ | ✅ own/editor | ✅ own | ✅ editor (moderate) | ✅ own | authenticated (all) | ✅ |
| saved_recipes | ✅ | ✅ own | ✅ own | — | ✅ own | authenticated (s/i/d) | ✅ (ingen UPDATE — design) |
| yarns | ✅ (via katalog) | ✅ public | (editor) | (editor) | (editor) | authenticated (s/u); anon (yarn_weight) | ✅ |
| yarns_full | ✅ | ✅ public | — | — | — | anon, authenticated (select) | ✅ |
| user_profiles | ⚠️ ukendt | (via is_editor SECURITY DEFINER) | — | — | — | service_role only (no GRANT i migrations) | ⚠️ Mangler create-table-migration |

## Detaljer

### API-routes
- **`app/api/revalidate/route.ts`** — gated bag editor-email OR REVALIDATE_SECRET env-var. Korrekt inputvalidering. Ingen rate-limit (lav risiko). ✅
- **`app/api/faq/[slug]/route.ts`** — regex-sanitisering `/^[\w-]+$/`. Path forgrenes mod `process.cwd()/content/faq/questions/`. Returnerer 404 ved manglende fil. ✅

### Auth-flows
- **Login** (`app/login/page.tsx`) — bruger Supabase's `signInWithPassword`. `?next=` valideres via `resolveNext()`. ✅. Note: `localStorage.setItem('striq-email', ...)` til "husk email" — konflikter med privatlivspolitik der påstår "kun session-cookies" (allerede flagget af Fase 5).
- **Signup** (`app/signup/page.tsx`) — emailRedirectTo bruger `window.location.origin/auth/callback?next=…` (encoded). Whitelistes derefter i callback. ✅. Password-min 6 (bør hæves).
- **Reset-password** (`app/auth/reset-password/page.tsx`) — kompleks token-parsing fra hash/query med fallback til `exchangeCodeForSession`. Fungerer men kan forenkles. ⚠️
- **OAuth-callback** (`app/auth/callback/route.ts`) — `resolveNext()` validerer, `ensureEditorRole()` opdaterer rolle. Håndterer "User already exists"-fejl elegant. ✅
- **Forgot-password** (`app/login/page.tsx:131-196`, `ForgotPasswordView`) — bruger `resetPasswordForEmail` med `window.location.origin/auth/reset-password`. ✅

### service_role / klient-bundle-isolation
Verificeret import-graf:
```
lib/supabase/admin.ts (SUPABASE_SERVICE_ROLE_KEY)
  ← lib/editors.ts (no 'use client')
    ← app/admin/barcode-forslag/page.tsx       (server component)
    ← app/api/revalidate/route.ts              (API route)
    ← app/auth/callback/route.ts               (route handler)
    ← app/garn/page.tsx                        (server component)
    ← app/garn/admin/page.tsx                  (server component)
    ← app/garn/admin/new/page.tsx              (server component)
    ← app/garn/admin/suggestions/page.tsx      (server component)
    ← app/garn/admin/[id]/edit/page.tsx        (server component)
    ← app/garn/auth/callback/route.ts          (route handler)
```
Ingen importer er klient-komponenter. ✅ Ingen klient-bundle-lækage.

### Data-mutationer
Stikprøve af yarn_items / projects / yarn_usage INSERT/UPDATE-flow: bruger `lib/supabase/client.ts`-baseret klient (RLS-bag-the-rat). Ingen direkte `.from('yarn_items').insert()` med user_id fra klientside (RLS sætter `user_id = auth.uid()` via policies). ✅
