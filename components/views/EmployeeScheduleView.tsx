'use client'

import { useEffect, useState } from 'react'
import ShiftBadge from '@/components/ShiftBadge'
import { ShiftKey, SHIFT_HOURS, SHIFTS } from '@/lib/constants'

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
            <div key={i} className="border-b border-r min-h-[110px] bg-gray-50 animate-pulse" />
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
  const SHIFT_TIMES: Record<string, { start: string; end: string; label: string }> = {
    A: { start: '010000', end: '060000', label: 'A班' },
    B: { start: '050000', end: '100000', label: 'B班' },
    C: { start: '010000', end: '100000', label: 'C班' },
  }

  function handleExport() {
    const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
    const events = monthAssignments.map(a => {
      const dateStr = a.date.replace(/-/g, '')
      const t = SHIFT_TIMES[a.shift]
      return [
        'BEGIN:VEVENT',
        `UID:shift-${dateStr}-${a.shift}@shift-app`,
        `DTSTAMP:${now}`,
        `DTSTART:${dateStr}T${t.start}Z`,
        `DTEND:${dateStr}T${t.end}Z`,
        `SUMMARY:${t.label}`,
        'LOCATION:金鐘辦公室',
        'END:VEVENT',
      ].join('\r\n')
    }).join('\r\n')

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//金鐘辦公室Bee報更系統//排班//ZH',
      'CALSCALE:GREGORIAN',
      events,
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([ics], { type: 'text/calendar; charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schedule-${year}-${String(month + 1).padStart(2, '0')}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

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
    <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
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
          {isPublished && monthAssignments.length > 0 && (
            <div className="mt-1">
              <button
                onClick={handleExport}
                className="text-xs text-blue-500 hover:text-blue-700 hover:underline transition"
              >
                📅 匯出到手機日曆
              </button>
            </div>
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
            <div key={`e-${i}`} className="border-b border-r min-h-[110px]" />
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
                className={`border-b border-r min-h-[110px] p-1.5 ${isRest ? 'bg-pink-50' : 'bg-white'}`}
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

      {isPublished && monthAssignments.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">本月排班紀錄</h3>
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500">
                  <th className="text-left px-4 py-2 font-medium">日期</th>
                  <th className="text-left px-4 py-2 font-medium">星期</th>
                  <th className="text-left px-4 py-2 font-medium">班次</th>
                  <th className="text-left px-4 py-2 font-medium">時間</th>
                  <th className="text-right px-4 py-2 font-medium">工時</th>
                </tr>
              </thead>
              <tbody>
                {[...monthAssignments]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((a, idx) => {
                    const d = new Date(a.date)
                    const shift = SHIFTS[a.shift as ShiftKey]
                    const hours = SHIFT_HOURS[a.shift as ShiftKey] ?? 0
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    return (
                      <tr key={a.id} className={`border-b last:border-0 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                        <td className="px-4 py-2 text-gray-700 tabular-nums">{a.date}</td>
                        <td className={`px-4 py-2 ${isWeekend ? 'text-pink-500' : 'text-gray-500'}`}>
                          {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
                        </td>
                        <td className="px-4 py-2">
                          <ShiftBadge shift={a.shift as ShiftKey} />
                        </td>
                        <td className="px-4 py-2 text-gray-500 tabular-nums">{shift?.time ?? '—'}</td>
                        <td className="px-4 py-2 text-right text-gray-600 tabular-nums">{hours}h</td>
                      </tr>
                    )
                  })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t">
                  <td colSpan={4} className="px-4 py-2 text-xs text-gray-500 font-medium">合計 {monthAssignments.length} 天</td>
                  <td className="px-4 py-2 text-right text-sm font-semibold text-blue-600 tabular-nums">{monthHours}h</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
