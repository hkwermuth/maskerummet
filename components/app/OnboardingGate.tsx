'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useSupabase } from '@/lib/supabase/client'
import { markOnboarded } from '@/lib/community'
import OnboardingModal from './OnboardingModal'

export function OnboardingGate() {
  const supabase = useSupabase()
  const [user, setUser] = useState<User | null>(null)
  const [shouldShow, setShouldShow] = useState(false)
  const [hasMarked, setHasMarked] = useState(false)

  useEffect(() => {
    let cancelled = false

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      setUser(data.user)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    if (!user || hasMarked) {
      setShouldShow(false)
      return
    }
    let cancelled = false
    supabase
      .from('profiles')
      .select('onboarded_at')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        // Fail-safe: ved DB/netværksfejl viser vi IKKE modalen (returnerende
        // brugere må aldrig få den igen ved transient fejl).
        if (error) return
        const onboarded = data && (data as { onboarded_at?: string | null }).onboarded_at
        if (!onboarded) setShouldShow(true)
      })
    return () => { cancelled = true }
  }, [supabase, user, hasMarked])

  function handleClose() {
    setShouldShow(false)
    setHasMarked(true)
    if (user) {
      void markOnboarded(supabase, user.id)
    }
  }

  if (!shouldShow) return null
  return <OnboardingModal onClose={handleClose} />
}

export default OnboardingGate
