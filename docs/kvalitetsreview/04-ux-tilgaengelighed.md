# Fase 4 — UX, tilgængelighed, dansk copy

**Kørt:** 2026-05-12 (manuelt — baggrundsagent var hængt efter ~4t)
**Metode:** Gennemlæsning af privatlivspolitik, auth-flow, top-10 komponenter; greps efter `dark:`, `aria-label`, localStorage, loading-states, tomme tilstande. Krydsrefereret med Fase 5's allerede grundige UX-fund.

## Sammenfatning

Dansk copy er konsistent og venlig på de side jeg har set; ingen engelske rester i kerne-flow. Tillids-signaler er **næsten** på plads (privatlivspolitik er omfattende, GDPR-rettigheder beskrevet), men har en **GDPR-blokerende cookie-tekst-fejl** og mangler en in-app data-eksport-knap. Dark mode er **ikke implementeret** (kun 2 `dark:`-forekomster i hele projektet, begge i en irrelevant Logoer-mappe — det er OK iflg. CLAUDE.md hvis vi ikke lover det). Største a11y-bekymring er den lave forekomst af `aria-label` (kun 7 i komponenter) men det skal verificeres manuelt om mange knapper har tekst i stedet.

## 🔴 Blokerende før testbruger-launch

- **[GDPR/Tillid]** Privatlivspolitik vs. faktisk localStorage-brug — `app/privatlivspolitik/page.tsx:44-45` påstår "STRIQ bruger kun en session-cookie fra Supabase Auth … Vi bruger ingen analytics, ingen tredjeparts-tracking og ingen reklame-cookies." Men faktisk localStorage-brug er bevist:
  - `app/login/page.tsx:40,57` — gemmer email under `striq-email` for "husk email"
  - `components/app/Garnlager.jsx:387,405` — gemmer filter-tilstand under `STASH_FILTERS_KEY`
  
  localStorage er teknisk ikke en cookie, men under GDPR's bredere definition af "tracking-mekanisme" eller "lokal lagring af identifiers" er en e-mailadresse i localStorage en personoplysning. Fix: opdater teksten til at omtale begge: "session-cookie fra Supabase Auth samt lokal lagring (localStorage) i din browser for at huske din e-mail og dine filterindstillinger." Eller fjern email-huske-funktionen og dermed forenkle compliance.

- **[Tillid/GDPR]** Manglende in-app data-eksport-knap — `app/privatlivspolitik/page.tsx:65-78` lover GDPR-rettighed til dataportabilitet, men der er **ingen knap** i app'en der gør det. Bruger skal sende email til kontakt@striq.dk. Compliance-mæssigt OK, men forventningen for moderne apps er en in-app "Download mine data"-knap. **Quick-fix**: tilføj knap i indstillinger der dumper bruger-yarn_items + projects + yarn_usage til JSON.

- **[Tillid/GDPR]** Manglende in-app slet-konto-knap — `app/privatlivspolitik/page.tsx:58-61` lover sletning ved henvendelse. Samme bemærkning: forventet at brugeren selv kan starte sletning. Less-urgent end data-eksport, men flag det.

(Yderligere blokerende fra Fase 5 vedrører UX: admin-email-lækage i klient-bundle (`app/ideer/page.tsx:7`, `app/kontakt-status/page.tsx:16`) er primært sikkerhed men også et tillids-issue hvis brugere finder det.)

## 🟡 Bør fixes inden launch

- **[A11y]** Lav `aria-label`-forekomst — kun 7 forekomster i 5 komponent-filer. Mange ikon-knapper i de utyped JSX-filer (`Garnlager.jsx`, `Arkiv.jsx`, `BarcodeScanner.jsx`) skal manuelt verificeres. **Action**: stikprøve 10 ikon-knapper på tværs af garnlager + projekter + kalender og sikre aria-label på alle.

