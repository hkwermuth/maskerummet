#!/usr/bin/env node
/**
 * For hver fysisk butik uden koblet online_retailer:
 *  1. Generer kandidat-domains fra butikkens navn
 *  2. HTTP GET med timeout; hvis 200 OK, fetch HTML
 *  3. Detect webshop via typiske indikatorer (læg i kurv, Shopify/Woo, kr-priser)
 *  4. Skriv findings til scripts/tmp/webshop-candidates.json
 *
 * Læser scripts/tmp/stores-to-check.json (genereret særskilt).
 */

import fs from 'node:fs'

const stores = JSON.parse(fs.readFileSync('scripts/tmp/stores-to-check.json', 'utf8'))
const CONCURRENCY = 10
const TIMEOUT_MS = 8000

function slugify(raw) {
  return raw
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .replace(/é/g, 'e')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
}

function domainCandidates(storeName) {
  const s = slugify(storeName)
  const words = s.split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const cands = new Set()
  const joined = words.join('')
  const hyphened = words.join('-')
  cands.add(joined + '.dk')
  if (words.length > 1) cands.add(hyphened + '.dk')
  if (words[0].length >= 4) cands.add(words[0] + '.dk')
  cands.add(joined + 'garn.dk')
  if (!joined.endsWith('garn')) cands.add(joined.replace(/garn$/, '') + 'garn.dk')
  return [...cands].filter(d => d.length > 5 && d.length < 40 && !d.startsWith('.'))
}

const WEBSHOP_SIGNALS = [
  /add[-_ ]to[-_ ]cart/i,
  /læg[- ]i[- ]kurv/i,
  /tilføj[- ]til[- ]kurv/i,
  /lægikurv/i,
  /woocommerce/i,
  /shopify/i,
  /prestashop/i,
  /magento/i,
  /dandomain/i,
  /\/cart\b/i,
  /\/kurv\b/i,
  /\/checkout\b/i,
  /\/products?\//i,
  /\bkr\.?\s*[0-9]/i,
  /[0-9]+,[0-9]{2}\s*kr/i,
]

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, redirect: 'follow' })
  } finally {
    clearTimeout(t)
  }
}

async function testCandidate(domain) {
  for (const scheme of ['https://', 'http://']) {
    try {
      const url = scheme + domain
      const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0 striq-retailer-crawler' } })
      if (!res.ok) continue
      const html = await res.text()
      if (html.length < 200) continue
      const hits = WEBSHOP_SIGNALS.filter(rx => rx.test(html)).length
      // Brug titel som et ekstra signal om at siden ikke er en parking-page.
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
      const title = titleMatch ? titleMatch[1].trim() : ''
      // Skip typiske parking-/for-sale-sider
      if (/domain\s*(is\s*)?for\s*sale|dette\s*dom\u00e6ne/i.test(html)) continue
      if (hits >= 2) {
        return { url: res.url || url, title, signals: hits }
      }
    } catch {
      // ignorér
    }
  }
  return null
}

async function probe(store) {
  const cands = domainCandidates(store.name)
  for (const dom of cands) {
    const result = await testCandidate(dom)
    if (result) return { store, ...result, tried_domain: dom }
  }
  return null
}

async function runInBatches(items, worker, batchSize) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const settled = await Promise.all(batch.map(worker))
    results.push(...settled)
    process.stdout.write(`\r  ${Math.min(i + batchSize, items.length)}/${items.length}  `)
  }
  console.log('')
  return results
}

console.log(`Probing ${stores.length} butikker med op til ${CONCURRENCY} parallelle requests...`)
const results = await runInBatches(stores, probe, CONCURRENCY)
const hits = results.filter(Boolean)
console.log(`${hits.length} kandidater fundet.`)
fs.writeFileSync('scripts/tmp/webshop-candidates.json', JSON.stringify(hits, null, 2))
console.log('Skrevet til scripts/tmp/webshop-candidates.json')
hits.slice(0, 10).forEach(h => console.log(` - ${h.store.name} (${h.store.postcode}) → ${h.url} [signals=${h.signals}]`))
