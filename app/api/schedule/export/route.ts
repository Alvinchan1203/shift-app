import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createHmac } from 'crypto'

function getSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ''
}

function verifyToken(token: string): { userId: string; year: number; month: number } | null {
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) return null
  const payloadB64 = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)
  const payload = Buffer.from(payloadB64, 'base64url').toString()
  const expectedSig = createHmac('sha256', getSecret()).update(payload).digest('base64url')
  if (sig !== expectedSig) return null
  const parts = payload.split(':')
  if (parts.length !== 4) return null
  const [userId, year, month, exp] = parts
  if (Date.now() > parseInt(exp)) return null
  return { userId, year: parseInt(year), month: parseInt(month) }
}

const SHIFT_TIMES: Record<string, { start: string; end: string; label: string }> = {
  A: { start: '010000', end: '060000', label: 'A班' },
  B: { start: '050000', end: '100000', label: 'B班' },
  C: { start: '010000', end: '100000', label: 'C班' },
}

async function buildICS(userId: string, year: number, month: number): Promise<string> {
  const assignments = await prisma.shiftAssignment.findMany({
    where: {
      userId,
      date: {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lt: new Date(Date.UTC(year, month, 1)),
      },
    },
    orderBy: { date: 'asc' },
  })

  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'

  const events = assignments.map(a => {
    const d = a.date
    const dateStr = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`
    const t = SHIFT_TIMES[a.shift]
    return [
      'BEGIN:VEVENT',
      `UID:shift-${dateStr}-${a.shift}-${userId}@shift-app`,
      `DTSTAMP:${now}`,
      `DTSTART:${dateStr}T${t.start}Z`,
      `DTEND:${dateStr}T${t.end}Z`,
      `SUMMARY:${t.label}`,
      'LOCATION:金鐘辦公室',
      'END:VEVENT',
    ].join('\r\n')
  }).join('\r\n')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//金鐘辦公室Bee報更系統//排班//ZH',
    'CALSCALE:GREGORIAN',
    events,
    'END:VCALENDAR',
  ].join('\r\n')
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  let userId: string
  let year: number
  let month: number

  if (token) {
    const verified = verifyToken(token)
    if (!verified) return new Response('Invalid or expired token', { status: 401 })
    ;({ userId, year, month } = verified)
  } else {
    const session = await auth()
    if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })
    userId = session.user.id
    year = parseInt(searchParams.get('year') ?? '')
    month = parseInt(searchParams.get('month') ?? '')
    if (!year || !month) return new Response('Bad Request', { status: 400 })
  }

  const ics = await buildICS(userId, year, month)

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="schedule-${year}-${String(month).padStart(2, '0')}.ics"`,
    },
  })
}
