# maskerummet — backlog

Sandhed for hvad der er lavet, i gang og ønsket. Opdateres via `/backlog sync`.

**Sidst synkroniseret:** 2026-04-22 (Projekt-stadier + delings-gating + rename substitution→alternativ)

---

## Nuværende milepæl

**Testbruger-launch** — mål-dato: 2026-05-09 (3 uger fra 2026-04-18).

### Launch-krav (MÅ-HAVE)
- Fungerende auth: login, logout, glemt-password, email-verifikation, signup
- Supabase RLS på alle tabeller med brugerdata
- Kerne-flow (tilføj garn, se lager, tilføj projekt) fungerer på mobil
- Fejlbeskeder og tomme tilstande overalt
- Data-eksport (bruger kan få sine data ud)
- Ingen synlige halv-implementeringer
- Privatlivspolitik (dansk, kort, ærlig)
- Kontakt/feedback-kanal

---

## Implementeret

### Auth
- Login med e-mail + adgangskode (`app/login/page.tsx`) — fejlbeskeder på dansk, husk-e-mail via localStorage
- **Signup med e-mail + adgangskode** (`app/signup/page.tsx`) — åben tilmelding, bekræft-adgangskode, email-verifikation via Supabase, "tjek din email"-besked, link til privatlivspolitik
- Login ↔ signup krydslinks
- Glemt-adgangskode flow med e-mail-reset (`/login` -> ForgotPasswordView)
- Nulstil-adgangskode side (`app/auth/reset-password/page.tsx`) — håndterer både token-hash og PKCE code-flow
- Auth-callback route (`app/auth/callback/route.ts`)
- LoginGate-komponent — beskytter garnlager, projekter og visualizer

### Garnlager
- Tilføj/rediger/slet garn — CRUD mod `yarn_items` i Supabase
- Fiber-filter (Uld, Merino, Mohair, Alpaka, Silke, Bomuld, Hør, Akryl)
- Status-filter (På lager, I brug, Brugt op, Ønskeliste)
- Farve-kategorier med hexfarve-vælger
- Barcode-scanner (kamera-baseret, `BarcodeScanner.jsx`)
- Katalog-søgning: link garn til garn-kataloget ved oprettelse
- Billede-upload til garnpost
- Metrage og antal nøgler registreres
- Kommentar/noter-felt per garn
- "Brug nøgler"-modal (`BrugNoeglerModal.tsx`) — log forbrug + opdater antal
- **CSV-eksport af garnlager** (`lib/export/exportGarnlager.ts`) — eksportknap i header, UTF-8 BOM, danske kolonner, Excel-kompatibel

### Projekter / Arkiv
- Tilføj og se projekter (`components/app/Arkiv.jsx`)
- Multi-garn pr. projekt med thumbnails
- Vælg garn+farve fra katalog ved projektoprettelse
- Projekter gemt i `projects`-tabel med `yarn_usage`-relationer
- RLS på `projects`-tabel (select/insert/update/delete egne)
- **CSV-eksport af projekter** (`lib/export/exportProjekter.ts`) — eksportknap i header, dansk kolonnenavne
- **Bekræftelsesdialog ved sletning af garn** (`components/app/Garnlager.jsx`) — inline "Er du sikker?" + Annuller + "Ja, slet" matcher mønster fra Arkiv.jsx; fejl vises via saveError; ingen dobbelt-sletning under async

### Sikkerhed / RLS
- RLS på `projects` (select/insert/update/delete egne)
- RLS på `substitution_votes` og `substitution_suggestions`
- **RLS på `yarn_items`** — aktiv i Supabase (verificeret 2026-04-19), 4 policies (select/insert/update/delete_own)
- **RLS på `yarn_usage`** — aktiv i Supabase (verificeret 2026-04-19), 4 policies (select/insert/update/delete_own). Gamle duplikat-policies fjernet.

### Garn-katalog
- Offentlig katalog-side (`app/garn/page.tsx`) med filtrering
- Garndetaljeside med FiberBar, farvevisning, beskrivelse (`app/garn/[slug]/page.tsx`)
- Substitution-sektion med community-validering (`SubstitutionsSection.tsx`, `ModerationClient.tsx`)
- Admin-editor til oprettelse/redigering af garn (`app/garn/admin/`) — med tom tilstand
- FAQ for garn-katalog (`app/garn/faq/page.tsx`)

