#!/usr/bin/env node
/**
 * LLM-klassificer hvilke garn-mærker hver online_retailer fører.
 *
 * Flow:
 *  1. Hent alle online_retailers (id, slug, navn, url) + alle brands (slug, name)
 *  2. For hver webshop: fetch HTML, trim til tekst-uddrag
 *  3. Send til Claude Haiku: "Hvilke af disse 17 mærker nævnes?" → JSON-array af slugs
 *  4. Upsert findings i retailer_brands
 *  5. Rapport: nye koblinger pr. mærke
 *
 * Kræver miljøvariabel: ANTHROPIC_API_KEY
 * Kører via Supabase Management API (service-scope via SUPABASE_ACCESS_TOKEN).
 *
 * Cost-estimat: ~$2-4 total for 113 webshops (Haiku 4.5 @ ~5-10k tokens per
 * kald input + <500 tokens output).
 */

import fs from 'node:fs'

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
if (!ANTHROPIC_KEY) {
  console.error('Fejl: ANTHROPIC_API_KEY er ikke sat. Tilføj den til .env.local eller sæt via:')
  console.error('  export ANTHROPIC_API_KEY=sk-ant-...')
  process.exit(1)
}
const SUPABASE_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_85b462afe8eb5d207cd69109cd9b6e785be2b9b8'
const PROJECT_REF = 'bdxjhylopixuvncswfqj'

const CONCURRENCY = 2 // Lav for at undgå Anthropic-rate-limits
const FETCH_TIMEOUT_MS = 12000
const MODEL = 'claude-haiku-4-5-20251001'
const RETRY_ON_RATE_LIMIT = 3
const RATE_LIMIT_BACKOFF_MS = 30000 // 30s pause efter rate-limit
const ONLY_MISSING_BRANDS = process.env.ONLY_MISSING_BRANDS === '1'

// ── Supabase helpers ────────────────────────────────────────────────────────
async function sbQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SUPABASE_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) throw new Error(`Supabase: ${res.status} ${await res.text()}`)
  return res.json()
}

// ── Fetch + trim HTML ───────────────────────────────────────────────────────
async function fetchShopContent(url) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    if (!res.ok) return null
    const html = await res.text()
    // Strip scripts, styles, HTML tags → kun tekst
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    // Også saml navigation/menu links som hints om kategorier
    const navMatches = [...html.matchAll(/<a[^>]*href=[^>]*>([^<]{2,60})<\/a>/gi)]
      .map(m => m[1].trim())
      .filter(t => t.length > 2)
      .slice(0, 100)
    return {
      text: text.slice(0, 6000),
      navLinks: navMatches.join(' | ').slice(0, 2000),
    }
  } catch (e) {
    return null
  } finally {
    clearTimeout(t)
  }
}

