'use client'

import { useEffect, useRef, useState } from 'react'
import { WORK_TYPE_LABELS, WORK_TYPE_POINTS } from '@/lib/scoring'
import MonthPicker from '@/components/MonthPicker'

type WorkLog = {
  id: string
  date: string
  workType: string
  description: string | null
  points: number
  source: string
  createdAt: string
  deletedAt: string | null
  deletedByName: string | null
}

const WORK_TYPES = ['A', 'B', 'C', 'D', 'E'] as const
type WorkTypeKey = typeof WORK_TYPES[number]

interface Props {
  initialYear: number
  initialMonth: number
  initialLogs: WorkLog[]
  initialDeletedLogs: WorkLog[]
  initialAttendanceDates: string[]
}

function toDateStr(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('zh-HK', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Hong_Kong',
  })
}

const TYPE_COLOR: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-green-100 text-green-700',
  C: 'bg-purple-100 text-purple-700',
  D: 'bg-orange-100 text-orange-700',
  E: 'bg-gray-100 text-gray-700',
}

export default function WorkLogClient({ initialYear, initialMonth, initialLogs, initialDeletedLogs, initialAttendanceDates }: Props) {
  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [logs, setLogs] = useState<WorkLog[]>(initialLogs)
  const [deletedLogs, setDeletedLogs] = useState<WorkLog[]>(initialDeletedLogs)
  const [attendanceDates, setAttendanceDates] = useState<string[]>(initialAttendanceDates)
  const [loadingMonth, setLoadingMonth] = useState(false)
  const isInitialMount = useRef(true)

  const [date, setDate] = useState(() => toDateStr(new Date()))
  const [workType, setWorkType] = useState<WorkTypeKey>('A')
  const [description, setDescription] = useState('')
  const [customPoints, setCustomPoints] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return }
    setLoadingMonth(true)
    Promise.all([
      fetch(`/api/worklog?year=${year}&month=${month}`).then(r => r.json()),
      fetch(`/api/attendance?year=${year}&month=${month}`).then(r => r.json()),
      fetch(`/api/assignments?year=${year}&month=${month}`).then(r => r.json()),
    ]).then(([wlData, att, asgn]) => {
      const normalize = (l: WorkLog) => ({ ...l, date: l.date.slice(0, 10) })
      setLogs((wlData.active as WorkLog[]).map(normalize))
      setDeletedLogs((wlData.deleted as WorkLog[]).map(normalize))
      const attendanceDates = (att as { date: string; type: string }[])
        .filter(r => ['A', 'B', 'C'].includes(r.type))
        .map(r => r.date.slice(0, 10))
      const assignmentDates = (asgn as { date: string }[]).map(r => r.date.slice(0, 10))
      setAttendanceDates([...new Set([...attendanceDates, ...assignmentDates])])
      setLoadingMonth(false)
    }).catch(() => setLoadingMonth(false))
  }, [year, month])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!date) { setError('請選擇日期'); return }
    if (!attendanceDates.includes(date)) {
      setError('該日期沒有 A/B/C 上班記錄，無法錄入工作記錄'); return
    }
    if (workType === 'E' && (!customPoints || isNaN(parseInt(customPoints)))) {
      setError('請輸入有效分數'); return
    }
    setSubmitting(true)
    const res = await fetch('/api/worklog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, workType, description: description || null, customPoints }),
    })
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) { setError(data.error ?? '提交失敗'); return }
    const logDate = new Date(data.date)
    const logYear = logDate.getUTCFullYear()
    const logMonth = logDate.getUTCMonth() + 1
    if (logYear === year && logMonth === month) {
      setLogs(prev => [...prev, { ...data, date: data.date.slice(0, 10) }].sort((a, b) => {
        if (a.date < b.date) return -1
        if (a.date > b.date) return 1
        return a.createdAt < b.createdAt ? -1 : 1
      }))
    }
    setDescription('')
    setCustomPoints('')
    setToast('工作記錄已成功添加')
    setTimeout(() => setToast(null), 3000)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/worklog/${id}`, { method: 'DELETE' })
    if (res.ok) {
      const data = await res.json()
      const target = logs.find(l => l.id === id)
      setLogs(prev => prev.filter(l => l.id !== id))
      if (target && data.deleted) {
        setDeletedLogs(prev => [
          ...prev,
          { ...target, deletedAt: data.deleted.deletedAt, deletedByName: data.deleted.deletedByName },
        ].sort((a, b) => a.date.localeCompare(b.date)))
      }
    }
  }

  const grouped = new Map<string, WorkLog[]>()
  for (const log of logs) {
    const key = log.date.slice(0, 10)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(log)
  }
  const sortedDates = [...grouped.keys()].sort()
  const totalPoints = logs.reduce((sum, l) => sum + l.points, 0)

  const groupedDeleted = new Map<string, WorkLog[]>()
  for (const log of deletedLogs) {
    const key = log.date.slice(0, 10)
    if (!groupedDeleted.has(key)) groupedDeleted.set(key, [])
    groupedDeleted.get(key)!.push(log)
  }
  const sortedDeletedDates = [...groupedDeleted.keys()].sort()

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">工作記錄</h2>
        <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
      </div>

      {/* Submit form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-5 mb-6 space-y-4">
        <h3 className="font-semibold text-gray-700">新增工作記錄</h3>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">日期</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">工作類型</label>
          <div className="border rounded-xl overflow-hidden divide-y">
            {WORK_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setWorkType(t)}
                className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                  workType === t ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                  workType === t
                    ? t === 'A' ? 'bg-blue-600 text-white' :
                      t === 'B' ? 'bg-green-600 text-white' :
                      t === 'C' ? 'bg-purple-600 text-white' :
                      t === 'D' ? 'bg-orange-500 text-white' :
                      'bg-gray-600 text-white'
                    : t === 'A' ? 'bg-blue-100 text-blue-700' :
                      t === 'B' ? 'bg-green-100 text-green-700' :
                      t === 'C' ? 'bg-purple-100 text-purple-700' :
                      t === 'D' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                }`}>{t}</span>
                <span className="flex-1 min-w-0">
                  <span className="text-xs text-gray-600 leading-relaxed">{WORK_TYPE_LABELS[t]}</span>
                </span>
                <span className={`flex-shrink-0 text-xs font-semibold mt-0.5 ${workType === t ? 'text-blue-600' : 'text-gray-400'}`}>
                  {t !== 'E' ? `${WORK_TYPE_POINTS[t]}分` : '自訂'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {workType === 'E' && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">分數</label>
              <input
                type="number"
                value={customPoints}
                onChange={e => setCustomPoints(e.target.value)}
                placeholder="請輸入分數"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
                min={0}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">說明（請列明工作內容）</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="請列明工作內容"
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? '提交中...' : '新增記錄'}
        </button>
      </form>

      {/* Active logs */}
      <div className={`space-y-4 transition-opacity ${loadingMonth ? 'opacity-50' : ''}`}>
        {sortedDates.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400 text-sm">
            本月暫無工作記錄
          </div>
        ) : (
          <>
            {sortedDates.map(dateKey => {
              const dayLogs = grouped.get(dateKey)!
              const d = new Date(dateKey + 'T00:00:00Z')
              const dayLabel = d.toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })
              const dayTotal = dayLogs.reduce((sum, l) => sum + l.points, 0)
              return (
                <div key={dateKey} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                    <span className="text-sm font-medium text-gray-700">{dayLabel}</span>
                    <span className="text-xs text-blue-600 font-medium">{dayTotal} 分</span>
                  </div>
                  <div className="divide-y">
                    {dayLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${TYPE_COLOR[log.workType] ?? 'bg-gray-100 text-gray-700'}`}>{log.workType}</span>
                          <span className="min-w-0">
                            <span className="text-xs text-gray-500 truncate block">{log.description || WORK_TYPE_LABELS[log.workType]}</span>
                            <span className="text-xs text-gray-400">錄入於 {fmtTime(log.createdAt)}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-sm font-medium text-gray-700">{log.points} 分</span>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                          >×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            <div className="bg-blue-50 rounded-2xl border border-blue-200 px-5 py-4 flex items-center justify-between">
              <span className="text-sm font-medium text-blue-800">本月工作分數合計</span>
              <span className="text-lg font-bold text-blue-700">{totalPoints} 分</span>
            </div>
          </>
        )}

        {/* Deleted logs */}
        {sortedDeletedDates.length > 0 && (
          <details className="group mt-2">
            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-500 select-none flex items-center gap-1 py-1">
              <span className="transition-transform group-open:rotate-90 inline-block">›</span>
              已刪除記錄（{deletedLogs.length}）
            </summary>
            <div className="space-y-3 mt-2">
              {sortedDeletedDates.map(dateKey => {
                const dayLogs = groupedDeleted.get(dateKey)!
                const d = new Date(dateKey + 'T00:00:00Z')
                const dayLabel = d.toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })
                return (
                  <div key={dateKey} className="bg-gray-50 rounded-xl border border-dashed border-gray-200 overflow-hidden">
                    <div className="px-4 py-2 border-b border-dashed border-gray-200">
                      <span className="text-xs font-medium text-gray-400">{dayLabel}</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {dayLogs.map(log => (
                        <div key={log.id} className="flex items-center gap-3 px-4 py-2.5 opacity-60">
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold grayscale ${TYPE_COLOR[log.workType] ?? 'bg-gray-100 text-gray-700'}`}>{log.workType}</span>
                          <span className="flex-1 min-w-0">
                            <span className="text-xs text-gray-500 line-through truncate block">{log.description || WORK_TYPE_LABELS[log.workType]}</span>
                            <span className="text-xs text-gray-400">
                              {log.deletedByName && log.deletedByName !== (log as any).userId
                                ? `管理員已於 ${fmtTime(log.deletedAt!)} 刪除`
                                : `已於 ${fmtTime(log.deletedAt!)} 刪除`}
                            </span>
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{log.points} 分</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </main>
  )
}
