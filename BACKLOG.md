# maskerummet — backlog

Sandhed for hvad der er lavet, i gang og ønsket. Opdateres via `/backlog sync`.

**Sidst synkroniseret:** 2026-04-27 (Indtastning + garn-katalog brief nedbrudt til 8 features)

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
- Barcode-scanner (kamera-baseret, `BarcodeScanner.jsx`) — **midlertidigt skjult** i Mit Garnlager (2026-04-27, se "I gang / halv-implementeret")
- Katalog-søgning: link garn til garn-kataloget ved oprettelse
- Billede-upload til garnpost
- Metrage og antal nøgler registreres
- Kommentar/noter-felt per garn
- "Brug nøgler"-modal (`BrugNoeglerModal.tsx`) — log forbrug + opdater antal
- **CSV-eksport af garnlager** (`lib/export/exportGarnlager.ts`) — eksportknap i header, UTF-8 BOM, danske kolonner, Excel-kompatibel
- **Lager-kort: kun bruger-fotos, ingen katalog-thumbnails (2026-04-28)** — kort i Mit Garnlager viser nu bruger-uploadet foto (`y.imageUrl`) hvis det findes, ellers farve/farve-gradient (`gradientFromHexColors`) som baggrund. Katalog-thumbnails (`y.catalogImageUrl`) rendres ikke længere — de var misvisende fordi de ikke nødvendigvis matchede den specifikke farve brugeren har. Foto-upload i edit-modal bevares. Dækker også B-fix: `YarnCatalogSearch`-dropdown åbner ikke længere automatisk når søgefeltet pre-udfyldes ved redigering af catalog-linket garn (kun bruger-initieret typing/focus trigger søgning).

