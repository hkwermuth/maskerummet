# Supabase migrations

Versioneret struktur for schema-ændringer. Migrations navngives `YYYYMMDDHHMMSS_kort_beskrivelse.sql` og køres i rækkefølge.

## Status

- Alle historiske SQL-filer er flyttet hertil fra `supabase/schema/` med sorterede timestamps. De er **ikke** kørt mod en fresh prod endnu — de blev oprindeligt kørt manuelt mod det eksisterende dev-projekt.
- Base-schema (tabellerne `yarn_items`, `yarn_usage`, `projects`, `brands`, `yarns`, `yarn_colors`, auth-schema, osv.) blev bygget via Supabase Studio UI — der findes **ingen** SQL-fil i git. Se "Bootstrap-gap" nedenfor.

## Bootstrap-gap (skal løses inden dev/prod split)

Før vi kan oprette en frisk prod-Supabase alene ud fra denne mappe, skal base-schemaet eksporteres fra dev:

```bash
# Fra dev-projektet — kræver supabase CLI + adgang
supabase db dump --schema public --data-only=false > supabase/migrations/00000000000000_base_schema.sql
```

Alternativt: kør `pg_dump --schema-only` direkte mod dev og ryd outputtet op så det kun indeholder offentlig schema.

## Rækkefølge (nuværende migrations)

1. `00000000000000_base_schema.sql` — SKAL OPRETTES (eksport fra dev)
2. `20260101000001_projects_and_usage_project_id.sql` — projects-tabel + project_id på yarn_usage
3. `20260101000002_projects_backfill_from_yarn_usage.sql` — backfill fra eksisterende data (NB: hvis prod er tom, kan backfillen enten springes over eller være no-op)
4. `20260101000003_stash_catalog_link.sql` — catalog_yarn_id + catalog_color_id på yarn_items
5. `20260101000004_yarn_items_catalog_image.sql` — catalog-billede på yarn_items
6. `20260101000005_substitution_community.sql` — community-votes/suggestions
7. `20260101000006_fix_permin_bella.sql` — data-fix (hvis katalog kopieres fra dev, er dette allerede anvendt — verificer)
8. `20260419000001_rls_yarn_items_and_usage.sql` — RLS på yarn_items + yarn_usage

Timestamps er rekonstrueret — præcis historisk dato kendes ikke. Nye migrations fremover: brug `date -u +%Y%m%d%H%M%S` eller `supabase migration new <name>` så tidsstemplerne er ægte.

## Data-kopi til prod (éngang, ved split)

Når prod-Supabase er oprettet og ovenstående migrations er kørt:

```bash
# Kopiér KUN delt katalog-data (ikke bruger-data).
# Ret $DEV_DB og $PROD_DB.
pg_dump "$DEV_DB" \
  --data-only \
  --table=public.brands \
  --table=public.yarns \
  --table=public.yarn_colors \
  --table=public.substitution_suggestions \
  --table=public.substitution_votes \
  | psql "$PROD_DB"
```

IKKE kopiér: `yarn_items`, `yarn_usage`, `projects`, `auth.users`.

## Fremtidig proces

- Nye schema-ændringer skrives kun som filer i denne mappe — aldrig direkte i Studio UI.
- Kør først mod dev, verificér, commit, kør derefter mod prod.
- Supabase CLI (`supabase db push` / `supabase migration new`) anbefales når vi er forbi MVP.
