'use client'

import { useEffect, useState } from 'react'
import ShiftBadge from '@/components/ShiftBadge'
import { ShiftKey, SHIFT_HOURS, SHIFTS, ATTENDANCE_TYPES, AttendanceTypeKey } from '@/lib/constants'

type Assignment = { id: string; date: string; shift: string; userId: string }
type PublishedMonth = { id: string; year: number; month: number; publishedAt: string }
type Holiday = { id: string; date: string; name: string }
type AttendanceRecord = { id: string; date: string; type: AttendanceTypeKey; durationMinutes?: number | null }
type AttendanceLog = { id: string; date: string; type: AttendanceTypeKey; action: 'ADD' | 'REMOVE'; adminName: string; createdAt: string }

type LogGroup = { date: string; removed: AttendanceTypeKey[]; added: AttendanceTypeKey[]; adminName: string; createdAt: string }

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

function groupLogs(logs: AttendanceLog[]): LogGroup[] {
  const map = new Map<string, LogGroup>()
  const sorted = [...logs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const log of sorted) {
    const key = log.date
    if (!map.has(key)) {
      map.set(key, { date: log.date, removed: [], added: [], adminName: log.adminName, createdAt: log.createdAt })
    }
    const g = map.get(key)!
    if (log.action === 'REMOVE') g.removed.push(log.type)
    else g.added.push(log.type)
    if (log.createdAt > g.createdAt) { g.createdAt = log.createdAt; g.adminName = log.adminName }
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date))
}

function typeLabel(type: AttendanceTypeKey) {
  const t = ATTENDANCE_TYPES[type]
  return `${t.label}${t.desc ? `（${t.desc}）` : ''}`
}