### Projekter / Arkiv
- Tilføj og se projekter (`components/app/Arkiv.jsx`)
- Multi-garn pr. projekt med thumbnails
- Vælg garn+farve fra katalog ved projektoprettelse
- Projekter gemt i `projects`-tabel med `yarn_usage`-relationer
- RLS på `projects`-tabel (select/insert/update/delete egne)
- **CSV-eksport af projekter** (`lib/export/exportProjekter.ts`) — eksportknap i header, dansk kolonnenavne
- **Bekræftelsesdialog ved sletning af garn** (`components/app/Garnlager.jsx`) — inline "Er du sikker?" + Annuller + "Ja, slet" matcher mønster fra Arkiv.jsx; fejl vises via saveError; ingen dobbelt-sletning under async
- **Multi-billed-upload til projekter (2026-04-27)** — op til 6 strik-billeder pr. projekt + opskrift som enten 1 PDF eller op til 10 billeder (multi-select). Cover i Fællesskabet er første strik-billede. PDF første side rendres klient-side via `lib/pdf-thumbnail.ts` (pdfjs-dist, lazy-loaded, worker i `public/pdf.worker.min.mjs`). Migration `20260428000001_project_media_arrays.sql` udskifter `project_image_url` med `project_image_urls TEXT[]`, tilføjer `pattern_image_urls TEXT[]` + `pattern_pdf_thumbnail_url`; XOR-CHECK forhindrer at PDF og billed-opskrift koeksisterer. Filstørrelse + MIME-validering via `validateUploadFile`. Pattern-felter forbliver owner-only via kolonne-niveau-GRANT.

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
- **F1: yarnWeight-enum på yarns-tabellen (2026-04-27)** — kanonisk vægt-klassifikation som Postgres-enum (`lace`/`fingering`/`sport`/`dk`/`worsted`/`aran`/`bulky`/`super_bulky`) erstatter fri-tekst `thickness_category`. Migration `20260427000003_yarn_weight_enum.sql` opretter enum, tilføjer kolonne, backfiller via alias-mapping (engelsk + dansk + n-ply), eksplicit BC Garn Luxor → fingering override (Luxor-bug fixet). `yarns_full`-view recreates med ny kolonne. Ny `lib/yarn-weight.ts` med `mapToYarnWeight()`-funktion 1:1 med SQL CASE. Admin-editor (`YarnForm.tsx`) får ny "Vægt"-dropdown; gammel "Tykkelse" bevares parallelt med "afløses af Vægt"-label indtil F2-F4 migreres væk fra det. 33 nye Vitest-tests (327/327 grønne).
- **F2: Read-only katalog-sektion i Tilføj Garn-formular (2026-04-27)** — når et garn vælges fra det offentlige katalog, vises katalog-felter (mærke, navn, fiber, vægt, løbelængde, pind, ball-vægt, gauge-pind) i en grøn read-only info-blok (`components/app/KatalogInfoblok.jsx`) i stedet for som inputs. Bruger-egne felter samles under "Dine egne oplysninger"-heading på neutral baggrund. Visualiserer datakilde-konventionen grøn = katalog (read-only), neutral = bruger-input. Esc lukker katalog-søg-dropdown med `stopPropagation` (modal forbliver åben). Autofokus på søge-input når formen åbner uden katalog-link. `yarn_weight` tilføjet til `YARN_FULL_SELECT` så F1's enum vises via `YARN_WEIGHT_LABELS`. 46 nye Vitest-tests (373/373 grønne).
- **F3: Felt-forenkling i Tilføj Garn-formular (2026-04-27)** — fjerner teknisk støj fra modallen. Ny `<FarvekategoriCirkler>` (12-cirkel grid drevet af `COLOR_FAMILY_DEFAULT_HEX`, klik sætter både kategori og farve) erstatter Farvekategori-tekst-input + Farve(hex)-blok. Ny `<AntalStepper>` (−/+/n med 44px touch-targets, dansk komma-decimal) erstatter antal-input. Farvenavn+Farvenummer slået sammen til ét felt med heuristisk split (`parseCombinedColorInput` — 3+ cifre er nummer, resten er navn). KatalogInfoblok-header "Fra kataloget" → "Importeret fra katalog", "Fjern katalog-link"-tekstlink → "Skift"-pillknap, forklarings-tekst tilføjet. EAN-felt fjernet fra DOM (form.barcode bevares for scanner-flow). Billede-upload kollapset bag "▸ + Tilføj billede"-toggle (auto-åbnes ved edit hvis garn har billede). Submit-knap "Tilføj" → "Tilføj til lager". `validateForm` springer name+brand-validering over når katalog-link er sat. **Ingen "hex"/"#RRGGBB" i synlig UI-tekst.** Eksakt-farve-toggle (`<input type="color">`) bevares som sekundær affordance bag "Vælg eksakt farve"-link. 72 nye Vitest-tests (445/445 grønne).
- **F4: Garnkort-redesign på Mit Garnlager (2026-04-27)** — konsistent kort-layout. 120px-billedfelt fyldes 100% via `gradientFromHexColors()` (foto, swatch-på-farve, single hex eller linear-gradient ved multi-farve). Farvenavn-pille (hvid bg, border, shadow) i nederste-venstre hjørne — "Multi (N)"-fallback ved ≥2 farver uden navn. Mærke som CAPSLOCK over dedupliceret garnnavn (`dedupeYarnNameFromBrand` fjerner præfiks/suffiks/by-pattern). "Katalog"-chip droppet til fordel for ✎-ikon (omvendt logik: vises kun ved manuelt tilføjet). Kompakt detaljelinje "{kode} · {antal} ngl · {status}". Tags = vægt (via `YARN_WEIGHT_LABELS`) + primær fiber (`primaryFiberLabel`). Multi-farve via ny `hex_colors text[] null`-kolonne (1-5 hex, CHECK med `cardinality()`); ny `<FlereFarverVælger>`-komponent med chips + "+ Tilføj farve"-knap der genbruger F3's `<FarvekategoriCirkler>` som inline-picker. Migration `20260427000004_yarn_items_hex_colors.sql` kørt mod dev. 106 nye Vitest-tests (551/551 grønne).
- **F11: Projekt-form-paritet (2026-04-28)** — bringer projekt-formularen op på samme niveau som Mit Garnlager (briefens C.2 + C.3). Fire delopgaver leveret som ét feature-PR: (1) **Designer + opskriftsnavn synlig i edit-formular** — `pattern_name` + `pattern_designer` (eksisterende DB-kolonner brugt af DelMedFaellesskabetModal) eksponeres nu i NytProjektModal + DetailModal og vises i read-only-detalje hvis udfyldt. (2) **"Strikket med" → "Følgetråd"-rename** — UI-label-skift i NytProjektModal, DetailModal (edit + read-only) og BrugNoeglerModal (begge call-sites). DB-kolonnen `held_with` bevares uændret. (3) **"Garn i projektet" tre-tabs vælger** — ny `<GarnLinjeVælger>`-komponent erstatter den dobbelt-implementerede inline garn-linje-blok i begge modaller. Tabs: "Fra mit garn" (datalist-autocomplete fra brugerens `yarn_items`-lager — default ved status=i_gang/faerdigstrikket), "Fra kataloget" (genbruger `<YarnCatalogSearch>` via JSX-child + read-only-blok ved katalog-grøn `src-catalog`-token), "Manuelt" (fri tekst med F9 `src-warning`-banner: "Husk at tilføje garnet til dit lager bagefter for præcis sporing"). Default-tab beregnet via `defaultTabForStatus()` ved første mount af linjen og låst — status-skift mid-edit ændrer ikke eksisterende liniers tab. Eksisterende garn-linjer infereres via `inferTabFromLine()` ud fra hvilke felter der er sat. (4) **Hele + halve nøgler globalt** — Hannah-beslutning 2026-04-28: AntalStepper-default skiftet fra `step={0.25}` til `step={0.5}` (rammer både Mit Garnlager og projekt-form). `BrugNoeglerModal`-step opdateret tilsvarende. Eksisterende historisk `quantity_used = 0.25/0.75`-data bevares i DB men vises rundet til nærmeste 0.5 via ny `roundToHalfStep()`-helper i `fromUsageDb`. (5) **Egen-farve-skrivning** på Manuelt-tab — kombineret nummer/navn-input via `parseCombinedColorInput` (flyttet fra Garnlager.jsx til delt `lib/colorInput.ts`) + `<FarvekategoriCirkler>`-fallback til kategori-baseret hex. Ingen DB-ændringer (alle kolonner findes allerede). 70 nye Vitest-tests (687/687 grønne). Tester-rapport: AC1-15 dækket. Reviewer: APPROVE.
- **F5: "Brugt op"-subflow på Mit Garnlager (2026-04-28)** — når brugeren skifter status til "Brugt op" i Tilføj/Rediger garn-formularen, folder en orange sub-sektion (`<BrugtOpFoldeUd>`) ud i samme formular med projekt-felt (required, native datalist-autocomplete fra eksisterende projekter + accept af fri tekst som forberedelse til F15) + "Brugt op den"-dato (default = i dag). Antal nøgler sættes auto til 0 ved gem (`toDb` enforcer `quantity=0` når status='Brugt op'). Folde-ud bruger F9 src-warning-tokens (#FAEEDA/#633806, WCAG AAA 8.5:1). Garnkort med status='Brugt op' vises greyscale (`filter: grayscale(1)` kun på 120px-billed-div for performance) + "Brugt op"-badge i øverste venstre hjørne. Default-filter skjuler "Brugt op"-kort på Mit Garnlager; brugeren kan eksplicit vælge "Brugt op" i status-dropdown for at se dem. Header-stats udvidet til 5 metrics inkl. "Brugt op"-tæller. Ny `markYarnAsBrugtOp(supabase, id, projekt, dato)`-helper i `lib/supabase/mappers.ts` forbereder F15 bidirektional kobling. Migration `20260428000002_yarn_items_brugt_op.sql` tilføjer `brugt_til_projekt TEXT NULL` + `brugt_op_dato DATE NULL` (idempotent, RLS arvet fra eksisterende `yarn_items`-policies). F15-fremtidssikring: kolonnen forbliver TEXT NULL uden constraints så parallel `_id UUID`-kolonne kan tilføjes senere uden breaking changes. Validering: `validateForm` returnerer `{brugtTilProjekt: '...'}` når status='Brugt op' uden projekt. Eksisterende "Brugt op"-data (sat af `BrugNoeglerModal` ved nedtælling til 0) bevares — folde-ud kan udfyldes retroaktivt. 51 nye Vitest-tests (617/617 grønne).
- **Hex-import-pipeline til katalog-farver (2026-04-28)** — generisk pipeline til at bagudfylde `colors.hex_code` (+ cascade til `yarn_items.hex_color`) fra producent-seeds. Pure mapping-funktion `mapColorSeedToColorRows` (`lib/catalog/colorSeed.mjs`) + seed-registry (`lib/data/colorSeeds/index.mjs`) + CLI (`scripts/seed-colors.mjs` med `--dry`/`--report`/`--force`/`--producer`/`--yarn`). Permin Bella (59) + Bella Color (38) seeds genbruger eksisterende `BELLA`/`BELLA_COLOR` arrays fra `lib/data/perminCatalog.js`. Mapping verificeret mod prod-DB 2026-04-28: Bella `articleNumber` → drop "8832"-prefix → 2/3-cifret `color_number`; Bella Color `articleNumber` → direkte 6-cifret match. Idempotent: kun `hex_code IS NULL` opdateres uden `--force`. Cascade beskytter manuel `yarn_items.hex_color` via NULL-guard (`.or('hex_color.is.null,hex_color.eq.')`). Ingen migration — pure data via service-role CLI (samme mønster som `import-yarns.mjs`). Skabelon i `_template.mjs` for fremtidige producenter (Sandnes/Drops/KfO osv.). 25 Vitest-tests dækker mapping/idempotens/force/keyTransform/seed-data-validitet. Tester + reviewer APPROVE. **Åbent punkt:** Knitting for Olive Cotton Merino (62 rækker) mangler hex-kilde — seed-skabelonen findes, kun udfyldning af 62 hex-værdier udestår.
- **F9+F10: Datakilde-farve-tokens + dansk datoformat-helper (2026-04-27)** — fundament-PR for STRIQ_implementation_brief (A.1 + A.2). 4 nye Tailwind-tokens under `striq`: `src-catalog` (#EAF3DE/#173404 grøn), `src-ai` (#EEEDFE/#3C3489 lilla), `src-warning` (#FAEEDA/#633806 orange), `src-error` (#FCEBEB/#791F1F rød). Hver med `bg`+`fg`-key. WCAG AAA-kontrast (12:1 for src-catalog). Content-glob udvidet til `{ts,tsx,js,jsx}` så `.jsx`-komponenter ikke får purget Tailwind-klasser. `KatalogInfoblok.jsx` refaktoreret fra inline `style` til Tailwind-klasser (`bg-striq-src-catalog-bg text-striq-src-catalog-fg`). Ny `lib/date/formatDanish.ts` med `formatDanish(date) → "27. apr 2026"` (intet 0-pad, intet punktum efter måned via defensiv regex) og `toISODate(date) → "2026-04-27"` (UTC, samme semantik som eksisterende `toISOString().slice(0,10)`-mønster). Begge robuste over for null/undefined/''/Invalid Date → `''`. 4 UI-call-sites migreret: `SubstitutionsSection.tsx:516`, `Arkiv.jsx:104` (`formatDate`-alias), `YarnVisualizer.jsx:984+1071`. DB-lagring (csv.ts, mappers.ts, BrugNoeglerModal.tsx) berørt ikke. Senere features (F5/F6/F8/F11/F12) bygger oven på disse tokens. 15 nye Vitest-tests (566/566 grønne). Roadmap-ref: `~/.claude/plans/functional-exploring-cake.md`.

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

### Fællesskabet — tilretninger Runde 1-3 (2026-04-28, fra Hannahs dok "Fælleskabet - tilretninger.docx")

**Runde 1 — projekt-forbedringer på egne projekter (commit `43592b1`):**
- **Farve-placeholder på projektkort uden foto** (`components/app/ProjectCardPlaceholder.tsx`) — 140 px label med status-tekst ("Projekt jeg overvejer" / "Projekt i gang" / "Færdigt projekt"), baggrund er garnets farve (solid 1 farve, 135°-gradient 2-4 farver, +N-overlay 5+). Tekst-kontrast WCAG-baseret via worst-case-kontrast over alle gradient-stops (`lib/colorContrast.ts`).
- **Mobil-skærpet billedkarrusel** (`components/app/ImageCarousel.tsx`) — i Arkiv detail-modal til opskrifts-billedkæde (`pattern_image_urls`). Native pointer-events, swipe ≥50px ELLER 30% af bredde, vinkel-check så modal-scroll ikke kapres, ArrowLeft/Right, prikker + pile (44×44 touch-targets), pre-load nabobilleder, tap åbner i ny tab.
- **Fri farve-tekst i "Fra kataloget"-tab** (`components/app/GarnLinjeVælger.jsx`) — select-dropdown erstattet med fri-tekst-input + klikbare farve-pills (max 6 + "Vis alle"). Skriv → catalog_color_id=null. Dækker projekt-delen af 2026-04-27-ønsket "Egen farve når katalog ikke har den".
- **Bonus**: luk-knap på Arkiv detail-modal udvidet til 44×44 + dansk aria-label "Luk projekt".

**Runde 2 — små rettelser på Fællesskabet (commit `2a70cf3`):**
- **Stort F i synlig copy** — alle 12 forekomster af "Fællesskabet" / "Fællesskabets" på tværs af 7 filer (Arkiv-knap, del-modal, Fællesskabet-side, onboarding).
- **Fire nye projekttyper**: Bluse, Sommerbluse, Babytøj, Børnetøj. Udvidet `PROJECT_TYPES` + DB CHECK-constraint via migration `20260428000004`.
- **Valgfrit "Vist i str."-felt** — ny nullable kolonne `community_size_shown`, input i del-modal med maxLength=50, lille "str. {value}"-pille på SharedProjectCard.
- **Dedupe garn-label** (`lib/yarn-display.ts:yarnDisplayLabel`) — fjerner duplikeret leverandørnavn på Fællesskabet-kort. Resultater verificeret mod faktisk DB-data: "Drops Drops Air" → "Drops Air", "Filcolana Filcolana Tilia" → "Filcolana Tilia", "Permin Permin Bella Color (Bella Color by Permin)" → "Bella Color by Permin".

**Runde 3 — multi-billede + detail-pop-up (commit `b30cd31`):**
- **Primær billede-valg** i del-modalen — thumbnail-grid (kun ved ≥2 billeder) hvor brugeren klikker for at vælge hvilket billede der vises som hovedbillede på Fællesskabet. Gemt i ny kolonne `community_primary_image_index` (default 0, fallback til 0 hvis index ud af range).
- **Detail-pop-up** (`components/app/SharedProjectDetailModal.tsx`) — klik/Enter/Space på SharedProjectCard åbner pop-up med karrusel over alle billeder, str-pille, forfatter, pattern-info, opskriftens forside (PDF-thumb foretrækkes over `pattern_cover_url`), community_description, garn-liste med farve-swatches. Sticky "← Tilbage til Fællesskabet"-knap øverst (≥44px), focus-trap, Escape + backdrop lukker, focus returnerer til kortet ved luk.
- **Klikbar SharedProjectCard** — role=button, dansk aria-label, viser primær billede med fallback til [0], +N-tæller hvis flere billeder.
- **Sikker forside-eksponering** (migration `20260428000005`) — view bruger `security_invoker=false` så anon kan læse computed `pattern_image_urls[1] AS pattern_cover_url` UDEN at hele opskrifts-arrayet eksponeres. Copyright-mur bevares via `WHERE is_shared = true` i view-definitionen. `pattern_pdf_thumbnail_url` tilføjet til anon GRANT (lille forside-thumb, ikke selve mønsterskema).

**Tests**: 92 nye tests på tværs af de tre runder (964 grønne i alt mod 781 før). Migrationer kørt mod prod-DB.

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

### Barcode-scanner i Mit Garnlager — skjult indtil EAN-koder er på plads (2026-04-27)
Funktionaliteten er fuldt implementeret (kamera-scanner + opslag mod `colors.barcode` + bidrag-flow til ukendte EAN-koder), men "Skann garn"-knappen i `Mit Garnlager` er **skjult** via feature-flag `SHOW_SCANNER = false` (`components/app/Garnlager.jsx:26`). Begrundelse: kataloget mangler stadig EAN-koder på de fleste farver, så scanner-flowet ville ramme tom hyppigere end det rammer match. Det giver dårlig første-oplevelse for testbrugere.

**Sådan genaktiveres når EAN-koder er populeret:**
1. Skift `SHOW_SCANNER` til `true` i `components/app/Garnlager.jsx`.
2. Verificér at `colors.barcode` har dækning (>~50% af farverne i kataloget).
3. Bekræft at bidrag-flowet (`BarcodeSuggestionForm`) virker for de tilfælde hvor EAN ikke matcher.

Bemærk: `ScanFraKatalogButton` på den offentlige `/garn`-katalog-side er IKKE skjult — kun den i Mit Garnlager. Modul/import bevaret, så ingen kode-rot.

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

### Planlagt: Indtastning + garn-katalog (brief 2026-04-27)

Stort brief om hele indtastnings-flowet og bidragsflow til STRIQs garn-katalog. Nedbrudt til 8 sekventerbare features. Tre datakilder skal være visuelt adskilte gennem hele appen: **grøn = katalog (read-only)**, **lilla = AI-forslag**, **neutral = bruger-input**.

**Afhængighedsgraf:**
```
F1 datamodel ──→ F2 read-only formular ──┬── F3 felt-forenkling ──→ F4 kort-redesign
                                         └── F5 "Brugt op"-flow
F6 manuel + bidragsflow ──→ F7 AI-opslag (post-launch)
                        └─→ F8 review + admin-notifikationer
```

- ~~**F1 (S)** Datamodel: `yarnWeight`-enum på `yarns`-tabellen~~ — **shippet 2026-04-27** (se "Implementeret → Garn-katalog")
- ~~**F2 (M)** Read-only katalog-sektion i Tilføj Garn-formular. Når garn vælges fra katalog vises katalog-felter som info-blok (ikke inputs). Kun bruger-egne felter er redigerbare. Inkluderer QW2 (escape lukker modal) + QW3 (autofokus på katalog-søg).~~ — **shippet 2026-04-27** (se "Implementeret → Garn-katalog")
- ~~**F3 (S)** Felt-forenkling i formular: behold hex-vælger som primær farve-input (fjern separat fritekst-farvenavn-felt), fjern EAN-felt fra brugervendt formular, erstat antal-input med +/− tæller-knapper, required-validering ved gem (QW1).~~ — **shippet 2026-04-27** (se "Implementeret → Garn-katalog")
- ~~**F4 (S)** Garnkort-redesign på Mit Garnlager: rund hex-fyldt farve-cirkel (ikke tekst-label), dedupe mærkenavn fra korttitel hvis det allerede er i badge, diskret "fra katalog"-ikon på linkede garn.~~ — **shippet 2026-04-27** (se "Implementeret → Garn-katalog")
- ~~**F5 (S)** "Brugt op"-subflow~~ — **shippet 2026-04-28** (se "Implementeret → Garn-katalog")
- **F6 (M)** Manuel indtastning + "Foreslå til STRIQs katalog"-bidragsflow. Tredje spor i Tilføj Garn (siden af katalog-søg og scanner). Efter gem: valgfri prompt om at bidrage. Genbruger `BarcodeSuggestionForm`-mønster og eksisterende admin-godkendelses-infrastruktur. **Detaljeret plan**: `~/.claude/plans/der-er-mange-ting-splendid-kernighan.md` (F6-sektion). **Beslutninger truffet (2026-04-27)**: separat tabel `yarn_catalog_suggestions` (ikke flettet med `barcode_suggestions`), separate RPC'er `approve_yarn_catalog_suggestion()`/`reject_yarn_catalog_suggestion()`, ny `<ManueltGarnFelter>`-komponent (mærke + navn + 8-pill vægt + fiber-pills + løbelængde/vægt/pind på én linje), grøn "Gem i mit garn-katalog"-checkbox. AI-knap fra skærm #2 er F7 (post-launch). **Branding**: "Foreslå til STRIQs garn-katalog" (ikke "Hannas").
- **F7 (L)** AI-opslag med caching: knap "Slå op med AI" → Claude API → udfylder fiber/vægt/metrage med confidence-score. Cache i ny `yarn_ai_cache`-tabel (30 dage). AI-felter vises med lilla accent. Kræver `ANTHROPIC_API_KEY` i prod. **Post-launch.**
- **F8 (M)** Review-flow + admin-notifikationer: fix `user_profiles`-bug (tom i prod → `is_editor()` returnerer false), Supabase Database Webhook → Resend ved nye forslag, batch-godkendelse i `ModerationClient.tsx`. **Detaljeret plan**: `~/.claude/plans/der-er-mange-ting-splendid-kernighan.md` (F8-sektion). **Beslutninger truffet (2026-04-27)**: KUN in-app-notifikation til at starte (Resend udskydes til efter testbruger-launch). Ny `<TopAfMitGarnBanner>`-komponent på Mit Garn der viser "Dit forslag er godkendt"-besked + "Se garnet"-knap. "Nu i kataloget"-pille på det relevante kort i 7 dage efter godkendelse. Datalag: udvid `yarn_catalog_suggestions` med `seen_at` ELLER ny `notifications`-tabel — afgøres i F8-arkitekt-fase. Bug-fix `user_profiles` tom i prod inkluderet. Resend (email) udsættes som senere udvidelse.

**Launch-vurdering:** Ingen af de 8 er launch-blokerende. F1–F6 + F8 er realistiske inden/kort efter testbruger-launch (2026-05-09). F7 er eksplicit post-launch.

**Dedupe-noter:**
- QW1/QW2/QW3 fra "UX-review af Mit Garn-input" nedenfor absorberes i F2+F3 — undgå dobbeltarbejde.
- "To-trins flow: [Søg katalog] / [Scan] / [Manuelt]" i UX-review nedenfor er i praksis F2+F6.
- "Notifikations-feature ved nyt forslag" og "Synlighed: hvor lander forslaget" under "Alternativer / substitutions" overlapper med F8 — løses samlet.

### BØR-HAVE (giver tillid og værdi til testbrugere)

**Alternativer / substitutions — opfølgning efter combos-launch (2026-04-25):**

Tilføjet efter at vote-override-systemet og held-together-combos shippede. Hannah testede selv flowet som `hannah@leanmind.dk` og opdagede flere huller.

- **Redigering af inputfeltet til "Foreslå alternativ"** — den nuværende formular i `SubstitutionsSection.tsx`-modalen mangler UX-pas: tydeligere felt-labels, evt. autosuggest på producent, hjælp til at udfylde URL korrekt, validering af om garnet allerede findes i kataloget. Hannah oplever at det er uklart hvordan man bedst beskriver et nyt alternativ.

- **Synlighed: hvor lander forslaget til godkendelse** — `/garn/admin/suggestions` findes (Next.js editor-only via `EDITOR_EMAILS`), men er ikke linket fra noget sted i UI'et. Bruger der har sendt et forslag får ingen klar bekræftelse om hvor det er på vej hen eller hvornår det vises offentligt. Minimum: tak-besked med "dit forslag sendes til moderation, vises offentligt når en editor godkender" + status-visning af brugerens egne pending forslag (delvist på plads via `myPendingExternal`-state). Bemærk separat bug: `user_profiles`-tabellen er tom i prod, så `is_editor()` returnerer false for alle — editorer kan tilgå moderations-siden men får permission denied ved godkend. Skal fixes som del af dette eller separat.

- **Notifikations-feature ved nyt forslag** — i dag intet. Editor opdager kun nye forslag ved at åbne `/garn/admin/suggestions` manuelt. Hannah kan ikke beslutte hvordan endnu. Realistiske paths:
  - **A)** Supabase Database Webhook → Resend API (gratis op til 3000 mails/md)
  - **B)** Postgres trigger + pg_net + Resend
  - **C)** Vercel Cron der poller DB hver 5 min og sender digest
  - **D)** Supabase Edge Function ved INSERT
  Modtager-email: muligvis dedikeret alias som `hkwermuth+godkendelse@gmail.com` (oprettes når feature bygges). Beslutning udskudt.

