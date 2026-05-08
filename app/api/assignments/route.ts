import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null
  const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : null

  const dateFilter = year && month
    ? { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) }
    : null

  if (session.user.role === 'ADMIN') {
    const assignments = await prisma.shiftAssignment.findMany({
      where: dateFilter ? { date: dateFilter } : date ? { date: new Date(date) } : undefined,
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    })
    return NextResponse.json(assignments)
  }

  const assignments = await prisma.shiftAssignment.findMany({
    where: { userId: session.user.id, ...(dateFilter ? { date: dateFilter } : {}) },
    orderBy: [{ date: 'asc' }, { shift: 'asc' }],
  })
  return NextResponse.json(assignments)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, date, shift } = await req.json()
  if (!userId || !date || !shift) return NextResponse.json({ error: '缺少資料' }, { status: 400 })

  const assignment = await prisma.shiftAssignment.upsert({
    where: { userId_date_shift: { userId, date: new Date(date), shift } },
    update: { assignedBy: session.user.id },
    create: { userId, date: new Date(date), shift, assignedBy: session.user.id },
  })
  return NextResponse.json(assignment)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, date, shift } = await req.json()
  await prisma.shiftAssignment.deleteMany({
    where: { userId, date: new Date(date), shift },
  })
  return NextResponse.json({ ok: true })
}
