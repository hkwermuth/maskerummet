---
description: Arbejd med backlog — synkronisér med Excel, prioriter mod milepæl, eller nedbryd en idé til feature
argument-hint: sync | prioriter <milepæl> | nedbryd <idé-titel> | status
---

Du driver backlog-arbejde for maskerummet. Bruger har skrevet:

**$ARGUMENTS**

Fortolk kommandoen og delegér til `backlog-styrer`-agenten:

- **Ingen argument eller "status"**: Kald backlog-styrer for hurtig status-rapport fra `BACKLOG.md`.
- **"sync"**: Kald backlog-styrer — den læser `STRIQ_ideer.xlsx`, scanner kodebasen, opdaterer `BACKLOG.md`.
- **"prioriter <milepæl>"**: Kald backlog-styrer med milepælen (default: "testbruger-launch") for prioriteret rapport.
- **"nedbryd <titel>"**: Kald backlog-styrer for at omsætte en idé til konkret feature-beskrivelse klar til `/ny-feature`.

## Efter agenten har leveret

Hvis backlog-styrer ender med et konkret næste skridt, foreslå brugeren det — typisk `/ny-feature <beskrivelse>`.

Opdatér `BACKLOG.md` hvis ændringer er aftalt med brugeren — aldrig uden bekræftelse.

## Regler

- `BACKLOG.md` er sandhed. Excel er kilde til ideer.
- Undgå at gentage backlog-styrerens fulde output — præsentér det komprimeret for brugeren, men GEM det fulde output til eventuel opfølgning.