- **Flere held-together-combos på pind 4, 4½, 5, 5½** — efter at de første 4 kuraterede combos er seedet (Sandnes Tynn Merinoull + Tynn Silk Mohair pind 5-6, Drops Kid-Silk + Alpaca pind 4.5-6, 2× Drops Flora pind 4-5, 2× Filcolana Highland Wool pind 4.5-5), mangler vi bredere dækning på de mellem-tykke pind-størrelser. **Skal sammenholdes med de mest populære opskrifter (fx PetiteKnit)** hvor disse pind-størrelser er typiske. Konkret kuraterings-arbejde: gennemgå topopskrifter, identificér garn-kombinationer designerne anbefaler, indsæt via `scripts/seed-combinations.mjs` (eller udvid med admin-UI når behov opstår). Inkluderer formentligt også at importere de garner combos kræver, hvis de ikke er i kataloget endnu.

**"Prøv garn"-side mere indbydende (2026-04-20):**
- **Prøv garn tilgængelig uden login** — `app/visualizer/page.tsx` er p.t. wrappet i `LoginGate`, så ikke-indloggede kun ser login-skærm. Eksempler skal kunne ses af alle, generering/gem kræver stadig login. Hero-banner øverst i om-striq-stil (gradient dustyPink → sage) med intro + CTA "Log ind for at prøve — og gemme — dine egne visualiseringer".
- **Slank upload drop-zone i visualizer** — nuværende drop-zone (`YarnVisualizer.jsx:525-555`) er for dominerende (padding 48px, 48px emoji). Omskriv til kompakt horizontal layout: ikon 28px, padding 20px, tekst ved siden af. Bevar drag-drop-affordance.

