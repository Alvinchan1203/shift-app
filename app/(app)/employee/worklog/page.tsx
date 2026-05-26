import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import WorkLogClient from './client'

export default async function WorkLogPage() {
  const session = await requireAuth()

  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1

  const [logs, attendance] = await Promise.all([
    prisma.workLog.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 1)),
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.attendanceRecord.findMany({
      where: {
        userId: session.user.id,
        type: { in: ['A', 'B', 'C'] },
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 1)),
        },
      },
      select: { date: true },
    }),
  ])

  const serialized = logs.map(l => ({
    ...l,
    date: l.date.toISOString(),
    createdAt: l.createdAt.toISOString(),
  }))

  const attendanceDates = attendance.map(a => a.date.toISOString().slice(0, 10))

  return (
    <WorkLogClient
      initialYear={year}
      initialMonth={month}
      initialLogs={serialized}
      initialAttendanceDates={attendanceDates}
    />
  )
}
