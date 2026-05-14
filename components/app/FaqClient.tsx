'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'

type FaqEntry = { slug: string; title: string }

const cardStyle: React.CSSProperties = {
  background: '#FFFCF7', border: '1px solid #E5DDD9',
  borderRadius: 16, boxShadow: '0 1px 4px rgba(48,34,24,.06)',
}

const itemBtnStyle = (active: boolean): React.CSSProperties => ({
  width: '100%', textAlign: 'left',
  background: active ? 'rgba(193,230,218,.6)' : 'transparent',
  border: '1px solid transparent', borderRadius: 12,
  padding: '12px', cursor: 'pointer', transition: 'background .12s',
})

export function FaqClient({ questions }: { questions: FaqEntry[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [md, setMd] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function openQuestion(slug: string) {
    setActiveSlug(slug)
    setLoading(true)
    setMd(null)
    try {
      const res = await fetch(`/api/faq/${slug}`)
      const text = res.ok ? await res.text() : '# Ikke fundet\n\nDenne side findes ikke endnu.'
      setMd(text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMd(`# Kunne ikke indlæse\n\n\`\`\`\n${msg}\n\`\`\`\n`)
    } finally {
      setLoading(false)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeTitle = activeSlug ? questions.find(q => q.slug === activeSlug)?.title : null

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={{ padding: '22px 22px 0' }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 30, fontWeight: 600, color: '#61846D', margin: 0 }}>
          FAQ
        </h1>
        <p style={{ margin: '8px 0 0', color: '#8C7E74', lineHeight: 1.6, fontSize: 14, maxWidth: 720 }}>
          Vælg et spørgsmål for at åbne en uddybende side med forklaringer, links og illustrationer.
        </p>
      </div>

      {/* Question list */}
      {!activeSlug && (
        <div style={{ padding: '14px 10px 22px' }}>
          {questions.map((q, i) => (
            <button key={q.slug} style={itemBtnStyle(false)} onClick={() => openQuestion(q.slug)}>
              <p style={{ margin: 0, fontSize: 14, color: '#302218', fontWeight: 600 }}>{q.title}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8C7E74' }}>Spørgsmål {i + 1}</p>
            </button>
          ))}
        </div>
      )}

      {/* Detail view */}
      {activeSlug && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 18, padding: '16px 22px 22px',
          borderTop: '1px solid #E5DDD9',
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <button
                onClick={() => setActiveSlug(null)}
                style={{ background: 'transparent', border: '1px solid #E5DDD9', borderRadius: 10, padding: '8px 10px', fontSize: 12, cursor: 'pointer', color: '#61846D' }}
              >
                ← Tilbage til alle spørgsmål
              </button>
              <div style={{ fontSize: 12, color: '#8C7E74' }}>{activeTitle}</div>
            </div>

            {loading && <div style={{ color: '#8C7E74', fontSize: 13 }}>Indlæser…</div>}

            {!loading && md && (
              <div style={{ color: '#302218', lineHeight: 1.75, fontSize: 14 }}>
                <ReactMarkdown
                  components={{
                    // node destructureres ud så det IKKE spreades videre til DOM-elementet
                    h1: ({ node: _node, ...props }) => (
                      <h2 {...props} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: '#61846D', margin: '0 0 10px' }} />
                    ),
                    h2: ({ node: _node, ...props }) => (
                      <h3 {...props} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 600, color: '#61846D', margin: '18px 0 8px' }} />
                    ),
                    a: ({ node: _node, ...props }) => (
                      <a {...props} target="_blank" rel="noopener noreferrer" style={{ color: '#9B6272', textDecoration: 'underline' }} />
                    ),
                    img: ({ node: _node, ...props }) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img {...props} alt={props.alt ?? ''} style={{ width: '100%', borderRadius: 14, border: '1px solid #E5DDD9', background: '#FFF', margin: '14px 0' }} />
                    ),
                    hr: ({ node: _node, ...props }) => (
                      <hr {...props} style={{ border: 0, borderTop: '1px solid #E5DDD9', margin: '18px 0' }} />
                    ),
                    ul: ({ node: _node, ...props }) => <ul {...props} style={{ paddingLeft: 18, margin: '8px 0' }} />,
                    li: ({ node: _node, ...props }) => <li {...props} style={{ margin: '6px 0' }} />,
                    p: ({ node: _node, ...props }) => <p {...props} style={{ margin: '10px 0' }} />,
                  }}
                >
                  {md}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside style={{
            alignSelf: 'start', position: 'sticky', top: 86,
            background: '#FFFFFF', border: '1px solid #E5DDD9',
            borderRadius: 14, padding: 14,
          }}>
            <div style={{ fontSize: 12, color: '#8C7E74', marginBottom: 10 }}>Hurtige links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {questions.slice(0, 6).map(q => (
                <button key={q.slug} onClick={() => openQuestion(q.slug)} style={itemBtnStyle(q.slug === activeSlug)}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#302218' }}>{q.title}</p>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
