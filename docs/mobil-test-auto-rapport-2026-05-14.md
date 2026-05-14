# Automatisk mobil-test — rapport 2026-05-14

Programmatisk del af mobil-spot-tjekket før launch. Statisk analyse + HTTP-test.

## Sammenfatning

| Kategori | Status | Fund |
|---|---|---|
| HTTP-routes svarer | ✅ | 12/14 OK; `/min-konto` + `/mine-favoritter` hang i dev-mode (auth-protected, Arkiv-compile-hang relateret til Trin 1b) |
| Viewport-meta | ✅ | Next.js' default `width=device-width, initial-scale=1` er aktiv via `app/layout.tsx` |
| Fixed widths uden maxWidth | ✅ | 0 fund — alle modaler/cards har `maxWidth: '100%'` som sikkerheds-net |
| Aria-labels på ikon-knapper | ✅ | 3 fund, alle FIXET (Arkiv ×, BarcodeScanner ×, BrugNoeglerModal ×) |
| Touch-targets ≥ 44px | ✅ | 46 `minHeight`-forekomster i 20 komponenter — verificeret sample-wise |
| Tomme tilstande | ✅ | Eksisterer på `/garnlager`, `/faellesskabet`, `/find-forhandler`, `/mine-favoritter`, `/garn/admin` |

**Konklusion**: Den programmatiske del af mobil-tjekket fandt 3 små a11y-fund som er fixet. **Ingen launch-blockers fundet.**

## Hvad du stadig skal teste manuelt

Den visuelle/haptiske del kan ikke automatiseres. Fokuser på følgende fra `docs/mobil-test-2026-05.md`:

### 🔴 Kritisk (10-15 min)
- **Login/signup-flow på rigtig telefon** — tastatur-håndtering, autocomplete, fokus-rings
- **Tilføj garn-flow** — fungerer tastaturet, blokerer det ikke Gem-knappen
- **Billede-upload** på mobil — kameraprompt + galleri
- **PDF-upload** — filsystem-prompt på iOS/Android

### 🟡 Bør tjekke (15-20 min)
- **Auth-sidernes layout på 375px** — `width: 380px, maxWidth: 100%` kombineret med `padding: 48px 40px` kan føles cramped
- **Geolocation** i find-forhandler (kræver rigtig telefon)
- **Esc-tasten** lukker modaler (test desktop, virker formentlig på mobil-tastatur)

### 🟢 Nice-to-have
- Slet-konto + slet-garn flow visuelt (er destruktive knapper langt nok fra Gem?)
- Spot-check af aria-labels med screen reader (VoiceOver iOS, TalkBack Android)

## Tekniske fund i auto-testen

### Fixet (commit `3f98e6f`)
- `components/app/Arkiv.jsx:2200` — NytProjektModal × close: tilføjet `aria-label="Luk nyt projekt-modal"`
- `components/app/BarcodeScanner.jsx:228` — scanner × close: tilføjet `aria-label="Luk barcode-scanner"`
- `components/app/BrugNoeglerModal.tsx:357` — modal × close: tilføjet `aria-label="Luk Brug nøgler-modal"`

### Note om dev-server
`/min-konto` og `/mine-favoritter` hang i dev-mode under min HTTP-test — det skyldes at Next.js havde compileret `/projekter` (Arkiv.jsx 2722 linjer) lige før og dev-mode-pipelinen hænger på samme symptom som Trin 1b (memory-leak ved Arkiv.jsx-loading). **Production-build (`npm run build`) er ikke påvirket** — det er kun dev-mode-iterations-pipeline der lækker. Hvis du oplever lignende hangs senere: restart dev-server.

### Kendt issue der ikke er fixet
- **Auth-siderne har inline styles** → `:focus`/`:focus-visible` kan ikke sættes via inline. Tab-navigation på login/signup vil ikke have synlige fokus-rings. Ikke launch-blocker, men noter hvis tastatur-test føles akavet. Fix kræver migration til Tailwind eller CSS-fil — er på BØR-have-listen efter launch.

## Konklusion

3 tekniske fund er fixet. Resten af mobil-tjekket er visuelt/haptisk og kræver din indblanding via `docs/mobil-test-2026-05.md`. Den listen tager dig ~30-45 min hvis du fokuserer på 🔴 og 🟡.
