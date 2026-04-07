# Maskerummet — garn-katalog (Next.js)

Separat Next.js 15 + Tailwind app for det offentlige garn-katalog. Deployes som
eget Vercel-projekt og monteres under `maskerummet.vercel.app/garn/*` via
Vercel rewrites i hovedrepoets `vercel.json`.

## Kom i gang lokalt

```bash
cd garn-katalog
cp .env.local.example .env.local   # udfyld Supabase keys + EDITOR_EMAILS
npm install
npm run dev
```

Åbn http://localhost:3000/garn

## Struktur

- `app/page.tsx` — offentlig liste (SSG/ISR, revalidate 1t)
- `app/[slug]/page.tsx` — garn-detalje med JSON-LD `Product` schema
- `app/sitemap.ts` + `app/robots.ts` — SEO
- `app/login` + `app/auth/callback` — Supabase magic link
- `app/admin/*` — editor pages (kun for emails på `EDITOR_EMAILS`)
- `app/api/revalidate` — on-demand revalidate efter editor-ændringer
- `lib/supabase/{server,client,admin}.ts` — Supabase-klienter
- `lib/editors.ts` — email-allowlist + `ensureEditorRole`

## Editor-rolle

Email-allowlist via `EDITOR_EMAILS` env-var. Når en bruger logger ind kalder
`/auth/callback` automatisk `ensureEditorRole`, som bruger service-role nøglen
til at upserte `user_profiles.role = 'editor'`. Derefter matcher RLS' indbyggede
`is_editor()`-funktion og brugeren kan skrive til `yarns`,
`yarn_fiber_components`, `colors` direkte fra browseren.

## Deploy

1. Opret nyt Vercel-projekt med rod `garn-katalog/`.
2. Sæt env-vars (samme som `.env.local.example`).
3. Bemærk projektets deployment-URL — opdater `vercel.json` i repo-roden hvis den
   afviger fra `garn-maskerummet.vercel.app`.
4. Deploy også hovedrepoet (Vite-appen) så rewrites tager effekt.
