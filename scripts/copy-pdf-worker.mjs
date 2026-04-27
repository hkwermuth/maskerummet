// Kopiér pdfjs-dist worker til public/ så den kan loades fra /pdf.worker.min.mjs
// uden at være afhængig af bundler-specifik asset-handling. Køres via
// "postinstall" i package.json.

import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const SOURCE = join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs')
const TARGET_DIR = join(root, 'public')
const TARGET = join(TARGET_DIR, 'pdf.worker.min.mjs')

if (!existsSync(SOURCE)) {
  console.warn(`[copy-pdf-worker] Kilde ikke fundet (springer over): ${SOURCE}`)
  process.exit(0)
}

if (!existsSync(TARGET_DIR)) mkdirSync(TARGET_DIR, { recursive: true })
copyFileSync(SOURCE, TARGET)
console.log(`[copy-pdf-worker] Kopierede ${SOURCE} → ${TARGET}`)
