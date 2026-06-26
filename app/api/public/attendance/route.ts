import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null

  if (!year || !month) return NextResponse.json({ error: '缺少年月' }, { status: 400 })

  const dateFilter = {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  }

  const [users, publish, holidays] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'EMPLOYEE', name: { not: { startsWith: 'Testing-' } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.schedulePublish.findUnique({ where: { year_month: { year, month } } }),
    prisma.holiday.findMany({
      where: { date: { gte: dateFilter.gte, lt: dateFilter.lt } },
      orderBy: { date: 'asc' },
    }),
  ])

  const isPublished = !!publish

  let assignments: { userId: string; date: string; shift: string }[] = []
  if (isPublished) {
    const rows = await prisma.shiftAssignment.findMany({
      where: { date: dateFilter },
      select: { userId: true, date: true, shift: true },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    })
    assignments = rows.map(r => ({ ...r, date: r.date.toISOString().slice(0, 10) }))
  }

  return NextResponse.json({
    users,
    assignments,
    holidays: holidays.map(h => ({ ...h, date: h.date.toISOString().slice(0, 10) })),
    isPublished,
  })
}
