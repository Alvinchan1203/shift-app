'use client'

import { useEffect, useState } from 'react'
import { SHIFTS, ShiftKey } from '@/lib/constants'
import ShiftBadge from '@/components/ShiftBadge'

const SHIFT_HOURS: Record<ShiftKey, number> = { A: 5, B: 5, C: 8 }

type Pref = { id: string; date: string; shift: ShiftKey; user: { id: string; name: string } }
type Assignment = { id: string; date: string; shift: ShiftKey; userId: string; user: { id: string; name: string } }
type Holiday = { id: string; date: string; name: string }

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonthDays(year: number, month: number) {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export default function AdminAssignClient() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<Pref[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [published, setPublished] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)

  const days = getMonthDays(year, month)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchData(showSpinner = false) {
    if (showSpinner) setRefreshing(true)
    const [p, a, h] = await Promise.all([
      fetch('/api/preferences').then((r) => r.json()),
      fetch('/api/assignments').then((r) => r.json()),
      fetch('/api/holidays').then((r) => r.json()),
    ])
    setPrefs(p.map((x: Pref) => ({ ...x, date: x.date.slice(0, 10) })))
    setAssignments(a.map((x: Assignment) => ({ ...x, date: x.date.slice(0, 10) })))
    setHolidays(h.map((x: Holiday) => ({ ...x, date: x.date.slice(0, 10) })))
    setLoading(false)
    if (showSpinner) setRefreshing(false)
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    fetch(`/api/schedule-publish?year=${year}&month=${month + 1}`)
      .then((r) => r.json())
      .then((data) => {
        setPublished(data.published)
        setPublishedAt(data.publishedAt)
      })
  }, [year, month])

  async function handlePublish() {
    setPublishing(true)
    const res = await fetch('/api/schedule-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month: month + 1 }),
    })
    const data = await res.json()
    setPublished(true)
    setPublishedAt(data.publishedAt)
    setPublishing(false)
  }

  async function handleUnpublish() {
    setPublishing(true)
    await fetch('/api/schedule-publish', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month: month + 1 }),
    })
    setPublished(false)
    setPublishedAt(null)
    setPublishing(false)
  }

  function getDayPrefs(dateStr: string) {
    return prefs.filter((p) => p.date === dateStr)
  }

  function getDayAssignments(dateStr: string) {
    return assignments.filter((a) => a.date === dateStr)
  }

  function isAssigned(dateStr: string, userId: string, shift: ShiftKey) {
    return assignments.some((a) => a.date === dateStr && a.userId === userId && a.shift === shift)
  }

  async function toggleAssign(dateStr: string, userId: string, userName: string, shift: ShiftKey) {
    if (isAssigned(dateStr, userId, shift)) {
      await fetch('/api/assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: dateStr, shift }),
      })
      setAssignments((prev) => prev.filter((a) => !(a.date === dateStr && a.userId === userId && a.shift === shift)))
    } else {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, date: dateStr, shift }),
      })
      const newA = await res.json()
      setAssignments((prev) => [...prev, { ...newA, date: newA.date.slice(0, 10), user: { id: userId, name: userName } }])
    }
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function getHoliday(dateStr: string) {
    return holidays.find((h) => h.date === dateStr)
  }

  const monthLabel = new Date(year, month).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const firstDow = days[0].getDay()

  if (loading) return <p className="text-gray-500">載入中...</p>

  const selectedPrefs = selectedDate ? getDayPrefs(selectedDate) : []
  const selectedAssignments = selectedDate ? getDayAssignments(selectedDate) : []
  const sheetPrefs = sheetDate ? getDayPrefs(sheetDate) : []
  const sheetAssignments = sheetDate ? getDayAssignments(sheetDate) : []

  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthAssignments = assignments.filter((a) => a.date.startsWith(monthPrefix))
  const statsMap = new Map<string, { name: string; records: { date: string; shift: ShiftKey }[] }>()
  for (const a of monthAssignments) {
    if (!statsMap.has(a.userId)) statsMap.set(a.userId, { name: a.user.name, records: [] })
    statsMap.get(a.userId)!.records.push({ date: a.date, shift: a.shift as ShiftKey })
  }
  const statsRows = [...statsMap.values()].map((s) => ({
    ...s,
    records: [...s.records].sort((a, b) => a.date.localeCompare(b.date)),
    totalHours: s.records.reduce((sum, r) => sum + SHIFT_HOURS[r.shift as ShiftKey], 0),
  })).sort((a, b) => a.name.localeCompare(b.name))

  // 排班面板內容（桌面側邊欄 / 手機底部面板共用）
  function DayPanel({ dateStr, panelPrefs, panelAssignments }: {
    dateStr: string
    panelPrefs: Pref[]
    panelAssignments: Assignment[]
  }) {
    return (
      <>
        <h3 className="font-semibold text-gray-800 text-lg mb-4">
          {new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })}
        </h3>
        {panelPrefs.length === 0 ? (
          <p className="text-base text-gray-400">無員工提交意願</p>
        ) : (
          <div className="space-y-5">
            {(Object.keys(SHIFTS) as ShiftKey[]).map((shift) => {
              const shiftPrefs = panelPrefs.filter((p) => p.shift === shift)
              if (shiftPrefs.length === 0) return null
              return (
                <div key={shift}>
                  <div className="mb-2"><ShiftBadge shift={shift} /></div>
                  <div className="space-y-2 pl-2">
                    {shiftPrefs.map((p) => {
                      const assigned = isAssigned(dateStr, p.user.id, shift)
                      return (
                        <div key={p.id} className="flex items-center justify-between">
                          <span className="text-base text-gray-700">{p.user.name}</span>
                          <button
                            onClick={() => toggleAssign(dateStr, p.user.id, p.user.name, shift)}
                            className={`text-sm px-3 py-2 rounded-lg transition ${
                              assigned
                                ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                            }`}
                          >
                            {assigned ? '已排班 ✓' : '排班'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {panelAssignments.length > 0 && (
          <div className="mt-5 pt-4 border-t">
            <p className="text-sm font-medium text-gray-500 mb-3">已確認排班</p>
            {panelAssignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between mb-2">
                <span className="text-base text-gray-700">{a.user.name}</span>
                <div className="flex items-center gap-2">
                  <ShiftBadge shift={a.shift as ShiftKey} />
                  <button
                    onClick={() => toggleAssign(dateStr, a.userId, a.user.name, a.shift as ShiftKey)}
                    className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 transition"
                  >
                    刪除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    )
  }

  return (
    <div>
      {/* 月份導航 + 發布狀態列 */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="px-3 py-2 rounded-lg border hover:bg-gray-100">‹</button>
        <span className="font-semibold text-gray-800">{monthLabel}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="重新整理意願資料"
            className="px-3 py-2 rounded-lg border hover:bg-gray-100 text-gray-500 disabled:opacity-50 transition"
          >
            {refreshing ? '⟳' : '↺'}
          </button>
          <button onClick={nextMonth} className="px-3 py-2 rounded-lg border hover:bg-gray-100">›</button>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4 bg-gray-50 rounded-xl px-4 py-3 border gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${published ? 'bg-green-500' : 'bg-yellow-400'}`} />
          <span className="text-sm text-gray-600 truncate">
            {published
              ? `已發布${publishedAt ? `・${new Date(publishedAt).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}`
              : '草稿中・員工未能查看'}
          </span>
        </div>
        {published ? (
          <button onClick={handleUnpublish} disabled={publishing}
            className="text-xs px-3 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-50 shrink-0">
            {publishing ? '處理中...' : '取消發布'}
          </button>
        ) : (
          <button onClick={handlePublish} disabled={publishing}
            className="text-xs px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 shrink-0">
            {publishing ? '發布中...' : '確認發布排班'}
          </button>
        )}
      </div>

      {/* ── 手機列表 ── */}
      <div className="md:hidden space-y-1.5 mb-6">
        {days.map((day) => {
          const dateStr = toDateStr(day)
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const holiday = getHoliday(dateStr)
          const dayPrefs = getDayPrefs(dateStr)
          const dayAssign = getDayAssignments(dateStr)

          if (isWeekend || holiday) {
            return (
              <div key={dateStr} className="flex items-center justify-between px-4 py-3 bg-pink-50 rounded-xl border border-pink-100">
                <span className="text-sm text-pink-500 font-medium">
                  {new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })}
                </span>
                <span className="text-sm text-pink-400">{holiday ? holiday.name : '休息'}</span>
              </div>
            )
          }

          return (
            <button
              key={dateStr}
              onClick={() => setSheetDate(dateStr)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 hover:bg-blue-50 transition text-left"
            >
              <span className="text-sm font-medium text-gray-700">
                {new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })}
              </span>
              <div className="flex items-center gap-2">
                {dayPrefs.length > 0 && (
                  <span className="text-xs text-blue-500">{dayPrefs.length} 意願</span>
                )}
                {dayAssign.length > 0 && (
                  <div className="flex gap-1">
                    {dayAssign.map((a) => (
                      <span key={a.id} className={`text-xs rounded px-1.5 py-0.5 ${SHIFTS[a.shift as ShiftKey].color}`}>
                        {a.user.name}
                      </span>
                    ))}
                  </div>
                )}
                <svg className="w-4 h-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── 桌面月曆 + 側邊欄 ── */}
      <div className="hidden md:flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="grid grid-cols-7 border-b">
              {weekdays.map((d) => (
                <div key={d} className="text-center text-sm font-medium text-gray-500 py-3">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`e-${i}`} className="border-b border-r p-2 min-h-[100px]" />
              ))}
              {days.map((day) => {
                const dateStr = toDateStr(day)
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const holiday = getHoliday(dateStr)
                const dayPrefs = getDayPrefs(dateStr)
                const dayAssign = getDayAssignments(dateStr)
                const isSelected = selectedDate === dateStr

                if (isWeekend || holiday) {
                  return (
                    <div key={dateStr} className="border-b border-r p-2 min-h-[100px] bg-pink-50">
                      <div className="text-sm text-pink-400 mb-1">{day.getDate()}</div>
                      <div className="text-xs text-pink-400 text-center mt-2">{holiday ? holiday.name : '休息'}</div>
                    </div>
                  )
                }

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`border-b border-r p-2 min-h-[100px] text-left w-full hover:bg-blue-50 transition ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : ''}`}
                  >
                    <div className="text-sm text-gray-500 mb-1">{day.getDate()}</div>
                    {dayPrefs.length > 0 && <div className="text-xs text-blue-500 mb-0.5">{dayPrefs.length} 意願</div>}
                    {dayAssign.map((a) => (
                      <div key={a.id} className={`text-xs rounded px-1.5 py-0.5 mt-0.5 truncate ${SHIFTS[a.shift as ShiftKey].color}`}>
                        {a.user.name} · {SHIFTS[a.shift as ShiftKey].label}
                      </div>
                    ))}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="w-96">
          {selectedDate ? (
            <div className="bg-white rounded-2xl shadow-sm border p-5 sticky top-4">
              <DayPanel dateStr={selectedDate} panelPrefs={selectedPrefs} panelAssignments={selectedAssignments} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border p-6 text-center text-gray-400">
              選擇日期以查看意願並分配排班
            </div>
          )}
        </div>
      </div>

      {/* ── 員工排班統計 ── */}
      <div className="mt-8">
        <h3 className="font-semibold text-gray-800 mb-4">本月員工排班統計</h3>
        {statsRows.length === 0 ? (
          <p className="text-sm text-gray-400">本月尚無排班記錄</p>
        ) : (
          <>
            {/* 手機：卡片式 */}
            <div className="md:hidden space-y-3">
              {statsRows.map((row) => (
                <div key={row.name} className="bg-white rounded-xl border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-800">{row.name}</span>
                    <div className="flex gap-3 text-sm text-gray-500">
                      <span>{row.records.length} 天</span>
                      <span>{row.totalHours} 小時</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {row.records.map((r) => (
                      <span key={r.date} className="inline-flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-600">
                        {new Date(r.date + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' })}
                        <span className={`px-1 rounded ${SHIFTS[r.shift].color}`}>{SHIFTS[r.shift].label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* 桌面：表格式 */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600 w-28">員工</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600 w-20">排班日數</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600 w-24">總工時</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">排班明細</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statsRows.map((row) => (
                    <tr key={row.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{row.records.length} 天</td>
                      <td className="px-4 py-3 text-center text-gray-700">{row.totalHours} 小時</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {row.records.map((r) => (
                            <span key={r.date} className="inline-flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-600">
                              {new Date(r.date + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' })}
                              <span className={`px-1 rounded ${SHIFTS[r.shift].color}`}>{SHIFTS[r.shift].label}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── 手機底部面板（bottom sheet）── */}
      {sheetDate && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSheetDate(null)} />
          <div className="relative bg-white rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div /> {/* spacer */}
              <div className="w-10 h-1 bg-gray-200 rounded-full absolute top-3 left-1/2 -translate-x-1/2" />
              <button onClick={() => setSheetDate(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-auto">×</button>
            </div>
            <DayPanel dateStr={sheetDate} panelPrefs={sheetPrefs} panelAssignments={sheetAssignments} />
          </div>
        </div>
      )}
    </div>
  )
}