### Layout og navigation
- Glassmorphism-navigation med auth-gating (`components/layout/Nav.tsx`)
- Footer med privatlivspolitik-link og kontakt-email (`components/layout/Footer.tsx`)
- Roterende baggrunds-karussel (`components/layout/BackgroundCarousel.tsx`)
- Forside med feature-cards (`app/page.tsx`, `FeatureCards.tsx`)
- Om Striq-side (`app/om-striq/page.tsx`)

### GDPR / tillid
- **Privatlivspolitik-side** (`app/privatlivspolitik/page.tsx`) — dansk, GDPR-compliant, dækker dataansvarlig, data indsamlet, cookies, tredjeparter (Supabase, Google Fonts), rettigheder, kontakt
- **Kontakt/feedback**: kontakt@striq.dk synlig i footer og på privatlivspolitik-siden
- **Data-eksport**: CSV-download af garnlager og projekter (GDPR art. 20 dataportabilitet)

### Projekt-stadier + delings-gating + hero (2026-04-22)
- **3-stage projekter** (`components/app/Arkiv.jsx`) — vil_gerne / i_gang / faerdigstrikket. Tabs i sub-header med tællere pr. stadie, default åbner på "Færdigstrikket". Søg filtrerer inden for valgt tab.
- **Status-vælger** i både NytProjektModal og DetailModal (chip-knapper). Ønskeprojekter må oprettes uden garn-linje; i_gang + færdig kræver mindst ét garn.
- **Hero til Projekter-siden** (`app/projekter/page.tsx`) — matcher Opskrifter i gradient (sage→dustyPink), form og størrelse. Titel "Mine strikkeprojekter" + underoverskrift. Illustration `skab-bloed`.
- **Datamodel** (`supabase/migrations/20260423000001_project_status.sql`) — ny `status`-kolonne (default `faerdigstrikket`, bagudkompatibelt). CHECK-constraint enforcer enum. Defense-in-depth CHECK: `is_shared=true` kræver `status='faerdigstrikket'`. Idempotent migration med `notify pgrst, 'reload schema'`.
- **UI-gating** af "Del med fællesskabet"-knap — skjult bag dæmpet hjælpetekst når status ≠ faerdigstrikket.
- **Backend-gating** — skift til ikke-faerdig på delt projekt sætter automatisk `is_shared=false` i samme UPDATE. Postgres CHECK-violation (23514) fejl-mappes til dansk besked i DelMedFaellesskabetModal.
- **Rename "substitution" → "alternativ"** — alle bruger-vendte strings (SubstitutionsSection, privatlivspolitik, ideer). Tabel-navne, RPC'er og TypeScript-typer bevaret for teknisk stabilitet.
- **Tests** (17 nye): Arkiv.tabs, Arkiv.statusGating, DelMedFaellesskabetModal.errorMapping — 194/194 passerer.

### Fællesskabet (2026-04-20)
- **Offentlig delingsside** (`app/faellesskabet/page.tsx` + `FaellesskabClient.tsx`) — matcher design-mockup, søg + 3 filter-dropdowns (type, garn, opskrift), kort-grid med type-chip, forfatter ("af [display_name]"), opskriftskort (kun navn+designer), garn-chips med overflow, tom tilstand, ingen login krævet
- **Del-flow** (`components/app/DelMedFaellesskabetModal.jsx`) — modal med project_type, community_description, pattern_name, pattern_designer, bekræftelses-checkbox, focus-trap, escape + click-outside. Kan afdeles.
- **Datamodel** (`supabase/migrations/20260421000001_community_sharing.sql`) — udvidet `projects` med is_shared, shared_at, project_type, pattern_name, pattern_designer, community_description. Ny `profiles`-tabel med valgfrit display_name. Views `public_shared_projects` + `public_shared_project_yarns` med `security_invoker=true`.
- **Copyright-hegn i 3 lag**: (1) view whitelister kolonner, (2) kolonne-niveau GRANTs på `projects`/`yarn_usage` udelader `notes` + `pattern_pdf_url` for anon, (3) RLS-policies begrænser anon til `is_shared=true` rækker
- **Arkiv-integration**: "Del med fællesskabet"-knap i DetailModal, "✦ Delt"-badge på projektkort
- **Navigation**: Strikkeskolen erstattet med Fællesskabet i Nav + forsidens feature-kort (strikkeskolen-siden bevaret unlinked)
- **Seed-script** (`scripts/seed-faellesskabet.mjs`) — finder projekter hos hkwermuth@gmail.com + hannah@leanmind.dk, deduplikerer på (titel, foto), `--dry-run` default
- **Tests** (39 nye): `lib/community.ts`, `FaellesskabClient`, `DelMedFaellesskabetModal`, navigation — 88/88 passerer

