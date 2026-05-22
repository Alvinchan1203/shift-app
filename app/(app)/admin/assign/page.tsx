import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import AdminAssignClient from './client'
import { ShiftKey } from '@/lib/constants'

export default async function AdminAssignPage() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') redirect('/employee/preferences')

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const month1 = month + 1

  const [prefs, assignments, holidays, submissions, publishRecord] = await Promise.all([
    prisma.shiftPreference.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    }),
    prisma.shiftAssignment.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    }),
    prisma.holiday.findMany(),
    prisma.preferenceSubmission.findMany({ where: { year, month: month1 } }),
    prisma.schedulePublish.findUnique({ where: { year_month: { year, month: month1 } } }),
  ])

  const initialData = {
    prefs: prefs.map(p => ({ id: p.id, date: p.date.toISOString().slice(0, 10), shift: p.shift as ShiftKey, user: p.user })),
    assignments: assignments.map(a => ({ id: a.id, date: a.date.toISOString().slice(0, 10), shift: a.shift as ShiftKey, userId: a.userId, user: a.user })),
    holidays: holidays.map(h => ({ id: h.id, date: h.date.toISOString().slice(0, 10), name: h.name })),
    submittedUserIds: submissions.filter(s => s.confirmedAt != null).map(s => s.userId),
    published: !!publishRecord,
    publishedAt: publishRecord?.publishedAt?.toISOString() ?? null,
    initialYear: year,
    initialMonth: month,
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">分配排班</h2>
        <AdminAssignClient initialData={initialData} />
    </main>
  )
}
