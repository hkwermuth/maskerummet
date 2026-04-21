#!/usr/bin/env node
/**
 * Test at alle online_retailer.url'er svarer 200 OK.
 * Rapporterer fejlede links (4xx, 5xx, timeout, DNS-fejl).
 */
import fs from 'node:fs'

const retailers = JSON.parse(fs.readFileSync('scripts/tmp/retailers.json', 'utf8'))
const CONCURRENCY = 15
const TIMEOUT_MS = 10000

async function check(r) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(r.url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 striq-link-checker' },
    })
    const finalUrl = res.url
    return {
      slug: r.slug,
      navn: r.navn,
      url: r.url,
      status: res.status,
      ok: res.ok,
      finalUrl,
      redirected: finalUrl !== r.url,
    }
  } catch (e) {
    return {
      slug: r.slug,
      navn: r.navn,
      url: r.url,
      status: 0,
      ok: false,
      error: e.name === 'AbortError' ? 'timeout' : e.message,
    }
  } finally {
    clearTimeout(t)
  }
}

async function runInBatches(items, worker, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    const batch = items.slice(i, i + size)
    out.push(...await Promise.all(batch.map(worker)))
    process.stdout.write(`\r  ${Math.min(i + size, items.length)}/${items.length}  `)
  }
  console.log('')
  return out
}

console.log(`Testing ${retailers.length} retailer URLs...`)
const results = await runInBatches(retailers, check, CONCURRENCY)
const ok = results.filter(r => r.ok)
const broken = results.filter(r => !r.ok)
console.log(`\nOK: ${ok.length}  Broken: ${broken.length}`)
if (broken.length) {
  console.log('\n=== FEJLEDE LINKS ===')
  broken.forEach(r => {
    console.log(`  [${r.status || 'ERR'}] ${r.navn.padEnd(30)} ${r.url}  ${r.error ? '→ ' + r.error : ''}`)
  })
}
fs.writeFileSync('scripts/tmp/link-check-results.json', JSON.stringify(results, null, 2))
