import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null

  const dateFilter = year && month ? {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  } : null

  const logs = await prisma.attendanceLog.findMany({
    where: {
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(session.user.role !== 'ADMIN' ? { userId: session.user.id } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json(logs)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  await prisma.attendanceLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
