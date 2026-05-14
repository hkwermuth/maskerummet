# Mobil-spot-tjek — pre-launch 2026-05-19

**Formål:** Inden testbruger-launch skal kerne-flows verificeres på mobil-størrelser. Listen er prioriteret: gør 🔴 og 🟡 først.

**Estimat:** 1-2 timer hvis du går igennem alt. Hvis kort tid: gør kun 🔴.

---

## Sådan tester du

Dev-serveren kører på <http://localhost:3000>. Brug Chrome DevTools til mobil-simulering:

1. Åbn Chrome
2. Tryk **F12** (eller Cmd+Option+I på Mac) → DevTools åbnes
3. Tryk **Ctrl+Shift+M** (eller Cmd+Shift+M) → toggler device-emulator
4. Vælg viewport-størrelse i toolbar øverst:
   - **iPhone SE (375 × 667)** — det smalleste mål
   - **iPhone 12 Pro (390 × 844)** — typisk størrelse
   - **iPad Mini (768 × 1024)** — tablet-spot-tjek
5. Test også **portrait + landscape** ved at klikke rotate-ikonet

**Vigtigste viewport at fokusere på: 375px (iPhone SE)** — hvis layout holder her, holder det på resten.

---

## 🔴 Skal-tjekkes (kerne-flows for testbrugere)

### 1. Login / signup
- [ ] `/login` — layout holder på 375px, ingen overflow
- [ ] `/signup` — alle felter synlige, "Mindst 8 tegn"-placeholder vises
- [ ] Email-input får tastatur op (på rigtig telefon)
- [ ] Submit-knap er tappable (≥ 44px høj)
- [ ] Fejlbesked vises tydeligt ved forkert password
- [ ] "Glemt password" → reset-flow virker

### 2. Min konto (GDPR)
- [ ] `/min-konto` åbner og viser email + 2 sektioner (data-eksport + slet-konto)
- [ ] **Download mine data (JSON)** knap fungerer på mobil — fil downloades
- [ ] **Slet-konto-flow**: skriv "SLET" → er feltet tappable, vises fejl hvis tekst er forkert?
- [ ] OBS: prøv kun slet-flow på en test-bruger — IKKE din egen primære konto!

### 3. Garnlager — Tilføj garn (3 spor)
- [ ] `/garnlager` åbner
- [ ] Klik "+ Tilføj garn" → modal åbner, fylder skærmen pænt
- [ ] **Søg i garn-katalog**: skriv et mærke (fx "Drops") — autocomplete vises, kan tappes
- [ ] **Manuelt felt-flow**: udfyld Garnnavn + Mærke + antal — kan udfyldes uden tastaturet blokerer Gem-knappen
- [ ] Modal-luk-knap (× eller "Annuller") er tappable
- [ ] Esc-tasten lukker modal (test på desktop også — burde fungere)

### 4. Garnlager — Rediger + Slet
- [ ] Klik på et garnkort → edit-modal åbner
- [ ] Modal scroller hvis indhold er for langt (fx mange felter)
- [ ] **Slet-flow**: tap "Slet" → "Er du sikker?" + "Ja, slet" vises → tap virker
- [ ] Slet er ikke fat-finger-risiko (knappen er ikke for tæt på Gem)

### 5. Garnlager — Filtre + Tomt lager
- [ ] Filter-dropdown "Alle statusser" → "I brug" filtrerer korrekt
- [ ] Fiber-pills er tappable (≥ 44px)
- [ ] **Hvis lager er tomt**: tomt-tilstand vises ("Dit garnlager er tomt" + CTA)

### 6. Projekter (Arkiv)
- [ ] `/projekter` åbner, tabs (Vil gerne / I gang / Færdigstrikket) er tappable
- [ ] Klik "+ Nyt projekt" → modal åbner — statuschips + titel-input + garn-vælger
- [ ] Garn-tilkobling: klik "+ Tilføj garn" inde i projekt-modal — virker
- [ ] **Billede-upload**: tap "Upload billede" → kamera/galleri-prompt vises (iOS/Android)
- [ ] **PDF-upload**: tap "Upload PDF" → filsystem-prompt vises
- [ ] Klik på projekt → DetailModal åbner med "Rediger"-knap

### 7. Find forhandler
- [ ] `/find-forhandler` åbner
- [ ] Søgefelt "Indtast by" virker — autocomplete eller fri-tekst
- [ ] Resultat-liste er læsbar (ikke for cramped)
- [ ] "Find min position" — geolocation-prompt vises (på rigtig telefon)

---

## 🟡 Bør-tjekkes (sekundære flows)

### 8. Garn-katalog
- [ ] `/garn` åbner, søgefelt + filtre fungerer
- [ ] Klik på et garn → `/garn/[slug]` åbner, info er læsbar
- [ ] (Hvis "Ønsker mig"-knap findes på detalje-siden, virker den?)

### 9. Opskrifter (DROPS)
- [ ] `/opskrifter` åbner
- [ ] Filterbar er tappable (multi-select dropdowns virker)
- [ ] Opskrift-kort er læsbare, billeder loader

### 10. Fællesskabet
- [ ] `/faellesskabet` åbner
- [ ] **Hvis tom**: "Ingen projekter delt endnu" vises
- [ ] Projektkort er læsbare

### 11. Kalender
- [ ] `/kalender` åbner, events er læsbare
- [ ] Klik på event → detaljer vises pænt

### 12. Visualizer (Prøv garn)
- [ ] `/visualizer` åbner uden login (eksempler synlige?)
- [ ] Upload-zone er tappable
- [ ] Hvis du genererer: progress-state vises

---

## 🟢 A11y-stikprøve (touch-targets)

Disse er kun på mobil-størrelse, gå hurtigt igennem:

- [ ] Hovedmenu (hamburger eller bottom-nav): tappable
- [ ] **Ikon-knapper i Garnlager**: kameraknap, eksport-knap, slet-knap
- [ ] **Ikon-knapper i Arkiv**: × på modaler, billede-fjern, PDF-fjern
- [ ] **BarcodeScanner**: hvis aktiv, er kamera-frame stor nok?
- [ ] Tilbage-knap i browser virker korrekt (ingen mistede states)

---

## 📋 Sådan rapporterer du fund

For hvert fund noter:
- **Hvor**: URL eller skærm-navn
- **Hvad**: hvad gik galt (cropped, knap kan ikke tappes, tekst overlapper, etc.)
- **Viewport**: 375 / 390 / andet
- **Screenshot**: nyttigt hvis muligt

Læg listen i `docs/mobil-test-fund-2026-05.md` — så ved jeg hvad jeg skal fixe.

---

## ⚠️ Kendte issues (allerede dokumenteret)

- **Garnlager-tests OOM'er i Vitest** (Trin 1b) — påvirker ikke brugere, kun automatiserede tests
- **Auth-siderne har `width: 380px`** — kan være cramped på 375px viewport (iPhone SE). `maxWidth: '100%'` skulle dække det, men dobbelttjek
- **Inline styles på auth-siderne** → `:focus`-rings mangler (tab-navigation svag). Ikke launch-blocker, men noter hvis det føles akavet