**UX-review af "Mit Garn"-input (2026-04-19) — quick wins (< 30 min hver):**
- **QW1 Required-validering ved gem** — `save()` accepterer tomme garn i dag. Kræv minimum `name` + `brand` (eller katalog-link). Vis fejl ved submit. (`Garnlager.jsx:345, 836`)
- **QW2 Escape-tast lukker modal** — mangler keydown-listener. (`Garnlager.jsx:775`)
- **QW3 Autofokus på katalog-søg ved "Tilføj garn"** — sparer mobilbrugere for at tappe. (`Garnlager.jsx:418, 788`)
- **QW4 Skjul "Skann garn"/"Eksporter" på tomt lager** — støj når yarns.length===0. (`Garnlager.jsx:617-639`)
- **Copy-forbedringer** — "Løbelængde pr. nøgle" + hjælpetekster, dansk-venlig "Gemt!" i stedet for "✓ Gemt"

**Tilgængelighed — followups fra F3-review (2026-04-27):**
- **Pile-tast-navigation på FarvekategoriCirkler** (`components/app/FarvekategoriCirkler.jsx`) — komponenten har `role="radiogroup"` men WAI-ARIA-pattern forventer ArrowLeft/Right/Up/Down + roving tabIndex. I dag er hver cirkel sit eget tab-stop. Mus + Tab fungerer; pile-taster gør ikke. Ikke launch-blokerende. ~30 min fix.

