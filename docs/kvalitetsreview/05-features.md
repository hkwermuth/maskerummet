# Fase 5 — Feature-by-feature gennemgang

_Kontekst: ~18.6k LOC, 41 features, testbruger-launch om 3 uger._
_Read-only-review; ingen kode-ændringer foretaget._

## Sammenfatning

Kerne-flowet (auth, garnlager, projekter, garn-katalog, find-forhandler) er teknisk på plads og dækker funktionaliteten. Auth-flowet har et velgennemtænkt callback (OAuth-konflikter håndteres, resolveNext whitelister redirects) og RLS er korrekt opsat på yarn_items/yarn_usage/projects med eksplicitte GRANTs. Fællesskabets RLS er det mest komplekse — kolonne-level GRANT på anon udelader notes og pattern_pdf_url, hvilket er det rigtige design.

Største risici før launch: (1) app/auth/reset-password/page.tsx har subtile race conditions i session-håndtering og inline-styles uden delte tokens. (2) components/app/Garnlager.jsx (1615 linjer) og components/app/Arkiv.jsx (3013 linjer) er monolitiske utyped JSX-filer — datakritisk kode uden typesikring 3 uger før launch. (3) app/ideer/page.tsx og app/kontakt-status/page.tsx har hard-coded ADMIN_EMAILS-arrays i klient-kode (læk af interne e-mails). (4) Strikkeskolen er en placeholder. (5) Visualizer-gating skal verificeres server-side.

Privatlivspolitik er substantielt opdateret med Hannah som dataansvarlig — compliance OK før launch, men teksten matcher ikke faktisk localStorage-brug.

## A. Kritiske for testbruger-launch

### app/auth/ + app/login/ + app/signup/ (Auth-flow)
- **Status:** 🟡 Fungerer men polering mangler
- **Hvad:** Hoved-callback (app/auth/callback/route.ts), reset-password (app/auth/reset-password/page.tsx), login (app/login/page.tsx), signup (app/signup/page.tsx). Bruger Supabase Auth + magic-link/OAuth. Separat editor-flow under /garn/login.
- **Største risiko:** Reset-password etablerer session manuelt fra hash/search-params (reset-password/page.tsx:18-47) parallelt med onAuthStateChange-subscription — dobbelt-state-write kan give race i nogle browsere. Ingen synlig rate-limit på password-reset; Supabase håndterer det internt, men confirmér.
- **Quick-win:** Erstat inline-styles på alle 3 sider med Tailwind-tokens fra tailwind.config.ts for konsistens. Tilføj aria-live-region til fejlmeddelelser.
- **Issues:**
  - app/auth/reset-password/page.tsx:23-36 — manuel hash/search-token-parsing duplikerer Supabase SDK-logik; fragilt på tværs af email-klienter
  - app/auth/reset-password/page.tsx:66 — err: any uden kommentar — brud på TypeScript-konvention
  - app/auth/callback/route.ts:37-39 — isIdentityConflict er en heuristik på Supabase-error-strings; bryder hvis Supabase ændrer ordlyd
  - app/login/page.tsx:40-45 — bruger localStorage-husk uden eksplicit samtykke; nævn det i privatlivspolitik (det gør den ikke pt.)
  - app/login/page.tsx:53-54 — engelsk fejl-fallback "Invalid login credentials"; viser ellers err.message rå
  - app/signup/page.tsx:38-44 — min-længde 6 tegn er for kort til en data-følsom app i 2026; brug 8+

### app/garnlager/
- **Status:** 🟡 Fungerer, men risikabel kode-størrelse
- **Hvad:** Personligt garnlager med CRUD, søgning, filtre, status-tracking, "Brugt op"-flow med projekt-kobling, barcode-scan (slået fra), katalog-opslag. Page (page.tsx) er kun en LoginGate-wrapper; al logik i components/app/Garnlager.jsx (1615 linjer).
- **Største risiko:** Datakritisk kode på 1615 linjer som utyped .jsx-fil. Hjertet i tillidskontrakten med brugerne. En off-by-one i toDb/fromDb-mappers kan forvride brugerens garnlager uden type-vagter. RLS beskytter mod cross-user-læk (verificeret i supabase/migrations/20260419000001_rls_yarn_items_and_usage.sql), men ikke mod tab.
- **Quick-win:** Konvertér Garnlager.jsx til .tsx og tilføj minimumstyper på EMPTY_FORM og DB-mappers. Selv delvis migration sænker risiko.
- **Issues:**
  - components/app/Garnlager.jsx — hele filen er .jsx; ingen typer på garn-formularen
  - components/app/Garnlager.jsx:52 — STASH_FILTERS_KEY i localStorage uden user-namespace; hvis to brugere deler enhed deler de filterstate
  - components/app/Garnlager.jsx:56 — SHOW_SCANNER = false — feature-flag i kode; OK midlertidigt men dokumentér i BACKLOG
  - components/app/Garnlager.jsx:71-85 — EMPTY_FORM blander snake_case og camelCase; let at glemme et felt

