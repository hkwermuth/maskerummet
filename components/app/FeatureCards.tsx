'use client'

import Link from 'next/link'

type Feature = {
  href: string
  title: string
  desc: string
  accent: string
  icon: React.ReactNode
}

export function FeatureCard({ href, title, desc, accent, icon }: Feature) {
  return (
    <Link
      href={href}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5DDD9',
        borderLeft: `4px solid ${accent}`,
        borderRadius: '12px',
        padding: '24px 20px 20px',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'transform .15s, box-shadow .15s',
        boxShadow: '0 1px 4px rgba(48,34,24,.06)',
        fontFamily: "'DM Sans', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        textDecoration: 'none',
        color: 'inherit',
      }}
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
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: '#F8F3EE',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 600, color: '#302218', margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: 13, color: '#8C7E74', margin: 0, lineHeight: 1.55 }}>
        {desc}
      </p>
      <span style={{ fontSize: 12.5, color: '#9B6272', fontWeight: 500, marginTop: 'auto', paddingTop: 4 }}>
        Åbn &rarr;
      </span>
    </Link>
  )
}
