import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (!year || !month) return NextResponse.json(null)

  if (session.user.role === 'ADMIN') {
    const submissions = await prisma.preferenceSubmission.findMany({ where: { year, month } })
    return NextResponse.json(submissions)
  }

  const submission = await prisma.preferenceSubmission.findUnique({
    where: { userId_year_month: { userId: session.user.id, year, month } },
  })
  return NextResponse.json(submission)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { year, month, preferences } = await req.json()
    if (!year || !month) return NextResponse.json({ error: '缺少資料' }, { status: 400 })

    const now = new Date()
    const monthStart = new Date(`${year}-${String(month).padStart(2, '0')}-01`)
    const monthEnd = month === 12
      ? new Date(`${year + 1}-01-01`)
      : new Date(`${year}-${String(month + 1).padStart(2, '0')}-01`)

    const submission = await prisma.$transaction(async (tx) => {
      await tx.shiftPreference.deleteMany({
        where: { userId: session.user.id, date: { gte: monthStart, lt: monthEnd } },
      })
      if (preferences && preferences.length > 0) {
        await tx.shiftPreference.createMany({
          data: preferences.map((p: { date: string; shift: string }) => ({
            userId: session.user.id,
            date: new Date(p.date),
            shift: p.shift,
          })),
        })
      }
      return tx.preferenceSubmission.upsert({
        where: { userId_year_month: { userId: session.user.id, year, month } },
        update: { submittedAt: now, confirmedAt: now },
        create: { userId: session.user.id, year, month, confirmedAt: now },
      })
    })

    return NextResponse.json(submission)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
