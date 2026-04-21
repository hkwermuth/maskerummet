#!/usr/bin/env node
/**
 * Generer SQL-migration fra webshop-candidates.json.
 * Output: supabase/migrations/20260422000013_seed_physical_webshops.sql
 */

import fs from 'node:fs'

const cands = JSON.parse(fs.readFileSync('scripts/tmp/webshop-candidates-filtered.json', 'utf8'))

function slugify(raw) {
  return raw
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/é/g, 'e')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40)
}

// Escape single quotes for SQL
function sq(s) { return String(s).replace(/'/g, "''") }

// Deduplikér på URL (nogle store-navne matcher samme URL)
const byUrl = new Map()
for (const c of cands) {
  const url = c.url.replace(/\/$/, '')
  if (!byUrl.has(url)) {
    byUrl.set(url, {
      url,
      slug: slugify(c.store.name),
      navn: c.store.name.replace(/\s*ApS\s*$/i, '').trim(),
      stores: [c.store],
    })
  } else {
    byUrl.get(url).stores.push(c.store)
  }
}

// Sikr unikke slugs
const usedSlugs = new Set()
for (const r of byUrl.values()) {
  let s = r.slug
  let n = 2
  while (usedSlugs.has(s)) s = r.slug + '-' + n++
  r.slug = s
  usedSlugs.add(s)
}

const retailers = [...byUrl.values()]
console.log(`Unikke retailers: ${retailers.length}`)

const lines = []
lines.push('-- Seed: opret online_retailers fra domain-crawl af 211 fysiske butikker.')
lines.push('--')
lines.push('-- Kandidater fundet via scripts/find-webshops.mjs (HTTP GET + webshop-signal-')
lines.push('-- detektion i HTML). Tre false positives er filtreret fra (begravelses-,')
lines.push('-- fest- og soul-wool-matches). 88 verificerede webshops.')
lines.push('--')
lines.push('-- For hver: upsert online_retailer, link stores, propagér brand-tags.')
lines.push('-- Hvis slug kolliderer med eksisterende online_retailer (fx gavstrikken)')
lines.push('-- ignoreres insert og stores linkes til eksisterende række.')
lines.push('--')
lines.push('-- Rydder også \"garn-kompagniet\" fra online_retailers — bruger-rapporteret')
lines.push('-- at det kun er en fysisk butik uden webshop.')
lines.push('')
lines.push('begin;')
lines.push('')
lines.push('-- Fjern garn-kompagniet (kun fysisk, ikke webshop)')
lines.push("delete from public.online_retailers where slug = 'garn-kompagniet';")
lines.push('')
lines.push('-- Upsert webshop-kandidater')
lines.push('insert into public.online_retailers (slug, navn, url, land, leverer_til_dk, sidst_tjekket) values')
const rows = retailers.map(r => `  ('${sq(r.slug)}', '${sq(r.navn)}', '${sq(r.url)}', 'DK', true, current_date)`)
lines.push(rows.join(',\n'))
lines.push('on conflict (slug) do nothing;')
lines.push('')
lines.push('-- Link stores til online_retailers (exact navn-match)')
lines.push('-- Først via eksakt match af online_retailers.navn = stores.name eller stores.name like "navn%"')
lines.push('update public.stores s')
lines.push('set online_retailer_id = orl.id')
lines.push('from public.online_retailers orl')
lines.push('where s.online_retailer_id is null')
lines.push("  and (lower(s.name) = lower(orl.navn)")
lines.push("       or lower(s.name) = lower(orl.navn) || ' aps'")
lines.push("       or lower(s.name) = lower(orl.navn) || ' i/s'")
lines.push('  );')
lines.push('')
lines.push('-- Specifikke mappings for navne der ikke matcher direkte')
retailers.forEach(r => {
  r.stores.forEach(s => {
    lines.push(`update public.stores set online_retailer_id = (select id from public.online_retailers where slug = '${sq(r.slug)}') where id = '${s.id}' and online_retailer_id is null;`)
  })
})
lines.push('')
lines.push('-- Propagér brand-tags fra store_brands til retailer_brands')
lines.push('insert into public.retailer_brands (retailer_id, brand_id)')
lines.push('select distinct s.online_retailer_id, sb.brand_id')
lines.push('from public.stores s')
lines.push('join public.store_brands sb on sb.store_id = s.id')
lines.push('where s.online_retailer_id is not null')
lines.push('on conflict (retailer_id, brand_id) do nothing;')
lines.push('')
lines.push('commit;')

const sql = lines.join('\n') + '\n'
fs.writeFileSync('supabase/migrations/20260422000013_seed_physical_webshops.sql', sql)
console.log('Skrev migration: supabase/migrations/20260422000013_seed_physical_webshops.sql')