### Indhold
- Kalender med strikke-events april–oktober 2026 (`app/kalender/page.tsx`)
- FAQ-side (`app/faq/page.tsx`)
- **Opskrifter** (`app/opskrifter/page.tsx`) — demo-side med eksempel-kort (ekstern/egen × gratis/betalt), "sådan tænker vi opskrifter"-afsnit, designer-pitch. Knapper er disablede og tydeligt mærket EKSEMPEL
- **Strikkeskolen** (`app/strikkeskolen/page.tsx`) — "kommer snart"-side med planlagte guides, FAQ-link
- Idéboard / kanban (`app/ideer/page.tsx`) — admin-only

### Forhandlersøgning (udbygget 2026-04-21)
- Find forhandler nær dig (`app/find-forhandler/page.tsx`) — geolokation + by-søgning, Supabase RPC `find_stores_near`, brand-filter
- **Hero-tekst** — "Find garnbutikker nær dig eller online" med direkte ankerlink til online-sektionen
- **Brand-filter over kortet** (`FindForhandlerClient.tsx`) — ét filter styrer samtidigt kort-pins, radius-søgeresultater OG online-forhandler-sektionen. Re-kører RPC automatisk når brand skiftes. Chip-listen viser kun mærker med fysiske butikker og filtrerer `HIDDEN_BRAND_SLUGS` (Hobbii, Novita, Holst, Hillesvåg) fra.
- **"Køb garn online"-sektion** under kortet (`OnlineRetailersSection.tsx`) — **113 webshops** leverer til DK, alfabetisk sorteret, brand-tags pr. butik, XSS-sikret URL-validering på alle eksterne links (`target="_blank"` + `rel="noopener noreferrer"` + `safeWebUrl()`).
- **Fysisk + online-kobling** — 16 butikker er linket til deres webshop via `stores.online_retailer_id` (Woolstock, Uldgalleriet, Strikkestedet, Maskefabrikken, Sommerfuglen, Uldfisken m.fl.). Brand-tags propageres begge veje — fra store_brands til retailer_brands og tilbage efter LLM-klassifikation.
- **Kontrast-forbedringer** — lys-grå #8C7E74 erstattet med mørkere #6B5D4F overalt (kontrastforhold 4.5:1 → 6:1 mod hvid). Resultat-meta og webshop-tæller matcher nu H2-overskriftens styling (#302218, 15px, fontWeight 500).

#### Database-tabeller (tilføjet 2026-04-21)
- `public.brands` — kanonisk 17 garn-mærker (slug, name, origin, website, updated_at)
- `public.online_retailers` — **113 webshops** (slug, navn, url, land, leverer_til_dk, sidst_tjekket)
- `public.retailer_brands` — junction (retailer ↔ brand), **403 koblinger**
- `public.store_brands` — junction (store ↔ brand), **579 koblinger** efter bagud-propagation fra webshops
- `public.stores.online_retailer_id` — nullable FK, linker fysisk butik til webshop
- RLS: offentlig SELECT på alle, ingen anon writes. `GRANT SELECT` tilføjet eksplicit (ellers blokeret trods policy).

#### Datagrundlag
- 17 brands, 228 fysiske butikker, 113 webshops
- **13 af 17 mærker** har fysiske butikker (chip-synlige). 4 skjult via `HIDDEN_BRAND_SLUGS`.
- **Top mærker (fysiske butikker):** Permin (197), Filcolana (117), Hjertegarn (59), Isager (41), CaMaRose (32), KfO (29), Sandnes (26), Drops (23), Rauma (16), Ístex (11), BC Garn (10), Mayflower (8), Önling (7).
- Online-dækning udvidet via **LLM-klassifikation** (Claude Haiku 4.5): analyserede HTML + navigation for hver af de 113 webshops, identificerede mærker fra navigationsstrukturen. Tilføjede 131 retailer_brands-koblinger (258 → 389, derefter 403 efter propagation).

#### Værktøjer i `scripts/`
- `find-webshops.mjs` — webshop-detektion for fysiske butikker (domain-guessing + HTML-signal-analyse: "læg i kurv", Shopify/Woo-tags, kr-priser)
- `classify-retailer-brands.mjs` — LLM-klassifikation via Claude Haiku 4.5, rate-limit retry, ONLY_MISSING_BRANDS=1 for delta-kørsel
- `check-retailer-links.mjs` — bulk HTTP-check af alle online-URLs (110/113 OK, 3× 429 fra shops med bot-beskyttelse)
- `generate-webshop-migration.mjs` — genererer SQL fra crawl-output

