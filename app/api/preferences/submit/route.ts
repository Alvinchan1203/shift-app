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
    const { year, month } = await req.json()
    if (!year || !month) return NextResponse.json({ error: '缺少資料' }, { status: 400 })

    const now = new Date()
    const submission = await prisma.preferenceSubmission.upsert({
      where: { userId_year_month: { userId: session.user.id, year, month } },
      update: { submittedAt: now, confirmedAt: now },
      create: { userId: session.user.id, year, month, confirmedAt: now },
    })
    return NextResponse.json(submission)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
