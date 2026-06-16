import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createHmac } from 'crypto'

function getSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
}

export function createExportToken(userId: string, year: number, month: number): string {
  const exp = Date.now() + 5 * 60 * 1000
  const payload = `${userId}:${year}:${month}:${exp}`
  const sig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  return Buffer.from(payload).toString('base64url') + '.' + sig
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!year || !month) return NextResponse.json({ error: 'Bad Request' }, { status: 400 })

  const token = createExportToken(session.user.id, year, month)
  return NextResponse.json({ token })
}
