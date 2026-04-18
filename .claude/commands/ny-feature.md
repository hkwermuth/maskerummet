---
description: Kør fuld softwareproces for ny feature (arkitekt → token-opt → UX → implementering → test → review)
argument-hint: <beskrivelse af feature>
---

Du er orkester-lederen for udvikling af en ny feature i maskerummet. Bruger har netop bedt om:

**$ARGUMENTS**

Kør følgende flow. Forklar kort hvad du gør mellem hvert trin, men vær sparsom med ord.

## Fase 1 — Arkitektur
Kald `software-arkitekt`-agenten med feature-beskrivelsen. Agenten læser selv relevant kode.
Gem arkitektens output. Noter flaget "UI involveret: ja/nej".

## Fase 2 — Token-optimering
Kald `token-performance-ekspert` med arkitektens plan.
Noter hvilke agenter der skippes og model-tier for de resterende.

## Fase 3 — UX (betinget)
HVIS "UI involveret: ja" OG token-eksperten ikke har skippet ux-ekspert:
- Kald `ux-ekspert` med arkitektens plan + relevant UI-kontekst.
ELLERS: skip denne fase.

## Fase 4 — Menneske-gate
Præsentér for brugeren:
- Arkitektens plan (komprimeret — ikke hele outputtet)
- UX-krav (hvis relevant)
- Estimat
- Afklarende spørgsmål hvis nødvendigt

Spørg: **"Skal jeg implementere?"**

VENT på brugerens svar. Hvis scope ændres — gå tilbage til Fase 1.

## Fase 5 — Implementering
DU (hovedagenten) implementerer. Kald IKKE en sub-agent til dette — fil-konflikt-risiko.
Følg arkitektens plan og UX-kravene. Hold dig til acceptkriterierne.

## Fase 6 — Test
Kald `tester`-agenten med acceptkriterierne + de ændrede filer.
VENT på grøn rapport. Hvis rød — ret og kald igen.

## Fase 7 — Review
Kald `software-reviewer`-agenten med acceptkriterierne + tester-rapporten.
Hvis BLOKERENDE fund — ret dem og gå tilbage til Fase 6.
Hvis APPROVE — fortsæt.

## Fase 8 — Afslutning
Præsentér for brugeren:
- Kort rapport: hvad blev gjort, hvilke filer, hvilke tests, review-resultat
- Foreslået commit-besked (dansk, imperativ, én linje + valgfri krop)

SPØRG før commit. Commit aldrig uden eksplicit ja.

## Regler for orkestret

- Opdatér `BACKLOG.md` når featuren er færdig (flyt fra "I gang" → "Implementeret") hvis posten findes der.
- Gentag ikke kontekst til sub-agenter — de læser selv filerne.
- Hvis en fase fejler uventet — stop og spørg brugeren.
- Hovedagenten er eneste der Edit'er/Write'r kode. Sub-agenter producerer planer, specs, tests og reviews.