**UX-review — større forbedringer (kræver design-tid):**
- **UX-fix Slet-bekræftelse → centreret AlertDialog** — nuværende inline "Er du sikker?" i Garnlager-modalens footer er fat-finger-risiko på mobil
- **Progressive disclosure i Tilføj-modal** — 14+ felter synlige samtidig overvælder. Sektioner: påkrævet → valgfri → "Flere detaljer ▸". ~2 dage.
- **Mobil bottom-sheet i stedet for centered modal** — matcher native mobile-conventions. ~1-2 dage.
- **To-trins flow: [Søg katalog] / [Scan stregkode] / [Manuelt]** — slanker den ene mega-form til tre fokuserede spor. ~2-3 dage.
- **Bulk-tilføj (tabel-UI, 5 tomme rækker)** — testbrugere skal importere eksisterende samling hurtigt. ~2 dage.
- **Katalog-søg: "Ingen match" + tastatur-navigation** — `YarnCatalogSearch` svarer ikke når intet findes; ingen ArrowUp/Down/Enter. (`Garnlager.jsx:72-152`)

- **Onboarding / velkomst-flow** — første-gangs-guide til nye brugere: hvad er Striq, hvad kan de gøre nu, hvor starter de. Uden dette vil testbrugere fare vild.
  Kør med: `/ny-feature Onboarding: velkomst-modal til ny bruger ved første login`

