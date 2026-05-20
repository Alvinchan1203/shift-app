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
    const { year, month, deductions } = await req.json()

    if (!year || !month || !Array.isArray(deductions)) {
      return NextResponse.json({ error: '缺少資料' }, { status: 400 })
    }

    await prisma.$transaction(
      deductions.map((d: { type: string; count: number }) =>
        prisma.monthlyDeduction.upsert({
          where: {
            userId_year_month_type: {
              userId: employeeId,
              year,
              month,
              type: d.type as any,
            },
          },
          update: { count: d.count },
          create: {
            userId: employeeId,
            year,
            month,
            type: d.type as any,
            count: d.count,
          },
        })
      )
    )

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('PUT /api/admin/scores/[employeeId]/deductions error:', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
