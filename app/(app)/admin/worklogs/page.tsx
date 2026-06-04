import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import AdminWorkLogsClient from './client'

export default async function AdminWorkLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') redirect('/employee/preferences')

  const params = await searchParams
  const today = new Date()
  const year = params.year ? parseInt(params.year) : today.getFullYear()
  const month = params.month ? parseInt(params.month) : today.getMonth() + 1

  const dateFilter = {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  }

  const [employees, workLogs, deletedLogs] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.workLog.findMany({
      where: { date: dateFilter, deletedAt: null },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    prisma.workLog.findMany({
      where: { date: dateFilter, deletedAt: { not: null } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  const serialize = (l: any) => ({
    id: l.id,
    userId: l.userId,
    userName: l.user.name,
    date: l.date.toISOString(),
    workType: l.workType,
    description: l.description,
    points: l.points,
    source: l.source,
    createdAt: l.createdAt.toISOString(),
    deletedAt: l.deletedAt?.toISOString() ?? null,
    deletedByName: l.deletedByName ?? null,
  })

  return (
    <AdminWorkLogsClient
      year={year}
      month={month}
      employees={employees}
      initialLogs={workLogs.map(serialize)}
      initialDeletedLogs={deletedLogs.map(serialize)}
    />
  )
}
