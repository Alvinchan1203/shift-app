import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import ShiftBadge from '@/components/ShiftBadge'
import { ShiftKey, SHIFT_HOURS } from '@/lib/constants'

export default async function EmployeeSchedulePage() {
  const session = await auth()
  if (!session) redirect('/login')

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

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4 sm:mb-6">我的排班</h2>
        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400">
            暫無已確認的排班
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border divide-y">
              {assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 sm:px-6 py-4 gap-3">
                  <span className="text-sm sm:text-base text-gray-700">
                    {new Date(a.date).toLocaleDateString('zh-HK', {
                      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                    })}
                  </span>
                  <div className="flex items-center gap-2">
                  <ShiftBadge shift={a.shift as ShiftKey} />
                  <span className="text-xs text-gray-400">{SHIFT_HOURS[a.shift as ShiftKey]}h</span>
                </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-right">
              <span className="text-sm text-blue-600 font-medium">
                排班總時數：{assignments.reduce((sum, a) => sum + (SHIFT_HOURS[a.shift as ShiftKey] ?? 0), 0)} 小時
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