### app/projekter/
- **Status:** 🟡 Fungerer, samme størrelses-risiko som garnlager
- **Hvad:** Projekt-arkiv med billeder, PDF-thumbnails, garn-allokering, statusstyring, deling til Fællesskabet. Page er LoginGate-wrapper; al logik i components/app/Arkiv.jsx (3013 linjer).
- **Største risiko:** 3013 linjer utyped JSX. Allocations- og finalize-logik (allocateYarnToProject, applyAllocationDelta, finalizeYarnLines, revertCascadedYarns) opererer på brugerens lager — en bug her kan vekselvirke mellem lager og projekt forkert og efterlade inkonsistent state. Mappers fromUsageDb/toUsageDb har ingen typer.
- **Quick-win:** Skriv mindst én vitest-test pr. allocate/finalize/revert-funktion før launch.
- **Issues:**
  - components/app/Arkiv.jsx — hele filen er .jsx
  - components/app/Arkiv.jsx:42-46 — PROJECT_FIELDS er en hardkodet komma-streng; let at glemme et felt og få stille mismatch med skema
  - components/app/Arkiv.jsx:51-54 — safeExt-fallback er "bin" — kan ende som filendelse i Supabase Storage; bekræft Storage-policies tillader kun whitelistede mime-typer

### app/garn/ (CRUD + admin)
- **Status:** ✅ Komplet
- **Hvad:** Offentligt garn-katalog (app/garn/page.tsx), detaljeside ([slug]), editor-admin under /garn/admin. Editor-gating via isEditorEmail på server-side + redirect i page-filer.
- **Største risiko:** isEditorEmail er kun e-mail-baseret klient-side check; RLS på yarns-tabel har egen security-definer-funktion (supabase/migrations/20260427000002_is_editor_security_definer.sql — godt). Ingen umiddelbar risiko.
- **Quick-win:** Tilføj metadata.robots: noindex til /garn/admin/* så admin-sider ikke indekseres.
- **Issues:**
  - app/garn/login/page.tsx:14-17 — host-baseret canonical-fallback til maskerummet.vercel.app; vil bryde når custom domæne tilføjes
  - app/garn/[slug]/page.tsx:75-79 — fetchAllYarns henter hele tabellen for hver detaljeside; ved 500+ garn bliver det dyrt — refactor til kun related-yarns
  - app/garn/admin/page.tsx:13-21 — uautoriseret bruger får tekst-side, ikke redirect; konsekvent design ville være redirect eller 403

### app/privatlivspolitik/
- **Status:** ✅ Komplet og compliance-klar
- **Hvad:** Dataansvarlig (Hannah Kamstrup Wermuth), data-typer, cookies, tredjeparter (Supabase, Google Fonts), GDPR-rettigheder, kontakt-flow til sletning.
- **Største risiko:** Nævner ikke localStorage-husk af email (striq-email i login/page.tsx:10,57) eller striq.garnlager.filters.v1. Dokumentation skal matche faktisk tracking.
- **Quick-win:** Tilføj ét bullet om "lokale browser-præferencer (filtre, husket e-mail)" under Cookies-sektionen.
- **Issues:**
  - app/privatlivspolitik/page.tsx:44-46 — påstår "kun en session-cookie fra Supabase Auth" — faktisk bruges også localStorage til UI-state; ikke teknisk ulovligt, men inkonsistent

## B. Store/komplekse features

### app/find-forhandler/
- **Status:** ✅ Komplet, ingen auth-krav (verificeret: page.tsx:15-21 SSR uden auth-check)
- **Hvad:** SSR henter stores/retailers/brands; client (FindForhandlerClient.tsx, 675 linjer) håndterer geocoding via Nominatim, IP-fallback via ipapi.co, kort via dynamic DanmarksKortClient (245 linjer Leaflet). Online-forhandler-liste og strikkecaféer-genvej.
- **Største risiko:** Tredjeparts-afhængigheder (Nominatim, ipapi.co) uden fallback ved nedetid eller rate-limit (FindForhandlerClient.tsx:103-122). En kort outage på ipapi.co rammer "min placering"-flow. Vil ikke crashe (try/catch er på plads), men er en blød failure.
- **Quick-win:** Tilføj aria-busy til søge-formularen mens loading=true og synligt fejl-banner ved IP-fallback.
- **Issues:**
  - app/find-forhandler/FindForhandlerClient.tsx:111 — ipapi.co har gratis rate-limit på 1000 req/dag pr. IP; kan ramme produktion
  - app/find-forhandler/FindForhandlerClient.tsx:103 — Nominatim usage policy kræver kontakt-email i User-Agent; ikke sat
  - app/find-forhandler/varianter/page.tsx — admin-design-eksplorations-side med robots: noindex,nofollow; bør slettes eller flyttes til /admin før launch

### app/kalender/
- **Status:** 🟡 Fungerer, men ikke skalerbar
- **Hvad:** Statisk events-kalender med hard-coded EVENTS-array i én 752-linjers fil (app/kalender/page.tsx). Type-filtre, måned-gruppering, ikon-bibliotek inline.
- **Største risiko:** Hardkodet event-data i page-filen. Hannah skal manuelt redigere app/kalender/page.tsx:184+ for hvert event-tilføj/fjern. Forbi-events ryddes manuelt. Skalerer ikke ud over Hannah.
- **Quick-win:** Flyt EVENTS til content/kalender.json eller en Supabase-tabel; behold UI. Mindre påtrængende: del filen i EVENTS-data og KalenderUI-komponent.
- **Issues:**
  - app/kalender/page.tsx:184+ — 400+ linjer rå event-data; refactor før der tilføjes mere
  - app/kalender/page.tsx:14-146 — 12 SVG-ikoner inline; flyt til components/icons/

### app/faellesskabet/
- **Status:** ✅ Komplet, RLS verificeret
- **Hvad:** Offentlig liste af delte projekter; SSR via fetchSharedProjects og public_shared_projects-view (page.tsx). Klient (378 linjer) gør filtre på type/garn/opskrift og modal-detalje.
- **Største risiko:** Læk-risiko er afværget i supabase/migrations/20260421000001_community_sharing.sql:100-118 ved kolonne-level GRANT der eksplicit udelader notes og pattern_pdf_url. Views har security_invoker = true. Korrekt design.
- **Quick-win:** Tilføj metadata.openGraph på app/faellesskabet/page.tsx så delte projekter får share-previews på sociale medier.
- **Issues:**
  - app/faellesskabet/FaellesskabClient.tsx:33-35 — setTimeout(..., 0) til focus-return ved modal-luk; brug useEffect med triggerRef i stedet, undgår glitch

### app/strikkecafeer/
- **Status:** ✅ Komplet
- **Hvad:** Server-side rendret liste over strikkecaféer grupperet pr. postnr-region (page.tsx:23-24: dynamic = force-dynamic, fetchCache = force-no-store, robots: noindex — light beskyttelse mod scraping). Klient (510 linjer) gør gruppering + interaktivt kort.
- **Største risiko:** "Light beskyttelse" er præcis hvad det er — ingen reel access-control. Forventet, dokumenteret i kommentar.
- **Quick-win:** Tilføj Cache-Control: private, no-store eksplicit i headers.ts (ikke kun via Next.js implicit) for klarhed.
- **Issues:**
  - app/strikkecafeer/StrikkecafeerClient.tsx:7 — import type fra ../find-forhandler/DanmarksKortClient — cross-feature import; flyt typen til lib/types.ts eller delt components/

### app/opskrifter/
- **Status:** 🟡 Fungerer, indhold er det knappe led
- **Hvad:** SSR-page henter DROPS-katalog (loadRecipes()) og brugerens gemte favoritter (fetchSavedRecipes). DropsKatalog-komponent gør søgning/filtre.
- **Største risiko:** fetchSavedRecipes har catch {} som fanger fejl stille (page.tsx:51-53); brugeren ser bare ingen favoritter uden besked. Acceptabelt for read-only browsing, men marker som warning.
- **Quick-win:** Tilføj toast/banner hvis savedRecipes-fetch fejler så brugeren ved hvorfor deres stjerner mangler.
- **Issues:**
  - app/opskrifter/page.tsx:51-53 — silent catch — log gerne via Sentry eller console.warn

## C. Mindre features

### app/admin/barcode-forslag/
- **Status:** ✅ Komplet
- **Hvad:** Editor-moderation af bruger-indsendte EAN-til-garn-koblinger. Hard-gating via isEditorEmail på server-side (page.tsx:16-17).
- **Issues:** Ingen blokerende.

### app/om-striq/
- **Status:** ✅ Komplet
- **Hvad:** Manifest, værdier, baggrundshistorie, FAQ-modal med 2 spørgsmål.
- **Issues:**
  - app/om-striq/page.tsx:280 — /brand/hannah.jpg.JPEG — dobbelt-extension i filnavn; konsolidér til én .jpg eller .jpeg

### app/faq/
- **Status:** 🟡 Indhold er den variable del
- **Hvad:** Læser content/faq/index.da.json og rendrer via FaqClient. Separat fra /garn/faq som læser content/faq.da.md med react-markdown — to forskellige FAQ-systemer.
- **Issues:**
  - To uafhængige FAQ-systemer (app/faq/ JSON-baseret, app/garn/faq/page.tsx markdown-baseret) — konsolidér eller dokumentér forskellen klart

### app/ideer/
- **Status:** 🔴 Intern Kanban med data-læk
- **Hvad:** Drag-drop Kanban-board over backlog-ideer; kun læseadgang for ikke-admins; admins kan redigere.
- **Største risiko:** ADMIN_EMAILS array (page.tsx:7) er hard-coded i klient-bundle med 3 e-mailadresser. Læk af interne adresser. RLS på ideas-tabellen burde være sandhedskilden; klient-checks er kosmetik.
- **Quick-win:** Fjern siden fra prod-build (flyt til /admin/*) eller flyt ADMIN_EMAILS til en server-side check (server component med isEditorEmail).
- **Issues:**
  - app/ideer/page.tsx:7 — ADMIN_EMAILS med 3 e-mailadresser lækket i klient-bundle
  - app/ideer/page.tsx:117 — useEffect med tom dependency-array men bruger isAdmin og user.id — manglende eslint-disable, kan give stale closure
  - app/ideer/page.tsx:185 — dark mode-only theme (#1A2620) på en ellers lys app — inkonsistent

### app/kontakt-status/
- **Status:** 🔴 Intern admin-side med samme læk
- **Hvad:** Tracking af henvendelser til garnfabrikanter/designere. Data ligger i lib/data/kontaktStatus.ts og redigeres manuelt.
- **Største risiko:** Samme ADMIN_EMAILS-læk som /ideer (page.tsx:16). Mindre data, men samme problem. Hele siden er intern dashboard der ikke hører hjemme i prod-flowet.
- **Quick-win:** Flyt til app/admin/kontakt-status/ for navnegruppering med øvrige admin-sider, og brug isEditorEmail server-side.
- **Issues:**
  - app/kontakt-status/page.tsx:16 — ADMIN_EMAILS med 2 e-mailadresser i klient-bundle

### app/strikkeskolen/
- **Status:** 🔴 Placeholder "Kommer snart"
- **Hvad:** Statisk side med "vi bygger..."-besked + 5 planlagte temaer + link til FAQ.
- **Største risiko:** Linket fra navigation? Hvis ja: dårligt 1. indtryk for testbrugere.
- **Quick-win:** Skjul siden fra navigation indtil indhold er der; behold ruten for direkte links.
- **Issues:** Ingen kode-issues; produkt-issue.

### app/visualizer/
- **Status:** 🟡 Fungerer
- **Hvad:** AI-farve-visualisering. Page-side håndterer auth-status og overgiver til YarnVisualizer-komponent. Ikke-loggede brugere får hero med "log ind for at prøve det selv"-link; selve YarnVisualizer rendres uanset login-status.
- **Største risiko:** YarnVisualizer accepterer user: User | null og onRequestLogin (page.tsx:89) — komponenten antages at håndtere gating internt. Skal verificeres at AI-endpoint bagved kræver auth server-side, ikke kun klient-gate. En unauthenticated bruger må ikke kunne kalde dyre AI-modeller direkte.
- **Quick-win:** Verificér at API-routes for visualizer kræver authenticated user via server-client.
- **Issues:** Skal verificeres separat i komponent-/API-review.

### Øvrige top-level pages
- **app/page.tsx (forside)** ✅ — Feature-kort grid, "under udvikling"-banner med kontakt-CTA. OK.
- **app/layout.tsx** — Ikke læst i denne fase; antaget OK fra eksisterende setup.
- **app/garn/auth/callback/route.ts** ✅ — Separat editor-callback eksisterer som forventet.
- **app/garn/faq/page.tsx** 🟡 — Læser content/faq.da.md; duplikerer system med /faq.
- **app/garn/layout.tsx** ✅ — Simpel max-width wrapper, OK.

## Samlet liste over fil:linje-issues (prioriteret)

### Blokerende før launch
1. app/ideer/page.tsx:7 — ADMIN_EMAILS hard-coded i klient-bundle, læk af interne e-mails
2. app/kontakt-status/page.tsx:16 — samme problem som ovenfor
3. components/app/Garnlager.jsx + components/app/Arkiv.jsx — 4628 linjer datakritisk kode uden TypeScript-typer; minimumskrav før launch: tilføj vitest-tests for allocate/finalize-funktioner og DB-mappers
4. app/privatlivspolitik/page.tsx:44-46 — påstand om "kun session-cookies" matcher ikke faktisk localStorage-brug; juridisk korrektion nødvendig
5. app/visualizer/page.tsx:89 — verificér at server-side API-route bag YarnVisualizer kræver auth (route-fil ikke læst i denne fase)

### Skal fixes
6. app/auth/reset-password/page.tsx:23-36 — manuel hash/token-parsing fragilt; brug Supabase officielle exchange-flow konsekvent
7. app/auth/reset-password/page.tsx:66 — err: any uden begrundelses-kommentar
8. app/signup/page.tsx:38 — password-min 6 tegn er for lavt for en data-følsom app
9. app/find-forhandler/FindForhandlerClient.tsx:103 — Nominatim brug uden kontakt-email i User-Agent (kan blive blokeret af Nominatim usage policy)
10. app/find-forhandler/FindForhandlerClient.tsx:111 — ipapi.co rate-limit-risiko ved skalering
11. app/kalender/page.tsx:184+ — flyt event-data ud af page-fil til content/JSON eller Supabase-tabel
12. app/find-forhandler/varianter/page.tsx — slet eller flyt til admin-segment før launch
13. app/garn/[slug]/page.tsx:75-79 — fetchAllYarns ineffektiv; refactor til kun related-yarns
14. app/garn/admin/page.tsx:13-21 — inkonsistent unauthorized-håndtering (tekst vs. redirect)
15. app/strikkeskolen/page.tsx — skjul fra navigation indtil indhold leveres
16. app/opskrifter/page.tsx:51-53 — silent catch på saved-recipes-fetch — log gerne

### Nice-to-have
17. app/om-striq/page.tsx:280 — hannah.jpg.JPEG dobbelt-extension
18. app/garn/login/page.tsx:14-17 — host-baseret canonical-fallback skal opdateres når custom domæne tilføjes
19. app/faq/ + app/garn/faq/ — konsolidér to FAQ-systemer
20. app/strikkecafeer/StrikkecafeerClient.tsx:7 — cross-feature type-import; flyt til delt lib/types.ts
21. app/auth/callback/route.ts:37-39 — isIdentityConflict afhænger af Supabase fejlstrings; spørg om Supabase har stabil error-kode
22. app/login/page.tsx:54 — engelsk fejl-fallback "Invalid login credentials" oversæt eller normalisér
23. app/faellesskabet/FaellesskabClient.tsx:33-35 — setTimeout(0) til focus-return; brug useEffect-cleanup-pattern
24. app/kalender/page.tsx:14-146 — flyt 12 inline-SVG-ikoner til components/icons/
25. app/login/page.tsx:10,57 — striq-email localStorage-nøgle skal dokumenteres i privatlivspolitik (linker til #4)
