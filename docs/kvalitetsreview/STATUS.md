# Kvalitetsreview — kørselsstatus

**Startet:** 2026-05-12
**Scope:** Hele projektet
**Output-format:** Prioriteret rapport med fil:linje-referencer
**Dybde:** Statiske checks + manuel review af alle features (ingen browser-test)

## Faser

| # | Fase | Status | Fil |
|---|------|--------|-----|
| 1 | Statiske checks (lint, tsc, tests, grep) | ✅ færdig | `01-static.md` |
| 2 | Sikkerhed (RLS, GRANTs, auth, API) | ✅ færdig (manuelt — agent hængt) | `02-security.md` |
| 3 | Arkitektur og konventioner | ✅ færdig (manuelt — agent hængt) | `03-arkitektur.md` |
| 4 | UX, tilgængelighed, dansk copy | ✅ færdig (manuelt — agent hængt) | `04-ux-tilgaengelighed.md` |
| 5 | Feature-by-feature gennemgang | ✅ færdig | `05-features.md` |
| — | Aggregering til prioriteret hovedrapport | ✅ færdig | `00-rapport.md` |

**Legenda:** ⚪ venter · 🟡 i gang · ✅ færdig · ❌ fejlet

## Crash-resilience

Hvis sessionen crasher, kan reviewet genoptages ved at:
1. Tjekke denne fil for hvilke faser der allerede er færdige
2. Læse de eksisterende delrapporter (`01-static.md`, `02-security.md`, …)
3. Genstarte fra første fase der ikke har en delrapport