- **[A11y]** Inline styles overalt — `app/privatlivspolitik/page.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`, `app/auth/reset-password/page.tsx` bruger CSS-in-JS via `style={...}` i stedet for Tailwind-klasser. Konsekvenser:
  - **`:focus`/`:hover`/`:focus-visible`** kan ikke sættes via inline styles (kun via pseudo-selectors i klasser) → tab-navigation er sandsynligvis svag på auth-siderne.
  - Dark mode kan aldrig retro-fittes på inline-styled komponenter uden refactor.
  - Konsistens-risiko (samme farve hardcoded mange steder — `#61846D`, `#8C7E74`, `#F9F6F0` er gentaget i 4+ filer).
  
  **Action**: før launch, sikr at auth-siderne har tastatur-fokus-ringe. Efter launch: migrer til Tailwind.

- **[UX]** Loading-states — kun 26 `Indlæser|Henter|Loading`-forekomster på tværs af 10 filer. Mange features har sandsynligvis stille perioder hvor brugeren ikke ved om appen arbejder. **Action**: stikprøve kerne-flow (åbn garnlager, åbn projekter, scan stregkode) og verificer feedback. Test især på langsom netforbindelse.

- **[UX]** Tomme tilstande — kun 2 eksplicitte `if (!data || length === 0)`-patterns fundet (i `YarnVisualizer.jsx` og `FiberBar.tsx`). Manglende tomme tilstande betyder at en ny bruger med tomt garnlager kan se en blank side. **Action**: verificer at `/garnlager`, `/projekter`, `/ideer`, `/opskrifter`, `/faellesskabet` alle har en bruger-venlig empty-state med call-to-action ("Tilføj dit første garn" osv.). Garnlager- og Projekter-siderne er begge i `.jsx` så kan ikke type-checkes.

- **[Mobile]** Auth-siderne har `width: 380` på kortet — `app/login/page.tsx:70`, `signup/page.tsx:92`, `auth/reset-password/page.tsx:77`. På telefoner < 380px (iPhone SE: 375px portrait) vil kortet overflow. `maxWidth: '100%'` ER sat så det burde være OK, men `padding: '48px 40px'` i kombination kan give cramped UX. **Action**: test ved 375px viewport-bredde.

- **[Copy]** "Indtast din email-adresse" + e-mail/email-inkonsistens — `app/login/page.tsx:176` bruger "email-adresse" mens øvrige bruger "E-mail" som label. Triviel inkonsistens.

## 🟢 Bør fixes efter launch / vedligeholdelse

- **[Visual]** Inline-styles forhindrer system-tema (light/dark/sepia) tilpasning. Konvertér efter launch.
- **[A11y]** Verificer kontrastniveauer i farvepaletten — `#8C7E74` på `#FFFCF7` har contrast ratio ~2.8:1, under WCAG AA (4.5:1) for normal tekst. Hvis brugt på små labels OK (mindre vigtigt), men hvis brugt på krop-tekst er det et issue. Stikprøve af to filer viser brug som "hint-tekst" — sandsynligvis acceptabel.
- **[I18n]** Hardcoded danske copy-strings spredt i kode — kan ikke nemt oversættes. Lav i18n-plan efter launch hvis internationalisering bliver aktuel.
- **[Onboarding]** Ingen synlig onboarding-flow for ny bruger. CLAUDE.md kalder dem "ikke-tekniske" — overvej en kort introduktion ved første login.

## ✅ Hvad er solidt