- **Sortering af garnlager (2026-04-27, fra Hannah)** — brugere skal kunne sortere efter farve, navn, garntype (fra Excel: "Man skal kunne sortere i garnlageret"). **Default-visning: farvesorteret** — når brugeren åbner Mit Garnlager, skal listen være sorteret efter farve som standard. Der er kun filter i dag, ingen sortering.

- ~~**Kun hele nøgler i Garnlager — ingen kvarte/halve (2026-04-27)**~~ — **revurderet 2026-04-28**: Hannah valgte i stedet at tillade **hele + halve nøgler** (step=0.5) globalt — både i Mit Garnlager og i projekter. Implementeret som del af F11. Kvarte (0.25/0.75) er ikke længere mulige; eksisterende historisk data rundes til nærmeste 0.5 ved visning.

- **Mobil-polish** — touch-targets og layout på < 640px. Kerne-flow skal være testet på mobil inden launch.

- **Markér yndlingsgarn** — simpel favoritmarkering i garnlageret (fra Excel: "Yndlingsgarner").

- **Ønskeliste i garnlager** — status "Ønskeliste" eksisterer allerede som felt, men overvej om det er tydeligt nok som feature (fra Excel: "Ønskeliste med garner").

- **Redesign eksport i Mit Garnlager til printvenlig udgave (2026-04-27, fra Hannah)** — i dag eksporteres garnlageret som CSV (`lib/export/exportGarnlager.ts`, Excel-kompatibel). Hannah ønsker en printvenlig udgave — overblik der ser pænt ud på papir, ikke kun rådata. Sandsynligvis en HTML- eller PDF-baseret rapport med sektioner pr. status, billeder/farve-pille, antal/total-summering. CSV bevares parallelt for dataportabilitet (GDPR art. 20). ⚠️ **Spørg Hannah ved opstart**: PDF (klient-side via fx pdf-lib eller server-side route) eller print-optimeret HTML der bruger browserens "Udskriv → Gem som PDF"? Skal layoutet matche garnkortene fra F4 (mini-thumbnails med farve), eller kompakt tabel? Hvilke felter skal med (kun navn+antal+farve, eller også løbelængde+pind+noter)? Sortering — alfabetisk, efter status, efter dato? Skal skannede billeder med, eller kun farvepiller?

