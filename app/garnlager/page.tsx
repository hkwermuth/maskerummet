'use client'

import { LoginGate } from '@/components/app/LoginGate'
import Garnlager from '@/components/app/Garnlager'

export default function GarnlagerPage() {
  return (
    <LoginGate
      title="Mit garnlager"
      desc="Hold styr på hele dit garnlager — søg på farve, fiber og se hvad du har på lager. Log ind for at komme i gang."
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#61846D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="15" rx="9" ry="5"/>
          <path d="M3 10c0-2.8 4-5 9-5s9 2.2 9 5"/>
          <path d="M3 10v5M21 10v5"/>
          <circle cx="12" cy="10" r="1.2" fill="#61846D" stroke="none"/>
        </svg>
      }
    >
      {(user) => <Garnlager user={user} onRequestLogin={() => {}} />}
    </LoginGate>
  )
}