- **Privatlivspolitik er omfattende** — `app/privatlivspolitik/page.tsx` dækker dataansvarlig, dataindsamling, formål, cookies (med fejlen ovenfor), tredjeparter, opbevaring/sletning, GDPR-rettigheder, klage-henvisning til Datatilsynet. Bedre end mange danske SaaS-apps.
- **Dansk copy er konsistent** i auth-flow og indstillinger — venlig tone, korte sætninger, handlingsorienterede knapper ("Log ind", "Opret konto", "Gem ny adgangskode").
- **Bruger-venlige fejlbeskeder** i auth-flow — fx `app/login/page.tsx:54` mapper Supabase-fejlen "Invalid login credentials" til "Forkert e-mail eller adgangskode." Ikke teknisk jargon.
- **Form-felter har eksplicitte `<label>`-elementer** — verificeret i auth-siderne. `autoComplete`-attributter ("email", "current-password", "new-password") er korrekt sat → browser-password-managers virker.
- **Footer/links til privatlivspolitik** synlig fra signup — `app/signup/page.tsx:143-146`.
- **Loading-states findes hvor de er kritiske** — fx `app/auth/reset-password/page.tsx:80-86` viser "Verificerer nulstillings-link / Venligst vent..." mens session etableres.
- **Dark mode IKKE halv-implementeret** — kun 2 `dark:`-forekomster i hele projektet, og begge i en irrelevant Logoer-mappe (kan slettes). CLAUDE.md siger "halv-implementeret dark mode er værre end ingen" — vi har **ingen** dark mode, hvilket er konsistent og OK.

## Detaljer

### Privatlivspolitik-analyse
Indhold dækker (`app/privatlivspolitik/page.tsx`):
- ✅ Dataansvarlig med email
- ✅ Hvilke data indsamles (konto, garnlager, projekter, stemmer)
- ✅ Hvorfor (kun for at levere tjenesten, ikke salg)
- ⚠️ Cookies/tracking — påstand om "kun session-cookie" matcher ikke localStorage-brug
- ✅ Tredjeparter (Supabase, Google Fonts) med links
- ✅ Opbevaring og sletning (manuel email til kontakt)
- ✅ GDPR-rettigheder med klage-henvisning til Datatilsynet
- ✅ Ændrings-procedure
- ⚠️ Senest opdateret: april 2026 (vi er nu maj — overvej at opdatere dato samtidig med cookie-fix)

### localStorage-brug (matchede privatlivspolitik?)
| Fil | Nøgle | Indhold | Beskrevet i privatlivspolitik? |
|---|---|---|---|
| `app/login/page.tsx:40,57` | `striq-email` | Brugerens email | ❌ Nej |
| `components/app/Garnlager.jsx:387,405` | `STASH_FILTERS_KEY` | Filter-state | ❌ Nej |

### Dark mode
Total `dark:`-forekomster: **2** (begge i `Logoer/Creme_logo_med_hvid_tråd_files/main.tsx`, irrelevant fil — flagget til sletning i Fase 1). Konklusion: **0 dark mode i app-koden**. Status: bevidst fravalg ✅.

### aria-label-forekomster
Komponenter med aria-label: 5 (Nav.tsx ×3, HeroIllustration ×1, ScanFraKatalogButton ×1, YarnHeroImage ×1, BrugNoeglerModal ×1) — total 7. Mange ikon-knapper i de utyped JSX-filer kan mangle aria-label. Manuel verifikation anbefales.

### Loading/tomme-tilstande-coverage (heuristisk)
- Loading-text-strings ("Indlæser", "Henter", "Loading"): 26 forekomster i 10 filer
- Empty-state-pattern (`if (!data || length === 0)`): 2 forekomster i 2 filer (en del flere bruger sandsynligvis andre patterns som `data?.length > 0 && ...` — manuel stikprøve anbefales)

### Inline-styles fordeling
Stikprøve af kritiske sider med 100% inline-styles (ingen Tailwind):
- `app/privatlivspolitik/page.tsx` — alle styles inline
- `app/login/page.tsx` — alle styles inline
- `app/signup/page.tsx` — alle styles inline
- `app/auth/reset-password/page.tsx` — alle styles inline

Disse er ALLE auth/tillids-flows. Risiko: tab-navigation kan være svag (ingen `:focus-visible` kan sættes inline).