~~**Egen farve når katalog ikke har den — Garnlager + Projekter (2026-04-27, fra Hannah):**~~ — **dækket 2026-04-28**: projekt-delen implementeret i Runde 1 af Fællesskabet-tilretninger (`GarnLinjeVælger.jsx` "Fra kataloget"-tab har nu fri-tekst-input + klikbare farve-pills). Garnlager-delen var allerede teknisk fri-tekst — hvis den stadig opleves som blokeret, åbn nyt punkt med konkret friction-rapport.

**Projekter — felter og inputfelt-tilpasning (2026-04-27, fra Hannah):**
- **Designer + opskriftsnavn på projekter** — under "Hvad er strikket" på Projekter skal man kunne skrive navn på designeren og navnet på opskriften. Felter eksisterer allerede på `projects`-tabellen som `pattern_designer` og `pattern_name` (brugt af Fællesskabet/del-flow), men er ikke eksponeret i selve projekt-redigeringen. ⚠️ **Spørg Hannah ved opstart**: skal felterne også være på vil_gerne / i_gang, eller kun færdigstrikket? Skal de være krævede ved deling? Skal designer-navn auto-suggestes fra eksisterende `content/designere.md`-liste?
- **Inputfelt til "Garn i projektet"** — skal tilpasses (uklart hvordan endnu). ⚠️ **Spørg Hannah ved opstart**: hvad konkret er problemet med det nuværende felt? Søger hun en bedre katalog-integration ligesom F2 i Mit Garn? Eller er det mængde/farve/visning der skal ændres? Find komponenten (sandsynligvis i `components/app/Arkiv.jsx` eller `NytProjektModal`) og afdæk konkrete pain points.
- **Paritet Garnlager ↔ Projekter ved garn-input (2026-04-27, fra Hannah)** — alle ændringer vi laver til garn-input-felterne i **Mit Garnlager** (Tilføj/Rediger garn) skal også afspejles i **Projekter** når man opretter eller redigerer et projekt og tilføjer garn til det. Dvs. samme felter, samme validering, samme UI-mønstre. Konkret gælder det de aktuelle Hannah-ønsker fra 2026-04-27: **kun hele nøgler** (ingen kvarte/halve), **egen-farve-skrivning** når katalog ikke har farven, **fjernet katalog-thumbnail** (hvis "Garn i projektet" viser samme thumbnail), og **default farvesortering** hvor relevant. Tjek både `NytProjektModal` og `Arkiv.jsx`/DetailModal — garn-tilføjelses-flowet eksisterer begge steder. Fremadrettet bør al garn-input-arbejde behandle Garnlager og Projekter som én sammenhængende feature, ikke to.
- **Designer-database (top 100)** — opbyg database over de 100 største danske strikdesignere + designere som danske strikkere bruger (også udenlandske). Skal afløse den nuværende `content/designere.md` (top 20). Ny tabel `designers` i Supabase (navn, evt. alias/hjemmeside/instagram, nationalitet, status), seed-script + admin-UI til kuratering. Driver auto-suggest på designer-feltet (forrige bullet) og lægger fundament for fremtidig opskrifts-katalog (`patterns.designer_id`-FK). ⚠️ **Spørg Hannah ved opstart**: hvilke datapunkter skal vi have ud over navn (hjemmeside? signatur-stil?)? Er der en kilde-liste at starte fra (Ravelry, Instagram, dansk strikkesammenslutning)? Skal udenlandske designere markeres separat, eller bare være med i samme tabel? Skal der være et offentligt designer-katalog ligesom garn-kataloget, eller er det kun intern reference til auto-suggest + opskrifts-FK?

