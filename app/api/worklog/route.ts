import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { WORK_TYPE_POINTS } from '@/lib/scoring'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
  const targetUserId = searchParams.get('userId')

  const userId = session.user.role === 'ADMIN' && targetUserId
    ? targetUserId
    : session.user.id

  const dateFilter = year && month ? {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  } : null

  const logs = await prisma.workLog.findMany({
    where: { userId, ...(dateFilter ? { date: dateFilter } : {}) },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { date, workType, description, customPoints } = body

    if (!date || !workType) return NextResponse.json({ error: '缺少資料' }, { status: 400 })

    let points: number
    if (workType === 'E') {
      if (!customPoints || isNaN(parseInt(customPoints))) {
        return NextResponse.json({ error: '請輸入有效分數' }, { status: 400 })
      }
      points = parseInt(customPoints)
    } else {
      points = WORK_TYPE_POINTS[workType]
      if (points === undefined) return NextResponse.json({ error: '無效工作類型' }, { status: 400 })
    }

    const log = await prisma.workLog.create({
      data: {
        userId: session.user.id,
        date: new Date(date),
        workType: workType as any,
        description: description ?? null,
        points,
      },
    })

    return NextResponse.json(log)
  } catch (e: any) {
    console.error('POST /api/worklog error:', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
