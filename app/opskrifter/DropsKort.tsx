'use client'

import { OPSKRIFTER_TOKENS as T } from '@/lib/opskrifter-tokens'
import type { Recipe } from '@/lib/types-recipes'

type Props = {
  recipe: Recipe
  isFavorite: boolean
  onToggleFavorite: () => void
}

function HjerteIkon({ fyldt }: { fyldt: boolean }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill={fyldt ? T.heart : 'none'}
      stroke={fyldt ? T.heart : T.textMuted}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

// Friendly DROPS-garn-label: 'BABY MERINO' → 'DROPS Baby Merino', 'KID-SILK' → 'DROPS Kid-Silk'
function dropsYarnLabel(key: string): string {
  const titled = key
    .toLowerCase()
    .split(/(\s|-)/) // bevar dash som separator
    .map((part) => (part === '-' || part === ' ' ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('')
  return `DROPS ${titled}`
}

export function DropsKort({ recipe, isFavorite, onToggleFavorite }: Props) {
  // Aggreger fiber-tags fra alle yarn-details (uden dubletter, sorteret)
  const fiberTags = Array.from(
    new Set(recipe.yarn_details.flatMap((y) => y.tags || [])),
  ).sort()

  return (
    <article
      style={{
        background: T.white,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 14px rgba(40,30,15,.06), 0 1px 2px rgba(40,30,15,.04)',
        position: 'relative',
      }}
    >
      {/* Hjerte-knap — over billede */}
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={isFavorite ? `Fjern ${recipe.name} fra favoritter` : `Gem ${recipe.name} som favorit`}
        aria-pressed={isFavorite}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: `${T.white}EE`,
          border: `1px solid ${T.border}`,
          borderRadius: '50%',
          width: 44,
          height: 44,
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 2,
          boxShadow: '0 1px 4px rgba(48,34,24,.08)',
          fontFamily: 'inherit',
        }}
      >
        <HjerteIkon fyldt={isFavorite} />
      </button>

      {/*
        Billede:
        - Native <img> — IKKE next/image. DROPS-licens kræver original ratio uden crop/transform.
        - width:100%; height:auto bevarer ratio.
        - DROPS DESIGN-badge bottom-left, hvid baggrund 92% opacity.
      */}
      <a
        href={recipe.pattern_url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Åbn ${recipe.name} hos ${recipe.designer}`}
        style={{
          position: 'relative',
          display: 'block',
          background: '#ECE6DA',
          lineHeight: 0,
        }}
      >
        <img
          src={recipe.image_url}
          alt={`${recipe.name} / ${recipe.designer} ${recipe.external_id} — foto: ${recipe.designer}`}
          loading="lazy"
          decoding="async"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        <span
          style={{
            position: 'absolute',
            left: 10,
            bottom: 10,
            background: 'rgba(255,255,255,.92)',
            color: T.text,
            fontSize: 11,
            letterSpacing: '.08em',
            textTransform: 'uppercase',
            padding: '4px 8px',
            borderRadius: 4,
            fontWeight: 700,
            boxShadow: '0 1px 2px rgba(0,0,0,.1)',
          }}
        >
          {recipe.designer}
        </span>
      </a>

      <div style={{ padding: '14px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'space-between' }}>
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              lineHeight: 1.3,
              color: T.text,
              fontFamily: "'Cormorant Garamond', serif",
            }}
          >
            {recipe.name}
          </h3>
          <span style={{ flexShrink: 0, fontSize: 12, color: T.textMuted, letterSpacing: '.04em' }}>
            DROPS {recipe.external_id}
          </span>
        </div>

        {/* Garn-chips (sand) + fiber-chips (grøn) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {recipe.yarns.map((y) => (
            <span
              key={`yarn-${y}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 11.5,
                padding: '4px 9px',
                borderRadius: 999,
                fontWeight: 500,
                letterSpacing: '.02em',
                background: T.chipYarnBg,
                color: T.chipYarnInk,
              }}
            >
              {dropsYarnLabel(y)}
            </span>
          ))}
          {fiberTags.map((tag) => (
            <span
              key={`fiber-${tag}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 11.5,
                padding: '4px 9px',
                borderRadius: 999,
                fontWeight: 500,
                letterSpacing: '.02em',
                background: T.chipFiberBg,
                color: T.chipFiberInk,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Pind-pille */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              padding: '3px 8px',
              borderRadius: 6,
              background: T.pillPindBg,
              color: T.pillPindInk,
              fontWeight: 600,
              letterSpacing: '.02em',
              fontFeatureSettings: '"tnum"',
            }}
          >
            Pind: {recipe.needle_size}
          </span>
        </div>

        {/* Klik-til-DROPS-knap — diskret lysegul, matcher pind-pillen */}
        <a
          href={recipe.pattern_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginTop: 'auto',
            display: 'inline-block',
            background: T.pillPindBg,
            color: T.pillPindInk,
            border: '1px solid transparent',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13.5,
            fontWeight: 600,
            textDecoration: 'none',
            textAlign: 'center',
            minHeight: 44,
            lineHeight: '24px',
            fontFamily: 'inherit',
          }}
        >
          Se opskrift hos {recipe.designer} ↗
        </a>
      </div>
    </article>
  )
}