~~**Fællesskabet — tilretninger Runde 2 + 3**~~ — **implementeret 2026-04-28** (commits `2a70cf3` + `b30cd31`). Se "Fællesskabet — tilretninger Runde 1-3" i Implementeret-sektionen ovenfor.

### KAN-VENTE (efter testbrugere)

**Fra Jesper (IT-arkitekt, 2026-04-19):**
- **Erstat `xlsx`-pakke med `exceljs`** (valgt A for nu: `xlsx` bruges kun server-side med betroede filer, så HIGH-vulnerability er lav reel risiko. Skift hvis bruger-upload af Excel kommer senere)
- **AI-substitutions-strategi** — pre-compute ved yarn-insert + nightly refresh vs. on-demand. Arkitekturel beslutning, udskudt til efter launch.
- **Code hardening fase 2** — bredere audit: CSP-tuning, dependency-scanning i CI, secrets-scanner

**Brug nøgler-modal — kun PDF, ikke billed-kæde-opskrift (2026-04-28):**
- "Brug nøgler"-flowet i Mit Garnlager understøtter kun upload af opskrift som PDF, ikke som billed-kæde (som "+ Nyt projekt"-formen i Arkiv gør). Inkonsistens mellem de to opret-projekt-stier. Bevidst udskudt: modalen er en hurtig forbrugs-logger, ikke et fuldt projekt-redaktørflow. Hvis testbrugere klager: tilføj patternMode-tabber + multi-billed-håndtering (~halvdelen af Arkiv-formen).

**Fra Hannah (nye ønsker, 2026-04-20):**
- **Søgning på konkrete garntyper pr. garnbutik** — brugeren vælger én eller flere specifikke garner fra katalog, finder butikker der fører netop dem. Kræver fuld mapping af butik↔garn i DB (brug/udvid `stores`-tabel og katalog-relation). Erstatning for den gamle brand-pill-filtrering der blev fjernet i Find garnbutikker-redesignet.

**Fra Hannah (egne ønsker, 2026-04-19):**
- **AI-validering af substitutioner** (Claude API) — AI der ved om fibre/vægt/metrage faktisk matcher. M-estimat
- **Moderations-flow for substitutions-forslag — effektivitets-review** — `ModerationClient.tsx` findes, men Hannah ønsker at verificere at godkendelses-workflowet er så hurtigt som muligt pr. forslag (batch-godkend? tastatur-shortcuts? keyboard-only flow?). UX-review anbefales.
- **Garnproducent- og designer-kontakt** — status i `content/fabrikanter.md` + `content/fabrikanter.csv` (fabrikanter) og `content/designere.md` (top 20 designere). Kontaktet 🟡: Drops (2026-04-21), Permin (2026-04-22), Filcolana — Anne Holt Kirkegaard (2026-04-22). Opfølgnings-datoer 2026-05-05 og 2026-05-06.
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
- **Garn-hero-billeder: hvor skal de bo?** I dag ligger de som statiske filer i `public/garn-eksempler/` (Next.js static), og DB'en gemmer kun stien. Alternativ: upload til Supabase Storage bucket, så billederne følger DB og er tilgængelige uden git-deploy. Trade-off: Storage giver "billederne i databasen", men kræver migration, upload-script, opdatering af URL'er, evt. signed URLs hvis bucket er privat. Beslut inden launch — påvirker hvordan nye garner får billeder fremover (admin-UI upload vs. commit til repo).
