'use client'

import { LoginGate } from '@/components/app/LoginGate'
import YarnVisualizer from '@/components/app/YarnVisualizer'

export default function VisualizerPage() {
  return (
    <LoginGate
      title="Prøv farven med AI"
      desc="Upload et foto og se hvordan dit projekt ser ud i nye farver. Log ind for at komme i gang."
      icon={
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9B6272" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
          <path d="M19 3v4M17 5h4"/>
        </svg>
      }
    >
      {(user) => <YarnVisualizer user={user} onRequestLogin={() => {}} />}
    </LoginGate>
  )
}
