import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import ShiftBadge from '@/components/ShiftBadge'
import { ShiftKey } from '@/lib/constants'
import Link from 'next/link'

export default async function AdminPreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/employee/preferences')

  const params = await searchParams
  const today = new Date()
  const defaultDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const year = params.year ? parseInt(params.year) : defaultDate.getFullYear()
  const month = params.month ? parseInt(params.month) : defaultDate.getMonth() + 1 // 1-indexed

  const prevDate = new Date(year, month - 2, 1)
  const nextDate = new Date(year, month, 1)
  const prevYear = prevDate.getFullYear()
  const prevMonth = prevDate.getMonth() + 1
  const nextYear = nextDate.getFullYear()
  const nextMonth = nextDate.getMonth() + 1

  const [allEmployees, prefs, submissions] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.shiftPreference.findMany({
      where: {
        date: {
          gte: new Date(Date.UTC(year, month - 1, 1)),
          lt: new Date(Date.UTC(year, month, 1)),
        },
      },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }],
    }),
    prisma.preferenceSubmission.findMany({
      where: { year, month },
    }),
  ])

  const prefsByUser: Record<string, typeof prefs> = {}
  for (const p of prefs) {
    if (!prefsByUser[p.userId]) prefsByUser[p.userId] = []
    prefsByUser[p.userId].push(p)
  }

  const submissionByUser: Record<string, { submittedAt: Date; confirmedAt: Date | null }> = {}
  for (const s of submissions) {
    submissionByUser[s.userId] = { submittedAt: s.submittedAt, confirmedAt: s.confirmedAt }
  }

  const sortedEmployees = [...allEmployees].sort((a, b) => {
    const aTime = submissionByUser[a.id]?.submittedAt?.getTime() ?? Infinity
    const bTime = submissionByUser[b.id]?.submittedAt?.getTime() ?? Infinity
    if (aTime !== bTime) return aTime - bTime
    return a.name.localeCompare(b.name)
  })

  const monthLabel = new Date(year, month - 1).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })
  const submittedCount = allEmployees.filter(e => submissionByUser[e.id]?.confirmedAt != null).length

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-800">Bee上班意願</h2>
            {allEmployees.length > 0 && (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${submittedCount === allEmployees.length ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                已提交 {submittedCount} / {allEmployees.length} 人
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/preferences?year=${prevYear}&month=${prevMonth}`}
              className="px-3 py-1.5 rounded-lg border hover:bg-gray-100 text-gray-600 text-sm"
            >
              ‹
            </Link>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg min-w-[80px] text-center">
              {monthLabel}
            </span>
            <Link
              href={`/admin/preferences?year=${nextYear}&month=${nextMonth}`}
              className="px-3 py-1.5 rounded-lg border hover:bg-gray-100 text-gray-600 text-sm"
            >
              ›
            </Link>
          </div>
        </div>

        {allEmployees.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400">暫無員工帳號</div>
        ) : (
          <div className="space-y-4">
            {sortedEmployees.map(emp => {
              const subRecord = submissionByUser[emp.id]
              const empPrefs = prefsByUser[emp.id] ?? []

              return (
                <div key={emp.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 border-b flex items-center justify-between">
                    <span className="font-medium text-gray-800">{emp.name}</span>
                    {subRecord?.confirmedAt != null ? (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                        確認提交於 {new Date(subRecord.confirmedAt).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">未提交</span>
                    )}
                  </div>
                  {empPrefs.length > 0 ? (
                    <div className="px-5 py-3 flex flex-wrap gap-2">
                      {empPrefs.map(p => {
                        const d = p.date
                        const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
                        return (
                          <div key={p.id} className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 border">
                            <span>{new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })}</span>
                            <ShiftBadge shift={p.shift as ShiftKey} />
                          </div>
                        )
                      })}
                    </div>
                  ) : subRecord ? (
                    <p className="text-sm text-gray-400 px-5 py-4">未選擇任何班次</p>
                  ) : (
                    <p className="text-sm text-gray-400 px-5 py-4">—</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
