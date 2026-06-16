import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const SHIFT_TIMES: Record<string, { start: string; end: string; label: string }> = {
  A: { start: '010000', end: '060000', label: 'A班' },
  B: { start: '050000', end: '100000', label: 'B班' },
  C: { start: '010000', end: '100000', label: 'C班' },
}

export const GET = auth(async (req) => {
  if (!req.auth) return new Response('Unauthorized', { status: 401 })

  const url = new URL(req.url)
  const year = parseInt(url.searchParams.get('year') ?? '')
  const month = parseInt(url.searchParams.get('month') ?? '')

  if (!year || !month) return new Response('Bad Request', { status: 400 })

  const userId = req.auth.user.id

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

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//金鐘辦公室Bee報更系統//排班//ZH',
    'CALSCALE:GREGORIAN',
    events,
    'END:VCALENDAR',
  ].join('\r\n')

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="schedule-${year}-${String(month).padStart(2, '0')}.ics"`,
    },
  })
})
