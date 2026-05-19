import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { employeeId } = await params
    const body = await req.json()
    const { year, month, witnessCount, successCount } = body

    if (!year || !month || witnessCount === undefined || successCount === undefined) {
      return NextResponse.json({ error: '缺少資料' }, { status: 400 })
    }

    const score = await prisma.monthlyScore.upsert({
      where: { userId_year_month: { userId: employeeId, year, month } },
      create: { userId: employeeId, year, month, witnessCount, successCount },
      update: { witnessCount, successCount },
      include: { adjustments: { orderBy: { createdAt: 'asc' } } },
    })

    return NextResponse.json(score)
  } catch (e: any) {
    console.error('PUT /api/admin/scores/[employeeId] error:', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
