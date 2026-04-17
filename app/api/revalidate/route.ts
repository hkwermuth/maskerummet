import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isEditorEmail } from '@/lib/editors'

export async function POST(request: Request) {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')

  if (secret && process.env.REVALIDATE_SECRET && secret === process.env.REVALIDATE_SECRET) {
    // Godkendt via secret
  } else {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isEditorEmail(user.email)) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const paths = url.searchParams.getAll('path')
  for (const p of paths.length > 0 ? paths : ['/garn']) {
    revalidatePath(p)
  }
  return NextResponse.json({ revalidated: true, paths })
}
