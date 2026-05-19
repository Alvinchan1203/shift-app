import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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
    const { year, month, description, points } = body

    if (!year || !month || !description || points === undefined) {
      return NextResponse.json({ error: '缺少資料' }, { status: 400 })
    }

    const score = await prisma.monthlyScore.upsert({
      where: { userId_year_month: { userId: employeeId, year, month } },
      create: { userId: employeeId, year, month },
      update: {},
    })

    const adjustment = await prisma.adminScoreAdjustment.create({
      data: {
        monthlyScoreId: score.id,
        description,
        points: parseInt(points),
        adminId: session.user.id,
        adminName: session.user.name!,
      },
    })

    return NextResponse.json(adjustment)
  } catch (e: any) {
    console.error('POST /api/admin/scores/[employeeId]/adjustments error:', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await params
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

    await prisma.adminScoreAdjustment.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /api/admin/scores/[employeeId]/adjustments error:', e)
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
