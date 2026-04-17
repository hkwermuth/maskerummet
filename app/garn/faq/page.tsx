import fs from 'node:fs/promises'
import path from 'node:path'
import ReactMarkdown from 'react-markdown'

export const metadata = {
  title: 'FAQ',
  description: 'FAQ med de mest stillede spørgsmål om strik og garn.',
}

async function loadFaqMarkdown() {
  const p = path.join(process.cwd(), 'content', 'faq.da.md')
  return await fs.readFile(p, 'utf8')
}

export default async function FaqPage() {
  const md = await loadFaqMarkdown()

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-striq-sage mb-3">FAQ</h1>
      <p className="text-sm text-striq-muted mb-6">
        De mest stillede spørgsmål om strik og garn – med korte svar og video-links.
      </p>
      <article className="prose prose-sm md:prose-base max-w-none prose-headings:font-serif prose-headings:text-striq-sage prose-a:text-striq-sage">
        <ReactMarkdown>{md}</ReactMarkdown>
      </article>
    </div>
  )
}