### Visualizer
- AI farvevisualizer (`app/visualizer/page.tsx`, `YarnVisualizer.jsx`) — kræver login

### Tomme tilstande
- Garnlager: "Dit garnlager er tomt" + handlingsopfordring ✓
- Projekter/Arkiv: "Ingen færdige projekter endnu" + guidance ✓
- Garn admin: tom tilstand med "Klik + Nyt garn" ✓

### Tech
- Supabase SSR + client setup i `lib/supabase/`
- Excel-import/eksport til garn-katalog (admin-script, ikke brugervendt)
- Generisk CSV-generator (`lib/export/csv.ts`) med UTF-8 BOM og dansk semikolon-separator

---

## I gang / halv-implementeret

### Dark mode (LAV PRIORITET)
Ingen `dark:`-klasser i kodebasen. Dark mode er ikke startet. Sørg for at OS dark mode ikke utilsigtet bryder layoutet. Kan vente til efter testbruger-launch.

### Forhandlersøgning — data mangler sandsynligvis
Siden er implementeret teknisk, men `find_stores_near` RPC'en forudsætter at butiks-data er indlæst i databasen. Verificer at der faktisk er data.

### "Min placering" — IP-fallback fejler ved gentagne radius-skift
Når brugeren klikker "📍 Min placering" og derefter skifter radius (10/25/50 km) flere gange, fejler IP-lookupet (`ipapi.co/json/` rate-limit eller intermittent fejl). Brugerens oprindelige IP-lokation bliver tabt, og søgningen stopper med "Kunne ikke finde din placering"-fejl.

**Forslag til alternativ "Min placering":**
- Cache brugerens lat/lng i `sessionStorage` efter første succes — ingen nye IP-lookups ved radius-skift.
- Eller brug `navigator.geolocation.watchPosition` med `maximumAge: 300000` så browseren selv genbruger lokation.
- Evt. serverside proxy-endpoint der cacher IP→lokation for 1 time.
- Fallback til "Skriv din by" med bedre fejlbesked når IP-lookup fejler.

Ikke launch-blokerende — kan løses efter testbruger-launch. `FindForhandlerClient.tsx` — `tryIpFallback()`-funktionen.

### Online-forhandlere — admin og vedligehold
- Seed-data er manuelt indsamlet april 2026 (28 shops) — `sidst_tjekket`-kolonnen på hver række markerer verificerings-dato. Kvartalsvis manuel gennemgang anbefalet indtil admin-UI er på plads.
- Ingen admin-UI endnu: tilføjelse/redigering kræver ny SQL-migration eller direkte service_role-query.
- `stores.online_retailer_id` FK er oprettet men ikke befolket — fysiske butikker i `stores` er ikke koblet til deres online-pendant endnu (fx Hobbii). Matching-job bør laves.
- `yarn_items.yarn_brand` er fri tekst; linke til kanonisk `brands(id)` som separat migration.
- Featured brands (Drops/Permin/Filcolana) er hardkodet i `OnlineRetailersSection.tsx:11` — kunne flyttes til en `is_featured` kolonne i `brands`.

### store_brands — udvidelse
- **Drops:** kun 16 af ~38 officielle DK-forhandlere blev matched mod vores `stores`-tabel (resten mangler eller har afvigende navne).
- **Hjertegarn:** 53 af 145 matched. Mange af de 92 ikke-matchede er små butikker der ikke findes i vores `stores`-tabel (importeret fra Permin+Filcolana-kort).
- **BC Garn:** kun 2 officielle DK-forhandlere (+ webshops). Ikke bredt distribueret fysisk.
- **Isager + Knitting for Olive:** seed er _approksimation_ baseret på overlap med CaMaRose-forhandlerlisten (18 butikker hver). Bør verificeres manuelt — Isager-siden har dynamisk retailer-finder der ikke kan scrapes via WebFetch.
- **Mærker uden koblinger (9 stk.):** Sandnes Garn, Hobbii, Mayflower, Holst Garn, Önling, Ístex, Rauma, Hillesvåg, Novita — vises kun i online-sektionen. Disse producenter har enten:
  - Ingen offentlig forhandlerliste (Holst, Önling, Mayflower, Hobbii)
  - Dynamisk SPA-site der ikke kan scrapes uden headless browser (Sandnes, Isager)
  - Primært nordisk marked (Ístex, Rauma, Hillesvåg, Novita)
  - **Anbefaling:** kontakt producenterne direkte via email (striq.dk) eller implementer Playwright-scraping for SPA-sider.

