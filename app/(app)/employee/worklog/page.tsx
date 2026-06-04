import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import WorkLogClient from './client'

export default async function WorkLogPage() {
  const session = await requireAuth()

  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1

  const dateFilter = {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  }

  const baseWhere = { userId: session.user.id, source: 'EMPLOYEE' as const, date: dateFilter }

  const [activeLogs, deletedLogs, attendance, assignments] = await Promise.all([
    prisma.workLog.findMany({
      where: { ...baseWhere, deletedAt: null },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.workLog.findMany({
      where: { ...baseWhere, deletedAt: { not: null } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.attendanceRecord.findMany({
      where: { userId: session.user.id, type: { in: ['A', 'B', 'C'] }, date: dateFilter },
      select: { date: true },
    }),
    prisma.shiftAssignment.findMany({
      where: { userId: session.user.id, date: dateFilter },
      select: { date: true },
    }),
  ])

  const serialize = (l: any) => ({
    ...l,
    date: l.date.toISOString(),
    createdAt: l.createdAt.toISOString(),
    deletedAt: l.deletedAt?.toISOString() ?? null,
  })

  const validDates = [
    ...attendance.map(a => a.date.toISOString().slice(0, 10)),
    ...assignments.map(a => a.date.toISOString().slice(0, 10)),
  ]
  const uniqueValidDates = [...new Set(validDates)]

  return (
    <WorkLogClient
      initialYear={year}
      initialMonth={month}
      initialLogs={activeLogs.map(serialize)}
      initialDeletedLogs={deletedLogs.map(serialize)}
      initialAttendanceDates={uniqueValidDates}
    />
  )
}
