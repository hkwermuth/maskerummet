-- Online retailers: webshops der sælger garn og leverer til Danmark.
--
-- Indeholder både rene online-aktører (Hobbii, YarnLiving) og fysiske butikker
-- der også har webshop. Overlap med public.stores (fysiske butikker) håndteres
-- via en FK stores.online_retailer_id (tilføjes i separat migration) — så en
-- butik med både fysisk+online tilstedeværelse kan vises på kortet OG i
-- online-sektionen uden dubletter i databasen.
--
-- RLS: offentlig SELECT. Ingen anon/authenticated writes — service_role skriver
-- via admin-scripts.

begin;

create table if not exists public.online_retailers (
  id              uuid        primary key default gen_random_uuid(),
  slug            citext      not null unique,
  navn            text        not null,
  url             text        not null,
  beskrivelse     text        null,
  land            text        not null default 'DK',
  leverer_til_dk  boolean     not null default true,
  sidst_tjekket   date        null,
  noter           text        null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists online_retailers_slug_idx on public.online_retailers (slug);
create index if not exists online_retailers_navn_idx on public.online_retailers (navn);
create index if not exists online_retailers_leverer_til_dk_idx on public.online_retailers (leverer_til_dk);

drop trigger if exists online_retailers_set_updated_at on public.online_retailers;
create trigger online_retailers_set_updated_at
  before update on public.online_retailers
  for each row execute function public.set_updated_at();

alter table public.online_retailers enable row level security;

drop policy if exists online_retailers_public_read on public.online_retailers;
create policy online_retailers_public_read
  on public.online_retailers for select
  to anon, authenticated
  using (true);

commit;
