'use client'

import { useEffect, useRef } from 'react'
import { PROJECT_TYPE_LABELS, type SharedProjectPublic } from '@/lib/types'
import { yarnDisplayLabel } from '@/lib/yarn-display'
import { useEscapeKey } from '@/lib/hooks/useEscapeKey'
import ImageCarousel from '@/components/app/ImageCarousel'

const AUTHOR_FALLBACK = 'Anonym strikker'

type Props = {
  project: SharedProjectPublic
  onClose: () => void
}

function normalizeHex(hex: string | null | undefined): string {
  if (!hex || typeof hex !== 'string') return '#E5DDD9'
  const trimmed = hex.trim()
  if (!trimmed) return '#E5DDD9'
  return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
}

export function SharedProjectDetailModal({ project, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const backRef = useRef<HTMLButtonElement | null>(null)

  const author = project.display_name?.trim() || AUTHOR_FALLBACK
  const typeLabel = project.project_type ? PROJECT_TYPE_LABELS[project.project_type] : null
  const images = project.project_image_urls ?? []
  const primaryIdx = project.community_primary_image_index ?? 0
  const initialIdx = primaryIdx >= 0 && primaryIdx < images.length ? primaryIdx : 0
  const coverUrl = project.pattern_pdf_thumbnail_url || project.pattern_cover_url || null
  const hasPatternInfo = !!(project.pattern_name || project.pattern_designer)

  useEscapeKey(true, onClose)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const root = dialogRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === root)) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    backRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-detail-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(44,32,24,.55)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        zIndex: 1300, overflowY: 'auto', padding: '0',
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          background: '#FFFCF7', width: '100%', maxWidth: 720,
          margin: '20px auto', borderRadius: 14,
          boxShadow: '0 24px 60px rgba(44,32,24,.25)',
          overflow: 'hidden', outline: 'none',
        }}
      >
        {/* Sticky tilbage-bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: '#FFFCF7', borderBottom: '1px solid #E5DDD9',
          padding: '8px 12px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <button
            ref={backRef}
            type="button"
            onClick={onClose}
            aria-label="Tilbage til Fællesskabet"
            style={{
              minHeight: 44, minWidth: 44, padding: '0 14px 0 10px',
              background: 'transparent', border: 'none',
              color: '#2C2018', fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, fontWeight: 500, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              borderRadius: 8,
            }}
            onFocus={e => { e.currentTarget.style.background = '#F4EFE6' }}
            onBlur={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>‹</span>
            <span>Tilbage til Fællesskabet</span>
          </button>
        </div>

        <div style={{ padding: '16px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Karrusel */}
          {images.length > 0 && (
            <ImageCarousel
              images={images}
              alt="Projektbillede"
              initialIndex={initialIdx}
            />
          )}
          {images.length === 0 && (
            <div style={{
              aspectRatio: '4 / 3', background: '#EDE7D8',
              borderRadius: 8, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 40, color: '#B0A090',
            }} aria-label="Ingen billeder">🧶</div>
          )}

          {/* Titel + meta */}
          <div>
            <h2 id="shared-detail-title" style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 24, fontWeight: 600, color: '#302218',
              margin: 0, lineHeight: 1.2,
            }}>
              {project.title || 'Unavngivet projekt'}
            </h2>
            <div style={{ fontSize: 13, color: '#8C7E74', marginTop: 4 }}>
              af {author}
            </div>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10,
            }}>
              {typeLabel && (
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 999,
                  background: '#F4EFE6', color: '#5A4228',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {typeLabel}
                </span>
              )}
              {project.community_size_shown && (
                <span style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 999,
                  background: '#EDE7D8', color: '#5A4228',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  str. {project.community_size_shown}
                </span>
              )}
            </div>
          </div>

          {/* Beskrivelse */}
          {project.community_description && (
            <p style={{
              fontSize: 14, color: '#3F352D', lineHeight: 1.6,
              margin: 0, whiteSpace: 'pre-wrap',
            }}>
              {project.community_description}
            </p>
          )}

          {/* Opskrift */}
          {(hasPatternInfo || coverUrl) && (
            <div style={{
              border: '1px solid #E5DDD9', borderRadius: 10,
              padding: 12, background: '#FFFCF7',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              {coverUrl && (
                <a
                  href={coverUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Åbn opskriftens forside i ny fane"
                  style={{ flexShrink: 0, display: 'block' }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt="Opskriftens forside"
                    style={{
                      width: 70, height: 90, objectFit: 'cover',
                      borderRadius: 6, border: '1px solid #E5DDD9',
                      display: 'block',
                    }}
                  />
                </a>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{
                  fontSize: 10, textTransform: 'uppercase',
                  letterSpacing: '.1em', color: '#8B7D6B',
                }}>
                  Opskrift
                </div>
                <div style={{
                  fontSize: 14, color: '#302218', fontWeight: 500,
                  fontFamily: "'Cormorant Garamond', serif",
                  marginTop: 2,
                }}>
                  {project.pattern_name || 'Uden navn'}
                </div>
                {project.pattern_designer && (
                  <div style={{ fontSize: 12.5, color: '#6B5D4F', marginTop: 2 }}>
                    af {project.pattern_designer}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Garn */}
          {project.yarns.length > 0 && (
            <div>
              <div style={{
                fontSize: 10, textTransform: 'uppercase',
                letterSpacing: '.1em', color: '#8B7D6B', marginBottom: 8,
              }}>
                Garn brugt
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {project.yarns.map(y => {
                  const label = yarnDisplayLabel(y.yarn_brand, y.yarn_name) || 'Garn'
                  const colorParts = [y.color_code, y.color_name].filter(Boolean).join(' ')
                  return (
                    <div key={y.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '6px 10px', borderRadius: 8,
                      background: '#F9F6F0', border: '1px solid #E5DDD9',
                    }}>
                      <span
                        aria-hidden="true"
                        style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: normalizeHex(y.hex_color),
                          border: '1px solid rgba(0,0,0,.10)',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 13, color: '#302218', fontWeight: 500,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {label}
                        </div>
                        {colorParts && (
                          <div style={{ fontSize: 11.5, color: '#6B5D4F' }}>
                            {colorParts}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SharedProjectDetailModal
