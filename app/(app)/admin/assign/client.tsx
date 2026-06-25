'use client'

import { useEffect, useRef, useState } from 'react'
import { SHIFTS, ShiftKey } from '@/lib/constants'
import ShiftBadge from '@/components/ShiftBadge'
import MonthPicker from '@/components/MonthPicker'

const SHIFT_HOURS: Record<ShiftKey, number> = { A: 5, B: 5, C: 8 }

type Pref = { id: string; date: string; shift: ShiftKey; user: { id: string; name: string } }
type Assignment = { id: string; date: string; shift: ShiftKey; userId: string; user: { id: string; name: string } }
type Holiday = { id: string; date: string; name: string }

type InitialData = {
  prefs: Pref[]
  assignments: Assignment[]
  holidays: Holiday[]
  submittedUserIds: string[]
  submissions?: { userId: string; confirmedAt: string }[]
  published: boolean
  publishedAt: string | null
  initialYear: number
  initialMonth: number
  allEmployees?: { id: string; name: string }[]
  initialDailyRequired?: number
}

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

export default function AdminAssignClient({ initialData }: { initialData: InitialData }) {
  const [year, setYear] = useState(initialData.initialYear)
  const [month, setMonth] = useState(initialData.initialMonth)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [sheetDate, setSheetDate] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<Pref[]>(initialData.prefs)
  const [submittedUserIds, setSubmittedUserIds] = useState<Set<string>>(new Set(initialData.submittedUserIds))
  const [submittedAtMap, setSubmittedAtMap] = useState<Map<string, string>>(
    new Map((initialData.submissions ?? []).map(s => [s.userId, s.confirmedAt]))
  )
  const [assignments, setAssignments] = useState<Assignment[]>(initialData.assignments)
  const [holidays, setHolidays] = useState<Holiday[]>(initialData.holidays)
  const [published, setPublished] = useState(initialData.published)
  const [publishedAt, setPublishedAt] = useState<string | null>(initialData.publishedAt)
  const [publishing, setPublishing] = useState(false)
  const [autoAssignOpen, setAutoAssignOpen] = useState(false)
  const [quota, setQuota] = useState(3)
  const [autoAssigning, setAutoAssigning] = useState(false)
  const [autoAssignResult, setAutoAssignResult] = useState<number | null>(null)
  const [clearConfirm, setClearConfirm] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [notifyingPublish, setNotifyingPublish] = useState(false)
  const [editingPublished, setEditingPublished] = useState(false)
  const [dailyRequiredInput, setDailyRequiredInput] = useState(() => {
    const db = initialData.initialDailyRequired ?? 0
    return db > 0 ? String(db) : ''
  })
  const [dailyRequired, setDailyRequired] = useState(initialData.initialDailyRequired ?? 0)

  const days = getMonthDays(year, month)
  const [refreshing, setRefreshing] = useState(false)
  const isInitialMount = useRef(true)

  async function fetchData(showSpinner = false, fetchYear = year, fetchMonth = month) {
    if (showSpinner) setRefreshing(true)
    const [p, a, h, subs] = await Promise.all([
      fetch('/api/preferences').then((r) => r.json()),
      fetch('/api/assignments').then((r) => r.json()),
      fetch('/api/holidays').then((r) => r.json()),
      fetch(`/api/preferences/submit?year=${fetchYear}&month=${fetchMonth + 1}`).then((r) => r.json()),
    ])
    setPrefs(p.map((x: Pref) => ({ ...x, date: x.date.slice(0, 10) })))
    setAssignments(a.map((x: Assignment) => ({ ...x, date: x.date.slice(0, 10) })))
    setHolidays(h.map((x: Holiday) => ({ ...x, date: x.date.slice(0, 10) })))
    const subsArr = Array.isArray(subs) ? subs : []
    setSubmittedUserIds(new Set(subsArr.map((s: { userId: string }) => s.userId)))
    setSubmittedAtMap(new Map(subsArr.map((s: { userId: string; confirmedAt: string }) => [s.userId, s.confirmedAt ?? ''])))
    if (showSpinner) setRefreshing(false)
  }

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    setSelectedDate(null)
    setSheetDate(null)
    fetch(`/api/schedule-publish?year=${year}&month=${month + 1}`)
      .then((r) => r.json())
      .then((data) => {
        setPublished(data.published)
        setPublishedAt(data.publishedAt)
      })
    fetch(`/api/preferences/submit?year=${year}&month=${month + 1}`)
      .then((r) => r.json())
      .then((subs) => {
        const subsArr = Array.isArray(subs) ? subs : []
        setSubmittedUserIds(new Set(subsArr.map((s: { userId: string }) => s.userId)))
        setSubmittedAtMap(new Map(subsArr.map((s: { userId: string; confirmedAt: string }) => [s.userId, s.confirmedAt ?? ''])))
      })
    const mk = `${year}-${String(month + 1).padStart(2, '0')}`
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(settings => {
        const val = settings?.[`daily_required_${mk}`] ? parseInt(settings[`daily_required_${mk}`]) : 0
        setDailyRequired(val)
        setDailyRequiredInput(val > 0 ? String(val) : '')
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

  async function handleClearAssignments() {
    setClearing(true)
    await fetch('/api/admin/auto-assign', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month: month + 1 }),
    })
    setClearing(false)
    setClearConfirm(false)
    await fetchData(true)
  }

  async function handleAutoAssign() {
    setAutoAssigning(true)
    const res = await fetch('/api/admin/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month: month + 1, dailyQuota: quota }),
    })
    const data = await res.json()
    setAutoAssignResult(data.added ?? 0)
    setAutoAssigning(false)
    await fetchData(true)
  }

  async function sendPublishNotification() {
    setNotifyingPublish(true)
    await fetch('/api/schedule/notify-publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month: month + 1, dailyRequired }),
    })
    setNotifyingPublish(false)
  }

  async function cancelEditPublished() {
    await fetchData(false)
    setEditingPublished(false)
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
    return prefs.filter((p) => p.date === dateStr && submittedUserIds.has(p.user.id))
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

  function getHoliday(dateStr: string) {
    return holidays.find((h) => h.date === dateStr)
  }

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const firstDow = days[0].getDay()

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
  const baseList = initialData.allEmployees && initialData.allEmployees.length > 0
    ? initialData.allEmployees
    : [...statsMap.entries()].map(([id, s]) => ({ id, name: s.name })).sort((a, b) => a.name.localeCompare(b.name))
  const statsRows = baseList.map((u) => {
    const s = statsMap.get(u.id)
    const records = s ? [...s.records].sort((a, b) => a.date.localeCompare(b.date)) : []
    const totalDays = records.reduce((sum, r) => sum + (r.shift === 'C' ? 1 : 0.5), 0)
    return {
      id: u.id,
      name: u.name,
      records,
      totalDays,
      totalHours: records.reduce((sum, r) => sum + SHIFT_HOURS[r.shift as ShiftKey], 0),
    }
  })

  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1)

  const PREF_DAY_VALUE: Record<ShiftKey, number> = { A: 0.5, B: 0.5, C: 1 }
  const monthPrefEntries = prefs.filter(p => p.date.startsWith(monthPrefix) && submittedUserIds.has(p.user.id))

  const statsPrefMap = new Map<string, Map<string, ShiftKey>>()
  for (const p of monthPrefEntries) {
    if (!statsPrefMap.has(p.user.id)) statsPrefMap.set(p.user.id, new Map())
    statsPrefMap.get(p.user.id)!.set(p.date, p.shift as ShiftKey)
  }
  const prefDaysMap = new Map<string, { name: string; days: number }>()
  for (const p of monthPrefEntries) {
    if (!prefDaysMap.has(p.user.id)) prefDaysMap.set(p.user.id, { name: p.user.name, days: 0 })
    prefDaysMap.get(p.user.id)!.days += PREF_DAY_VALUE[p.shift as ShiftKey] ?? 0
  }
  const assignedDaysMap = new Map<string, number>()
  for (const a of monthAssignments) {
    assignedDaysMap.set(a.userId, (assignedDaysMap.get(a.userId) ?? 0) + (PREF_DAY_VALUE[a.shift as ShiftKey] ?? 0))
  }
  const prefSummaryRows = [...prefDaysMap.entries()]
    .map(([userId, s]) => {
      const assigned = assignedDaysMap.get(userId) ?? 0
      return {
        name: s.name,
        days: s.days,
        assigned,
        remaining: Math.max(0, s.days - assigned),
      }
    })
    .sort((a, b) => b.days - a.days)

  // 排班面板內容（桌面側邊欄 / 手機底部面板共用）
  function DayPanel({ dateStr, panelPrefs, panelAssignments }: {
    dateStr: string
    panelPrefs: Pref[]
    panelAssignments: Assignment[]
  }) {
    return (
      <>
        <h3 className="font-semibold text-gray-800 text-base mb-3">
          {new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })}
        </h3>
        <div className="flex gap-3">
          <div className="flex-1 min-w-0">
            {panelPrefs.length === 0 ? (
              <p className="text-sm text-gray-400">無員工提交意願</p>
            ) : (
              <div className="space-y-3">
                {(Object.keys(SHIFTS) as ShiftKey[]).map((shift) => {
                  const shiftPrefs = panelPrefs.filter((p) => p.shift === shift)
                  if (shiftPrefs.length === 0) return null
                  return (
                    <div key={shift}>
                      <div className="mb-1"><ShiftBadge shift={shift} /></div>
                      <div className="space-y-1 pl-2">
                        {shiftPrefs.map((p) => {
                          const assignedA = shift === 'C' ? isAssigned(dateStr, p.user.id, 'A') : false
                          const assignedB = shift === 'C' ? isAssigned(dateStr, p.user.id, 'B') : false
                          const assigned = isAssigned(dateStr, p.user.id, shift)
                          const anyAssigned = assignedA || assignedB || assigned
                          return (
                            <div key={p.id} className={shift === 'C' ? 'mb-1' : ''}>
                              <div className="flex items-center justify-between gap-1">
                                <span className={`truncate ${shift === 'C' ? 'text-xs text-gray-700' : 'text-sm text-gray-700'}`}>{p.user.name}</span>
                                {shift !== 'C' && (
                                  <button
                                    onClick={() => (!published || editingPublished) && toggleAssign(dateStr, p.user.id, p.user.name, shift)}
                                    disabled={published && !editingPublished}
                                    className={`text-xs px-2 py-1 rounded-lg transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                                      assigned
                                        ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                        : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                                    }`}
                                  >
                                    {assigned ? '✓' : '排班'}
                                  </button>
                                )}
                              </div>
                              {shift === 'C' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => (!published || editingPublished) && !(!assignedA && anyAssigned) && toggleAssign(dateStr, p.user.id, p.user.name, 'A')}
                                    disabled={(published && !editingPublished) || (!assignedA && anyAssigned)}
                                    style={{ fontSize: '10px' }}
                                    className={`px-1.5 py-0.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed ${
                                      assignedA
                                        ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                        : 'bg-blue-50 text-blue-600 hover:bg-green-100 hover:text-green-700'
                                    }`}
                                  >
                                    {assignedA ? '✓A' : 'A班'}
                                  </button>
                                  <button
                                    onClick={() => (!published || editingPublished) && !(!assignedB && anyAssigned) && toggleAssign(dateStr, p.user.id, p.user.name, 'B')}
                                    disabled={(published && !editingPublished) || (!assignedB && anyAssigned)}
                                    style={{ fontSize: '10px' }}
                                    className={`px-1.5 py-0.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed ${
                                      assignedB
                                        ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                        : 'bg-teal-50 text-teal-600 hover:bg-green-100 hover:text-green-700'
                                    }`}
                                  >
                                    {assignedB ? '✓B' : 'B班'}
                                  </button>
                                  <button
                                    onClick={() => (!published || editingPublished) && !(!assigned && anyAssigned) && toggleAssign(dateStr, p.user.id, p.user.name, 'C')}
                                    disabled={(published && !editingPublished) || (!assigned && anyAssigned)}
                                    style={{ fontSize: '10px' }}
                                    className={`px-1.5 py-0.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed ${
                                      assigned
                                        ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700'
                                        : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700'
                                    }`}
                                  >
                                    {assigned ? '✓C' : 'C班'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {panelAssignments.length > 0 && (
            <div className="border-l pl-3 min-w-[90px]">
              <p className="text-xs font-medium text-gray-500 mb-2">已確認排班</p>
              {panelAssignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-sm text-gray-700 truncate">
                    {a.user.name}
                    <span className="ml-1 text-xs text-gray-400">{SHIFTS[a.shift as ShiftKey].label}</span>
                  </span>
                  {(!published || editingPublished) && (
                    <button
                      onClick={() => toggleAssign(dateStr, a.userId, a.user.name, a.shift as ShiftKey)}
                      className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded px-1 py-0.5 transition shrink-0"
                    >
                      刪除
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <div>
      {/* 月份導航 + 發布狀態列 */}
      <div className="flex items-center justify-between mb-3">
        <MonthPicker year={year} month={month + 1} onChange={(y, m) => { setYear(y); setMonth(m - 1) }} />
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="shrink-0">每天需要</span>
          <input
            type="text" inputMode="numeric" value={dailyRequiredInput}
            onChange={e => { if (/^\d{0,2}$/.test(e.target.value)) setDailyRequiredInput(e.target.value) }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = dailyRequiredInput === '' ? 0 : parseInt(dailyRequiredInput)
                setDailyRequired(val)
                const mk = `${year}-${String(month + 1).padStart(2, '0')}`
                fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: `daily_required_${mk}`, value: String(val) }) })
              }
            }}
            onFocus={e => e.target.select()}
            placeholder="0"
            className="w-12 border rounded-lg px-2 py-1 text-sm text-center"
          />
          <span className="shrink-0 text-gray-400">人</span>
          <button
            onClick={() => {
              const val = dailyRequiredInput === '' ? 0 : parseInt(dailyRequiredInput)
              setDailyRequired(val)
              const mk = `${year}-${String(month + 1).padStart(2, '0')}`
              fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: `daily_required_${mk}`, value: String(val) }) })
            }}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shrink-0"
          >
            確認
          </button>
          {dailyRequired > 0 && (
            <span className="text-xs text-yellow-600 shrink-0">黃色 = 未達 {dailyRequired} 人</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!published && (
            <>
              {clearConfirm ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600">確定清除本月所有排班？</span>
                  <button onClick={handleClearAssignments} disabled={clearing}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50">
                    {clearing ? '清除中...' : '確定'}
                  </button>
                  <button onClick={() => setClearConfirm(false)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border hover:bg-gray-50 transition">
                    取消
                  </button>
                </div>
              ) : (
                <button onClick={() => setClearConfirm(true)}
                  className="text-sm px-3 py-2 rounded-lg border bg-red-50 text-red-600 border-red-200 hover:bg-red-100 transition">
                  清除草稿
                </button>
              )}
              <button
                onClick={() => { setAutoAssignOpen(true); setAutoAssignResult(null) }}
                className="text-sm px-3 py-2 rounded-lg border bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition"
              >
                自動排班
              </button>
            </>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="重新整理意願資料"
            className="px-3 py-2 rounded-lg border hover:bg-gray-100 text-gray-500 disabled:opacity-50 transition"
          >
            {refreshing ? '⟳' : '↺'}
          </button>
        </div>
      </div>
      {editingPublished && (
        <div className="flex items-center justify-between mb-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 gap-3">
          <span className="text-sm text-orange-700 font-medium">✏️ 修改模式・排班已解鎖，可進行微調</span>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setEditingPublished(false)}
              className="text-xs px-3 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition">
              確認修改
            </button>
            <button onClick={cancelEditPublished}
              className="text-xs px-3 py-2 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-100 transition">
              放棄修改
            </button>
          </div>
        </div>
      )}
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
          <div className="flex items-center gap-2 shrink-0">
            {!editingPublished && (
              <button onClick={() => setEditingPublished(true)}
                className="text-xs px-3 py-2 rounded-lg bg-orange-100 text-orange-600 hover:bg-orange-200 transition">
                解鎖微調
              </button>
            )}
            <button onClick={sendPublishNotification} disabled={notifyingPublish}
              className="text-xs px-3 py-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition disabled:opacity-50">
              {notifyingPublish ? '發送中...' : '📣 通知報更谷'}
            </button>
            <button onClick={handleUnpublish} disabled={publishing}
              className="text-xs px-3 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-50">
              {publishing ? '處理中...' : '取消發布'}
            </button>
          </div>
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
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border hover:bg-blue-50 transition text-left ${dailyRequired > 0 && dayAssign.length < dailyRequired ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}
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
            <div className="grid border-b" style={{ gridTemplateColumns: '0.55fr 1fr 1fr 1fr 1fr 1fr 0.55fr' }}>
              {weekdays.map((d) => (
                <div key={d} className="text-center text-sm font-medium text-gray-500 py-3">{d}</div>
              ))}
            </div>
            <div className="grid" style={{ gridTemplateColumns: '0.55fr 1fr 1fr 1fr 1fr 1fr 0.55fr' }}>
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`e-${i}`} className="border-b border-r p-2 min-h-[80px]" />
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
                    className={`border-b border-r p-2 min-h-[80px] text-left w-full hover:bg-blue-50 transition ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : dailyRequired > 0 && dayAssign.length < dailyRequired ? 'bg-yellow-50' : ''}`}
                  >
                    <div className="text-sm text-gray-500 mb-1">{day.getDate()}</div>
                    {(() => {
                      const assignMap = new Map(dayAssign.map(a => [a.userId, a]))
                      const prefUserIds = new Set(dayPrefs.map(p => p.user.id))
                      const chips = [
                        ...[...new Map(dayPrefs.map(p => [p.user.id, p.user.name])).entries()]
                          .sort(([uidA], [uidB]) => (submittedAtMap.get(uidA) ?? '').localeCompare(submittedAtMap.get(uidB) ?? ''))
                          .map(([uid, name]) => {
                          const a = assignMap.get(uid)
                          return { key: uid, name, colorClass: a ? SHIFTS[a.shift as ShiftKey].color : 'text-gray-700 bg-white border border-gray-200' }
                        }),
                        ...dayAssign.filter(a => !prefUserIds.has(a.userId)).map(a => ({
                          key: a.id, name: a.user.name, colorClass: SHIFTS[a.shift as ShiftKey].color
                        })),
                      ]
                      if (chips.length === 0) return null
                      return (
                        <div className="grid grid-cols-2 gap-0.5 mt-0.5">
                          {chips.map(({ key, name, colorClass }) => (
                            <div key={key} className={`text-xs rounded px-1 py-0.5 truncate ${colorClass}`}>
                              {name}
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="w-72 space-y-4 self-start sticky top-4">
          {selectedDate ? (
            <div className="bg-white rounded-2xl shadow-sm border p-5">
              <DayPanel dateStr={selectedDate} panelPrefs={selectedPrefs} panelAssignments={selectedAssignments} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border p-5 text-center text-gray-400 text-sm">
              選擇日期以查看意願並分配排班
            </div>
          )}
        </div>
      </div>

      {/* ── 本月報更意願摘要 ── */}
      {prefSummaryRows.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold text-gray-800 text-sm mb-3">本月報更意願摘要</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {prefSummaryRows.map(row => {
              return (
                <div key={row.name} className="bg-white rounded-xl border p-3">
                  <div className="font-medium text-gray-800 text-sm truncate mb-2">{row.name}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">意願</span>
                      <span className="font-medium text-blue-600">{fmt(row.days)} 天</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">已排班</span>
                      <span className="font-medium text-gray-700">{fmt(row.assigned)} 天</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">剩餘</span>
                      <span className={`font-medium ${row.remaining > 0 ? 'text-orange-500' : 'text-gray-400'}`}>{fmt(row.remaining)} 天</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                      <span>{fmt(row.totalDays)} 天</span>
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

            {/* 桌面：月曆格式 */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border overflow-x-auto">
              <table className="text-xs border-collapse w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2 font-medium text-gray-600 border-r border-b min-w-[110px]">員工</th>
                    {days.map(day => {
                      const dateStr = toDateStr(day)
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6
                      const holiday = getHoliday(dateStr)
                      return (
                        <th key={dateStr} className={`text-center px-1 py-2 font-medium border-b border-r border-gray-200 min-w-[36px] ${isWeekend || holiday ? 'bg-pink-50 text-pink-400' : 'text-gray-500'}`}>
                          <div>{day.getDate()}</div>
                          <div className={`${isWeekend || holiday ? 'text-pink-300' : 'text-gray-400'}`}>{weekdays[day.getDay()]}</div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statsRows.map((row) => {
                    const dateShiftMap = new Map(row.records.map(r => [r.date, r.shift]))
                    const userPrefMap = statsPrefMap.get(row.id) ?? new Map<string, ShiftKey>()
                    return (
                      <tr key={row.name} className="hover:bg-gray-50/50">
                        <td className="sticky left-0 z-10 bg-white px-3 py-1 border-r min-w-[110px]">
                          <div className="font-medium text-gray-800">{row.name}</div>
                          <div className="text-gray-400 mt-0.5">{fmt(row.totalDays)}天 · {row.totalHours}h</div>
                        </td>
                        {days.map(day => {
                          const dateStr = toDateStr(day)
                          const isWeekend = day.getDay() === 0 || day.getDay() === 6
                          const holiday = getHoliday(dateStr)
                          const shift = dateShiftMap.get(dateStr)
                          const prefShift = userPrefMap.get(dateStr)
                          return (
                            <td key={dateStr} className={`text-center px-0.5 py-1.5 border-r border-gray-200 ${isWeekend || holiday ? 'bg-pink-50' : ''}`}>
                              {shift ? (
                                <span className={`inline-block rounded px-1 py-0.5 leading-tight ${SHIFTS[shift as ShiftKey].color}`}>
                                  {SHIFTS[shift as ShiftKey].label}
                                </span>
                              ) : prefShift && !isWeekend && !holiday ? (
                                <span className="inline-block rounded px-1 py-0.5 leading-tight bg-gray-100 text-gray-400">
                                  {SHIFTS[prefShift].label}
                                </span>
                              ) : null}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── 自動排班 Modal ── */}
      {autoAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAutoAssignOpen(false)} />
          <div className="relative bg-white rounded-2xl p-6 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-800 text-lg mb-4">自動排班</h3>
            {autoAssignResult === null ? (
              <>
                <label className="block text-sm text-gray-600 mb-1">每天所需員工人數</label>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="number" min={1} max={20} value={quota}
                    onChange={e => setQuota(Math.max(1, Number(e.target.value)))}
                    className="w-20 border rounded-lg px-3 py-2 text-center text-lg font-medium"
                  />
                  <span className="text-sm text-gray-500">人</span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mb-5 text-xs text-gray-500 space-y-1">
                  <div>優先：最早提交＋相連班次，C班優先 → 目標80小時</div>
                  <div>其次：最早提交＋獨立班次，C班優先 → 目標80小時</div>
                  <div>最後：隨機補足（C班優先）</div>
                  <div className="pt-1 text-gray-400">⚠ 已有排班不受影響</div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setAutoAssignOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50 transition">
                    取消
                  </button>
                  <button onClick={handleAutoAssign} disabled={autoAssigning}
                    className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50">
                    {autoAssigning ? '排班中...' : '確認執行'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center py-4">
                  <div className="text-4xl mb-3">✓</div>
                  <div className="text-gray-700 font-medium">已新增 {autoAssignResult} 筆排班</div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setAutoAssignOpen(false)}
                    className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition">
                    完成
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