### Google Places-berigelse (POST-TESTLAUNCH)
`stores`-tabellen mangler websites, åbningstider, og verificeret business-status. Google Places/Maps API kan give:
- `website` — officielle URLs (låser op for LLM-crawl af brand-info)
- `opening_hours` — struktureret dag-for-dag
- `business_status` — fanger permanent lukkede butikker
- `rating` / `user_ratings_total` — social proof i kort-popup
- `photos` — officielle butiksbilleder

Pris: ~$0.017/butik × 228 ≈ $4-8. Kræver Google Cloud API key. **Ikke launch-blokerende** — nuværende 8 mærker + 16 fysisk+online-koblinger giver tilstrækkelig funktionalitet. Planlægges post-testlaunch som samlet data-berigelses-sprint.

### LLM-crawl af butiks-websites (afhænger af Google Places)
Planlagt som automatiseret brand-klassifikation pr. butik via Claude Haiku 4.5. Kan først køres efter `stores.website` er populeret (se ovenfor). Forventet resultat: yderligere 200-500 brand-koblinger + detektion af flere fysisk+online-butikker.

---

## Mangler — blokerende for testbruger-launch

### 1. Verificer email-bekræftelse i Supabase
Tjek at "Confirm email" er aktiveret under Authentication > Email i Supabase-dashboardet. Uden dette logges nye brugere ind direkte uden verifikation.

### 2. Mobil-test af kerne-flows
Touch targets og layout under 640px. Garnlager + projekter skal testes på mobil.

### 3. Ret tekst i velkomst-modal
Onboarding-velkomstmodalen (`components/app/OnboardingModal.tsx`, `SECTIONS`-array linje 11-31) indeholder fejl i copy. Skal gennemlæses og rettes af Hannah inden testbruger-launch.

### 4. Substitutions-flow: klik-adfærd, kommentarer, flertrådede forslag
Flere huller i substitutions-UX'en skal lukkes inden launch:

**5a. Klik-adfærd på et substitutions-forslag**
I dag: uklart hvad der sker når bruger klikker på et garn i substitutions-sektionen (`SubstitutionsSection.tsx`). Skal afklares og implementeres:
- Navigér til substitutions-garnets egen detaljeside?
- Åbn modal med fuld info + "Tilføj til mit lager"-knap?
- Begge (klik = navigér, anden knap = tilføj)?

**5b. Kommentar-flow**
Medlemmer kan poste kommentarer/forslag til substitutioner, men flowet er ikke verificeret:
- Hvordan ser brugerinput ud (formular-felter)?
- Er der tydelig feedback efter submit ("tak, dit forslag gennemgås")?
- Hvordan vises godkendte kommentarer på garn-detaljesiden?
- Moderations-flowet (`ModerationClient.tsx`) — se også BØR-HAVE om effektivitets-review.

**5c. Flertrådede substitutions-forslag**
Ofte kan man erstatte fx en "Aran"-garn med *to tråde* af en tyndere garn. Datamodellen skal understøtte dette:
- Udvid `substitutions`-tabellen (eller hvad der nu er) med `strand_count` (int, default 1) + evt. `held_with_yarn_id` hvis blanding af to forskellige garner.
- UI: "foreslå som 2-tråds substitution" i forslags-flowet.
- Visning: "2 tråde af [garn]" i substitutions-listen.


**Filer formentligt berørt:**
- `components/garn/SubstitutionsSection.tsx` (klik-handlers, kommentar-UI, rename)
- `components/garn/ModerationClient.tsx` (rename, evt. flertråds-UI)
- Ny migration hvis flertrådede forslag kræver schema-ændring
- `app/garn/[slug]/page.tsx` (visning, rename)
- Evt. `content/` hvis der er statisk copy

Launch-blokerende: feature er halv-implementeret uden klart klik-flow eller understøttelse af den mest almindelige danske substitutions-case (flertrådet).

### 5. Infra / ops inden testbruger-launch

Opsamling fra Jespers råd (IT-arkitekt) + løbende diskussion. Markeret efter kritikalitet.

**KRITISK — skal være på plads før testbrugere får adgang:**

