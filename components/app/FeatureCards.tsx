'use client'

import Link from 'next/link'

type Feature = {
  href: string
  title: string
  desc: string
  accent: string
  icon: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  comingSoon?: boolean
}

export function FeatureCard({ href, title, desc, accent, icon, size = 'md', comingSoon = false }: Feature) {
  const pad = size === 'lg' ? '32px 28px 28px' : size === 'sm' ? '20px 18px 16px' : '24px 20px 20px'
  const iconBox = size === 'lg' ? 56 : size === 'sm' ? 38 : 44
  const titleSize = size === 'lg' ? 24 : size === 'sm' ? 17 : 19
  const descSize = size === 'lg' ? 14.5 : size === 'sm' ? 12.5 : 13
  const gap = size === 'lg' ? 14 : size === 'sm' ? 8 : 10

  // "Kommer snart"-varianten har dæmpet styling og en lille badge.
  // Klikbar fordi vi vil gerne fortælle brugeren at de kan kontakte os
  // hvis de er interesserede — men href kan pege på en kontakt-anker
  // eller en placeholder-side.
  const isComingSoon = comingSoon

  const cardContent = (
    <>
      <div style={{
        width: iconBox, height: iconBox, borderRadius: 10,
        background: '#F8F3EE',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        opacity: isComingSoon ? 0.7 : 1,
      }}>
        {icon}
      </div>
      {isComingSoon && (
        <span style={{
          display: 'inline-block',
          background: 'rgba(212, 173, 182, 0.25)',
          color: '#9B6272',
          fontSize: 11,
          fontWeight: 600,
          padding: '3px 10px',
          borderRadius: 16,
          letterSpacing: '.03em',
          alignSelf: 'flex-start',
        }}>
          Kommer snart
        </span>
      )}
      <h3 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: titleSize, fontWeight: 600,
        color: isComingSoon ? '#5C5048' : '#302218',
        margin: 0,
      }}>
        {title}
      </h3>
      <p style={{ fontSize: descSize, color: '#8C7E74', margin: 0, lineHeight: 1.55 }}>
        {desc}
      </p>
      {!isComingSoon && (
        <span style={{ fontSize: 12.5, color: '#9B6272', fontWeight: 500, marginTop: 'auto', paddingTop: 4 }}>
          Åbn &rarr;
        </span>
      )}
    </>
  )

  const baseStyle: React.CSSProperties = {
    background: isComingSoon ? '#FBF8F3' : '#FFFFFF',
    border: '1px solid #E5DDD9',
    borderLeft: `4px solid ${isComingSoon ? '#D4ADB6' : accent}`,
    borderRadius: '12px',
    padding: pad,
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'transform .15s, box-shadow .15s',
    boxShadow: '0 1px 4px rgba(48,34,24,.06)',
    fontFamily: "'DM Sans', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    gap,
    textDecoration: 'none',
    color: 'inherit',
    height: '100%',
  }

  return (
    <Link
      href={href}
      style={baseStyle}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = '0 8px 24px rgba(48,34,24,.11)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.transform = 'none'
        el.style.boxShadow = '0 1px 4px rgba(48,34,24,.06)'
      }}
    >
      {cardContent}
    </Link>
  )
}
