'use client'

import { useEffect, useState } from 'react'
import ShiftBadge from '@/components/ShiftBadge'
import { ShiftKey, SHIFT_HOURS } from '@/lib/constants'

type Assignment = { id: string; date: string; shift: string; userId: string }
type PublishedMonth = { id: string; year: number; month: number; publishedAt: string }

function Skeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />
            </div>
            <div className="bg-white rounded-2xl border divide-y">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center justify-between px-4 py-4">
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EmployeeScheduleView() {
  const [loaded, setLoaded] = useState(false)
  const [publishedMonths, setPublishedMonths] = useState<PublishedMonth[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/schedule-publish').then(r => r.json()),
      fetch('/api/assignments').then(r => r.json()),
    ]).then(([months, asgn]) => {
      setPublishedMonths(months)
      setAssignments(asgn.map((a: Assignment) => ({ ...a, date: a.date.slice(0, 10) })))
      setLoaded(true)
    })
  }, [])

  if (!loaded) return <Skeleton />

  const publishedSet = new Set(
    publishedMonths.map(pm => `${pm.year}-${String(pm.month).padStart(2, '0')}`)
  )

  const grouped = new Map<string, Assignment[]>()
  for (const a of assignments) {
    const key = a.date.slice(0, 7)
    if (!publishedSet.has(key)) continue
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(a)
  }
  const sortedMonths = [...grouped.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
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
            const monthHours = monthAssignments.reduce(
              (sum, a) => sum + (SHIFT_HOURS[a.shift as ShiftKey] ?? 0), 0
            )
            return (
              <div key={monthKey}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="font-semibold text-gray-700">{monthLabel}</h3>
                  <span className="text-sm text-blue-600 font-medium">{monthHours} 小時</span>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border divide-y">
                  {monthAssignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between px-4 sm:px-6 py-4 gap-3">
                      <span className="text-sm sm:text-base text-gray-700">
                        {new Date(a.date + 'T00:00:00').toLocaleDateString('zh-HK', {
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
  )
}