- [ ] **5.1 Dev/prod-split af Supabase** — i dag kører alt mod én Supabase-instans (`bdxjhylopixuvncswfqj.supabase.co`). Opret separat prod-projekt, kopiér schema + seed-data, opdater `NEXT_PUBLIC_SUPABASE_URL` + keys i Vercel prod-env. Dev-instansen bevares til lokale kørsler. Task #13 (i gang).
- [ ] **5.2 Migrations-versionering / kørsels-proces** — migrations i `supabase/migrations/` køres ikke automatisk. Dokumentér proces ("før deploy: kør nye migrations manuelt i SQL Editor"), eller sæt Supabase CLI op så `supabase db push` virker. Uden dette risikerer vi gentagelser af "status-kolonne mangler"-fejlen. Del af task #13.
- [ ] **5.3 Backup — rå kopi af data** — Supabase Pro giver 7 dages automatisk backup. Free-tier har ingen. To veje:
  - **A) Opgradér til Supabase Pro** (~$25/md) — task #11
  - **B) Automatiseret nightly backup via GitHub Actions** — `pg_dump` til privat storage, Free-tier-kompatibel. Task #20
  Vælg én **inden** testbrugere lægger data ind.
- [ ] **5.4 Secrets-audit** — verificér at ingen nøgler/tokens er hardcodet i koden eller committet til git. Kør `git log -p | grep -i "api_key\|secret\|token"` som stikprøve. Alle reelle secrets skal ligge i Vercel env-vars, ikke i `.env` (som er i gitignore men bør verificeres). Task #10 er delvist kørt — verificér mod prod-env.
- [ ] **5.5 Verificér "Confirm email" i Supabase Auth** — allerede i punkt 1 ovenfor. Uden dette logges nye brugere ind direkte uden email-verifikation. Tjek Authentication → Email → "Confirm email" er tændt.
- [ ] **5.6 Kør pending migrations i prod** — før launch: verificér at alle `supabase/migrations/` er kørt mod prod-instansen. Særligt `20260423000001_project_status.sql` (status-kolonne) og `20260419000001_rls_yarn_items_and_usage.sql` (RLS på garn).

**VIGTIG — bør være på plads inden mange brugere:**

- [ ] **5.7 Password-beskyt Vercel-previews** — Vercel preview deployments er offentligt tilgængelige med kendt URL-mønster. Aktivér Vercel Auth eller password-beskyt via Vercel Pro. Task #9.
- [ ] **5.8 Rate-limiting på auth-endpoints** — i dag har login/signup ingen throttling. Brute-force-beskyttelse via Vercel Edge Middleware eller Supabase Auth-rate-limits. Task #17.
- [ ] **5.9 CSP + security headers** — Content-Security-Policy, Strict-Transport-Security, X-Frame-Options m.fl. Sæt via `next.config.js` headers() eller middleware. Task #16.
- [ ] **5.10 Sentry — fejl-monitorering** — i dag har vi ingen logging af runtime-fejl i prod. Tilføj Sentry (gratis-tier). Task #15.

**KAN-VENTE (men bør planlægges):**

- [ ] **5.11 Striq-branded emails via Resend** — Supabases default-emails er generiske. Opsæt Resend som SMTP-provider i Supabase Auth så velkomst/reset-mails ser ud som Striq. Task #19.
- [ ] **5.12 Performance/latency-monitorering** — Vercel Analytics eller Sentry Performance. Mål end-to-end klik→svar tid. Nice-to-have før launch, må-have kort efter.
- [ ] **5.13 Dashboard / observability** — opsaml fejl + performance-signaler i et sted (Sentry + Vercel Analytics). Del af 5.10 + 5.12.
- [ ] **5.14 Code hardening fase 2** — `npm audit` + `dependency scanning` i CI, secrets-scanner (fx gitleaks). Ikke akut men hygiejne-mæssigt vigtigt.

---

## Ønsker / overvejelser

Ideer fra STRIQ_ideer.xlsx der ikke er startet. Grupperet efter prioritet.

### BØR-HAVE (giver tillid og værdi til testbrugere)

**"Prøv garn"-side mere indbydende (2026-04-20):**
- **Prøv garn tilgængelig uden login** — `app/visualizer/page.tsx` er p.t. wrappet i `LoginGate`, så ikke-indloggede kun ser login-skærm. Eksempler skal kunne ses af alle, generering/gem kræver stadig login. Hero-banner øverst i om-striq-stil (gradient dustyPink → sage) med intro + CTA "Log ind for at prøve — og gemme — dine egne visualiseringer".
- **Slank upload drop-zone i visualizer** — nuværende drop-zone (`YarnVisualizer.jsx:525-555`) er for dominerende (padding 48px, 48px emoji). Omskriv til kompakt horizontal layout: ikon 28px, padding 20px, tekst ved siden af. Bevar drag-drop-affordance.

