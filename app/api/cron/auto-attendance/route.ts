import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const tokenParam = req.nextUrl.searchParams.get('token')
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}` && tokenParam !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 取得今天香港時間 (UTC+8)
  const hktNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const year = hktNow.getUTCFullYear()
  const month = hktNow.getUTCMonth()
  const day = hktNow.getUTCDate()
  const todayUTC = new Date(Date.UTC(year, month, day))

  // 取得今天所有排班記錄
  const assignments = await prisma.shiftAssignment.findMany({
    where: { date: todayUTC },
  })

  if (assignments.length === 0) {
    return NextResponse.json({ ok: true, date: todayUTC.toISOString().slice(0, 10), created: 0, message: 'No assignments today' })
  }

  // 批量新增出勤記錄，已存在的跳過（skipDuplicates）
  const result = await prisma.attendanceRecord.createMany({
    data: assignments.map(a => ({
      userId: a.userId,
      date: todayUTC,
      type: a.shift,
    })),
    skipDuplicates: true,
  })

  return NextResponse.json({
    ok: true,
    date: todayUTC.toISOString().slice(0, 10),
    created: result.count,
    total: assignments.length,
  })
}
