# maskerummet — backlog

Sandhed for hvad der er lavet, i gang og ønsket. Opdateres via `/backlog sync`.

**Sidst synkroniseret:** 2026-04-20 (Fællesskabet implementeret + "Prøv garn"-åbning + slank drop-zone)

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

### Forhandlersøgning
- Find forhandler nær dig (`app/find-forhandler/page.tsx`) — geolokation + by-søgning, Supabase RPC `find_stores_near`, brand-filter
- **Køb garn online**-sektion under kortet (`app/find-forhandler/OnlineRetailersSection.tsx`) — 28 danske online-forhandlere, brand-filter-chips (Drops/Permin/Filcolana + flere), direkte link til hver webshop. Data i `public.online_retailers` + `retailer_brands`-junction (17 brands, 68 koblinger). RLS offentlig SELECT. `stores.online_retailer_id` FK gør det muligt senere at linke fysiske butikker til deres webshop.
- **Brand-filter over kortet** styrer både kort-pins, radius-søgeresultater og online-forhandler-sektion samtidigt. Re-kører RPC'en automatisk når brand skiftes efter en søgning. Tom tilstand på kort peger brugeren mod online-sektionen når et mærke ikke har fysiske koblinger.
- **`store_brands` populeret** for 8 mærker: Permin (188), Filcolana (104), Hjertegarn (53), CaMaRose (18), Isager (18), Knitting for Olive (18), Drops (16), BC Garn (2). Total: 417 store-brand-koblinger.
- **Brand-filter skjuler mærker uden fysiske butikker** — kun de 8 mærker ovenfor vises som chip-filter over kortet. De resterende 9 mærker (Sandnes, Hobbii, Mayflower, Holst, Önling, Ístex, Rauma, Hillesvåg, Novita) vises stadig i online-sektionens retailer-cards som brand-tags, men kan ikke filtreres på. Når fysiske butikker findes for dem, kommer chipsene tilbage automatisk.
- **16 fysiske butikker linket til deres webshop** via `stores.online_retailer_id`: Citystoffer (×2 Aarhus), Garnværkstedet, Kreamok, Little Yarn, Maskefabrikken, Netgarn, Rito, Strikkenet (×2), Strikkestedet, Svinninge Garn, Uldfisken, Uldgalleriet, Unigarn, Woolstock. Brand-koblinger kopieret fra `store_brands` til `retailer_brands` så filter virker konsistent på tværs.

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