export default function EmployeeScheduleView() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [loaded, setLoaded] = useState(false)
  const [publishedSet, setPublishedSet] = useState<Set<string>>(new Set())
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const SHIFT_TIMES: Record<string, { start: string; end: string; label: string }> = {
    A: { start: '010000', end: '060000', label: 'A班' },
    B: { start: '050000', end: '100000', label: 'B班' },
    C: { start: '010000', end: '100000', label: 'C班' },
  }

  async function handleExport() {
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

    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent)
    if (isIOS) {
      const res = await fetch(`/api/schedule/export-token?year=${year}&month=${month + 1}`)
      if (!res.ok) return
      const { token } = await res.json()
      window.location.href = `/api/schedule/export?token=${token}`
    } else {
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
  }

  useEffect(() => {
    setLoaded(false)
    const m1 = month + 1
    Promise.all([
      fetch('/api/schedule-publish').then(r => r.json()),
      fetch('/api/assignments').then(r => r.json()),
      fetch('/api/holidays').then(r => r.json()),
      fetch(`/api/attendance?year=${year}&month=${m1}`).then(r => r.json()),
      fetch(`/api/attendance/log?year=${year}&month=${m1}`).then(r => r.json()),
    ]).then(([months, asgn, hols, att, logs]) => {
      setPublishedSet(new Set(
        (months as PublishedMonth[]).map(pm => `${pm.year}-${String(pm.month).padStart(2, '0')}`)
      ))
      setAssignments((asgn as Assignment[]).map(a => ({ ...a, date: a.date.slice(0, 10) })))
      setHolidays((hols as Holiday[]).map(h => ({ ...h, date: h.date.slice(0, 10) })))
      setAttendanceRecords((att as AttendanceRecord[]).map(r => ({ ...r, date: r.date.slice(0, 10) })))
      setAttendanceLogs(Array.isArray(logs) ? (logs as AttendanceLog[]).map(l => ({ ...l, date: l.date.slice(0, 10) })) : [])
      setLoaded(true)
    })
  }, [refreshKey, year, month])

  if (!loaded) return <Skeleton />

  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const isPublished = publishedSet.has(monthKey)
  const monthLabel = new Date(year, month).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })
  const days = getMonthDays(year, month)
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const firstDow = days[0].getDay()

  const monthAssignments = assignments.filter(a => a.date.startsWith(monthKey))
  const monthAttendance = attendanceRecords.filter(r => r.date.startsWith(monthKey))
  const monthLogs = attendanceLogs.filter(l => l.date.startsWith(monthKey))

  const assignByDate = new Map<string, Assignment>()
  for (const a of monthAssignments) assignByDate.set(a.date, a)

  const attendByDate = new Map<string, AttendanceRecord[]>()
  for (const r of monthAttendance) {
    if (!attendByDate.has(r.date)) attendByDate.set(r.date, [])
    attendByDate.get(r.date)!.push(r)
  }

  const holidayByDate = new Map<string, string>()
  for (const h of holidays) {
    if (h.date.startsWith(monthKey)) holidayByDate.set(h.date, h.name)
  }

  const WORK_HOURS: Partial<Record<AttendanceTypeKey, number>> = { A: 5, B: 5, C: 8 }

  const hasActual = monthAttendance.length > 0

  const logGroups = groupLogs(monthLogs)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const allDates = new Set([
    ...monthAssignments.map(a => a.date),
    ...monthAttendance.map(r => r.date),
  ])
  const sortedDates = [...allDates].sort()

  // 每天：有出勤紀錄用出勤工時，否則用排班工時
  const totalHours = sortedDates.reduce((sum, dateStr) => {
    const assign = assignByDate.get(dateStr)
    const dayAttend = attendByDate.get(dateStr) ?? []
    const h = dayAttend.length > 0
      ? dayAttend.reduce((s, r) => s + (WORK_HOURS[r.type] ?? 0), 0)
      : assign ? (SHIFT_HOURS[assign.shift as ShiftKey] ?? 0) : 0
    return sum + h
  }, 0)

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
          {isPublished && totalHours > 0 && (
            <span className={`ml-2 text-sm font-medium ${hasActual ? 'text-green-600' : 'text-blue-600'}`}>
              {totalHours}h
            </span>
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

      {/* ── 月曆 ── */}
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
            const dayAttendance = attendByDate.get(dateStr) ?? []
            const isRest = isWeekend || !!holidayName
            const hasAttend = dayAttendance.length > 0
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
                {isPublished && !isRest && (
                  <div className="mt-0.5 space-y-0.5">
                    {hasAttend ? (
                      dayAttendance.map(r => {
                        if (r.type === 'A' || r.type === 'B' || r.type === 'C') {
                          return <ShiftBadge key={r.id} shift={r.type} />
                        }
                        const t = ATTENDANCE_TYPES[r.type]
                        return (
                          <div key={r.id} className={`text-xs rounded-md px-1 py-0.5 font-medium leading-tight ${t.bg} ${t.text}`}>
                            {t.label}
                          </div>
                        )
                      })
                    ) : assignment ? (
                      <ShiftBadge shift={assignment.shift as ShiftKey} />
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 本月排班紀錄 ── */}
      {isPublished && sortedDates.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">本月排班紀錄</h3>
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs text-gray-500">
                  <th className="text-left px-4 py-2 font-medium">日期</th>
                  <th className="text-left px-4 py-2 font-medium">排班</th>
                  <th className="text-left px-4 py-2 font-medium">實際出勤</th>
                  <th className="text-right px-4 py-2 font-medium">工時</th>
                </tr>
              </thead>
              <tbody>
                {sortedDates.map((dateStr, idx) => {
                  const d = new Date(dateStr + 'T00:00:00')
                  const assign = assignByDate.get(dateStr)
                  const dayAttend = attendByDate.get(dateStr) ?? []
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  const hours = dayAttend.length > 0
                    ? dayAttend.reduce((sum, r) => sum + (WORK_HOURS[r.type] ?? 0), 0)
                    : assign ? (SHIFT_HOURS[assign.shift as ShiftKey] ?? 0) : 0
                  const dateLabel = d.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })
                  return (
                    <tr key={dateStr} className={`border-b last:border-0 ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                      <td className={`px-4 py-2 tabular-nums text-xs ${isWeekend ? 'text-pink-500' : 'text-gray-700'}`}>{dateLabel}</td>
                      <td className="px-4 py-2">
                        {assign ? <ShiftBadge shift={assign.shift as ShiftKey} /> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2">
                        {dayAttend.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {dayAttend.map(r => {
                              const t = ATTENDANCE_TYPES[r.type]
                              return (
                                <span key={r.id} className={`text-xs rounded px-1.5 py-0.5 font-medium ${t.bg} ${t.text}`}>
                                  {t.label}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-600 text-xs">{hours}h</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t">
                  <td colSpan={3} className="px-4 py-2 text-xs text-gray-500 font-medium">
                    合計 {sortedDates.length} 天
                    {hasActual && <span className="ml-2 text-green-600">（已有出勤記錄）</span>}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-semibold tabular-nums">
                    <span className={hasActual ? 'text-green-600' : 'text-blue-600'}>{totalHours}h</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── 出勤修改紀錄 ── */}
      {logGroups.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-600 mb-2">出勤修改紀錄</h3>
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm divide-y">
            {logGroups.map(g => {
              const d = new Date(g.date + 'T00:00:00')
              const dateLabel = d.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })
              let changeText = ''
              if (g.removed.length > 0 && g.added.length > 0) {
                changeText = `${g.removed.map(typeLabel).join('、')} → ${g.added.map(typeLabel).join('、')}`
              } else if (g.added.length > 0) {
                changeText = `新增 ${g.added.map(typeLabel).join('、')}`
              } else {
                changeText = `移除 ${g.removed.map(typeLabel).join('、')}`
              }
              return (
                <div key={g.date} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm text-gray-700 shrink-0">{dateLabel}</span>
                    <span className="text-sm text-gray-600 truncate">{changeText}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-400">{g.adminName}</div>
                    <div className="text-xs text-gray-300">
                      {new Date(g.createdAt).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
