'use client'

import { useEffect, useState } from 'react'
import ShiftBadge from '@/components/ShiftBadge'
import { ShiftKey, SHIFT_HOURS } from '@/lib/constants'

type Assignment = { id: string; date: string; shift: string; userId: string }
type PublishedMonth = { id: string; year: number; month: number; publishedAt: string }
type Holiday = { id: string; date: string; name: string }

function getMonthDays(year: number, month: number) {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function Skeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="h-10 bg-gray-50 border-b animate-pulse" />
        <div className="grid grid-cols-7">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="border-b border-r min-h-[80px] bg-gray-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function EmployeeScheduleView() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [loaded, setLoaded] = useState(false)
  const [publishedSet, setPublishedSet] = useState<Set<string>>(new Set())
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoaded(false)
    Promise.all([
      fetch('/api/schedule-publish').then(r => r.json()),
      fetch('/api/assignments').then(r => r.json()),
      fetch('/api/holidays').then(r => r.json()),
    ]).then(([months, asgn, hols]) => {
      setPublishedSet(new Set(
        (months as PublishedMonth[]).map(pm => `${pm.year}-${String(pm.month).padStart(2, '0')}`)
      ))
      setAssignments((asgn as Assignment[]).map(a => ({ ...a, date: a.date.slice(0, 10) })))
      setHolidays((hols as Holiday[]).map(h => ({ ...h, date: h.date.slice(0, 10) })))
      setLoaded(true)
    })
  }, [refreshKey])

  if (!loaded) return <Skeleton />

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const isPublished = publishedSet.has(monthKey)
  const monthLabel = new Date(year, month).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })
  const days = getMonthDays(year, month)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const firstDow = days[0].getDay()

  const monthAssignments = assignments.filter(a => a.date.startsWith(monthKey))
  const monthHours = monthAssignments.reduce((sum, a) => sum + (SHIFT_HOURS[a.shift as ShiftKey] ?? 0), 0)

  const assignByDate = new Map<string, Assignment>()
  for (const a of monthAssignments) assignByDate.set(a.date, a)

  const holidayByDate = new Map<string, string>()
  for (const h of holidays) {
    if (h.date.startsWith(monthKey)) holidayByDate.set(h.date, h.name)
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">我的排班</h2>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="px-2.5 py-1.5 rounded-lg border hover:bg-gray-100 text-gray-500 transition"
          title="重新整理"
        >↺</button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-2 rounded-lg border hover:bg-gray-100 text-gray-600">‹</button>
        <div className="text-center">
          <span className="font-semibold text-gray-800">{monthLabel}</span>
          {isPublished && monthHours > 0 && (
            <span className="ml-2 text-sm text-blue-600 font-medium">{monthHours} 小時</span>
          )}
          {!isPublished && (
            <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">未發布</span>
          )}
        </div>
        <button onClick={nextMonth} className="px-3 py-2 rounded-lg border hover:bg-gray-100 text-gray-600">›</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="grid grid-cols-7 border-b bg-gray-50">
          {weekdays.map((d, i) => (
            <div key={d} className={`text-center text-xs font-medium py-2.5 ${i === 0 || i === 6 ? 'text-pink-400' : 'text-gray-500'}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e-${i}`} className="border-b border-r min-h-[80px]" />
          ))}
          {days.map(day => {
            const dateStr = toDateStr(day)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            const holidayName = holidayByDate.get(dateStr)
            const assignment = assignByDate.get(dateStr)
            const isRest = isWeekend || !!holidayName
            return (
              <div
                key={dateStr}
                className={`border-b border-r min-h-[80px] p-1.5 ${isRest ? 'bg-pink-50' : 'bg-white'}`}
              >
                <div className={`text-xs mb-1 font-medium ${isRest ? 'text-pink-400' : 'text-gray-600'}`}>
                  {day.getDate()}
                </div>
                {holidayName && (
                  <div className="text-xs text-pink-500 font-medium leading-tight mb-1">{holidayName}</div>
                )}
                {isRest && !holidayName && (
                  <div className="text-xs text-pink-300">休息</div>
                )}
                {isPublished && assignment && (
                  <div className="mt-0.5">
                    <ShiftBadge shift={assignment.shift as ShiftKey} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
