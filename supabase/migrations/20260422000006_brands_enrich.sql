-- Brands: idempotent tilføjelse af updated_at-kolonnen.
--
-- Historisk: en tidligere version af 20260422000001_brands.sql oprettede en
-- BEFORE UPDATE-trigger der refererer kolonnen "updated_at". Hvis den
-- migration blev kørt mod en DB hvor brands-tabellen allerede fandtes uden
-- updated_at, blev trigger'en oprettet mod en manglende kolonne. Denne
-- migration tilføjer kolonnen idempotent.
--
-- Migration 20260422000001 er nu opdateret så den selv opretter updated_at
-- korrekt på fresh DB. Denne migration bliver dermed en no-op på fresh DB,
-- men nødvendig på eksisterende DB'er hvor den gamle migration 1 allerede er
-- kørt.
--
-- Idempotent. Sikkert at køre gentagne gange.

begin;

alter table if exists public.brands
  add column if not exists updated_at timestamptz not null default now();

commit;
