import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')
  if (isNaN(year) || isNaN(month)) return NextResponse.json({})

  const scores = await prisma.monthlyScore.findMany({
    where: {
      year,
      month,
      ...(session.user.role !== 'ADMIN' ? { userId: session.user.id } : {}),
    },
    select: { userId: true, confirmedMinutes: true },
  })

  const result: Record<string, number | null> = {}
  for (const s of scores) {
    result[s.userId] = s.confirmedMinutes ?? null
  }
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, year, month, confirmedMinutes } = await req.json()
  if (!userId || !year || !month) {
    return NextResponse.json({ error: '缺少參數' }, { status: 400 })
  }

  await prisma.monthlyScore.upsert({
    where: { userId_year_month: { userId, year, month } },
    create: { userId, year, month, confirmedMinutes: confirmedMinutes ?? null },
    update: { confirmedMinutes: confirmedMinutes ?? null },
  })

  return NextResponse.json({ ok: true })
}
