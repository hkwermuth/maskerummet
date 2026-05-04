import fs from 'node:fs/promises'
import path from 'node:path'
import type { Metadata } from 'next'
import { FaqClient } from '@/components/app/FaqClient'

export const metadata: Metadata = {
  title: 'FAQ — STRIQ',
  description: 'Svar på de mest stillede spørgsmål om strik og garn.',
}

async function loadIndex() {
  const file = path.join(process.cwd(), 'content', 'faq', 'index.da.json')
  const raw = await fs.readFile(file, 'utf8')
  return JSON.parse(raw) as { slug: string; title: string }[]
}

export default async function FaqPage() {
  const questions = await loadIndex()
  return (
    <div style={{ background: 'transparent', padding: '26px 16px 60px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <FaqClient questions={questions} />
      </div>
    </div>
  )
}
