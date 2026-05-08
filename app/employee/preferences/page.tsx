import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import EmployeePreferencesClient from './client'

export default async function EmployeePreferencesPage() {
  const session = await requireAuth()

  const today = new Date()
  const targetDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const targetYear = targetDate.getFullYear()
  const targetMonth1 = targetDate.getMonth() + 1

  const [user, prefs, holidays, submission] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { extraSubmitEnabled: true },
    }),
    prisma.shiftPreference.findMany({
      where: { userId: session.user.id },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    }),
    prisma.holiday.findMany(),
    prisma.preferenceSubmission.findUnique({
      where: { userId_year_month: { userId: session.user.id, year: targetYear, month: targetMonth1 } },
    }),
  ])

  const initialData = {
    prefs: prefs.map(p => ({ id: p.id, date: p.date.toISOString().slice(0, 10), shift: p.shift as string })),
    holidays: holidays.map(h => ({ id: h.id, date: h.date.toISOString().slice(0, 10), name: h.name })),
    submission: submission ? { submittedAt: submission.submittedAt.toISOString() } : null,
  }

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
          <h2 className="text-xl font-bold text-gray-800 shrink-0">提交上班意願</h2>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            {[
              { label: 'A班', time: '0900–1400', color: 'bg-blue-100 text-blue-800' },
              { label: 'B班', time: '1300–1800', color: 'bg-green-100 text-green-800' },
              { label: 'C班', time: '0900–1800', color: 'bg-purple-100 text-purple-800' },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${s.color}`}>
                <span className="font-medium">{s.label}</span>
                <span className="opacity-70">{s.time}</span>
              </div>
            ))}
          </div>
        </div>
        <EmployeePreferencesClient
          userName={session.user.name!}
          extraSubmitEnabled={user?.extraSubmitEnabled ?? false}
          initialData={initialData}
        />
      </main>
    </div>
  )
}
