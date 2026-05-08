import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.user.role === 'ADMIN') {
    const records = await prisma.attendanceRecord.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }],
    })
    return NextResponse.json(records)
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { userId: session.user.id },
    orderBy: [{ date: 'asc' }],
  })
  return NextResponse.json(records)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { userId, date, note, durationMinutes } = body
    const type = body.type as string
    if (!userId || !date || !type) return NextResponse.json({ error: '缺少資料' }, { status: 400 })

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })

    const existing = await prisma.attendanceRecord.findFirst({
      where: { userId, date: new Date(date), type: type as any },
    })
    let record
    if (existing) {
      record = await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: { note: note ?? null, durationMinutes: durationMinutes ?? null },
        include: { user: { select: { id: true, name: true } } },
      })
    } else {
      record = await prisma.attendanceRecord.create({
        data: { userId, date: new Date(date), type: type as any, note: note ?? null, durationMinutes: durationMinutes ?? null },
        include: { user: { select: { id: true, name: true } } },
      })
      await prisma.attendanceLog.create({
        data: {
          userId,
          userName: targetUser?.name ?? userId,
          date: new Date(date),
          type: type as any,
          action: 'ADD',
          adminId: session.user.id,
          adminName: session.user.name!,
        },
      })
    }
    return NextResponse.json(record)
  } catch (e: any) {
    console.error('POST /api/attendance error:', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { userId, date } = body
    const type = body.type as string | undefined

    const toDelete = await prisma.attendanceRecord.findMany({
      where: { userId, date: new Date(date), ...(type ? { type: type as any } : {}) },
      include: { user: { select: { name: true } } },
    })

    await prisma.attendanceRecord.deleteMany({
      where: { userId, date: new Date(date), ...(type ? { type: type as any } : {}) },
    })

    if (toDelete.length > 0) {
      await prisma.attendanceLog.createMany({
        data: toDelete.map(r => ({
          userId: r.userId,
          userName: r.user.name,
          date: new Date(date),
          type: r.type,
          action: 'REMOVE',
          adminId: session.user.id,
          adminName: session.user.name!,
        })),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /api/attendance error:', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