// ── Claude classification ───────────────────────────────────────────────────
async function classifyBrands(retailer, content, brands) {
  const brandList = brands.map(b => `- ${b.slug}: "${b.name}"`).join('\n')
  const prompt = `Du analyserer en dansk garn-webshop og vurderer hvilke garn-mærker de forhandler.

WEBSHOP: ${retailer.navn}
URL: ${retailer.url}

NAVIGATION/LINKS FRA SIDEN:
${content.navLinks}

SIDEINDHOLD (uddrag):
${content.text}

KENDTE MÆRKER (slug: "officielt navn"):
${brandList}

Returnér KUN et JSON-array med slugs for mærker der tydeligt forhandles på denne webshop. Eksempel: ["drops","permin","isager"]
- Medtag KUN mærker du er sikker på baseret på navigationen eller sideindholdet
- Brand-navne kan optræde som kategorier, menu-items, produkt-sektioner
- Ved tvivl: udelad mærket
- Returnér tomt array [] hvis ingen tydelige mærker findes

Svar (kun JSON-array, ingen anden tekst):`

  let res
  for (let attempt = 0; attempt < RETRY_ON_RATE_LIMIT; attempt++) {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (res.ok) break
    if (res.status === 429 && attempt < RETRY_ON_RATE_LIMIT - 1) {
      const backoff = RATE_LIMIT_BACKOFF_MS * (attempt + 1)
      process.stdout.write(` [rate-limit, pauser ${backoff / 1000}s] `)
      await new Promise(r => setTimeout(r, backoff))
      continue
    }
    throw new Error(`Anthropic: ${res.status} ${await res.text()}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text?.trim() || '[]'
  try {
    const arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || text)
    const validSlugs = new Set(brands.map(b => b.slug))
    return arr.filter(s => validSlugs.has(s))
  } catch {
    console.error(`  Parse error for ${retailer.navn}:`, text.slice(0, 100))
    return []
  }
}

// ── Main ────────────────────────────────────────────────────────────────────
console.log('Henter retailers og brands fra Supabase...')
let retailerQuery = 'select id, slug, navn, url from online_retailers order by navn'
if (ONLY_MISSING_BRANDS) {
  // Retailers med færre end 3 brand-tags — dem der har kun arvet 1-2 fra stores
  retailerQuery = `
    select orl.id, orl.slug, orl.navn, orl.url
    from online_retailers orl
    where (select count(*) from retailer_brands rb where rb.retailer_id = orl.id) < 3
    order by orl.navn
  `
}
const [retailers, brands] = await Promise.all([
  sbQuery(retailerQuery),
  sbQuery('select id, slug, name from brands order by name'),
])
console.log(`Retailers: ${retailers.length}, brands: ${brands.length}${ONLY_MISSING_BRANDS ? ' (kun retailers med <3 brand-tags)' : ''}`)

const brandBySlug = new Map(brands.map(b => [b.slug, b]))
const results = []

async function processRetailer(retailer) {
  const content = await fetchShopContent(retailer.url)
  if (!content || content.text.length < 200) {
    return { retailer, brands: [], skipped: 'no-content' }
  }
  try {
    const slugs = await classifyBrands(retailer, content, brands)
    return { retailer, brands: slugs }
  } catch (e) {
    return { retailer, brands: [], error: e.message }
  }
}

async function runInBatches(items, worker, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size)
    const res = await Promise.all(batch.map(worker))
    out.push(...res)
    process.stdout.write(`\r  ${Math.min(i + size, items.length)}/${items.length}  `)
  }
  console.log('')
  return out
}

console.log('Klassificerer webshops parallelt...')
const classified = await runInBatches(retailers, processRetailer, CONCURRENCY)

// Report
const withBrands = classified.filter(r => r.brands.length > 0)
const skipped = classified.filter(r => r.skipped || r.error)
console.log(`\nKlassificeret: ${withBrands.length}, skipped/err: ${skipped.length}`)

// Byg SQL-migration
const sqlLines = []
sqlLines.push('-- LLM-klassificerede retailer_brands fra scripts/classify-retailer-brands.mjs')
sqlLines.push('-- Claude Haiku 4.5 analyserede hver webshops indhold og identificerede hvilke')
sqlLines.push('-- af de 17 kendte mærker der forhandles. Idempotent.')
sqlLines.push('')
sqlLines.push('begin;')
sqlLines.push('')
for (const r of withBrands) {
  for (const slug of r.brands) {
    sqlLines.push(`insert into public.retailer_brands (retailer_id, brand_id) select '${r.retailer.id}'::uuid, id from public.brands where slug='${slug}' on conflict (retailer_id, brand_id) do nothing;`)
  }
}
sqlLines.push('')
sqlLines.push('commit;')

const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const hhmm = new Date().toISOString().slice(11, 16).replace(':', '')
const migrationPath = `supabase/migrations/${date}${hhmm}00_llm_classify_retailer_brands.sql`
fs.writeFileSync(migrationPath, sqlLines.join('\n') + '\n')
console.log(`Migration skrevet: ${migrationPath}`)

// Detail-report
fs.writeFileSync('scripts/tmp/classify-report.json', JSON.stringify(classified, null, 2))
console.log('\nTop 5 retailers med flest mærker:')
withBrands
  .sort((a, b) => b.brands.length - a.brands.length)
  .slice(0, 5)
  .forEach(r => console.log(`  ${r.retailer.navn.padEnd(30)} ${r.brands.length} mærker: ${r.brands.join(', ')}`))

console.log('\nKør migration med: echo y | npx supabase db push --include-all')
