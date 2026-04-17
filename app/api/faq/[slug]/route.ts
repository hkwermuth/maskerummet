import fs from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  // Sanitise slug — only allow alphanumeric + hyphen
  if (!/^[\w-]+$/.test(slug)) {
    return new NextResponse('Not found', { status: 404 })
  }
  const file = path.join(process.cwd(), 'content', 'faq', 'questions', `${slug}.da.md`)
  try {
    const md = await fs.readFile(file, 'utf8')
    return new NextResponse(md, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
