import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { WORK_TYPE_POINTS } from '@/lib/scoring'

function serializeLog(l: any) {
  return {
    ...l,
    date: typeof l.date === 'string' ? l.date : l.date.toISOString(),
    createdAt: typeof l.createdAt === 'string' ? l.createdAt : l.createdAt.toISOString(),
    deletedAt: l.deletedAt ? (typeof l.deletedAt === 'string' ? l.deletedAt : l.deletedAt.toISOString()) : null,
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null
  const targetUserId = searchParams.get('userId')

  const dateFilter = year && month ? {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  } : null

  const isAdminAll = session.user.role === 'ADMIN' && !targetUserId

  if (isAdminAll) {
    const baseWhere = { ...(dateFilter ? { date: dateFilter } : {}) }
    const [active, deleted] = await Promise.all([
      prisma.workLog.findMany({
        where: { ...baseWhere, deletedAt: null },
        include: { user: { select: { name: true } } },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.workLog.findMany({
        where: { ...baseWhere, deletedAt: { not: null } },
        include: { user: { select: { name: true } } },
        orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
      }),
    ])
    return NextResponse.json({
      active: active.map(l => serializeLog({ ...l, userName: l.user.name })),
      deleted: deleted.map(l => serializeLog({ ...l, userName: l.user.name })),
    })
  }

  const userId = session.user.role === 'ADMIN' && targetUserId ? targetUserId : session.user.id
  const baseWhere = { userId, source: 'EMPLOYEE' as const, ...(dateFilter ? { date: dateFilter } : {}) }

  const [active, deleted] = await Promise.all([
    prisma.workLog.findMany({
      where: { ...baseWhere, deletedAt: null },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.workLog.findMany({
      where: { ...baseWhere, deletedAt: { not: null } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  return NextResponse.json({
    active: active.map(serializeLog),
    deleted: deleted.map(serializeLog),
  })
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

    const userId = session.user.role === 'ADMIN' && body.userId ? body.userId : session.user.id
    const source = session.user.role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE'

    const log = await prisma.workLog.create({
      data: {
        userId,
        date: new Date(date),
        workType: workType as any,
        description: description ?? null,
        points,
        source: source as any,
      },
    })

    return NextResponse.json(serializeLog(log))
  } catch (e: any) {
    console.error('POST /api/worklog error:', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
