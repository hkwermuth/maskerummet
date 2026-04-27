---
id: ee3ba33c
title: Migrations-versionering / kørsels-proces
status: naeste
priority: maa-have
project: striq
parent: null
estimate: null
created: '2026-04-26'
updated: '2026-04-26'
tags:
  - Infra / ops inden testbruger-launch
area: infra-ops
---
## Hvorfor
_(beskriv brugerværdien — hvorfor er denne opgave vigtig?)_

## Beskrivelse
migrations i `supabase/migrations/` køres ikke automatisk. Dokumentér proces ("før deploy: kør nye migrations manuelt i SQL Editor"), eller sæt Supabase CLI op så `supabase db push` virker. Uden dette risikerer vi gentagelser af "status-kolonne mangler"-fejlen. Del af task #13.
