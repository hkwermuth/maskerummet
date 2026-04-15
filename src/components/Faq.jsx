import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import index from '../../content/faq/index.da.json'

// Use root-based glob (Vite can be inconsistent with ".." segments in dev).
const questionMds = import.meta.glob('/content/faq/questions/*.da.md', {
  query: '?raw',
  import: 'default',
})

function pathToSlug(p) {
  const file = String(p).split('/').pop() ?? ''
  return file.replace(/\.da\.md$/i, '')
}

const slugToLoader = Object.fromEntries(
  Object.entries(questionMds).map(([p, loader]) => [pathToSlug(p), loader])
)

const containerStyle = {
  background: 'transparent',
  minHeight: 'calc(100vh - 60px)',
  padding: '26px 16px 60px',
  fontFamily: "'DM Sans', sans-serif",
}

const cardStyle = {
  maxWidth: 980,
  margin: '0 auto',
  background: '#FFFCF7',
  border: '1px solid #E8E0D4',
  borderRadius: 16,
  boxShadow: '0 1px 4px rgba(44,32,24,.06)',
}

const headerStyle = {
  padding: '22px 22px 0',
}

const titleStyle = {
  fontFamily: "'Cormorant Garamond', serif",
  fontSize: 30,
  fontWeight: 600,
  color: '#2C4A3E',
  margin: 0,
}

const introStyle = {
  margin: '8px 0 0',
  color: '#5A4E42',
  lineHeight: 1.6,
  fontSize: 14,
  maxWidth: 720,
}

const listStyle = {
  padding: '14px 10px 22px',
}

const itemButtonStyle = (active) => ({
  width: '100%',
  textAlign: 'left',
  background: active ? 'rgba(208,232,212,.6)' : 'transparent',
  border: '1px solid transparent',
  borderRadius: 12,
  padding: '12px 12px',
  cursor: 'pointer',
  transition: 'background .12s',
})

const itemTitleStyle = {
  margin: 0,
  fontSize: 14,
  color: '#2C2018',
  fontWeight: 600,
}

const itemMetaStyle = {
  margin: '4px 0 0',
  fontSize: 12,
  color: '#7A6E62',
}

const detailWrapStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) 320px',
  gap: 18,
  padding: '16px 22px 22px',
  borderTop: '1px solid #E8E0D4',
}

const backButtonStyle = {
  background: 'transparent',
  border: '1px solid #E8E0D4',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 12,
  cursor: 'pointer',
  color: '#2C4A3E',
}

export default function Faq() {
  const [activeSlug, setActiveSlug] = useState(null)
  const [md, setMd] = useState(null)
  const [loading, setLoading] = useState(false)

  const questions = useMemo(() => index, [])

  async function openQuestion(slug) {
    setActiveSlug(slug)
    setLoading(true)
    setMd(null)
    try {
      const loader = slugToLoader[slug]
      const content = loader ? await loader() : null
      setMd(content ?? '# Ikke fundet\n\nDenne side findes ikke endnu.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setMd(`# Kunne ikke indlæse\n\nDer skete en fejl, da indholdet skulle indlæses.\n\n\`\`\`\n${msg}\n\`\`\`\n`)
    } finally {
      setLoading(false)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeTitle = activeSlug
    ? questions.find((q) => q.slug === activeSlug)?.title ?? 'FAQ'
    : null

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <h1 style={titleStyle}>FAQ</h1>
          <p style={introStyle}>
            Vælg et spørgsmål for at åbne en uddybende side med forklaringer, links og illustrationer.
          </p>
        </div>

        {!activeSlug && (
          <div style={listStyle}>
            {questions.map((q, i) => (
              <button
                key={q.slug}
                style={itemButtonStyle(false)}
                onClick={() => openQuestion(q.slug)}
              >
                <p style={itemTitleStyle}>{q.title}</p>
                <p style={itemMetaStyle}>Spørgsmål {i + 1}</p>
              </button>
            ))}
          </div>
        )}

        {activeSlug && (
          <div style={detailWrapStyle}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <button style={backButtonStyle} onClick={() => setActiveSlug(null)}>
                  ← Tilbage til alle spørgsmål
                </button>
                <div style={{ fontSize: 12, color: '#7A6E62' }}>{activeTitle}</div>
              </div>

              {loading && <div style={{ color: '#7A6E62', fontSize: 13 }}>Indlæser…</div>}

              {!loading && md && (
                <div style={{ color: '#2C2018', lineHeight: 1.75, fontSize: 14 }}>
                  <ReactMarkdown
                    components={{
                      h1: (props) => (
                        <h2
                          {...props}
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 26,
                            fontWeight: 600,
                            color: '#2C4A3E',
                            margin: '0 0 10px',
                          }}
                        />
                      ),
                      h2: (props) => (
                        <h3
                          {...props}
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontSize: 18,
                            fontWeight: 600,
                            color: '#2C4A3E',
                            margin: '18px 0 8px',
                          }}
                        />
                      ),
                      a: ({ node, ...props }) => (
                        <a
                          {...props}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2C4A3E', textDecoration: 'underline' }}
                        />
                      ),
                      img: (props) => (
                        <img
                          {...props}
                          alt={props.alt ?? ''}
                          style={{
                            width: '100%',
                            borderRadius: 14,
                            border: '1px solid #E8E0D4',
                            background: '#FFF',
                            margin: '14px 0',
                          }}
                        />
                      ),
                      hr: (props) => (
                        <hr {...props} style={{ border: 0, borderTop: '1px solid #E8E0D4', margin: '18px 0' }} />
                      ),
                      ul: (props) => <ul {...props} style={{ paddingLeft: 18, margin: '8px 0' }} />,
                      li: (props) => <li {...props} style={{ margin: '6px 0' }} />,
                      p: (props) => <p {...props} style={{ margin: '10px 0' }} />,
                    }}
                  >
                    {md}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            <aside
              style={{
                alignSelf: 'start',
                position: 'sticky',
                top: 86,
                background: '#FFFFFF',
                border: '1px solid #E8E0D4',
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: '#7A6E62', marginBottom: 10 }}>
                Hurtige links
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {questions.slice(0, 6).map((q) => (
                  <button
                    key={q.slug}
                    onClick={() => openQuestion(q.slug)}
                    style={itemButtonStyle(q.slug === activeSlug)}
                  >
                    <p style={{ ...itemTitleStyle, fontWeight: 600, fontSize: 13 }}>{q.title}</p>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

