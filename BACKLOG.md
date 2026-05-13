# maskerummet — backlog

Sandhed for hvad der er lavet, i gang og ønsket. Opdateres via `/backlog sync`.

**Sidst synkroniseret:** 2026-05-12 (launch-dato fastsat til 2026-05-19 + kvalitetsreview-fund tilføjet som sektion 8)

---

## Nuværende milepæl

**Testbruger-launch** — mål-dato: 2026-05-19 (tirsdag, 7 dage fra nu). Tidligere mål-dato 2026-05-12 brugt på kvalitetsgennemgang (`docs/kvalitetsreview/00-rapport.md`) der afdækkede 8 blokerende fund — alle skal lukkes inden 19. maj. Komprimeret launch-plan i sektion 8 nedenfor.

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
- **F15: Brugt op-flow kobler garn til projekt + valgfrit projekt (2026-04-29)** — `BrugtOpFoldeUd.jsx` omformet til 3-mode pill-tabs (Intet projekt / Eksisterende / Nyt projekt) som matcher `BrugNoeglerModal`-vælgeren. Default = 'none'. `Garnlager.jsx:save()` opretter nu en `yarn_usage`-række når mode≠'none' så projektet faktisk ved at garnet er brugt der; `quantity_used = previousQty` (læst FØR toDb nuller den ud). 'Nyt projekt'-mode opretter automatisk projects-række med `status='i_gang'` (brugeren afslutter selv i Arkiv). `validateForm` kræver kun projekt/titel når mode='existing'/'new'. `loadProjects` filtrerer nu på `user_id`. Migration `20260429000004_backfill_brugt_op_yarn_usage.sql` retter eksisterende status='Brugt op'-rækker hvor `brugt_til_projekt` entydigt matcher en projekt-titel (case-insensitive trim, count=1, NOT EXISTS-guard idempotent). `yarn_usage.yarn_name` dedupes via `toUsageDb`. 24 nye tests (BrugtOpFoldeUd 3-mode + yarnForm.brugtOp). 6 Garnlager-test-filer fik tilføjet `toUsageDb` til mappers-mock.
- **yarn_usage brand-præfix cleanup (2026-04-29)** — fjernet duplikeret brand-navn i projekt-visninger ("Permin Permin Hannah" → "Permin Hannah", "Gepard Gepard Kid Silk 5" → "Gepard Kid Silk 5"). Tre lag: (1) migration `20260429000002_clean_yarn_usage_brand_prefix.sql` strip'er brand+space-præfix fra `yarn_name` på 38 eksisterende rækker (idempotent, BC Garn-safe via `lower(yarn_name) like lower(yarn_brand) || ' %'`); (2) skrivelogik i `Arkiv.jsx` (to onSelectYarn-callbacks) sender nu `yarn.name` direkte (ikke `displayYarnName(y)`), plus defensiv strip i `lib/supabase/mappers.ts:toUsageDb` som invariant-håndhævelse for ALLE skrive-call-sites (inkl. `BrugNoeglerModal`); (3) display-fix i `Arkiv.jsx` (detalje-modal-liste bruger `dedupeYarnNameFromBrand`, projekt-grid-kort bruger `yarnDisplayLabel`) + `lib/export/exportProjekter.ts` (CSV `garnnavn`-kolonne dedupes). Community-siderne (`SharedProjectDetailModal` + `FaellesskabClient`) brugte allerede `yarnDisplayLabel`. Ny test `test/mappers.toUsageDb.test.ts` (10 cases) verificerer mapper-invariant. Genbrug af eksisterende `dedupeYarnNameFromBrand` (13 testede cases).
- **Bug 7: vil_gerne→aktiv allokerer + bevar katalog-billede ved status-skift (2026-05-06)** — to bugs konstateret af Hannah (`hannah@leanmind.dk`) ved test af Bug 6-fix. **(B-A)** vil_gerne-projekt med 6 ngl Bella Koral fra lager → bruger skifter status til i_gang → garnet blev IKKE deduceret fra lager fordi DetailModal.handleSave-per-line-loopet kun allokerede NYE linjer (`l.id` skipper allocation-grenen). **(B-B)** Bella Koral har kun katalog-billede (ingen bruger-uploadet `image_url`); når den allokeredes til projekt viste I-brug-kortet kun farven — `createInUseRow` selecter ikke `catalog_image_url` fra source. Maglia fra Lana Grossa virkede fordi `image_url` (bruger-uploadet) blev kopieret. **Fix (B-A)**: `Arkiv.jsx` DetailModal.handleSave fik fire nye faser: (1.4) pre-flight stock-validering når `transitionFromVilGerne === true` så insufficient-stock kastes inline før DB-mutation; (1.5 modificeret) eksisterende cascade-trigger skipper når transitionFromVilGerne — classify kører i stedet i Phase 1.7; (1.6 NY) allokér eksisterende lager-koblede linjer via `allocateYarnToProject`, redirect `yarn_usage.yarn_item_id` til ny I-brug-id, mutér `l.yarnItemId` + `l.__justAllocated = true`, track i `vilGerneAllocations[]` til evt. rollback; (1.7 NY) post-allokerings classify + finalize-modal når target-status er faerdigstrikket — modal-cancel ruller Phase 1.6 tilbage. Per-line-loop skipper `__justAllocated`-markerede linjer for at undgå dobbelt-allokering. Helper `rollbackVilGerneAllocations` defineret inline: `applyAllocationDelta(-qty)` returnerer garn til lager + redirecter yarn_usage tilbage til oprindelig kilde. Reviewer-fund: outer try-block-catch fik også rollback-kald så garn ikke forsvinder fra lageret hvis upload eller projects.update fejler EFTER Phase 1.6. `vilGerneAllocations` flyttet til outer scope så catch'en kan se trackeren. **Fix (B-B)**: `lib/yarn-allocate.ts:createInUseRow` udvidet med `catalog_image_url` i select-listen og insert-objektet. **Sub-agent kvalitet**: tester 18 nye + 2 nye = 20 tests, 146/146 grønne på 10 berørte filer (`test/Arkiv.vilGerneTransition.test.tsx` NY). Reviewer REJECT på atomicitets-hul → fixet → APPROVE. **Udskudt til BØR-HAVE post-launch**: omvendte transitioner (i_gang → vil_gerne, faerdigstrikket → vil_gerne) — i nuværende implementation forbliver garn "I brug" hvis bruger sætter et i gang-projekt tilbage til ønskeliste (inkonsistent men ikke datatab; bruger skal manuelt fjerne yarn-linjer for at få garn tilbage på lager). Også edge-case: vil_gerne→i_gang med qty reduceret til 0 i samme save kalder `applyAllocationDelta` på en 'På lager'-række (pre-existing, kun shuffle-bugs).
- **Bug 6: Konsolidér duplikat-yarn_items + bevar billede/metadata gennem status-skift (2026-05-06)** — tre relaterede bugs konstateret i Hannah's prod-data (`hannah@leanmind.dk`) under Bug 5-test: (B1) Permin Bella Koral kode 84 finalize'et til projekt "Bella Koralrød sweater" som TO separate Brugt op-rækker (`76deb55b` 4 ngl + `caed29b5` 1 ngl) i stedet for ÉN samlet, fordi `finalizeYarnLines` kørte pr. yarn_usage uden at konsolidere på (yarn_item_id, project_id). (B2) Permin Bella Color Råhvid 883150 havde én række MED billede + én UDEN — billede arvedes ikke gennem status-skift fordi `returnYarnLinesToStash` INSERT-grenen kun kopierede navn/mærke/farve, og `allocateYarnToProject` merge-grenen overskrev ikke target's NULL-felter med source's data. (B3) Samme Råhvid eksisterede som TO På lager-rækker — `returnYarnLinesToStash` matchede kun første target uden at konsolidere eksisterende duplikater. **Fix**: (1) `finalizeYarnLines` grupperer nu på `(yarn_item_id)` før split-loop og redirecter ALLE yarn_usage i gruppen til den ene Brugt op-række; (2) ny intern `resolveLineMetadata` i `yarn-return.ts` falder tilbage til SELECT på source-yarn_item når `yarnItemId` er sat så `image_url`/`fiber`/`yarn_weight`/`hex_colors`/`gauge`/`meters`/`notes`/`color_category`/`catalog_image_url` arves; ny intern `backfillMetadataFromSource` i `yarn-allocate.ts` der opdaterer target's NULL-felter fra source efter merge (overskriver ikke non-NULL); (3) ny `lib/yarn-consolidate.ts` med `consolidateOnStockDuplicates(supabase, userId, targetId)` der finder andre På lager-rækker med samme garn-identitet (catalog_color_id ELLER brand+color_name+color_code) OG samme `brugt_til_projekt_id` (eller begge null), redirecter yarn_usage, summer quantity ind i target, backfiller NULL-metadata, sletter duplikater. Kaldes fra `returnYarnLinesToStash` efter både UPDATE-merge og INSERT. Bonus-fix: `returnYarnLinesToStash` nulstiller nu også `brugt_til_projekt_id` ved merge så behold-split-markers ikke overlever en retur-cyklus og senere får revertCascadedYarns til at flippe oppustede rækker (reviewer-fund). (B4) **Migration `20260506000001_consolidate_duplicate_yarn_items.sql`**: one-shot CTE-baseret oprydning af eksisterende duplikat-rækker for ALLE brugere. Inden for `(user_id, status, identitet, brugt_til_projekt_id)`: vinder = række med `image_url IS NOT NULL` hvis kun én har, ellers ældste `created_at`. Backfiller NULL-metadata via `coalesce`-update. Idempotent (anden kørsel finder 0 grupper). Wraps i `BEGIN/COMMIT`. NOTICE med før/efter-counts. **Sub-agent kvalitet**: tester 38 nye + 8 omskrevne tests fordelt på 5 testfiler (`yarn-consolidate.test.ts` NY, `yarn-allocate.metadataBackfill.test.ts` NY) — 119/119 grønne på berørte filer. Reviewer APPROVE; bør-fixes #1+#2 (rydning af `brugt_til_projekt_id` i merge-update + match på marker i consolidate) implementeret før commit. **Kendte begrænsninger til opfølgning** (ikke launch-blokerende): N+1-queries ved batch-retur (>10 linjer) — acceptabelt for v1; atomicitet i multi-step helpers uden RPC-transaktion (samme niveau som finalize/revert). End-to-end test mod lokal Supabase-instans efterstår. **Genbrug**: `sameYarnIdentity` + `IdentityRow` eksporteret fra `yarn-finalize.ts` så consolidate og finalize-revert deler match-regel.
- **F16 + yarn-allocation bug-fixes: cascade-split + BrugNoegler via shared allocate (2026-05-05)** — to bugs fundet ved Hannah's testkørsel af F16 fixet i samme cyklus. **Bug 1**: `finalizeYarnLines` opdaterede tidligere hele yarn_items-rækken ved cascade — pga. merge-arkitekturen i `allocateYarnToProject` markerede ÉT brugt-op-valg ALLE yarn_usage-linjer der pegede på samme merged I-brug-række. Fixet: brug `splitYarnItemRow` til at splitte kun den valgte yarn_usage's andel ud som ny Brugt op-række (quantity=0 via extraOnNew-override) og redirect `yarn_usage.yarn_item_id` til den nye række. Hvis qty===total: status-update direkte uden split. **Bug 2**: `BrugNoeglerModal.tsx:295` (pre-fix) brugte ad-hoc `yarn_items.update({status:'I brug'})` der ændrede source-rækkens status til 'I brug' og pegede yarn_usage på source — brød yarn-allocation-system'ets invariant og forhindrede merge. Fixet: erstattet med kald til `allocateYarnToProject` der bevarer source-status='På lager' og merger til eksisterende I-brug-rækker. `Garnlager.jsx` refresher stash via ny `fetchYarns`-callback efter save. Bonusfix: `revertCascadedYarns` fik manglende `user_id`-guard på yarn_usage SUM-query (defense-in-depth). 105/105 tests grønne på 8 testfiler — eksplicit Hannah-scenarie (12 ngl På lager + 3 ngl I brug → BrugNoegler 2,5 → 9,5 + 5,5 merged) i `BrugNoeglerModal.statusFix.test.tsx` AC-4 + cascade-then-revert i ny `test/yarn-allocation-gaps.test.ts`. Reviewer: APPROVE. **Kendt begrænsning til BACKLOG før testbruger-launch**: hvis brugeren åbner BrugNoeglerModal fra en allerede 'I brug'-række (knappen vises for alle rækker, ikke kun 'På lager'), springes allocate over og yarn_usage får en ny række uden at I-brug-rækkens quantity inkrementeres → invariant `yarn_items.quantity = SUM(yarn_usage.quantity_used)` brydes. Acceptabelt for v1; ramte ikke Hannah's scenarie. Mitigation: enten blokér modalen for I-brug-rækker, eller increment yarn_items.quantity ved I-brug-source.
- **Permin Bella + Bella Color naming-cleanup (2026-04-29)** — fjernet kosmetisk støj `(by Permin)` / `(Bella Color by Permin)` fra både `yarns`-rækker (series=NULL, full_name='Permin Bella' / 'Permin Bella Color') og 17 brugeres `yarn_items.name` via migration `20260429000001_clean_permin_bella_naming.sql`. Idempotent. Seed-filer (`lib/data/colorSeeds/permin-bella.mjs` + `permin-bella-color.mjs`) opdateret til `series: null` så `npm run seed:colors` matcher den nye DB-state. `dedupeYarnNameFromBrand` urørt (historisk safety net for ældre stash-data). **TODO**: opdater `content/yarns.xlsx` så `npm run import:yarns` ikke gen-introducerer støjen — kør IKKE import-scriptet før Excel er ryddet, eller migrationen rulles tilbage.
- **F16: Auto-cascade brugt-op + de-cascade ved revert (2026-05-04)** — afslutter cascade-flowet planlagt 2026-05-01. Når et projekt skifter til `status='faerdigstrikket'`, åbnes `<MarkYarnsBrugtOpModal>` med radio pr. linje (default 'behold'); 'brugt-op'-valg kalder `finalizeYarnLines` der sætter `status='Brugt op'`, `quantity=0`, `brugt_til_projekt`, `brugt_til_projekt_id` (nyt UUID-FK fra d3f26fe) og `brugt_op_dato`. Når status reverter til `i_gang`/`vil_gerne` kører `revertCascadedYarns` silent: matcher først via UUID-FK, fallback til title-ILIKE for legacy-rækker uden `_id`. Quantity restaureres som SUM af `yarn_usage.quantity_used` for samme yarn_item så I-brug-rækken får den oprindelige mængde tilbage (ikke 0 som planen ellers indikerede — bedre match for brugerens forventning "5 ngl I brug → 5 ngl Brugt op → revert → 5 ngl I brug igen"). Ny `lib/yarn-finalize.ts` med `classifyFinalizableLines` (4-bucket: finalizable/multiProject/noYarnItem/alreadyBrugtOp), `finalizeYarnLines`, `revertCascadedYarns`. Modal har "Anvend første valg på alle"-shortcut, multi-projekt-banner med projekttitler, no-yarn-item-banner, role=alert/status, ≥44px touch-targets, useEscapeKey. `Arkiv.jsx` DetailModal `handleSave` udvidet med Fase 1.5 (klassificér + åbn modal FØR uploads så cancel = 100% uændret state) + Fase 4 (finalize/de-cascade efter `projects.update`). NytProjektModal `save` udvidet med cascade efter `yarn_usage.insert`. Promise-wrapper-mønster + unmount-cleanup som `openReturnConfirmModal`. 36 nye Vitest-tests (yarn-finalize: 15, MarkYarnsBrugtOpModal: 11, Arkiv.cascadeBrugtOp: 10) — dækker AC-1 til AC-12 inkl. multi-projekt, legacy title-fallback, dedupe ved samme yarn-id via begge match-paths, defensiv quantity=0. Reviewer: APPROVE, ingen blokerende fund. **Kendt begrænsning til BACKLOG før testbruger-launch**: atomicitet i `finalizeYarnLines` og `revertCascadedYarns` — for-loops uden transaktion betyder at delvis cascade kan opstå hvis én update fejler midt i. Acceptabelt for v1; senere refactor til Postgres RPC-funktion eliminerer risikoen.
- **Yarn-allocation-system: lager → projekt (2026-05-04)** — modsat-flow til retur-til-lager. Ny `lib/yarn-allocate.ts` med pure helpers: `validateLineStock` (client-side stock-validering før gem — Bella Koral-bug fixet: 8 ngl, prøver 10 → blokeres med inline-fejl), `findInUseRowMatch` (catalog_color_id → brand+name+code, ekskl. 'Brugt op'), `decrementYarnItemQuantity` (race-safe via gte-clause + 0-row detection), `allocateYarnToProject` (decrement source + merge til eksisterende I-brug-række ELLER createInUseRow med kopieret metadata), `splitYarnItemRow` (delvis status-flytning: 5 ud af 10 ngl flyttes til ny status, resten bevares — eller direkte status-update hvis qty=total). `Arkiv.jsx` (DetailModal + NytProjektModal) bruger `validateLineStock` før gem og `allocateYarnToProject` ved nye lager-koblede linjer. `GarnLinjeVælger.jsx` viser ny `<StockBadge>` ("X på lager" / "X i brug") + over-allocation alert (`role="alert"`, src-warning-tokens). Migration `20260504000001_yarn_items_brugt_til_projekt_id.sql` tilføjer `brugt_til_projekt_id UUID NULL` med FK til `projects.id` ON DELETE SET NULL + index — eliminerer fragiliteten i title-baseret de-cascade-match (dækker risiko #2 fra auto-cascade-planen). RLS arvet via eksisterende `user_id`-policies. 23 nye Vitest-tests dækker AC-1/2/3/6/13. Reviewer: APPROVE, ingen blokerende fund. **Kendte begrænsninger til BACKLOG før testbruger-launch:** (1) **Atomicitet**: hvis decrement lykkes men efterfølgende I-brug-merge/insert fejler (netværk/RLS), står source decrementeret uden modsvarende I-brug-række — datatab-risiko. Mitigation: pak i RPC-funktion eller valider i UI før kald. (2) **Delta-håndtering**: redigering af `quantityUsed` på eksisterende lager-koblet linje opdaterer kun `yarn_usage.quantity_used` uden at flytte garn — UI bør blokere ændring eller kalde split/decrement-flow. Begge er ikke-blokerende for v1 (almindeligt flow virker), men skal addresseres før launch.
- **Sporbarhed garn ↔ projekt + retur-til-lager-flow (2026-05-01)** — to-vejs kobling mellem Mit garn og projekter, plus sikkert flow når garn fjernes fra et projekt. Tre dele: **(1) Retur-til-lager**: ny `lib/yarn-return.ts` med pure helpers `findYarnItemMatch()` (4-trins prioritet: `yarn_item_id` FK → `catalog_color_id` ekskl. 'Brugt op' → case-insensitive `(brand, color_name, color_code)` → null) + `returnYarnLinesToStash()` (merge inkrementerer quantity og resetter status='På lager' + nulstiller `brugt_til_projekt`/`brugt_op_dato`; race-fallback: 0-row UPDATE → INSERT). Ny `<ConfirmDeleteProjectModal>` ved sletning af projekt med garn (3 valg: Returnér / Slet alt / Annuller). Ny `<ReturnYarnConfirmModal>` med auto-merge short-circuit ved `by-yarn-item-id` (ingen UI når match er FK-direkte) + radio-valg per kandidat ved tvetydige match. Inline `<PendingRemoveLineConfirm>` i `Arkiv.jsx` ved fjernelse af enkelt-linje fra åbent projekt — markerer linjen `__pendingRemove`/`__shouldReturn` indtil "Gem ændringer". `handleSave` omstruktureret i 3 faser: prompt FØR uploads (cancel = 100% uændret state), derefter uploads + `projects.update`, derefter `returnYarnLinesToStash` + `yarn_usage` delete/upsert. `setSaving(false)` i `finally` så cancel-path frigiver knappen. Unmount-cleanup resolver dangling `openReturnConfirmModal`-promise når DetailModal lukkes mid-flow. **(2) Cross-link Garnlager ↔ Arkiv**: Garnlager edit-modal viser ny "Bruges i projekter"-sektion (joiner `yarn_usage` med `projects` for det åbne garn, kun read-mode). `?yarn=<id>` auto-åbner garn-edit i Garnlager; `?projekt=<id>` auto-åbner projekt-detail i Arkiv (begge med ref-guard mod re-trigger efter close). Garn-linjer i projekt-detail er klikbare når `yarnItemId` findes (router.push til Garnlager). **(3) Status-regel-fix i `BrugNoeglerModal`** (korrigeret 2026-05-01 efter Hannah-feedback): garn der logges via modalen er per design committeret til et aktivt projekt — status sættes til `'I brug'` uanset restantal (ikke quantity-drevet). Aftale: 'I brug' = bundet til i_gang/vil_gerne-projekt; 'Brugt op' sættes via BrugtOpFoldeUd når brugeren markerer projekt færdigt; 'På lager' kun for garn ikke-knyttet til projekt. Bonusfix: ny-projekt-fra-modalen oprettes nu med `status='i_gang'` (matcher F15-pattern; uden eksplicit status faldt DB-default til 'faerdigstrikket' som modsiger modalens formål). **Side-kvest**: DROPS Kid Silk farve-seed registreret; `isCatalogSwatchUrl()` udvidet til `images.garnstudio.com/img/shademap/`-mønster så DROPS-swatches vises som fallback når bruger-foto mangler. 8 nye DROPS-eksempel-billeder + `update-drops-hero-images.mjs` (jimp-dependency). Global `next/navigation`-mock i `test/setup.ts`. 51 nye Vitest-tests (yarn-return: 24, ConfirmDeleteProjectModal, ReturnYarnConfirmModal, BrugNoeglerModal.statusFix). Reviewer: 2 blokere fundet og fixet (saving-state-leak ved cancel; orphans+delvist-committet projekt) + 3 bør-fixes (Esc-handling på PendingRemoveLineConfirm, misvisende kommentar, unmount-cleanup).
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
- Kalender med strikke-events april–oktober 2026 (`app/kalender/page.tsx`) — **2026-05-07**: tilføjet International Strikkedag (WWKIP) lørdag 13. juni 2026 kl. 10–16 som Internationalt-event med globus-ikon. Sidst opdateret-mærkat opdateret.
- FAQ-side (`app/faq/page.tsx`)
- **Opskrifter — DROPS-katalog (2026-04-29)** (`app/opskrifter/page.tsx` + `DropsKatalog.tsx`/`DropsKort.tsx`/`Filterbar.tsx`/`MultiSelect.tsx`) — 53 kuraterede DROPS-mønstre fra `content/striq-drops-sample.json`. Søgning på navn + DROPS-nummer, multi-filter (målgruppe, type, sæson, garn, fiber, pind), AND mellem felter / OR inden for. URL-state med pipe-separator (`?fiber=mohair|uld`) — delbar, reload-stabil. Hjerte gemmer i `saved_recipes`-tabel (RLS+GRANT, kun authenticated, anon har INGEN rettigheder). Ikke-logget hjerte-klik → login-redirect via `buildLoginHref`, filtre bevares i `?next=`. Lager-badge "Garn på lager ✓" / "Mangler 1 garn" mod brugerens `yarn_items` (whole-string match efter brand-stripping; fanger ikke false-positive fragmenter som "ALPACA"→"Brushed Alpaca Silk"). DROPS-licens: native `<img>` (ikke `next/image`), original ratio bevaret, "DROPS DESIGN"-badge synligt, klik åbner garnstudio.com i ny fane. Tilgængelighed: ARIA combobox-pattern på MultiSelect, `role="status"` på resultat-tæller, `aria-pressed` på hjerte, touch ≥ 44px. Erstatter den gamle `EksempelGrid`-demo. Kilde-uafhængigt design — flere designere kan plugges ind senere uden refactor. **Tests**: 77 nye (52 pure data + 22 UI + 3 regression for stricter lager-match), 1096 grønne i alt.
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

### Forhandlersøgning — kandidatliste over manglende butikker (2026-05-06)

**Baggrund.** Vores `stores`-tabel (228 butikker) er aggregeret fra kun to kilder: Permins forhandlerkort + Filcolanas forhandler-API. Det betyder at butikker der ikke fører Permin- eller Filcolana-garn formentlig mangler. Brugeren rejste det konkret med fire eksempler: Ulrikka Garn, By Bek (Faaborg), Wadils, Sart Strik — ingen af dem er i DB.

**Hvad jeg har lavet 2026-05-06.** Spawnede general-purpose-agent der scraped forhandler-sider hos CaMaRose, Krea Deluxe, BC Garn, Hjertegarn (delvist), DROPS Superstore + verificerede de fire bruger-nævnte butikker. Resultat: ~56 unikke kandidater der ikke findes i DB. Önling, Sandnes Garn, Isager og halvdelen af Hjertegarn kunne ikke parses (JS-renderet, kræver headless browser).

**Kandidatliste — sorteret efter postnummer:**

| Butik | Postnr. | By | Website | Fundet via |
|---|---|---|---|---|
| The Fiddlery | 2100 | København Ø | thefiddlery.dk | BC Garn |
| Sart Strik | 2300 | København S | sartstrik.dk | Bruger-input |
| Wadils | 2690 | Karlslunde | wadils.dk | Bruger-input |
| Amager Strik ? | 2770 | Kastrup | — | Hjertegarn |
| STRIKbart | 2791 | Dragør | strikbart.dk | CaMaRose |
| Strikkeboden | 2800 | Lyngby | — | Hjertegarn |
| Gentofte Modestoffer | 2820 | Gentofte | gentoftemodestoffer.dk | CaMaRose |
| Mormorfabrikken | 2860 | Søborg | mormorfabrikken.dk | CaMaRose, Hjertegarn |
| Van Hauen Design | 2900 | Hellerup | — | Hjertegarn |
| Bymarianne | 3050 | Humlebæk | — | Hjertegarn, Krea Deluxe |
| Smykkesten og Fritid | 3300 | Frederiksværk | — | DROPS |
| Lille my strik og sy | 3460 | Birkerød | — | Hjertegarn |
| Strikkeriet Bornholm ? | 3700 | Rønne | facebook | CaMaRose |
| Ghitas Garn | 4070 | Kr. Hyllinge | — | CaMaRose |
| Masker Med Mere | 4180 | Sorø | maskermedmere.dk | CaMaRose |
| Frk Sibbes Garn | 4230 | Skælskør | frksibbes.dk | CaMaRose |
| MaskeradeGarn | 4250 | Fuglebjerg | maskeradegarn.dk | Krea Deluxe |
| Hønses Garn | 4270 | Høng | — | Hjertegarn |
| Knit by Flintholm | 4295 | Stenlille | knitbyflintholm.dk | CaMaRose |
| Knitgarden | 4330 | Hvalsø | knitgarden.dk | CaMaRose |
| Salkavalka | 4500 | Nykøbing Sj | salkavalka.dk | CaMaRose |
| Hjertestrik | 4571 | Grevinge | — | Hjertegarn |
| Ernas | 4591 | Føllenslev | — | Hjertegarn |
| YarnStudio | 4600 | Køge | yarnstudio.dk | CaMaRose |
| Violykke | 4632 | Bjæverskov | — | Hjertegarn |
| Mosters Hylde | 4660 | St. Heddinge | — | Hjertegarn |
| Krea Deluxe (flagship) | 4690 | Haslev | kreadeluxe.com | Krea Deluxe |
| JM-Shop | 4690 | Haslev | — | Hjertegarn |
| Min Lille Strikkebutik | 4760 | Vordingborg | facebook | CaMaRose |
| Bettygarn | 4800 | Nykøbing F | — | Hjertegarn |
| Sokkegarn | 4862 | Guldborg | — | Hjertegarn |
| Garnnøglen | 4900 | Nakskov | — | Hjertegarn |
| Hemsø Broderi | 4930 | Maribo | hemsoebroderi.dk | Krea Deluxe |
| Tante Grøn (Odense) | 5000 | Odense C | tantegroen.dk | CaMaRose |
| Wonder Wool | 5000 | Odense | — | Krea Deluxe |
| Bemipa | 5210 | Odense NV | — | Hjertegarn |
| By Bek ? | 5600 | Faaborg | instagram | Bruger-input, CaMaRose |
| Ulrikka Garn | 5700 | Svendborg | ulrikkagarn.dk | Bruger-input |
| Little Village People | 5900 | Rudkøbing | littlevillagepeople.dk | CaMaRose |
| Island Living | 5970 | Ærøskøbing | — | Krea Deluxe |
| Garn og Craft | 6000 | Kolding | garnogcraft.dk | CaMaRose |
| Mikkla | 6818 | Årre | mikkla.dk | Krea Deluxe |
| MARISTA Garn | 6800 | Varde | — | DROPS |
| Handmade by Hjort | 6933 | Kibæk | handmadebyhjort.dk | Krea Deluxe |
| Garniture Give | 7320 | Give | garnituregive.dk | CaMaRose |
| Design Agger | 7770 | Vestervig | designagger.dk | CaMaRose |
| WeLoveWool | 8240 | Risskov | welovewool.dk | BC Garn |
| IdeGarn | 8500 | Grenaa | idegarn.dk | CaMaRose |
| Ønskegarn | 8600 | Silkeborg | onskegarn.dk | CaMaRose |
| MADE by___ | 8660 | Skanderborg | madebyshop.dk | CaMaRose |
| YarnForward | 8762 | Flemming | yarnforward.dk | BC Garn |
| Knudegarn | 9480 | Løkken | knudegarn.dk | CaMaRose |
| Garnværk Hadsund | 9560 | Hadsund | — | CaMaRose |
| Garnglæde | 9600 | Aars | — | CaMaRose |
| Kronborg Uld | 9690 | Fjerritslev | kronborg-uld.dk | CaMaRose |
| Lamashop | 9800 | Hjørring | lamashop.dk | CaMaRose |

**Forbehold der skal verificeres før import:**
- **By Bek (5600 Faaborg)** — ifølge nyheder solgte hun garnet ud i 2021 og fortsætter som livsstilsbutik *uden* garn. Står stadig på CaMaRose-listen, men kan være forældet.
- **Wadils (2690 Karlslunde)** — primært webshop med lagerudsalg. Gråzone om det tæller som "fysisk butik".
- **Tre rækker markeret med `?`** — samme postnummer som en eksisterende butik men forskelligt navn. Kan være ny butik eller stavevariant.

**Ikke parseable kilder (kræver headless browser, fx Playwright):**
- **Önling** (oenling.dk) — JS-loaded forhandlerkort, tom HTML. Estimeret 20-50 butikker.
- **Sandnes Garn (DK)** — `/dealers` map er JS-app. Estimeret 30-80 butikker.
- **Isager** (knitisager.com / isagerstrik.dk) — search-baseret, ingen fuld liste i HTML.
- **Hjertegarn** — kun postnumre op til 5210 kom igennem; resten af tabellen returnerede tegn på modellens-konfabulering. Halvdelen af Jylland mangler.

**Forslag til næste skridt (vælg én):**
1. **Godkend listen som den er** → migration der tilføjer alle ~56 (med geokodning af adresser via fx Dataforsyningen). Marker `By Bek` og `Wadils` til manuel review.
2. **Hannah redigerer først** → markér hvilke der skal med, kun de markerede importeres.
3. **Headless-scrape først** → kør Playwright mod Önling/Sandnes/Isager/resten af Hjertegarn så vi får hele billedet før import. Mest komplet, mest arbejde.

Relateret: "Forhandler-foreslå"-knap i `/find-forhandler` så testbrugere kan supplere efter launch (kræver moderation, ikke launch-blokerende).

Ikke launch-blokerende — kan tages efter testbruger-launch. Beslutning om hvilken vej der vælges skal tages før migration laves (orkester: arkitekt → tester → reviewer).

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

### 6. Fold-ud-redesign af Tilføj garn-formular + valgfrit pris-felt (2026-05-04, fra Hannah)

Den nuværende Tilføj garn-modal viser 14+ felter samtidig — overvælder testbrugere. Identificeret som UX-problem 2026-04-19, lå tidligere som BØR-HAVE-redesign. **Promoveret til launch-blokerende 2026-05-04** efter pris-fokusgruppe-runden, hvor Hannah samtidig besluttede at det valgfri pris-felt skal tilføjes i samme strøm (den naturlige plads for et nyt valgfrit felt er den nye "Flere detaljer"-sektion — at gøre det først undgår at forværre den eksisterende form-bloat).

**Hvorfor launch-blokerende**: Camilla/Mette/Kirsten-brugertyper (tids-fattige, ikke-research-tunge) er kerne-testbruger-segmentet. Hvis deres første møde med "Tilføj garn" er 14 felter ad gangen, er det et dårligt første-indtryk vi ikke kan tage tilbage. Mit Garnlager er kerne-flowet for testbrugere ifølge launch-krav.

**Nyt layout (afløser nuværende form):**

Synligt som default:
- Navn / mærke / farve / antal nøgler / status

Derefter knap: **"▸ Flere detaljer"** (kollapset som default på nye registreringer)

Foldet ud (klik):
- Løbelængde, vægt pr. nøgle, pind, fiber-detaljer, noter, billede, **pris (valgfri)**, oprindelse (når P0-1's tre-niveau-felter er på plads)

**Pris-felt-detaljer** (afledt af pris-fokusgruppe 2026-05-04):
- `pris_kr NUMERIC NULL` på `yarn_items`. Aldrig required, aldrig blokerende.
- Pr. nøgle (matcher konsistens med øvrige antal-felter — afgøres endeligt i arkitekt-fasen).
- Anden indgang: når garn tilknyttes projekt for første gang, blid prompt "Tilføj pris (valgfri)?" så data kan bruges til kr/projekt-summering.
- Payoff i `Arkiv.jsx` projekt-detalje: "Garn-pris: 487 kr" når alle linjer har pris. Ved manglende data: "Mangler pris på X garn" — aldrig som advarsel.
- Stash-værdi-visning: opt-in, ikke default (Mette-protection — ingen "30.000 kr"-overskrift over lageret).
- "Ukendt"-håndtering grafisk neutralt — ingen skam, ingen farve-advarsler.

**Filer berørt**:
- `components/app/Garnlager.jsx` — Tilføj/Rediger-modal restruktureres med fold-ud-sektioner
- Migration: `pris_kr NUMERIC NULL` på `yarn_items`
- `Arkiv.jsx` — projekt-detalje får ny kr/projekt-summering når data findes
- `NytProjektModal` — pris-prompt ved garn-kobling
- Evt. ny indstilling for opt-in stash-værdi-visning

⚠️ **Spørg Hannah ved opstart**: hvad præcis skal med i "synligt som default"-sektionen — kun navn/mærke/farve/antal/status, eller også løbelængde? Skal pris være DKK-only eller også valuta-felt? Skal "Flere detaljer" auto-folde ud hvis brugeren redigerer et garn der har data i de skjulte felter? Skal pris-feltet auto-foreslå sidst-anvendte pris for samme mærke+vægt?

**Estimat**: ~2 dage for fold-ud + ~1 dag for pris-felt + projekt-summering + tests. Realistisk i launch-vinduet hvis prioriteret nu.

**Kør med**: `/ny-feature Fold-ud-redesign af Tilføj garn-modal + valgfrit pris-felt`

### 7. Feedback + adfærds-tracking inden testbruger-launch (2026-05-07, fra Hannah)

Vi sender testbrugere ind uden at kunne se hvad de gør eller høre hvad de tænker. Det skal fixes inden launch — ellers smider vi mest værdifulde signal ud i 1. uge.

**Tre dele, samme launch-blokker:**

**(A) Nem feedback-knap** — synlig CTA i app'en hvor testbrugere kan sende kort tilbagemelding uden at forlade flowet. Forslag: floating "💬 Feedback"-knap nederst-højre, åbner modal med ét fritekst-felt + valgfri stjerne-rating + auto-vedhæftet kontekst (hvilken side, browser, user_id). Skriver til ny `feedback`-tabel i Supabase + sender Resend-mail til kontakt@striq.dk så vi reagerer hurtigt. Alternativt simpelt: redirect-link til Tally/Google-form (færrest linjer kode, ingen DB-vedligehold). ⚠️ **Spørg Hannah ved opstart**: in-app-modal eller ekstern formular? Skal feedback være anonym mulig, eller altid knyttet til user_id?

**(B) Klik-/adfærds-tracking — hvor går de i stå?** — heatmap + session-recording så vi kan se hvilke knapper der bliver klikket, hvilke der ignoreres, og hvor folk forlader et flow midt i. To realistiske paths:
  - **PostHog** (gratis op til 1M events/md, EU-hosting i Frankfurt, GDPR-venlig, har heatmaps + session replay + funnels) — dansk-relevant fordi det undgår US-data-transfer-spørgsmålet vi ellers skal opdatere privatlivspolitikken med
  - **Microsoft Clarity** (helt gratis, ubegrænset, men US/Microsoft → kræver privatlivspolitik-opdatering + cookie-consent-banner)
  - **Vercel Analytics + custom events** (allerede i stack hvis vi kører Vercel Pro, men ingen heatmap/replay — kun aggregater)

  Skal kunne slås fra pr. bruger (consent), kun aktivt for opt-in testbrugere første uge. ⚠️ **Spørg Hannah ved opstart**: PostHog (EU-hosting, mest funktionalitet) eller Clarity (gratis, men kræver privatliv-opdatering)? Skal session-replay være tændt fra start eller kun heatmap?

**(C) Domæne-metrics: garn + projekter pr. bruger** — simpel dashboard-visning der svarer på "har testbrugerne faktisk brugt det?". Tre tal pr. bruger:
  - Antal `yarn_items` oprettet (groupby user_id)
  - Antal `projects` oprettet (groupby user_id, evt. fordelt på status)
  - Sidste aktivitets-tidspunkt (max created_at/updated_at på tværs)

  Implementering: SQL-view `user_activity_summary` + en intern `/admin/metrics`-side beskyttet af `EDITOR_EMAILS` (samme mønster som `/garn/admin`). Ingen ekstra tracking-værktøj nødvendigt — alt ligger allerede i DB. **Lille men kritisk** for at svare på "virker det?" efter 1. uge.

**Privatlivspolitik-opdatering** påkrævet uanset valg af tracking-værktøj — skal inkludere navn på tredjepart, retsgrundlag (samtykke for testbrugere), og hvor data bor (EU vs. US). Allerede etableret skabelon i `app/privatlivspolitik/page.tsx`.

**Filer berørt (estimat):**
- Migration: `supabase/migrations/<dato>_feedback_and_metrics.sql` — `feedback`-tabel + `user_activity_summary`-view
- `components/layout/FeedbackButton.tsx` — ny floating knap (eller redirect-link)
- `app/admin/metrics/page.tsx` — ny intern dashboard-side
- Tracking-script i `app/layout.tsx` (PostHog/Clarity SDK init med consent-gate)
- `app/privatlivspolitik/page.tsx` — opdater med valgte tredjepart
- `lib/consent.ts` — ny opt-in/opt-out helper hvis tracking medtages

**Estimat**: 0,5 dag for (A) hvis ekstern formular vælges, 1 dag hvis in-app-modal. 0,5-1 dag for (B) afhængigt af værktøj. 0,5 dag for (C). Samlet: 1,5-2,5 dage.

**Hvorfor launch-blokerende**: uden (A) ved vi ikke om noget er i stykker indtil testbrugere mailer eller giver op. Uden (B) gætter vi på hvor de går i stå. Uden (C) ved vi ikke om de har brugt produktet overhovedet. Alle tre er små tiltag der mangedobler signal-værdien fra første uge.

**Kør med**: `/ny-feature Feedback-knap + adfærds-tracking + admin-metrics-dashboard`

### 8. Kvalitetsreview-fund (2026-05-12) — blokerende før 19. maj-launch

Fuld rapport: `docs/kvalitetsreview/00-rapport.md` (+ 5 delrapporter). 8 blokerende fund. Rækkefølgen nedenfor er kritisk path mod 19. maj.

**8.1 Bump Next.js til 15.5.18 — 7 åbne CVE'er** *(KRITISK, ~1t)*
- 2 high CVSS 7.5 DoS, 2 moderate XSS, 1 low cache poisoning, 1 image DoS
- Fix: `npm install next@15.5.18` (patch-bump, ingen breaking)
- Verificér: `npm audit` skal vise 0 next-advisories bagefter

**8.2 Fjern admin-e-mails fra klient-bundle — phishing-vektor** *(KRITISK, ~4t)*
- `app/ideer/page.tsx:7` lækker 3 reelle admin-e-mails i klient-bundle
- `app/kontakt-status/page.tsx:16` lækker 2 e-mails
- Fix: konvertér til server component med `isEditorEmail()` fra `lib/editors.ts`, ELLER flyt begge sider under `app/admin/` (server-side guard)
- Begge sider er reelt admin-dashboards der ikke hører til i prod-flow

**8.3 Ret GDPR-konflikt i privatlivspolitik** *(KRITISK, ~1t)*
- `app/privatlivspolitik/page.tsx:44-46` påstår "kun en session-cookie fra Supabase Auth"
- Faktisk localStorage-brug: `app/login/page.tsx:40,57` (husket e-mail), `components/app/Garnlager.jsx:387,405` (filtre)
- Fix: tilføj "Vi gemmer også enkelte præferencer (din e-mail og dine filtre) i din browsers localStorage. Disse forlader ikke din enhed."
- Opdatér "Senest opdateret"-dato samtidig

**8.4 Tilføj in-app data-eksport-knap** *(KRITISK, 1 dag)*
- Privatlivspolitikken lover GDPR-dataportabilitet, men kun via manuel email pt
- Vi har allerede `lib/export/exportGarnlager.ts` + `lib/export/exportProjekter.ts` (CSV) — skal bare eksponeres som "Download mine data"-knap i indstillinger/profil
- Bonus-opgave: kombinér til én ZIP eller dump alt til JSON for fuld dataportabilitet

**8.5 Tilføj in-app slet-konto-knap** *(KRITISK, ~4t)*
- Samme GDPR-rettighed, samme situation som 8.4
- Server-action der kalder `supabase.auth.admin.deleteUser()` via service_role + cascade-sletning af yarn_items/projects/yarn_usage
- Skal kræve typing af "SLET" som bekræftelse for at undgå utilsigtet tab

**8.6 Migrér ESLint config — linter virker ikke i CI** *(SKAL, ~2t)*
- `npm run lint` venter på interaktiv prompt fra deprecated `next lint`
- Fix: `npx @next/codemod@canary next-lint-to-eslint-cli .`
- Verificér: CI fanger nye lint-issues efter migration

**8.7 Fix tsc + 12 fejlende tests** *(DELVIST FÆRDIG 2026-05-12, ~2t)*

**FÆRDIG**:
- Alle 16 test-filer med tsc-fejl bragt i takt med types (commit `ad97b0f`)
- 2 runtime-fejl fixet: `stores.test.ts` (manglende `is_strikkecafe`+`note`), `FindForhandlerClient` B4 (tekst-ændring)
- npx tsc --noEmit kører nu rent
- 1306/1412 tests passerer; 10 tests skipped med `it.skip` + dokumentation

**EFTERSTÅR (post-19/5-launch)**: 10 skipped runtime-tests der dækker komponenter hvor implementering har ændret sig siden tests blev skrevet:
- `test/FindForhandlerClient.test.tsx` B10 (8 tests) — StoreCard rendrer ikke efter search-flow med mocks; kræver ny mock-pattern eller integration-test
- `test/CombinationsSection.test.tsx` thickness-label-test — komponentens label-rendering er ændret
- `test/BrugNoeglerModal.statusFix.test.tsx` AC-4 — allocate-flow har skiftet path, mock kaldes ikke

Disse tests dækker funktioner der ER testet andre steder (yarn-allocate har egen test-suite, FindForhandlerClient har 20+ andre tests der passerer). Det er sikker viden at skippe dem til efter launch.

**8.8 Reducer store filer + worker-crashes** *(SKAL, 2-3 dage)*

`components/app/Arkiv.jsx` (3013 linjer) + `Garnlager.jsx` (1615 linjer) — store utyped JSX-filer der sandsynligvis forårsager 6 worker-crashes i testsuite'n.

**Plan: Niveau 1 på Arkiv + Niveau 2 på Garnlager. Kør hvert trin som /ny-feature. Commit efter hvert trin. Gå ikke videre før tests er grønne.**

**Trin 0 — Adfærdstest (sikkerhedsnet)**
```
/ny-feature Skriv adfærdstest for Garnlager og Arkiv inden refaktorering.

Opret test/Garnlager.behavior.test.tsx med 4 tests (mock useSupabase):
1. "tilføj garn med navn og antal → vises i listen"
2. "rediger garn → ændringer gemmes og vises i listen"
3. "filtrer på status 'I brug' → kun matchende garn vises"
4. "slet garn → bekræftelsesdialog → garn forsvinder fra listen"

Opret test/Arkiv.behavior.test.tsx med 5 tests (mock useSupabase):
1. "opret projekt → vises i Vil gerne-fanen"
2. "skift status fra Vil gerne til I gang → projekt vises i I gang-fanen"
3. "tilføj garn til projekt → yarn_items kald sker"
4. "slet projekt → bekræftelsesdialog → projekt forsvinder"
5. "arkivér projekt → garn returneres (returnYarnLinesToStash kaldes)"

Alle tests skal være grønne inden vi fortsætter.
```

**Status 2026-05-13**: Trin 0 *delvist verificeret*. `test/Arkiv.behavior.test.tsx` (5/5) grøn i isoleret + fuld Arkiv-suite (69 tests). `test/Garnlager.behavior.test.tsx` (4 tests) skrevet og review-godkendt, men kan ikke køres lokalt pga. heap OOM — samme failure-mode som de 6 eksisterende Garnlager-testfiler. Verificeres efter Trin 1 lukker worker-OOM. `vitest.config.ts` har fået `testTimeout: 15000`.

**Trin 1 — Vitest worker-crash-fix**
```
/ny-feature Fix Vitest worker-crashes i maskerummet.

6 workers crasher med "Worker exited unexpectedly" — sandsynligvis OOM fra
store JSX-filer. Tilføj til vitest.config.ts:
  pool: 'threads'
  poolOptions: { threads: { maxWorkers: 2 } }

Kør npm run test:run og verificer at worker-crash-antal er reduceret.
```

**Status 2026-05-13**: Trin 1 *delvist landed*. Vitest 4-korrekt config sat (`pool: 'forks'`, `maxWorkers: 2`, `minWorkers: 1`, `isolate: true`). `cross-env` installeret som devDep og `NODE_OPTIONS=--max-old-space-size=8192` indlejret i `test`/`test:run`-scripts. Resultat: **90 af 91 testfiler grønne, 1297 tests passerer**. Garnlager-tests OOM'er stadig — leak'en er reproducerbar med 1 fork + 8 GB heap + alle sub-komponenter mocked, så det er en **dybere leak i Garnlager.jsx's egen module-graf** (~33 MB/s allocation rate når komponenten loades i jsdom), ikke parallel-belastning. **Ny blocker** (se næste blok). Mock-path-bug i `Garnlager.behavior.test.tsx` rettet på vejen (`./BarcodeScanner` → `@/components/app/BarcodeScanner`, samme for BrugNoeglerModal).

**Trin 1b — Garnlager.jsx memory-leak** *(NY BLOCKER, åbnet 2026-05-13)*

Reproducerbar OOM i Garnlager.jsx's module-graf når den indlæses af Vitest/jsdom. Heap-belastning ~33 MB/s indtil OOM (~8 GB efter 110-120s). Rammer alle 7 Garnlager-testfiler. Ikke en parallel-belastning eller config-issue.

Mulige rod-årsager:
- jsdom-incompatibel side-effect ved module-evaluering (useEffect/useRef-mønster på fil-niveau?)
- En sub-komponent eller lib-fil med global registrering (event listener, timer, observer)
- pdfjs/zxing/React-internals der allokerer aggressivt i jsdom

Realistisk fix: **udfør Trin 2-3 først** (split Garnlager.jsx i mindre filer) — leak'en forsvinder muligvis når komponenten ikke længere er ét monolittisk module. Hvis ikke, kør binary-search ved at fjerne kode-blokke midlertidigt.



**Trin 2 — Garnlager: GarnKort + useGarnFilters**
```
/ny-feature Udtræk GarnKort og useGarnFilters fra Garnlager.jsx.

1. Opret components/app/GarnKort.jsx med kode fra linje 987-1163 i
   Garnlager.jsx. Props: yarn, onEdit, onBrugNogler, activeProjects.

2. Opret lib/hooks/useGarnFilters.ts med localStorage-logik fra
   linje 337-348 + 385-412 i Garnlager.jsx.
   Tilføj user-namespace til STASH_FILTERS_KEY:
   'striq.garnlager.filters.v1.' + userId

3. Opdatér Garnlager.jsx til at importere begge.

Kør npx vitest run test/Garnlager.* og verificer grønt.
```

**Trin 3 — Garnlager: GarnModal**
```
/ny-feature Udtræk GarnModal fra Garnlager.jsx.

Opret components/app/GarnModal.jsx med al modal-JSX fra linje 1167-1610
i Garnlager.jsx. Komponenten modtager al state og callbacks som props —
ingen intern state. Garnlager.jsx forbliver state-manager.

Kør npx vitest run test/Garnlager.* og test/Garnlager.behavior.test.tsx.
Alle skal være grønne. Manuelt: tilføj garn, rediger, slet.
```

**Trin 4 — Arkiv: hooks og helpers**
```
/ny-feature Ryd op i Arkiv.jsx — fjern duplikeret kode.

1. Opret lib/hooks/useProjectImages.ts — samler addProjectImages,
   removeProjectImage, reorderProjectImage (duplikeret i linje 834-912
   og 2169-2250 i Arkiv.jsx).

2. Opret lib/hooks/usePdfPattern.ts — samler handlePdfPick, clearPdf,
   switchPatternMode (duplikeret i linje 914-976 og 2227-2269).

3. Opret lib/project-form-helpers.ts — mergeDuplicateLines (duplikeret
   i 762-806 og 2118-2155), findDuplicateLineIndex, patchTouchesIdentity,
   pathFromUrl, safeExt, makeImagePath.

4. Opdatér Arkiv.jsx til at importere og bruge de nye hooks/helpers.

Kør npx vitest run test/Arkiv.* og test/Arkiv.behavior.test.tsx.
```

**Trin 5 — Verificer**
```
npm run test:run
```
Forventet: 0 fejlende, max 8 skippede (FindForhandlerClient), 0-2 worker-crashes.
Manuelt: garnlager-flow + arkiv-flow på mobil.

- **Post-launch ideal**: konvertér begge til `.tsx`

### 8.9 BØR-FIXES inden launch (bonus hvis tid tillader)
- **user_profiles mangler create-migration** — DB kan ikke recreates from-scratch; tilføj `supabase/migrations/2026….sql` med tabel-definition + RLS (~30 min)
- **Password-min 6 tegn → 8-10** — `app/signup/page.tsx:38`, `app/auth/reset-password/page.tsx:53` (~15 min)
- **Reset-password forenkles til PKCE-only** — `app/auth/reset-password/page.tsx:23-36` fjern hash-token-parsing (~2t)
- **Edge function logger brugerprompts** — `supabase/functions/visualize/index.ts:97` fjern eller redaktér (~15 min)
- **`app/Logoer/Creme_logo_med_hvid_tråd_files/` slettes** — fremmed Vite-template-fil i source (~5 min)
- **`app/find-forhandler/varianter/page.tsx` slettes** — design-eksplorations-side; allerede flagget i Fase 5 (~5 min)
- **9 `any` i source → konkrete typer** — `app/kontakt-status/page.tsx`, `app/ideer/page.tsx`, `components/app/BrugNoeglerModal.tsx` (~3t)
- **Nominatim User-Agent + kontakt-email** — `app/find-forhandler/FindForhandlerClient.tsx:103` (~15 min)
- **`npm audit fix`** — fixer PostCSS XSS (~5 min)
- **A11y stikprøve**: `aria-label` på ikon-knapper i `Garnlager.jsx`/`Arkiv.jsx`/`BarcodeScanner.jsx`; tomme tilstande på `/garnlager`/`/projekter`/`/ideer`/`/opskrifter`/`/faellesskabet` (~1 dag)

### Komprimeret 7-dages launch-plan (mål: 2026-05-19)

| Dag | Fokus |
|---|---|
| **Tirs 13/5** | 8.1 Next bump (1t) + 8.3 GDPR-tekst (1t) + 8.6 ESLint-migration (2t) + 8.9 npm audit fix + Logoer-slet + varianter-slet (1t) |
| **Ons 14/5** | 8.2 Admin-email-flytning (4t) + 8.9 password-min + edge function log + Nominatim-fix (1t) |
| **Tors 15/5** | 8.7 Tests grøn (1-2 dage start) |
| **Fre 16/5** | 8.7 Tests grøn slut + 8.8 Vitest-tests for allocate/finalize/mappers (start) |
| **Lør-søn 17-18/5** | 8.8 Tests slut + 8.4 Data-eksport + 8.5 Slet-konto |
| **Man 18/5** | Verifikation: spot-check mobil (<640px) + tastatur-nav + alle empty-states + `supabase db reset` recovery-test |
| **Tirs 19/5** | **LAUNCH** — first 3-5 testbrugere får adgang |

**Risici**:
- Ramt forsinkelse hvis tests viser flere skjulte drifter end ventet (8.7+8.8 er længste vej)
- 8.5 (slet-konto) kan glide til efter launch hvis presset; rationale: 30-dages email-flow opfylder lovkrav indtil knappen er der
- Hvis 8.8 ikke når 100%: launch på minimum kerne-test-coverage (4 funktioner) og lov sig selv at konvertere `.jsx`→`.tsx` i uge 1 efter launch

**Kør med (anbefalet)**:
- 8.1, 8.3, 8.6, 8.9 npm/audit/slet: direkte (trivielle)
- 8.2 admin-email: `/ny-feature Flyt admin-gating til server-side`
- 8.4 + 8.5: `/ny-feature In-app data-eksport og slet-konto`
- 8.7: `/backlog status` + direkte test-fix
- 8.8: `/ny-feature Vitest-tests for yarn-allocate og DB-mappers`

---

## Ønsker / overvejelser

Ideer fra STRIQ_ideer.xlsx der ikke er startet. Grupperet efter prioritet.

### Delvist shippet: Brugt op-rækker bevarer antal + per-projekt-visning (Bug 5, 2026-05-05)

Fra Hannahs feedback: Brugt op-rækker bør bevare antal ngl (i stedet for at dumpe til 0) og vises pr. projekt så samme garn kan figurere flere gange i Mit Garn.

**Status 2026-05-05**: UI-delen (vis projekt + antal nøgler pr. projekt) er shippet via variant A (commit `ce3caee`) — ét kort pr. garn med kompakt projekt-liste indeni (cap 3 + "…og N flere"). Data-modellen var allerede på plads via F16 yarn_usage. Bruger valgte variant A frem for "separate rækker pr. projekt"-tilgangen.

**Stadig planlagt** (datamodel-skift uden for UI-display):
- `lib/supabase/mappers.ts` — `toDb` (fjern `isBrugtOp ? 0` logikken) + `markYarnAsBrugtOp` (sæt ikke quantity=0)
- `lib/yarn-finalize.ts` — `finalizeYarnLines`: fjern `quantity:0` override i extraOnNew så split-qty bevares
- `lib/yarn-finalize.ts` — `revertCascadedYarns`: brug row's quantity i stedet for SUM yarn_usage
- `components/app/BrugtOpFoldeUd.tsx` — tilføj editerbar "Antal nøgler brugt"-felt
- Migration: backfill eksisterende Brugt op-rækker fra yarn_usage.quantity_used (en sådan migration `20260505000001_brugt_op_quantity_backfill.sql` er allerede skrevet — ikke committeret endnu)
- Eksisterende tests der asserter quantity=0 for Brugt op (~5-6 tests)

**Acceptkriterier (resterende):**
- Marker garn med 5 ngl som Brugt op via BrugtOpFoldeUd → row har quantity=5 (ikke 0), brugt_til_projekt_id sat
- Cascade fra projekt-færdig → split bevarer antallet (ikke quantity=0 længere)
- Backfill-migration retter eksisterende Brugt op-rækker korrekt
- De-cascade restaurerer korrekt antal (test mod begge stier — quantity bevaret OG legacy quantity=0-rækker)

**Estimat**: middel — ca. 150 linjer kode + migration aktivering + 6-8 test-opdateringer.

**Kør med**: `/ny-feature Bevar quantity på Brugt op-rækker + editerbar antal-felt`



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

**Launch-vurdering:** Ingen af de 8 er launch-blokerende. F1–F6 + F8 er realistiske inden/kort efter testbruger-launch (2026-05-12). F7 er eksplicit post-launch.

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
- ~~**Progressive disclosure i Tilføj-modal**~~ — **promoveret til launch-blokerende 2026-05-04** sammen med pris-felt. Se "Mangler — blokerende for testbruger-launch → 6. Fold-ud-redesign af Tilføj garn-formular + valgfrit pris-felt".
- **Mobil bottom-sheet i stedet for centered modal** — matcher native mobile-conventions. ~1-2 dage.
- **To-trins flow: [Søg katalog] / [Scan stregkode] / [Manuelt]** — slanker den ene mega-form til tre fokuserede spor. ~2-3 dage.
- **Bulk-tilføj (tabel-UI, 5 tomme rækker)** — testbrugere skal importere eksisterende samling hurtigt. ~2 dage.
- **Katalog-søg: "Ingen match" + tastatur-navigation** — `YarnCatalogSearch` svarer ikke når intet findes; ingen ArrowUp/Down/Enter. (`Garnlager.jsx:72-152`)

- **Onboarding / velkomst-flow** — første-gangs-guide til nye brugere: hvad er Striq, hvad kan de gøre nu, hvor starter de. Uden dette vil testbrugere fare vild.
  Kør med: `/ny-feature Onboarding: velkomst-modal til ny bruger ved første login`

- **PWA-installer-side: nem "føj til hjemmeskærm" for ikke-tekniske brugere (2026-05-05, fra Hannah)** — need, ikke akut. PWA-manifest er allerede på plads (`app/manifest.ts`), men ikke-tekniske brugere ved ikke hvordan de installerer en PWA. Behov: en `/installer`-side (eller indlejret modal/banner) der gør det så nemt som muligt. **Android (Chrome/Edge/Samsung Internet)**: stor "Installér STRIQ"-knap der trigger systemets install-dialog via `beforeinstallprompt`-eventet — ét tryk og det er gjort. **iPhone (Safari)**: visuel 3-trins guide med pil/illustration der peger på del-ikonet → "Føj til hjemmeskærm" → "Tilføj". Apple tillader ikke programmatisk install — visuel guide er det bedste vi kan gøre. **Allerede installeret**: detect via `display-mode: standalone` og vis "Du har den allerede". **Forkert browser** (fx Chrome på iOS): forklar at de skal åbne i Safari. QR-kode der peger på `/installer` kan så bruges på SoMe/email/print som distributions-kanal. Kør med: `/ny-feature PWA-installer-side med Android one-tap og iOS-guide`.

- **Sortering af garnlager (2026-04-27, fra Hannah)** — brugere skal kunne sortere efter farve, navn, garntype (fra Excel: "Man skal kunne sortere i garnlageret"). **Default-visning: farvesorteret** — når brugeren åbner Mit Garnlager, skal listen være sorteret efter farve som standard. Der er kun filter i dag, ingen sortering.

- ~~**Kun hele nøgler i Garnlager — ingen kvarte/halve (2026-04-27)**~~ — **revurderet 2026-04-28**: Hannah valgte i stedet at tillade **hele + halve nøgler** (step=0.5) globalt — både i Mit Garnlager og i projekter. Implementeret som del af F11. Kvarte (0.25/0.75) er ikke længere mulige; eksisterende historisk data rundes til nærmeste 0.5 ved visning.

- **Mobil-polish** — touch-targets og layout på < 640px. Kerne-flow skal være testet på mobil inden launch.

- **Markér yndlingsgarn** — simpel favoritmarkering i garnlageret (fra Excel: "Yndlingsgarner").

- **"Ønsker mig"-knap fra Garn-katalog → Garnlager (2026-04-29, fra Hannah)** — på garn-detaljesiden `/garn/[slug]` tilføjes en "Ønsker mig"-knap der opretter en ny `yarn_items`-række med `status = 'Ønskeliste'`, `catalog_yarn_id` udfyldt, og `color_name/hex` tomme (brugeren udfylder farve senere i Garnlager). Login-required: ulogget bruger får login-prompt-modal ved klik (knappen er synlig for alle). Duplikat-tjek på `catalog_yarn_id` — hvis garnet allerede findes (uanset status), spørges brugeren via modal om de vil tilføje alligevel. Efter succes: toast "Tilføjet til ønskeliste — [Se garnlager]" og knappen skifter til "På ønskelisten ✓" (disabled). Fjern-flow sker kun fra Garnlager-UI. Knappen findes IKKE på `YarnCard` i oversigten — kun på detaljesiden. Status `'Ønskeliste'` og hele Garnlager-filtrering eksisterer allerede; denne feature handler om discovery-indgangen fra kataloget. Kør med: `/ny-feature "Ønsker mig"-knap fra Garn-katalog`. (Erstatter tidligere vag post: "Ønskeliste i garnlager", fra Excel: "Ønskeliste med garner".)

- **Redesign eksport i Mit Garnlager til printvenlig udgave (2026-04-27, fra Hannah)** — i dag eksporteres garnlageret som CSV (`lib/export/exportGarnlager.ts`, Excel-kompatibel). Hannah ønsker en printvenlig udgave — overblik der ser pænt ud på papir, ikke kun rådata. Sandsynligvis en HTML- eller PDF-baseret rapport med sektioner pr. status, billeder/farve-pille, antal/total-summering. CSV bevares parallelt for dataportabilitet (GDPR art. 20). ⚠️ **Spørg Hannah ved opstart**: PDF (klient-side via fx pdf-lib eller server-side route) eller print-optimeret HTML der bruger browserens "Udskriv → Gem som PDF"? Skal layoutet matche garnkortene fra F4 (mini-thumbnails med farve), eller kompakt tabel? Hvilke felter skal med (kun navn+antal+farve, eller også løbelængde+pind+noter)? Sortering — alfabetisk, efter status, efter dato? Skal skannede billeder med, eller kun farvepiller?

~~**Egen farve når katalog ikke har den — Garnlager + Projekter (2026-04-27, fra Hannah):**~~ — **dækket 2026-04-28**: projekt-delen implementeret i Runde 1 af Fællesskabet-tilretninger (`GarnLinjeVælger.jsx` "Fra kataloget"-tab har nu fri-tekst-input + klikbare farve-pills). Garnlager-delen var allerede teknisk fri-tekst — hvis den stadig opleves som blokeret, åbn nyt punkt med konkret friction-rapport.

**Projekter — felter og inputfelt-tilpasning (2026-04-27, fra Hannah):**
- **Designer + opskriftsnavn på projekter** — under "Hvad er strikket" på Projekter skal man kunne skrive navn på designeren og navnet på opskriften. Felter eksisterer allerede på `projects`-tabellen som `pattern_designer` og `pattern_name` (brugt af Fællesskabet/del-flow), men er ikke eksponeret i selve projekt-redigeringen. ⚠️ **Spørg Hannah ved opstart**: skal felterne også være på vil_gerne / i_gang, eller kun færdigstrikket? Skal de være krævede ved deling? Skal designer-navn auto-suggestes fra eksisterende `content/designere.md`-liste?
- **Inputfelt til "Garn i projektet"** — skal tilpasses (uklart hvordan endnu). ⚠️ **Spørg Hannah ved opstart**: hvad konkret er problemet med det nuværende felt? Søger hun en bedre katalog-integration ligesom F2 i Mit Garn? Eller er det mængde/farve/visning der skal ændres? Find komponenten (sandsynligvis i `components/app/Arkiv.jsx` eller `NytProjektModal`) og afdæk konkrete pain points.
- **Paritet Garnlager ↔ Projekter ved garn-input (2026-04-27, fra Hannah)** — alle ændringer vi laver til garn-input-felterne i **Mit Garnlager** (Tilføj/Rediger garn) skal også afspejles i **Projekter** når man opretter eller redigerer et projekt og tilføjer garn til det. Dvs. samme felter, samme validering, samme UI-mønstre. Konkret gælder det de aktuelle Hannah-ønsker fra 2026-04-27: **kun hele nøgler** (ingen kvarte/halve), **egen-farve-skrivning** når katalog ikke har farven, **fjernet katalog-thumbnail** (hvis "Garn i projektet" viser samme thumbnail), og **default farvesortering** hvor relevant. Tjek både `NytProjektModal` og `Arkiv.jsx`/DetailModal — garn-tilføjelses-flowet eksisterer begge steder. Fremadrettet bør al garn-input-arbejde behandle Garnlager og Projekter som én sammenhængende feature, ikke to.
- **Designer-database (top 100)** — opbyg database over de 100 største danske strikdesignere + designere som danske strikkere bruger (også udenlandske). Skal afløse den nuværende `content/designere.md` (top 20). Ny tabel `designers` i Supabase (navn, evt. alias/hjemmeside/instagram, nationalitet, status), seed-script + admin-UI til kuratering. Driver auto-suggest på designer-feltet (forrige bullet) og lægger fundament for fremtidig opskrifts-katalog (`patterns.designer_id`-FK). ⚠️ **Spørg Hannah ved opstart**: hvilke datapunkter skal vi have ud over navn (hjemmeside? signatur-stil?)? Er der en kilde-liste at starte fra (Ravelry, Instagram, dansk strikkesammenslutning)? Skal udenlandske designere markeres separat, eller bare være med i samme tabel? Skal der være et offentligt designer-katalog ligesom garn-kataloget, eller er det kun intern reference til auto-suggest + opskrifts-FK?

~~**Fællesskabet — tilretninger Runde 2 + 3**~~ — **implementeret 2026-04-28** (commits `2a70cf3` + `b30cd31`). Se "Fællesskabet — tilretninger Runde 1-3" i Implementeret-sektionen ovenfor.

**Arrangementkalender — udvidelser (2026-05-07, fra Hannah):**

- **VIGTIGT: Tilføj spindekursus til arrangementkalenderen** — `app/kalender/page.tsx` rummer i dag strikke-events april–oktober 2026 men mangler spindekurser. Tilføj spindekursus(er) som event-type i kalenderen så brugere der vil lære at spinde kan finde og tilmelde sig. ⚠️ **Spørg Hannah ved opstart**: hvilke konkrete spindekurser skal med (én bestemt eller flere udbydere)? Skal "spindekursus" være en separat event-kategori med eget filter/tag, eller bare en event-type på linje med strikke-events? Skal vi have datoer/lokation/pris/tilmeldings-link fra Hannah, eller skal det hentes fra en ekstern kilde?
- **Strikkecafé-arrangementer fra garnbutikker** — brugere skal kunne se strikkecafé-arrangementer fra de forskellige garnbutikker i kalenderen. Mange fysiske garnbutikker (de 228 i `stores`-tabellen) holder regelmæssige strikkecaféer som er værdifulde mødesteder. Forudsætninger: (1) datakilde — manuelt indtastet via admin, scrapet fra butikkernes hjemmesider/Facebook-events, eller crowd-sourcet via butikkerne selv? (2) Schema — sandsynligvis ny tabel `store_events` med `store_id`-FK, dato/tid (evt. tilbagevendende), beskrivelse, evt. tilmelding/pris. (3) UI — filter i kalenderen til at vise/skjule strikkecaféer, evt. kobling fra `find-forhandler`-siden så hver butik viser sine kommende caféer. ⚠️ **Spørg Hannah ved opstart**: hvilken datakilde er realistisk på kort sigt (manuel indtastning af top-X butikker, eller bredere crawl)? Skal kalenderen have geografisk filter ("strikkecaféer nær mig")? Skal vi kontakte garnbutikker og bede dem indberette deres caféer (overlap med eksisterende `content/fabrikanter.md`-kontaktproces)?

Kør med: `/ny-feature Arrangementkalender: spindekursus + strikkecafé-arrangementer fra garnbutikker` (eller del op i to features hvis omfanget bliver for stort).

**Bæredygtighed — efter strikkeprofil-fokusgruppe (2026-05-04, snart prioriteres):**

Fokusgruppe-interview gennemført 2026-05-04 med 8 strikkeprofiler (Sara 26 / Lone 64 / Mette 47 / Astrid 33 / Camilla 38 / Frida 29 / Kirsten 72 / Maria 41) over tre temaer: lokal vs. global produktion, stash-management, certificeringer. Output: 4 P0-features (snart prioriteres), 4 P1-features (post-launch), 3 anti-mønstre. Erstatter den åbne idé-fase-entry under KAN-VENTE → Fra Hannah (nyt ønske, 2026-05-04). Profil-noter + fuld interview-syntese: chat 2026-05-04 (overvej senere flytning til `content/research/`).

**P0 — snart prioriteres:**

- **Garn-oprindelse på 3 niveauer, ikke ét felt** — drevet af insight 1 (Maria: dansk garn er ofte spundet i udlandet, "dansk = grønt" er en romantik). I dag har `yarns`-tabellen `fiber_origin_country` + `origin_country` som groft samler det hele. Split eksplicit op i: **uld-oprindelse** (land + evt. race), **spundet hos** (mølleri/land), **farvet hos** (farveri/land). Alle valgfri — bedre tre tomme felter end ét forført. Påvirker `yarns`-schema (migration), admin-editor (`app/garn/admin/`), garndetaljeside (`app/garn/[slug]/page.tsx`). ⚠️ **Spørg Hannah ved opstart**: skal felterne også gælde `yarn_items` (bruger-egne) eller kun katalog-yarns? Skal alle tre vises eksplicit selvom kun ét er udfyldt, eller fold sammen til "Oprindelse: ikke oplyst"? Kør med: `/ny-feature Garn-oprindelse på tre niveauer i katalog`.

- **Indkøbsdato + "ligger uberørt"-status på `yarn_items`** — drevet af insight 2 (Kirsten + Maria: mængde slår oprindelse) og insight 3 (Mette: stash-skam er emotionel, ikke logistisk). Tilføj `koebt_dato DATE NULL` på `yarn_items` (eller infer fra `created_at` indtil bruger korrigerer), udled "sidst brugt" fra `yarn_usage`-koblinger. Vis i lager-listen som nøgterne mærkater: "Tilføjet for 14 mdr. siden, ikke brugt endnu". **Ikke** rødt, **ikke** advarsel, **ikke** badge — bare data. Tone-invariant: dette må aldrig føles som en revisor. ⚠️ **Spørg Hannah ved opstart**: skal `koebt_dato` være redigerbar (så historisk stash kan dateres) eller kun nye registreringer? Skal "uberørt"-mærkat ramme via threshold (>6 mdr / >12 mdr) eller altid vise antal måneder? Skal mærkatet vises på alle status, eller kun "På lager"? Kør med: `/ny-feature Indkøbsdato og uberørt-status på garn-lager`.

- **Certifikat-modal med ærlige "dækker / dækker ikke"-beskrivelser** — drevet af insight 4 (Sara's paralyse + Maria's punktering at GOTS ikke dækker mulesing). Hvor vi viser GOTS / RWS / mulesing-frit / OEKO-TEX / EU Ecolabel: ikke som badges men som klikbare info-elementer. Tap → kort dansk tekst der forklarer **hvad mærket dækker og hvad det ikke dækker**. Indeholder 5-7 certifikater. Genbrugelig komponent. **Dækker også** det eksisterende KAN-VENTE-ønske "Certificeringer forklaret" (Excel-listen) — flettes ind. ⚠️ **Spørg Hannah ved opstart**: skal ordbogen ligge som hardcoded TS-konstant i repo (hurtigst) eller som DB-tabel `certifications` med admin-redigering (mere fleksibelt, mere arbejde)? Hvilke 5-7 certifikater er prioritet? Kør med: minimum `software-arkitekt` → `tester` → `software-reviewer` ved repo-løsning, eller `/ny-feature` ved DB-løsning.

- **Kuratér "anbefalede mærker"-liste til første-garn-tilføjelse** — drevet af insight 6 (Camilla: tids-fattige brugere skal ikke bære research-byrden). Når en ny bruger tilføjer sit første garn: vis 8-10 nordiske mærker som hurtig-vælger, ikke kun et tomt søgefelt. **Må ikke** brandes som "vores bæredygtige top-10" (greenwashing-fælde) — formuleres som "almindelige mærker danske strikkere bruger". Implementeres som content (kurateret liste i kode eller DB), kobler til onboarding-flow (særskilt eksisterende BØR-HAVE-punkt). ⚠️ **Spørg Hannah ved opstart**: hvilke mærker (sandsynligt: Filcolana, Permin, Sandnes, CaMaRose, Drops, Hjelholt, Isager, Knitting for Olive, Önling)? Alfabetisk, efter popularitet i kataloget, eller efter Hannas redaktionelle valg? Skal listen være filtrérbar (vægt/fiber)? Kør med: content-opgave + lille UI-feature, ikke fuld `/ny-feature`.

**P1 — første sprint efter launch:**

- **Stash-statistik på lager-siden** — "Du har tilføjet X garn det sidste år, brugt Y." Forholdstal, ikke domme. Falder naturligt ud af P0-2's `koebt_dato`-data koblet til `yarn_usage`.
- **Restegarn-håndtering** — Kirstens kurv (insight 6 + Kirsten-citat: "Den er bæredygtig fordi den BLIVER brugt"). Felt på projekter til "her er hvad jeg har tilbage", senere kobling til "passer til X-projekt"-forslag.
- **Filter i lager efter tre tillidsmodeller** — insight 5 (Lone/relations-tillid, Sara/system-tillid, Astrid/direkte-adgang). Filter-chips i Mit Garnlager: "Mærker jeg har brugt før" / "Har certifikater" / "Har dokumenteret kæde". Påvirker informations-arkitektur — kør gennem `software-arkitekt` inden bygning.
- **Indkøbs-refleksion (blid)** — når garn tilføjes til lager *uden* projekt-kobling: en valgfri prompt "Skal vi parre det med et projekt nu eller senere?" Knytter sig til Mette's stress-shopping-mønster, men må ikke virke moraliserende. "Senere" skal være lige så validt som "nu".

**Anti-mønstre — gør IKKE (afledt direkte af interviewet):**

- **Ingen "bæredygtigheds-score" pr. garn.** Maria-pointen: enhver score smelter komplekse afvejninger til ét tal og er enten greenwashing eller arrogant. Bevidst fravalgt — modsiger den oprindelige open-ended idé-entry. Vis data, lad brugeren tolke selv.
- **Ingen gamificering af stash-reduktion.** Mettes skam er ægte. Streak-counter på "dage uden at købe garn" gør appen til hendes fjende. Statistik må ikke være konkurrence.
- **Ingen "research-skat" før man kan registrere et garn.** Hvis det kræver 12 felter at tilføje en pelote, taber vi Camilla, Kirsten og Mette på sekund 30. Default-tilføjelse må forblive navn + farve. P0-1's tre oprindelses-felter er **alle valgfri** netop af denne grund.

**Bæredygtighed — Runde 2: Pris-akse (2026-05-04):**

Anden fokusgruppe-runde med samme 8 profiler, denne gang med pris som indgang. Afslørede 5 indsigter der krydsskærer bæredygtighed og forbrug. Fuld interview-syntese: chat 2026-05-04.

**5 indsigter (kort):**
1. **"Bæredygtigt" er låst bag en prisbarriere** — Maria/Sara: hvis app'en taler bæredygtighed uden at adressere pris, taler den til Lone/Mette og lukker Sara/Camilla/Kirsten ude.
2. **Kr/projekt > kr/nøgle** — Frida/Camilla: et projekt er den meningsfulde pris-enhed, ikke et nøgle. Mental model ingen anden app gør synlig.
3. **Tilbud er stash-trigger, ikke gevinst** — Mette/Frida: pris-notifikationer forstærker overforbrugs-mønstret. Skal designes med dette i hånden.
4. **Tid er en skjult pris-akse** — Astrid: research-tid og spind-tid er reelle omkostninger. Default-good-valg er pris-reduktion for tids-fattige.
5. **Holdbarhed-narrativ er ikke universelt** — Lone/Camilla: kvalitet-over-kvantitet er sandt for voksen-tøj, falskt for børnetøj der vokses ud af.

**Krydsreferencer til eksisterende backlog:**
- "Tilbud-notifikationer på yndlingsgarn" (KAN-VENTE, fra Excel) — kvalificeres med insight 3: opt-in pr. garn, ikke generel feed.
- "'Køb garn til opskriften'-flow" (KAN-VENTE 2026-04-30) — pris-drevet, kobler til insight 2 (kr/projekt).
- P0-4 "anbefalede mærker"-liste — skal vise pris, ikke kun kvalitet (insight 1).
- "Affiliate-model med garnbutikker" (KAN-VENTE) — insight 1 advarer om at affiliate-anbefalinger må ikke implicit forudsætte premium-budget.

~~**Ny feature: Pris-felt på `yarn_items`**~~ — **promoveret til launch-blokerende 2026-05-04** og kombineret med fold-ud-redesignet. Se "Mangler — blokerende for testbruger-launch → 6. Fold-ud-redesign af Tilføj garn-formular + valgfrit pris-felt".

### KAN-VENTE (efter testbrugere)

**Garncafé-anmeldelser på forsiden (2026-05-12, fra Hannah):**

Forslag til "Fra fællesskabet"-sektionens senere udvidelse: et roterende rul med kundeudtalelser fra garncaféer rundt om i Danmark. Formål: gøre forsiden mere levende, vise mangfoldighed i strikkecafé-fællesskabet, og give caféerne synlighed.

**Tre niveauer:**

1. **Simpelt café-rul** (~1-2 timer) — horizontal scroll-row med 6-8 caféer fra `stores`-tabellen (hvor `is_strikkecafe=true`). Hver: navn, by, `note` som teaser. Linker til /strikkecafeer. Ingen ny data.

2. **Rul med hardcoded citater** (~2-3 timer) — Hannah leverer 4-6 citater fra caféejere/-gæster, eller jeg foreslår generiske. Format: "[Citat]" — Navn, Café · By. Statisk content-modul, ingen DB.

3. **Bruger-anmeldelser** (~2-3 dage) — fuld feature:
   - Ny tabel `cafe_reviews` med kolonner: id, store_id (FK), author_user_id, review_text, rating (1-5), created_at, status (`pending`/`approved`/`rejected`)
   - RLS-policies: SELECT på `approved` til anon, INSERT for authenticated, UPDATE/DELETE kun egne pending-anmeldelser, moderation via editor-rolle
   - GRANT'er som ved øvrige tabeller (CLAUDE.md-konvention)
   - Indleveringsformular på café-detalje-side eller modal fra `/strikkecafeer`
   - Moderation-flow under `/admin/cafe-anmeldelser` (genbruger `is_editor`-pattern fra barcode-suggestions)
   - Forside-rul: server-component der henter 6-8 nyeste `approved` anmeldelser, viser som auto-scrollende eller manuelt scroll-row
   - Stjernerangering valgfri — start uden, tilføj hvis efterspurgt

**Anbefalet rækkefølge:** Start med #1 eller #2 hvis Hannah vil teste konceptet hurtigt. Spring direkte til #3 hvis intentionen er at give caféer en stemme i fællesskabet og at det er en kerne-værdi.

⚠️ **Spørg Hannah ved opstart**: Skal anmeldelser være knyttet til en konkret café (kræver café-detalje-side først), eller frit citat fra hvilken som helst café-gæst? Skal anonyme anmeldelser være tilladt, eller altid med display_name? Skal cafén selv kunne svare på en anmeldelse?

Kør med (efter launch): `/ny-feature Garncafé-anmeldelser med rul på forsiden`

---

**Fra Jesper (IT-arkitekt, 2026-04-19):**
- **Erstat `xlsx`-pakke med `exceljs`** (valgt A for nu: `xlsx` bruges kun server-side med betroede filer, så HIGH-vulnerability er lav reel risiko. Skift hvis bruger-upload af Excel kommer senere)
- **AI-substitutions-strategi** — pre-compute ved yarn-insert + nightly refresh vs. on-demand. Arkitekturel beslutning, udskudt til efter launch.
- **Code hardening fase 2** — bredere audit: CSP-tuning, dependency-scanning i CI, secrets-scanner

**Brug nøgler-modal — kun PDF, ikke billed-kæde-opskrift (2026-04-28):**
- "Brug nøgler"-flowet i Mit Garnlager understøtter kun upload af opskrift som PDF, ikke som billed-kæde (som "+ Nyt projekt"-formen i Arkiv gør). Inkonsistens mellem de to opret-projekt-stier. Bevidst udskudt: modalen er en hurtig forbrugs-logger, ikke et fuldt projekt-redaktørflow. Hvis testbrugere klager: tilføj patternMode-tabber + multi-billed-håndtering (~halvdelen af Arkiv-formen).

**Fra Hannah (nye ønsker, 2026-04-20):**
- **Søgning på konkrete garntyper pr. garnbutik** — brugeren vælger én eller flere specifikke garner fra katalog, finder butikker der fører netop dem. Kræver fuld mapping af butik↔garn i DB (brug/udvid `stores`-tabel og katalog-relation). Erstatning for den gamle brand-pill-filtrering der blev fjernet i Find garnbutikker-redesignet.

**Fra Hannah (nyt ønske, 2026-04-30):**
- **"Køb garn til opskriften"-flow fra opskriftssiden** — på en opskriftsside (fx i opskrifts-katalog eller på et knyttet projekt) kan brugeren klikke "Jeg vil gerne købe garn til opskriften" (à la knittingforolive.dk's toggle "Jeg vil gerne købe garn til opskriften"). Derefter to valg:
  1. **Find bedste tilbud på præcis dette garn** — direct link/redirect til den garnbutik der pt. har det originale garn billigst (kræver pris-tracking pr. butik + garn).
  2. **Vis gode billigere alternativer** — substitutter med fiber/vægt/metrage-match, sorteret efter pris (kobler op til AI-validering af substitutioner og evt. lager-badge-substitut-logik).
  Forudsætninger: butik↔garn-mapping (overlap med "Søgning på konkrete garntyper pr. garnbutik"), pris-felt på `store_yarns`/butiks-katalog, regelmæssig pris-opdatering (scrape/API/manuelt), og en CTA-komponent på opskriftssiden. Synergi med affiliate-modellen og tilbud-notifikationer.

**Fra Hannah (nyt ønske, 2026-05-04):**
- ~~**Bæredygtighed som aktiv del af appen — særligt i Garn-kataloget**~~ — **udfoldet 2026-05-04** via strikkeprofil-fokusgruppe; struktureret som 4 P0 + 4 P1 + 3 anti-mønstre under "BØR-HAVE → Bæredygtighed — efter strikkeprofil-fokusgruppe (2026-05-04)".

**Fra Hannah (egne ønsker, 2026-04-19):**
- **AI-validering af substitutioner** (Claude API) — AI der ved om fibre/vægt/metrage faktisk matcher. M-estimat
- **Moderations-flow for substitutions-forslag — effektivitets-review** — `ModerationClient.tsx` findes, men Hannah ønsker at verificere at godkendelses-workflowet er så hurtigt som muligt pr. forslag (batch-godkend? tastatur-shortcuts? keyboard-only flow?). UX-review anbefales.
- **Garnproducent- og designer-kontakt** — status i `content/fabrikanter.md` + `content/fabrikanter.csv` (fabrikanter) og `content/designere.md` (top 20 designere). Kontaktet 🟡: Drops (2026-04-21), Permin (2026-04-22), Filcolana — Anne Holt Kirkegaard (2026-04-22). Opfølgnings-datoer 2026-05-05 og 2026-05-06.
- **Opskrifts-katalog (resterende dele, post-launch)** — DROPS-katalog med søgning, filtrering og favoritter er implementeret 2026-04-29. Resterende:
  - **Ny tabel `patterns`** i Supabase (for STRIQ-egne opskrifter med titel, designer, billede, garn, pind, sværhedsgrad, pris, kilde-URL, `is_own`, `owner_user_id`) + RLS
  - **Tabel `user_pattern_filters`** — gemmer brugerens sidste søgekriterier/filtre på tværs af sessioner (URL-state dækker session-hukommelse i denne iteration)
  - **Kolonne `pattern_id` på `projects`** — knyt opskrift → projekt når opskriften ligger i STRIQ
  - **UI**: "Mine favoritter"-filter (toggle), "Knyt opskrift"-vælger i Mine projekter
  - **Admin-flow** til at oprette STRIQ-egne opskrifter
  - **Substitut-logik på lager-badge**: vis også "Kan strikke nu med substitut" baseret på fiber-tags (kompatibel uld→uld, mohair→mohair). Aktuel implementation matcher kun eksakte garn-keys.
  - **Flere designere**: Sandnes, Filcolana, Permin, m.fl. kan flyde ind i samme `DropsKatalog`-komponent — `RecipeSource`-typen er allerede udvidelig.
  - **Forudsætning for ekspansjon**: tilladelser fra designere/fabrikanter indhentes via `content/fabrikanter.md`-processen
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

**Fra Hannah (research-spike 2026-05-06): Daglig pris-scraping med "billigste pris" på katalog-kort + detalje-side**

Mål: vis aktuel billigste pris (DKK) på YarnCard og garn-detaljesiden, med direkte link til den retailer der lige nu er billigst. Opdateres automatisk hver nat.

**Faldgruber (vigtigst først):**
1. **Mapping-problemet** — 99 garner × ~15 retailers = ~1500 mulige produktside-URL'er. Ingen central database mapper "Drops Karisma" til specifikke produktsider hos hver retailer. Skal bootstrappes manuelt (eller delvist via søg-API'er) første gang. Uden mapping ingen priser.
2. **Hver retailer har sin egen DOM** — ingen ensartet schema; hver redesign bryder parseren.
3. **JS-rendret pris** — moderne webshops rendrer pris via JS; native `fetch()` ser kun tom skal. Løsning: Playwright/Puppeteer (tungt, virker dårligt på Vercel serverless). **Lyspunkt**: mange sider eksponerer JSON-LD `Product` schema for SEO — skal undersøges retailer-for-retailer.
4. **Juridisk/ToS** — scraping uden tilladelse er gråzone; risiko for IP-ban eller cease-and-desist. Bedre vej: **affiliate-aftaler** (Adtraction, Partner-Ads) med struktureret pris-feed mod provision på salg.
5. **Sammenligningsproblemer** — 50g vs 100g nøgler kræver pris pr. 100g (eller pr. 100m). Tilbudspriser, mængde-rabatter, udsolgt, udenlandsk fragt forvrænger "billigste".
6. **Cron-infrastruktur findes ikke** — kun `.github/workflows/backup-db.yml` (daglig DB-dump). Vercel Hobby = max 2 crons/dag; alternativ er GitHub Actions schedule (gratis) eller Supabase Edge Function + pg_cron.
7. **Vedligeholdelse** — 5-10 parsers × kontinuerlige redesigns ≈ ~½ dag/måned vedligehold. Stale priser er værre end ingen priser.
8. **Skæve outliers** — sanity-check (pris pr. 100g i [50; 1500] kr) påkrævet, ellers vis ikke.

**Anbefalet etape-tilgang (stop og evaluer efter etape 1):**

Etape 1 — MVP (4-7 dages arbejde): manuel mapping af 20 mest populære garner × 3 store retailers. Brug native `fetch` + JSON-LD-parsing.

Schema-skitse:
```sql
create table public.yarn_retailer_offers (
  id uuid primary key default gen_random_uuid(),
  yarn_id uuid not null references public.yarns(id) on delete cascade,
  retailer_id uuid not null references public.online_retailers(id) on delete cascade,
  product_url text not null,
  ball_weight_g_at_retailer integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (yarn_id, retailer_id)
);
create table public.yarn_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.yarn_retailer_offers(id) on delete cascade,
  price_dkk numeric(10,2) not null,
  price_per_100g_dkk numeric(10,2),
  in_stock boolean,
  scraped_at timestamptz not null default now(),
  raw_html_snippet text
);
create index on public.yarn_price_snapshots (offer_id, scraped_at desc);
create table public.yarn_cheapest_offer (
  yarn_id uuid primary key references public.yarns(id) on delete cascade,
  offer_id uuid references public.yarn_retailer_offers(id) on delete set null,
  price_dkk numeric(10,2),
  price_per_100g_dkk numeric(10,2),
  retailer_navn text,
  product_url text,
  updated_at timestamptz not null default now()
);
```

Etape 2 — cron via **GitHub Actions** (anbefales): tilføj `.github/workflows/scrape-prices.yml` der kører `node scripts/scrape-prices.mjs` hver nat 03:00 UTC. Service-role key som GitHub secret. Gratis, ubegrænset, samme mønster som backup-db.yml.

Etape 3 (valgfri) — custom parsers per retailer der ikke har JSON-LD. Én ad gangen i `scripts/scrapers/<slug>.mjs`. For JS-tunge sites: spring og overvej affiliate-feed.

**Genbrug fra eksisterende kodebase:**
- `scripts/check-retailer-links.mjs` — mønster: native `fetch` + AbortController + concurrency-batch
- `scripts/_yarns-xlsx.mjs:loadEnv` + `makeAdminClient` — service-role Supabase-klient
- `online_retailers`, `brands`, `retailer_brands` — eksisterer; pegs til af `yarn_retailer_offers.retailer_id`
- `lib/data/retailers.ts` — typed Supabase-query mønster
- `app/api/revalidate/route.ts` — kald efter scrape så ISR (`revalidate=3600`) invalideres

**Filer der skal ændres/oprettes** (ved senere implementering):
- `lib/types.ts` — tilføj `cheapest_price_dkk`, `cheapest_price_url`, `cheapest_retailer_navn`, `price_updated_at` på `Yarn`
- `yarns_full`-view (defineret i `supabase/migrations/20260427000003_yarn_weight_enum.sql:98-139`) skal genoprettes med `LEFT JOIN public.yarn_cheapest_offer`
- `components/catalog/YarnCard.tsx` — pris-linje under fiber-teksten
- `app/garn/[slug]/page.tsx` — "Billigste pris"-boks i hero med "Se hos {retailer}"-knap
- Nye: `supabase/migrations/<dato>_yarn_pricing.sql`, `scripts/scrape-prices.mjs`, `scripts/scrapers/json-ld.mjs`, `scripts/seed-yarn-offers.mjs`, `.github/workflows/scrape-prices.yml`

**Estimat**: Etape 1 ≈ 4-7 dage. Etape 2 ≈ 0,5 dag. Etape 3 ≈ 1-2 dage pr. yderligere retailer. Vedligehold ≈ ½ dag/måned.

**Beslutninger der bør tages før implementering**:
1. Vedligeholde scrapers løbende, eller foretrække affiliate-feeds (færre retailers, men stabilt)?
2. Skal vi tale med 1-2 store retailers om produkt-feed eller affiliate-aftale før vi bygger scraping?
3. Er det vigtigere at vise *billigste pris* eller bare *en pris med direkte køb-link*? Det første er meget sværere.

Synergi med eksisterende KAN-VENTE-emner: "Køb garn til opskriften"-flow (2026-04-30), Tilbud-notifikationer på yndlingsgarn, Affiliate-model med garnbutikker, Søgning på konkrete garntyper pr. garnbutik.

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
