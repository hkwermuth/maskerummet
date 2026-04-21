#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx), l.slice(idx + 1).replace(/^"|"$/g, '')]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const svc = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !svc || !anon) {
  console.error('Missing env vars')
  process.exit(1)
}

const admin = createClient(url, svc)
const anonClient = createClient(url, anon)

let pass = 0
let fail = 0

function check(name, cond, info = '') {
  if (cond) { console.log(`  PASS  ${name}${info ? ` — ${info}` : ''}`); pass++ }
  else { console.log(`  FAIL  ${name}${info ? ` — ${info}` : ''}`); fail++ }
}

console.log('Verifying onboarded_at migration + RLS\n')

// 1) Kolonne findes
const { data: cols, error: colErr } = await admin
  .rpc('pg_catalog.pg_type')
  .select()
  .limit(1)
  .then(() => ({ data: null, error: null }))
  .catch(() => ({ data: null, error: null }))

// Brug direct REST call til information_schema via service_role
const r = await fetch(`${url}/rest/v1/profiles?select=onboarded_at&limit=0`, {
  headers: { apikey: svc, Authorization: `Bearer ${svc}`, Prefer: 'count=exact' },
})
check('Kolonne onboarded_at eksponerer på profiles', r.ok, `HTTP ${r.status}`)

// 2) Service-role kan skrive (simulerer markOnboarded ved at hente en tilfældig user)
const { data: users, error: userErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 })
if (userErr || !users?.users?.length) {
  check('Kunne hente testbruger', false, userErr?.message || 'ingen brugere')
} else {
  const uid = users.users[0].id
  const { error: upErr } = await admin
    .from('profiles')
    .upsert({ id: uid, onboarded_at: new Date().toISOString() }, { onConflict: 'id' })
  check('Upsert onboarded_at som service_role', !upErr, upErr?.message)

  // 3) Læs onboarded_at som service_role
  const { data: prof, error: readErr } = await admin
    .from('profiles')
    .select('id,onboarded_at')
    .eq('id', uid)
    .maybeSingle()
  check('Læs onboarded_at som service_role',
    !readErr && prof?.onboarded_at, readErr?.message || `value=${prof?.onboarded_at ?? 'null'}`)

  // 4) Anon må IKKE se onboarded_at via GRANT
  const anonR = await fetch(`${url}/rest/v1/profiles?select=onboarded_at&id=eq.${uid}`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  })
  const body = await anonR.text()
  // Forventer enten 400 (column not granted) eller tom liste
  const blocked = !anonR.ok || body === '[]'
  check('Anon blokeret fra onboarded_at (kolonne-GRANT)', blocked, `HTTP ${anonR.status}, body: ${body.slice(0,80)}`)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
