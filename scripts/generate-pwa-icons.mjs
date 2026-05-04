// Genererer PWA-ikoner ud fra striq-logoet:
// udtrækker Q + garnnøglet og centrerer det på sage-baggrund.
// Køres med: node scripts/generate-pwa-icons.mjs

import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const SOURCE = 'public/brand/striq-logo-creme-rosa-traad-3d-transparent.png' // 1017×321 — cream Q + rosé garnnøgle
const OUT_DIR = 'public/icons'
const BG_SAGE = { r: 97, g: 132, b: 109, alpha: 1 } // #61846D

// Bounding box for Q + garnnøgle + Q-krølle (kilde er 1017×321, vi tager hele
// højden så Q-halens nederste hook også kommer med):
const Q_CROP = { left: 712, top: 0, width: 300, height: 321 }

// Genbruges som kilde til alle størrelser
const Q_BUFFER = await sharp(SOURCE).extract(Q_CROP).png().toBuffer()

async function makeIcon(size, padding, outName) {
  const innerSize = Math.floor(size * (1 - padding * 2))
  // Resize bevarer aspect ratio — kilden er let højere end bred (300×321),
  // så outputtet bliver smalle sage-striber tv./th. men hele Q+krølle vises.
  const inner = await sharp(Q_BUFFER)
    .resize({
      width: innerSize,
      height: innerSize,
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG_SAGE },
  })
    .composite([{ input: inner, gravity: 'center' }])
    .png()
    .toFile(join(OUT_DIR, outName))

  console.log(`✓ ${outName} (${size}×${size}, pad ${Math.round(padding * 100)}%)`)
}

await mkdir(OUT_DIR, { recursive: true })
await makeIcon(192, 0.16, 'icon-192.png')
await makeIcon(512, 0.16, 'icon-512.png')
await makeIcon(512, 0.22, 'icon-512-maskable.png') // 80 % safe-zone for Android maskable
await makeIcon(180, 0.16, 'apple-touch-icon.png')  // iOS — opaque (sage-fill, ingen alpha)
