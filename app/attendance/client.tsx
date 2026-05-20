'use client'

import { useEffect, useRef, useState } from 'react'
import { ATTENDANCE_TYPES, AttendanceTypeKey, SHIFT_DURATIONS, formatDuration } from '@/lib/constants'
import MonthPicker from '@/components/MonthPicker'

type User = { id: string; name: string }
type AttendanceRecord = {
  id: string; userId: string; date: string; type: AttendanceTypeKey; note?: string | null; durationMinutes?: number | null
  user?: { id: string; name: string }
}
type Assignment = { userId: string; date: string; shift: string }
type Holiday = { id: string; date: string; name: string }
type AttendanceLog = {
  id: string; userId: string; userName: string; date: string
  type: AttendanceTypeKey; action: string; adminId: string; adminName: string; createdAt: string
}

type DurationType = 'OT' | 'SPECIAL'
const DURATION_TYPES: DurationType[] = ['OT', 'SPECIAL']

type InitialData = {
  initialYear: number
  initialMonth: number
  records: { id: string; userId: string; date: string; type: string; note: string | null; durationMinutes: number | null }[]
  assignments: { userId: string; date: string; shift: string }[]
  holidays: { id: string; date: string; name: string }[]
  confirmedMinutesMap: Record<string, number | null>
  logs: { id: string; userId: string; userName: string; date: string; type: string; action: string; adminId: string; adminName: string; createdAt: string }[]
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

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  isAdmin: boolean
  users: User[]
  currentUserId: string
  initialData: InitialData
}

