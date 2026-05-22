import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import ShiftBadge from '@/components/ShiftBadge'
import { ShiftKey, SHIFT_HOURS } from '@/lib/constants'

export default async function EmployeeSchedulePage() {
  const session = await requireAuth()

  const publishedMonths = await prisma.schedulePublish.findMany()

  const assignments = publishedMonths.length === 0 ? [] : await prisma.shiftAssignment.findMany({
    where: {
      userId: session.user.id,
      OR: publishedMonths.map((pm) => ({
        date: {
          gte: new Date(pm.year, pm.month - 1, 1),
          lt: new Date(pm.year, pm.month, 1),
        },
      })),
    },
    orderBy: [{ date: 'asc' }, { shift: 'asc' }],
  })

  // Group by year-month
  const grouped = new Map<string, typeof assignments>()
  for (const a of assignments) {
    const d = a.date
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(a)
  }
  const sortedMonths = [...grouped.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar userName={session.user.name!} role={session.user.role} />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">我的排班</h2>
        {sortedMonths.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400">
            暫無已確認的排班
          </div>
        ) : (
          <div className="space-y-6">
            {sortedMonths.map(monthKey => {
              const [y, m] = monthKey.split('-').map(Number)
              const monthLabel = new Date(y, m - 1).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })
              const monthAssignments = grouped.get(monthKey)!
              const monthHours = monthAssignments.reduce((sum, a) => sum + (SHIFT_HOURS[a.shift as ShiftKey] ?? 0), 0)
              return (
                <div key={monthKey}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="font-semibold text-gray-700">{monthLabel}</h3>
                    <span className="text-sm text-blue-600 font-medium">{monthHours} 小時</span>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border divide-y">
                    {monthAssignments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between px-4 sm:px-6 py-4 gap-3">
                        <span className="text-sm sm:text-base text-gray-700">
                          {new Date(a.date).toLocaleDateString('zh-HK', {
                            month: 'long', day: 'numeric', weekday: 'short',
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <ShiftBadge shift={a.shift as ShiftKey} />
                          <span className="text-xs text-gray-400">{SHIFT_HOURS[a.shift as ShiftKey]}h</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