**UX-review af "Mit Garn"-input (2026-04-19) — quick wins (< 30 min hver):**
- **QW1 Required-validering ved gem** — `save()` accepterer tomme garn i dag. Kræv minimum `name` + `brand` (eller katalog-link). Vis fejl ved submit. (`Garnlager.jsx:345, 836`)
- **QW2 Escape-tast lukker modal** — mangler keydown-listener. (`Garnlager.jsx:775`)
- **QW3 Autofokus på katalog-søg ved "Tilføj garn"** — sparer mobilbrugere for at tappe. (`Garnlager.jsx:418, 788`)
- **QW4 Skjul "Skann garn"/"Eksporter" på tomt lager** — støj når yarns.length===0. (`Garnlager.jsx:617-639`)
- **Copy-forbedringer** — "Løbelængde pr. nøgle" + hjælpetekster, dansk-venlig "Gemt!" i stedet for "✓ Gemt"

**UX-review — større forbedringer (kræver design-tid):**
- **UX-fix Slet-bekræftelse → centreret AlertDialog** — nuværende inline "Er du sikker?" i Garnlager-modalens footer er fat-finger-risiko på mobil
- **Progressive disclosure i Tilføj-modal** — 14+ felter synlige samtidig overvælder. Sektioner: påkrævet → valgfri → "Flere detaljer ▸". ~2 dage.
- **Mobil bottom-sheet i stedet for centered modal** — matcher native mobile-conventions. ~1-2 dage.
- **To-trins flow: [Søg katalog] / [Scan stregkode] / [Manuelt]** — slanker den ene mega-form til tre fokuserede spor. ~2-3 dage.
- **Bulk-tilføj (tabel-UI, 5 tomme rækker)** — testbrugere skal importere eksisterende samling hurtigt. ~2 dage.
- **Katalog-søg: "Ingen match" + tastatur-navigation** — `YarnCatalogSearch` svarer ikke når intet findes; ingen ArrowUp/Down/Enter. (`Garnlager.jsx:72-152`)

- **Onboarding / velkomst-flow** — første-gangs-guide til nye brugere: hvad er Striq, hvad kan de gøre nu, hvor starter de. Uden dette vil testbrugere fare vild.
  Kør med: `/ny-feature Onboarding: velkomst-modal til ny bruger ved første login`

- **Sortering af garnlager** — brugere vil sortere efter farve, navn, garntype (fra Excel: "Man skal kunne sortere i garnlageret"). Der er kun filter i dag, ingen sortering.

- **Mobil-polish** — touch-targets og layout på < 640px. Kerne-flow skal være testet på mobil inden launch.

- **Markér yndlingsgarn** — simpel favoritmarkering i garnlageret (fra Excel: "Yndlingsgarner").

- **Ønskeliste i garnlager** — status "Ønskeliste" eksisterer allerede som felt, men overvej om det er tydeligt nok som feature (fra Excel: "Ønskeliste med garner").

### KAN-VENTE (efter testbrugere)

**Fra Jesper (IT-arkitekt, 2026-04-19):**
- **Erstat `xlsx`-pakke med `exceljs`** (valgt A for nu: `xlsx` bruges kun server-side med betroede filer, så HIGH-vulnerability er lav reel risiko. Skift hvis bruger-upload af Excel kommer senere)
- **AI-substitutions-strategi** — pre-compute ved yarn-insert + nightly refresh vs. on-demand. Arkitekturel beslutning, udskudt til efter launch.
- **Code hardening fase 2** — bredere audit: CSP-tuning, dependency-scanning i CI, secrets-scanner

**Fra Hannah (nye ønsker, 2026-04-20):**
- **Søgning på konkrete garntyper pr. garnbutik** — brugeren vælger én eller flere specifikke garner fra katalog, finder butikker der fører netop dem. Kræver fuld mapping af butik↔garn i DB (brug/udvid `stores`-tabel og katalog-relation). Erstatning for den gamle brand-pill-filtrering der blev fjernet i Find garnbutikker-redesignet.