export default function AttendanceClient({ isAdmin, users, currentUserId, initialData }: Props) {
  const [year, setYear] = useState(initialData.initialYear)
  const [month, setMonth] = useState(initialData.initialMonth)
  const [records, setRecords] = useState<AttendanceRecord[]>(initialData.records as AttendanceRecord[])
  const [assignments, setAssignments] = useState<Assignment[]>(initialData.assignments)
  const [holidays] = useState<Holiday[]>(initialData.holidays)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const isInitialMount = useRef(true)

  const [modal, setModal] = useState<{ userId: string; userName: string; dateStr: string; currentTypes: AttendanceTypeKey[] } | null>(null)
  const [selectedTypes, setSelectedTypes] = useState<AttendanceTypeKey[]>([])
  const [durations, setDurations] = useState<Partial<Record<DurationType, { h: string; m: string }>>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [logs, setLogs] = useState<AttendanceLog[]>(initialData.logs as AttendanceLog[])
  const [showLog, setShowLog] = useState(false)
  const [confirmedMins, setConfirmedMins] = useState<Record<string, number | null>>(initialData.confirmedMinutesMap ?? {})
  const [hoursModal, setHoursModal] = useState<{ userId: string; userName: string } | null>(null)
  const [hoursInput, setHoursInput] = useState('')
  const [hoursSaving, setHoursSaving] = useState(false)

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return }
    setLoadingMonth(true)
    const m1 = month + 1
    Promise.all([
      fetch(`/api/attendance?year=${year}&month=${m1}`).then(r => r.json()),
      fetch(`/api/assignments?year=${year}&month=${m1}`).then(r => r.json()),
      fetch(`/api/attendance/confirm-hours?year=${year}&month=${m1}`).then(r => r.json()),
    ]).then(([att, asgn, confirmMap]) => {
      setRecords(att.map((r: AttendanceRecord) => ({ ...r, date: r.date.slice(0, 10) })))
      setAssignments(asgn.map((a: Assignment) => ({ ...a, date: a.date.slice(0, 10) })))
      setConfirmedMins(confirmMap)
      setLoadingMonth(false)
    })
  }, [year, month])

  const days = getMonthDays(year, month)
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`

  function getRecords(userId: string, dateStr: string) {
    return records.filter(r => r.userId === userId && r.date === dateStr)
  }

  function getAssignment(userId: string, dateStr: string) {
    return assignments.find(a => a.userId === userId && a.date === dateStr) ?? null
  }

  function isRestDay(day: Date) {
    const dow = day.getDay()
    const dateStr = toDateStr(day)
    const holiday = holidays.find(h => h.date === dateStr)
    return { rest: dow === 0 || dow === 6 || !!holiday, holidayName: holiday?.name }
  }

  function calcMonthlyMinutes(userId: string): number {
    let total = 0
    const monthRecords = records.filter(r => r.userId === userId && r.date.startsWith(monthPrefix))
    const recordedDates = new Set(monthRecords.map(r => r.date))
    for (const r of monthRecords) {
      if (r.type === 'OT' || r.type === 'SPECIAL') {
        total += r.durationMinutes ?? 0
      } else {
        total += SHIFT_DURATIONS[r.type] ?? 0
      }
    }
    // Also count assignment prefill for days with no saved records
    for (const a of assignments.filter(a => a.userId === userId && a.date.startsWith(monthPrefix))) {
      if (!recordedDates.has(a.date)) {
        total += SHIFT_DURATIONS[a.shift as AttendanceTypeKey] ?? 0
      }
    }
    return total
  }

  function openModal(userId: string, userName: string, dateStr: string) {
    const existingRecords = getRecords(userId, dateStr)
    const existing = existingRecords.map(r => r.type)
    const assignment = getAssignment(userId, dateStr)
    const initial = existing.length > 0 ? existing : (assignment ? [assignment.shift as AttendanceTypeKey] : [])

    const initDurations: Partial<Record<DurationType, { h: string; m: string }>> = {}
    for (const type of DURATION_TYPES) {
      const rec = existingRecords.find(r => r.type === type)
      if (rec?.durationMinutes) {
        initDurations[type] = {
          h: String(Math.floor(rec.durationMinutes / 60)),
          m: String(rec.durationMinutes % 60),
        }
      }
    }

    setSaving(false)
    setSaveError(null)
    setDurations(initDurations)
    setModal({ userId, userName, dateStr, currentTypes: existing })
    setSelectedTypes(initial)
  }

  function toggleType(key: AttendanceTypeKey) {
    setSelectedTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key])
  }

  function getDurationMinutes(type: DurationType): number | undefined {
    const d = durations[type]
    if (!d) return undefined
    const total = (parseInt(d.h) || 0) * 60 + (parseInt(d.m) || 0)
    return total > 0 ? total : undefined
  }

  async function saveRecords() {
    if (!modal) return
    setSaving(true)
    try {
      const toAdd = selectedTypes.filter(t => !modal.currentTypes.includes(t))
      const toRemove = modal.currentTypes.filter(t => !selectedTypes.includes(t))
      const toUpdateDuration = DURATION_TYPES.filter(t => selectedTypes.includes(t) && modal.currentTypes.includes(t))

      const typesToPost = [
        ...toAdd.map(t => t),
        ...toUpdateDuration.map(t => t as AttendanceTypeKey),
      ]

      const postResults = await Promise.all(
        typesToPost.map(async type => {
          const dm = (type === 'OT' || type === 'SPECIAL') ? getDurationMinutes(type) : undefined
          const r = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: modal.userId, date: modal.dateStr, type, durationMinutes: dm ?? null }),
          })
          const data = await r.json()
          if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`)
          return data
        })
      )

      await Promise.all(
        toRemove.map(type => fetch('/api/attendance', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: modal.userId, date: modal.dateStr, type }),
        }))
      )

      setRecords(prev => {
        let updated = prev.filter(r => !(
          r.userId === modal.userId && r.date === modal.dateStr &&
          (toRemove.includes(r.type) || (toUpdateDuration as string[]).includes(r.type))
        ))
        for (const saved of postResults) {
          if (saved && saved.id) {
            updated = [...updated, { ...saved, date: saved.date.slice(0, 10) }]
          }
        }
        return updated
      })
      setSaveError(null)
      setModal(null)
      if (isAdmin) fetch('/api/attendance/log').then(r => r.json()).then(setLogs)
    } catch (e: any) {
      setSaveError(e?.message ?? '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLog(id: string) {
    await fetch('/api/attendance/log', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  async function deleteAllRecords() {
    if (!modal) return
    setSaving(true)
    try {
      await fetch('/api/attendance', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: modal.userId, date: modal.dateStr }),
      })
      setRecords(prev => prev.filter(r => !(r.userId === modal.userId && r.date === modal.dateStr)))
      setModal(null)
      if (isAdmin) fetch('/api/attendance/log').then(r => r.json()).then(setLogs)
    } finally {
      setSaving(false)
    }
  }


  function openHoursModal(userId: string, userName: string) {
    const mins = confirmedMins[userId]
    setHoursInput(mins != null ? String(Math.round(mins / 60 * 10) / 10) : '')
    setHoursModal({ userId, userName })
  }

  async function saveConfirmedHours() {
    if (!hoursModal) return
    setHoursSaving(true)
    const hours = parseFloat(hoursInput)
    const confirmedMinutes = !hoursInput.trim() || isNaN(hours) || hours < 0 ? null : Math.round(hours * 60)
    const res = await fetch('/api/attendance/confirm-hours', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: hoursModal.userId, year, month: month + 1, confirmedMinutes }),
    })
    setHoursSaving(false)
    if (res.ok) {
      setConfirmedMins(prev => ({ ...prev, [hoursModal!.userId]: confirmedMinutes }))
      setHoursModal(null)
    }
  }

  const monthDays = days

  // ── 圖例 ──
  const Legend = () => (
    <div className="flex flex-wrap gap-2 mb-5">
      {(Object.entries(ATTENDANCE_TYPES) as [AttendanceTypeKey, typeof ATTENDANCE_TYPES[AttendanceTypeKey]][]).map(([key, t]) => (
        <div key={key} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${t.bg} ${t.text} ${t.border}`}>
          <span className="font-medium">{t.label}</span>
          <span className="opacity-70">{t.desc}</span>
        </div>
      ))}
    </div>
  )

  // ── 出勤格子 ──
  function Cell({ userId, userName, dateStr, restDay }: { userId: string; userName: string; dateStr: string; restDay: boolean }) {
    const dayRecords = getRecords(userId, dateStr)
    const assignment = getAssignment(userId, dateStr)
    const prefill = dayRecords.length === 0 && assignment ? assignment.shift as AttendanceTypeKey : null

    if (restDay) return <td className="border border-gray-100 bg-pink-50 w-9" />

    if (!isAdmin) {
      return (
        <td className="border border-gray-100 w-9 p-0">
          {dayRecords.length > 0 ? (
            <div className="flex flex-col">
              {dayRecords.map(r => (
                <div key={r.id} className={`flex items-center justify-center text-xs font-medium py-1 ${ATTENDANCE_TYPES[r.type].bg} ${ATTENDANCE_TYPES[r.type].text}`}>
                  {ATTENDANCE_TYPES[r.type].label}
                </div>
              ))}
            </div>
          ) : prefill ? (
            <div className={`flex items-center justify-center text-xs font-medium py-1.5 opacity-50 ${ATTENDANCE_TYPES[prefill].bg} ${ATTENDANCE_TYPES[prefill].text}`}>
              {ATTENDANCE_TYPES[prefill].label}
            </div>
          ) : <div className="py-1.5" />}
        </td>
      )
    }

    return (
      <td className="border border-gray-100 w-9 p-0">
        <button
          onClick={() => openModal(userId, userName, dateStr)}
          className={`flex flex-col items-center justify-center text-xs font-medium w-full h-full min-h-[26px] transition
            ${dayRecords.length === 0 && !prefill ? 'hover:bg-blue-50 text-gray-200 hover:text-blue-400' : ''}`}
        >
          {dayRecords.length > 0 ? (
            dayRecords.map(r => (
              <span key={r.id} className={`w-full text-center py-0.5 ${ATTENDANCE_TYPES[r.type].bg} ${ATTENDANCE_TYPES[r.type].text}`}>
                {ATTENDANCE_TYPES[r.type].label}
              </span>
            ))
          ) : prefill ? (
            <span className={`w-full text-center py-1.5 opacity-50 border border-dashed ${ATTENDANCE_TYPES[prefill].bg} ${ATTENDANCE_TYPES[prefill].text}`}>
              {ATTENDANCE_TYPES[prefill].label}
            </span>
          ) : '+'}
        </button>
      </td>
    )
  }

  const monthRecordsEmployee = records.filter(r => r.date.startsWith(monthPrefix))
  const totalMinutesEmployee = calcMonthlyMinutes(currentUserId)

  return (
    <div>
      <Legend />

      {/* 月份導航 */}
      <div className="flex justify-center mb-4">
        <MonthPicker year={year} month={month + 1} onChange={(y, m) => { setYear(y); setMonth(m - 1) }} />
      </div>

      {/* ── Roster 表格（橫向捲動）── */}
      <div className={`overflow-x-auto rounded-2xl border shadow-sm bg-white transition-opacity ${loadingMonth ? 'opacity-50 pointer-events-none' : ''}`}>
        <table className="border-collapse min-w-max text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-2.5 font-medium text-gray-600 min-w-[110px] border-r">員工</th>
              {monthDays.map(day => {
                const { rest } = isRestDay(day)
                return (
                  <th key={toDateStr(day)} className={`text-center px-0 py-2 font-medium w-9 text-xs ${rest ? 'text-pink-400 bg-pink-50' : 'text-gray-500'}`}>
                    <div>{day.getDate()}</div>
                    <div className="text-gray-300 font-normal">{'日一二三四五六'[day.getDay()]}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(user => {
              const totalMins = calcMonthlyMinutes(user.id)
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white hover:bg-gray-50 px-3 py-1 border-r min-w-[110px]">
                    <div className="font-medium text-gray-800 text-sm leading-tight">{user.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-400">{formatDuration(totalMins)}</span>
                      {isAdmin ? (
                        <button
                          onClick={() => openHoursModal(user.id, user.name)}
                          className={`text-xs transition ${confirmedMins[user.id] != null ? 'text-green-600 font-medium' : 'text-gray-300 hover:text-blue-400'}`}
                        >
                          {confirmedMins[user.id] != null ? `· ✓ ${formatDuration(confirmedMins[user.id]!)}` : '· 設工時'}
                        </button>
                      ) : confirmedMins[user.id] != null ? (
                        <span className="text-xs text-green-600 font-medium">· ✓ {formatDuration(confirmedMins[user.id]!)}</span>
                      ) : null}
                    </div>
                  </td>
                  {monthDays.map(day => {
                    const dateStr = toDateStr(day)
                    const { rest } = isRestDay(day)
                    return <Cell key={dateStr} userId={user.id} userName={user.name} dateStr={dateStr} restDay={rest} />
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── 修改記錄（管理員）── */}
      {isAdmin && (
        <div className="mt-8">
          <button
            onClick={() => setShowLog(v => !v)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 mb-3"
          >
            <span>修改記錄</span>
            <span className="text-gray-400">{showLog ? '▲' : '▼'}</span>
          </button>
          {showLog && (
            logs.length === 0 ? (
              <p className="text-sm text-gray-400">暫無修改記錄</p>
            ) : (
              <div className="bg-white rounded-2xl border shadow-sm divide-y text-sm">
                {logs.map(log => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-2.5 gap-3 group">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${log.action === 'ADD' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {log.action === 'ADD' ? '新增' : '刪除'}
                      </span>
                      <span className="text-gray-700 font-medium truncate">{log.userName}</span>
                      <span className="text-gray-400">{new Date(log.date).toLocaleDateString('zh-HK', { month: 'short', day: 'numeric' })}</span>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ATTENDANCE_TYPES[log.type]?.bg} ${ATTENDANCE_TYPES[log.type]?.text}`}>
                        {ATTENDANCE_TYPES[log.type]?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-gray-500">{log.adminName}</div>
                        <div className="text-xs text-gray-300">
                          {new Date(log.createdAt).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteLog(log.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition text-lg leading-none"
                        title="刪除此記錄"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* ── 員工個人出勤記錄（手機 / 個人檢視）── */}
      {!isAdmin && (
        <div className="mt-8">
          {confirmedMins[currentUserId] != null && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-3">
              <span className="text-sm text-green-700 font-medium">✓ 管理員已確認本月工時：{formatDuration(confirmedMins[currentUserId]!)}</span>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-700">本月出勤明細</h3>
            {totalMinutesEmployee > 0 && (
              <span className="text-sm font-semibold text-blue-700">
                估算工時 {formatDuration(totalMinutesEmployee)}
              </span>
            )}
          </div>
          {monthRecordsEmployee.length === 0 ? (
            <p className="text-sm text-gray-400">本月暫無出勤記錄</p>
          ) : (
            <div className="bg-white rounded-2xl border divide-y">
              {monthRecordsEmployee
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(r => (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-gray-700">
                      {new Date(r.date + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })}
                    </span>
                    <div className="flex items-center gap-2">
                      {(r.type === 'OT' || r.type === 'SPECIAL') && r.durationMinutes != null && r.durationMinutes > 0 && (
                        <span className="text-xs text-gray-500">{formatDuration(r.durationMinutes)}</span>
                      )}
                      <div className={`text-xs font-medium px-2.5 py-1 rounded-lg border ${ATTENDANCE_TYPES[r.type].bg} ${ATTENDANCE_TYPES[r.type].text} ${ATTENDANCE_TYPES[r.type].border}`}>
                        {ATTENDANCE_TYPES[r.type].label} {ATTENDANCE_TYPES[r.type].desc}
                      </div>
                    </div>
                  </div>
                ))}
              {totalMinutesEmployee > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-b-2xl">
                  <span className="text-sm font-medium text-gray-600">本月總工時</span>
                  <span className="text-sm font-semibold text-blue-700">{formatDuration(totalMinutesEmployee)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 編輯 Modal（管理員）── */}
      {modal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-800">{modal.userName}</p>
                <p className="text-sm text-gray-500">
                  {new Date(modal.dateStr + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {(Object.entries(ATTENDANCE_TYPES) as [AttendanceTypeKey, typeof ATTENDANCE_TYPES[AttendanceTypeKey]][]).map(([key, t]) => (
                <button
                  key={key}
                  disabled={saving}
                  onClick={() => toggleType(key)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition text-sm font-medium
                    ${selectedTypes.includes(key) ? 'ring-2 ring-blue-400' : 'hover:opacity-80'}
                    ${t.bg} ${t.text} ${t.border}`}
                >
                  <span className="w-7 text-center">{t.label}</span>
                  <span className="opacity-80 text-xs">{t.desc}</span>
                </button>
              ))}
            </div>

            {(selectedTypes.includes('OT') || selectedTypes.includes('SPECIAL')) && (
              <div className="mb-4 space-y-2 border rounded-xl p-3 bg-gray-50">
                {DURATION_TYPES.filter(t => selectedTypes.includes(t)).map(type => (
                  <div key={type} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-20 shrink-0">{type === 'OT' ? 'OT時數' : '特別更時數'}</span>
                    <input
                      type="number" min="0" max="23"
                      placeholder="時"
                      value={durations[type]?.h ?? ''}
                      onChange={e => setDurations(prev => ({ ...prev, [type]: { h: e.target.value, m: prev[type]?.m ?? '' } }))}
                      className="w-14 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <span className="text-xs text-gray-500">時</span>
                    <input
                      type="number" min="0" max="59"
                      placeholder="分"
                      value={durations[type]?.m ?? ''}
                      onChange={e => setDurations(prev => ({ ...prev, [type]: { h: prev[type]?.h ?? '', m: e.target.value } }))}
                      className="w-14 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <span className="text-xs text-gray-500">分</span>
                  </div>
                ))}
              </div>
            )}

            {saveError && (
              <p className="text-xs text-red-500 mb-2">{saveError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={saveRecords}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50"
              >
                {saving ? '處理中...' : '儲存'}
              </button>
              {(modal.currentTypes.length > 0 || selectedTypes.length > 0) && (
                <button
                  onClick={deleteAllRecords}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm hover:bg-red-100 transition disabled:opacity-50"
                >
                  清除
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 確認工時 Modal（管理員）── */}
      {hoursModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setHoursModal(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-xs shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-semibold text-gray-800">{hoursModal.userName}</p>
                <p className="text-sm text-gray-500">設定本月確認工時</p>
              </div>
              <button onClick={() => setHoursModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number"
                value={hoursInput}
                onChange={e => setHoursInput(e.target.value)}
                placeholder="例如 72.5"
                min={0}
                step={0.5}
                className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600 shrink-0">小時</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">留空並確認可清除已設定的工時</p>
            <div className="flex gap-2">
              <button onClick={() => setHoursModal(null)} className="flex-1 border border-gray-300 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition">取消</button>
              <button onClick={saveConfirmedHours} disabled={hoursSaving} className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition">
                {hoursSaving ? '儲存中...' : '確認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
