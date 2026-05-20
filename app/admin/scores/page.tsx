import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import AdminScoresClient from './client'
import { SHIFT_DURATIONS } from '@/lib/constants'
import {
  calcWorkHoursScore,
  calcAccountOpeningScore,
  calcActualWorkScore,
  calcAdminScore,
  calcSalaryMultiplier,
} from '@/lib/scoring'

export default async function AdminScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') redirect('/employee/preferences')

  const params = await searchParams
  const today = new Date()
  const defaultDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const year = params.year ? parseInt(params.year) : defaultDate.getFullYear()
  const month = params.month ? parseInt(params.month) : defaultDate.getMonth() + 1

  const dateFilter = {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  }

  const [employees, monthlyScores, attendanceRecords, workLogs] = await Promise.all([
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
      where: { date: dateFilter },
      select: { userId: true, points: true },
    }),
  ])

  const scoreMap = new Map(monthlyScores.map(s => [s.userId, s]))

  const attendanceMinutesMap = new Map<string, number>()
  for (const r of attendanceRecords) {
    const mins = SHIFT_DURATIONS[r.type as keyof typeof SHIFT_DURATIONS] ?? r.durationMinutes ?? 0
    if (mins > 0) {
      attendanceMinutesMap.set(r.userId, (attendanceMinutesMap.get(r.userId) ?? 0) + mins)
    }
  }

  const workPointsMap = new Map<string, number>()
  for (const w of workLogs) {
    workPointsMap.set(w.userId, (workPointsMap.get(w.userId) ?? 0) + w.points)
  }

  const employeeData = employees.map(emp => {
    const score = scoreMap.get(emp.id)
    const totalAttendanceMinutes = attendanceMinutesMap.get(emp.id) ?? 0
    const totalWorkPoints = workPointsMap.get(emp.id) ?? 0
    const adjustments = (score?.adjustments ?? []).map(a => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    }))

    const confirmedMinutes = score?.confirmedMinutes ?? null
    const effectiveMinutes = confirmedMinutes ?? totalAttendanceMinutes
    const item1 = calcWorkHoursScore(effectiveMinutes)
    const item2 = calcAccountOpeningScore(score?.witnessCount ?? 0, score?.successCount ?? 0)
    const item3 = calcActualWorkScore(totalWorkPoints, effectiveMinutes)
    const item4 = calcAdminScore(adjustments)
    const total = item1 + item2 + item3 + item4
    const multiplier = calcSalaryMultiplier(total)

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      monthlyScoreId: score?.id ?? null,
      witnessCount: score?.witnessCount ?? 0,
      successCount: score?.successCount ?? 0,
      adjustments,
      totalAttendanceMinutes,
      confirmedMinutes,
      totalWorkPoints,
      item1,
      item2,
      item3,
      item4,
      total,
      multiplier,
    }
  })

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <AdminScoresClient year={year} month={month} employeeData={employeeData} />
    </div>
  )
}
