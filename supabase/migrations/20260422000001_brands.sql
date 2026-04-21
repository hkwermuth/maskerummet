-- Brands: førsteklasses entitet for garn-mærker.
--
-- Tabellen findes i visse miljøer fra tidligere opsætning (pre-repo) — dén
-- version har kolonnerne (id, slug, name, origin, website, created_at).
-- Denne migration matcher dét skema så fresh-DB-init producerer samme
-- tilstand som eksisterende dev/prod, og tilføjer updated_at + trigger + RLS.
--
-- Feltkonvention: engelsk (name/origin/website) for kompatibilitet med den
-- eksisterende tabel og med `store_brands`-junction der også referer hertil.
-- Online-forhandlere (public.online_retailers) bruger danske feltnavne
-- (navn/url/land) — disse to tabeller er bevidst adskilt.
--
-- Idempotent. Kan køres igen uden bivirkninger.

begin;

create extension if not exists citext;

create table if not exists public.brands (
  id          uuid        primary key default gen_random_uuid(),
  slug        citext      not null unique,
  name        text        not null,
  origin      text        null,
  website     text        null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists brands_slug_idx on public.brands (slug);

-- Fælles updated_at-trigger-funktion (bruges også af online_retailers).
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

alter table public.brands enable row level security;

drop policy if exists brands_public_read on public.brands;
create policy brands_public_read
  on public.brands for select
  to anon, authenticated
  using (true);

commit;
