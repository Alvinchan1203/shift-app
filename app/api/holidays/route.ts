import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const holidays = await prisma.holiday.findMany({ orderBy: { date: 'asc' } })
  return NextResponse.json(holidays)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { date, name } = await req.json()
  if (!date || !name) return NextResponse.json({ error: '缺少資料' }, { status: 400 })

  const holiday = await prisma.holiday.upsert({
    where: { date: new Date(date) },
    update: { name },
    create: { date: new Date(date), name },
  })
  return NextResponse.json(holiday)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { date } = await req.json()
  await prisma.holiday.deleteMany({ where: { date: new Date(date) } })
  return NextResponse.json({ ok: true })
}
