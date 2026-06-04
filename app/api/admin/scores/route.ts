import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { SHIFT_DURATIONS } from '@/lib/constants'
import {
  calcWorkHoursScore,
  calcAccountOpeningScore,
  calcActualWorkScore,
  calcAdminScore,
  calcSalaryMultiplier,
  calcTotalDeductions,
} from '@/lib/scoring'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? '')
  const month = parseInt(searchParams.get('month') ?? '')

  if (isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: '缺少 year/month' }, { status: 400 })
  }

  const dateFilter = {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  }

  const [employees, monthlyScores, attendanceRecords, workLogs, deductionRecords] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.monthlyScore.findMany({
      where: { year, month },
      include: { adjustments: { orderBy: { createdAt: 'asc' } } },
    }),
    prisma.attendanceRecord.findMany({
      where: { date: dateFilter },
      select: { userId: true, type: true, durationMinutes: true },
    }),
    prisma.workLog.findMany({
      where: { date: dateFilter, deletedAt: null },
      select: { userId: true, points: true },
    }),
    prisma.monthlyDeduction.findMany({
      where: { year, month },
      select: { userId: true, type: true, count: true },
    }),
  ])

  const scoreMap = new Map(monthlyScores.map(s => [s.userId, s]))

  const deductionsMap = new Map<string, { type: string; count: number }[]>()
  for (const d of deductionRecords) {
    const existing = deductionsMap.get(d.userId) ?? []
    existing.push({ type: d.type, count: d.count })
    deductionsMap.set(d.userId, existing)
  }

  const attendanceMinutes = new Map<string, number>()
  for (const r of attendanceRecords) {
    const mins = SHIFT_DURATIONS[r.type as keyof typeof SHIFT_DURATIONS] ?? r.durationMinutes ?? 0
    if (mins > 0) {
      attendanceMinutes.set(r.userId, (attendanceMinutes.get(r.userId) ?? 0) + mins)
    }
  }

  const workPoints = new Map<string, number>()
  for (const w of workLogs) {
    workPoints.set(w.userId, (workPoints.get(w.userId) ?? 0) + w.points)
  }

  const result = employees.map(emp => {
    const score = scoreMap.get(emp.id)
    const totalAttendanceMinutes = attendanceMinutes.get(emp.id) ?? 0
    const totalWorkPoints = workPoints.get(emp.id) ?? 0
    const confirmedMinutes = score?.confirmedMinutes ?? null
    const effectiveMinutes = confirmedMinutes ?? totalAttendanceMinutes

    const item1 = calcWorkHoursScore(effectiveMinutes)
    const item2 = calcAccountOpeningScore(
      score?.witnessCount ?? 0,
      score?.successCount ?? 0
    )
    const item3 = calcActualWorkScore(totalWorkPoints, effectiveMinutes)
    const item4 = calcAdminScore(score?.adjustments ?? [])
    const deductions = deductionsMap.get(emp.id) ?? []
    const totalDeductions = calcTotalDeductions(deductions)
    const total = Math.max(0, item1 + item2 + item3 + item4 - totalDeductions)
    const multiplier = calcSalaryMultiplier(total)

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      monthlyScoreId: score?.id ?? null,
      witnessCount: score?.witnessCount ?? 0,
      successCount: score?.successCount ?? 0,
      adjustments: score?.adjustments ?? [],
      totalAttendanceMinutes,
      confirmedMinutes,
      totalWorkPoints,
      item1,
      item2,
      item3,
      item4,
      deductions,
      totalDeductions,
      total,
      multiplier,
    }
  })

  return NextResponse.json(result)
}
