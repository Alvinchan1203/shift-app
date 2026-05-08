import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import AttendanceClient from './client'

export default async function AttendancePage() {
  const session = await requireAuth()

  const isAdmin = session.user.role === 'ADMIN'

  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() // 0-indexed

  const monthStart = new Date(Date.UTC(currentYear, currentMonth, 1))
  const monthEnd = new Date(Date.UTC(currentYear, currentMonth + 1, 1))

  const usersData = isAdmin
    ? await prisma.user.findMany({ where: { role: 'EMPLOYEE' }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    : [{ id: session.user.id, name: session.user.name! }]

  const [records, assignments, holidays] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        ...(isAdmin ? {} : { userId: session.user.id }),
        date: { gte: monthStart, lt: monthEnd },
      },
      orderBy: [{ date: 'asc' }],
    }),
    prisma.shiftAssignment.findMany({
      where: {
        ...(isAdmin ? {} : { userId: session.user.id }),
        date: { gte: monthStart, lt: monthEnd },
      },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    }),
    prisma.holiday.findMany(),
  ])

  const logs = isAdmin
    ? await prisma.attendanceLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
    : []

  const initialData = {
    initialYear: currentYear,
    initialMonth: currentMonth,
    records: records.map(r => ({
      id: r.id,
      userId: r.userId,
      date: r.date.toISOString().slice(0, 10),
      type: r.type as string,
      note: r.note ?? null,
      durationMinutes: r.durationMinutes ?? null,
    })),
    assignments: assignments.map(a => ({
      userId: a.userId,
      date: a.date.toISOString().slice(0, 10),
      shift: a.shift,
    })),
    holidays: holidays.map(h => ({
      id: h.id,
      date: h.date.toISOString().slice(0, 10),
      name: h.name,
    })),
    logs: logs.map(l => ({
      id: l.id,
      userId: l.userId,
      userName: l.userName,
      date: l.date.toISOString().slice(0, 10),
      type: l.type as string,
      action: l.action,
      adminId: l.adminId,
      adminName: l.adminName,
      createdAt: l.createdAt.toISOString(),
    })),
  }

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-full mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          {isAdmin ? '實際出勤管理' : '我的出勤記錄'}
        </h2>
        <AttendanceClient isAdmin={isAdmin} users={usersData} currentUserId={session.user.id} initialData={initialData} />
      </main>
    </div>
  )
}
