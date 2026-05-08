import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (session.user.role === 'ADMIN') {
    const prefs = await prisma.shiftPreference.findMany({
      where: userId ? { userId } : undefined,
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    })
    return NextResponse.json(prefs)
  }

  const prefs = await prisma.shiftPreference.findMany({
    where: { userId: session.user.id },
    orderBy: [{ date: 'asc' }, { shift: 'asc' }],
  })
  return NextResponse.json(prefs)
}

async function touchSubmission(userId: string, date: string) {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  await prisma.preferenceSubmission.updateMany({
    where: { userId, year, month },
    data: { submittedAt: new Date() },
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, shift } = await req.json()
  if (!date || !shift) return NextResponse.json({ error: '缺少資料' }, { status: 400 })

  const pref = await prisma.shiftPreference.upsert({
    where: { userId_date_shift: { userId: session.user.id, date: new Date(date), shift } },
    update: {},
    create: { userId: session.user.id, date: new Date(date), shift },
  })
  await touchSubmission(session.user.id, date)
  return NextResponse.json(pref)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, shift } = await req.json()
  await prisma.shiftPreference.deleteMany({
    where: { userId: session.user.id, date: new Date(date), shift },
  })
  await touchSubmission(session.user.id, date)
  return NextResponse.json({ ok: true })
}