**Fra Hannah (egne ønsker, 2026-04-19):**
- **AI-validering af substitutioner** (Claude API) — AI der ved om fibre/vægt/metrage faktisk matcher. M-estimat
- **Moderations-flow for substitutions-forslag — effektivitets-review** — `ModerationClient.tsx` findes, men Hannah ønsker at verificere at godkendelses-workflowet er så hurtigt som muligt pr. forslag (batch-godkend? tastatur-shortcuts? keyboard-only flow?). UX-review anbefales.
- **Garnproducent-kontaktliste** — Excel med producentnavne, kontaktoplysninger, hvilke garner de fører. Research-task, ikke kode. Kan hjælpe separat.
- **Opskrifts-katalog (fuld feature, post-launch)** — juridisk og forretningsmæssig overvejelse før teknisk. Består af:
  - **Ny tabel `patterns`** i Supabase (titel, designer, billede, garn, pind, sværhedsgrad, pris, kilde-URL, `is_own`, `owner_user_id`) + RLS
  - **Tabel `pattern_favorites`** (user_id, pattern_id) — erstatter den nuværende localStorage-løsning på demo-siden
  - **Tabel `user_pattern_filters`** — gemmer brugerens sidste søgekriterier/filtre, så de huskes på tværs af sessioner
  - **Kolonne `pattern_id` på `projects`** — knyt opskrift → projekt når opskriften ligger i STRIQ
  - **UI**: favorit-hjerte på kort, "Mine favoritter"-filter, filter-persistens, "Knyt opskrift"-vælger i Mine projekter
  - **Admin-flow** til at oprette opskrifter (både egne og efter tilladelse fra eksterne designere)
  - **Forudsætning**: tilladelser fra designere/fabrikanter indhentes via `content/fabrikanter.md`-processen
- **Salg af opskrifter gennem STRIQ (monetisering)** — kræver betalings-integration, royalty-aftaler, moms-håndtering. Stor, senere.
- **Bredere UI/UX-audit af hele appen** — overlap med "Mit Garn"-review (3.2). Efter launch.
- **PWA + app-store** — PWA realistisk tidligt, native app-store kræver Capacitor/separat build (måneder). PWA anbefales som næste skridt.

- **Metrage-beregner pr. projekt** — beregn hvor meget garn der skal bruges til et projekt (fra Excel)
- **Sorter garnets visning på forsiden** — brugerdefineret standardvisning der gemmes
- **Import fra Ravelry** — API eller CSV-import fra eksisterende Ravelry-profil
- **AI-forklaring af teknikker** — German short rows, Italian cast-off osv. via Claude API
- **Fiber- og garnegenskaber forklaret** — "hvad er Fingering?", "hvad er Lace?" — oversæt tekniske termer til alm. dansk (fra Excel)
- **Certificeringer forklaret** — GOTS, Oeko-Tex osv. (fra Excel)
- **Prosatekst og fotos til garn-kataloget** — redaktionelt indhold per garn (fra Excel)
- **Søg på garn til bestemte projekter** — "garner til sjal, bluse, hue osv." (fra Excel)
- **Farveteori: kombiner egne garner** — se dine garner som farvepalette og få forslag (fra Excel)
- **Tilbud-notifikationer på yndlingsgarn** — robot der giver besked ved tilbud i netbutikker (fra Excel)
- **Affiliate-model med garnbutikker** — særligt DK-fokus (fra Excel)
- **Membership: Gratis / Pro** — AI-funktioner bag Pro-muren (fra Excel)
- **Strikkelog** — personlig log over alt man har strikket, kommentarer om ændringer (fra Excel: Pernille)
- **Link til opskrifter der passer til garnet** — og beregning af manglende mængde (fra Excel: Pernille)
- **Sociale features** — dele færdige projekter (uden opskriften), fællesskab
- **AI-mønstergenkendelse** — få lavet en opskrift fra et foto
- **Visualizer: se dig selv i en trøje** — avanceret AI-feature
- **Hækling** — udvide scope til hækling (fra Excel)
- **Offentlig forhandler-søgning med mere data** — udvide brands og butiks-database

---

## Anbefalet næste skridt

1. **Verificer email-bekræftelse** i Supabase-dashboardet
2. **Mobil-test** af garnlager + projekter på < 640px
3. Overvej **onboarding-flow** til nye brugere (`/ny-feature Onboarding: velkomst-modal til ny bruger ved første login`)
4. **A11y-pass** (nice-to-have fra review): touch-targets ≥ 44px, `role="alert"` på fejl-bannere, `role="dialog"` + fokus-trap på modaler, fokus-flytning til bekræftelses-knapper

---

## Åbne spørgsmål

- Har `find_stores_near` RPC faktisk butiks-data at returnere?
- Dark mode: ikke startet — beslut om det skal med til launch eller vente
