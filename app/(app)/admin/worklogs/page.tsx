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

  const [employees, workLogs] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.workLog.findMany({
      where: { date: dateFilter },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  const serialized = workLogs.map(l => ({
    id: l.id,
    userId: l.userId,
    userName: l.user.name,
    date: l.date.toISOString(),
    workType: l.workType,
    description: l.description,
    points: l.points,
    createdAt: l.createdAt.toISOString(),
  }))

  return <AdminWorkLogsClient year={year} month={month} employees={employees} initialLogs={serialized} />
}
