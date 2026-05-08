import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const year = Number(searchParams.get('year'))
  const month = Number(searchParams.get('month'))

  if (year && month) {
    const record = await prisma.schedulePublish.findUnique({ where: { year_month: { year, month } } })
    return NextResponse.json({ published: !!record, publishedAt: record?.publishedAt ?? null })
  }

  const all = await prisma.schedulePublish.findMany()
  return NextResponse.json(all)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { year, month } = await req.json()
  const record = await prisma.schedulePublish.upsert({
    where: { year_month: { year, month } },
    update: { publishedAt: new Date(), publishedBy: session.user.id },
    create: { year, month, publishedBy: session.user.id },
  })
  return NextResponse.json(record)
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { year, month } = await req.json()
  await prisma.schedulePublish.deleteMany({ where: { year, month } })
  return NextResponse.json({ ok: true })
}
