'use client'

import { useState, FormEvent } from 'react'
import MonthPicker from '@/components/MonthPicker'
import { WORK_TYPE_LABELS, WORK_TYPE_POINTS } from '@/lib/scoring'

type WorkLog = {
  id: string
  userId: string
  userName: string
  date: string
  workType: string
  description: string | null
  points: number
  createdAt: string
}

function fmtCreatedAt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('zh-HK', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: 'Asia/Hong_Kong',
  })
}

type Employee = { id: string; name: string }

interface Props {
  year: number
  month: number
  employees: Employee[]
  initialLogs: WorkLog[]
  onMonthChange?: (year: number, month: number) => void
}

const TYPE_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-green-100 text-green-700',
  C: 'bg-purple-100 text-purple-700',
  D: 'bg-orange-100 text-orange-700',
  E: 'bg-gray-100 text-gray-700',
}

const WORK_TYPES = ['A', 'B', 'C', 'D', 'E'] as const

export default function AdminWorkLogsClient({
  year, month, employees, initialLogs, onMonthChange,
}: Props) {
  const [logs, setLogs] = useState<WorkLog[]>(initialLogs)
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)
  const [showAdd, setShowAdd] = useState(false)
  const [addUserId, setAddUserId] = useState('')
  const [addDate, setAddDate] = useState(todayStr)
  const [addType, setAddType] = useState<string>('A')
  const [addDescription, setAddDescription] = useState('')
  const [addCustomPoints, setAddCustomPoints] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const filtered = selectedEmployee === 'all'
    ? logs
    : logs.filter(l => l.userId === selectedEmployee)

  const grouped = new Map<string, WorkLog[]>()
  for (const log of filtered) {
    const key = log.date.slice(0, 10)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(log)
  }
  const sortedDates = [...grouped.keys()].sort()

  const empSummary = new Map<string, { name: string; total: number; count: number }>()
  for (const log of logs) {
    const cur = empSummary.get(log.userId) ?? { name: log.userName, total: 0, count: 0 }
    empSummary.set(log.userId, { name: log.userName, total: cur.total + log.points, count: cur.count + 1 })
  }

  const totalPoints = filtered.reduce((sum, l) => sum + l.points, 0)

  async function handleDelete(id: string) {
    if (!confirm('確認刪除此工作記錄？')) return
    setDeletingId(id)
    const res = await fetch(`/api/worklog/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setLogs(prev => prev.filter(l => l.id !== id))
    }
    setDeletingId(null)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!addUserId) { setAddError('請選擇員工'); return }
    setAdding(true)
    setAddError('')
    const res = await fetch('/api/worklog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: addUserId,
        date: addDate,
        workType: addType,
        description: addDescription || null,
        customPoints: addType === 'E' ? addCustomPoints : undefined,
      }),
    })
    if (res.ok) {
      const newLog = await res.json()
      const emp = employees.find(e => e.id === addUserId)
      setLogs(prev => [...prev, {
        ...newLog,
        date: newLog.date.slice(0, 10),
        userName: emp?.name ?? '',
      }].sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.createdAt.localeCompare(b.createdAt)))
      setShowAdd(false)
      setAddUserId('')
      setAddDate(todayStr)
      setAddType('A')
      setAddDescription('')
      setAddCustomPoints('')
    } else {
      const data = await res.json().catch(() => ({}))
      setAddError(data.error ?? '新增失敗')
    }
    setAdding(false)
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">員工工作記錄</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            + 新增記錄
          </button>
        </div>
        <MonthPicker year={year} month={month} onChange={onMonthChange} basePath={onMonthChange ? undefined : '/admin/worklogs'} />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-4 mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-gray-500 shrink-0">篩選員工</label>
          <select
            value={selectedEmployee}
            onChange={e => setSelectedEmployee(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部員工</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          {selectedEmployee === 'all' ? (
            <span className="text-xs text-gray-500">共 {logs.length} 筆，{logs.reduce((s, l) => s + l.points, 0)} 分</span>
          ) : (
            <span className="text-xs text-gray-500">共 {filtered.length} 筆，{totalPoints} 分</span>
          )}
        </div>

        {selectedEmployee === 'all' && empSummary.size > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
            {[...empSummary.entries()].sort((a, b) => b[1].total - a[1].total).map(([id, s]) => (
              <button
                key={id}
                onClick={() => setSelectedEmployee(id)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-700 text-xs text-gray-600 transition-colors"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-gray-400">{s.total}分</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {sortedDates.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400 text-sm">
            本月暫無工作記錄
          </div>
        ) : (
          sortedDates.map(dateKey => {
            const dayLogs = grouped.get(dateKey)!
            const d = new Date(dateKey + 'T00:00:00Z')
            const dayLabel = d.toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })
            const dayTotal = dayLogs.reduce((sum, l) => sum + l.points, 0)
            return (
              <div key={dateKey} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b">
                  <span className="text-sm font-medium text-gray-700">{dayLabel}</span>
                  <span className="text-xs text-blue-600 font-medium">{dayTotal} 分</span>
                </div>
                <div className="divide-y">
                  {dayLogs.map(log => (
                    <div key={log.id} className="flex items-center gap-3 px-4 py-2.5">
                      {selectedEmployee === 'all' && (
                        <span className="text-xs font-medium text-gray-500 w-20 shrink-0 truncate">{log.userName}</span>
                      )}
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${TYPE_COLORS[log.workType] ?? 'bg-gray-100 text-gray-700'}`}>
                        {log.workType}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-xs text-gray-600 block truncate">
                          {log.description || WORK_TYPE_LABELS[log.workType]}
                        </span>
                        <span className="text-xs text-gray-400">錄入於 {fmtCreatedAt(log.createdAt)}</span>
                      </span>
                      <span className="text-sm font-medium text-gray-700 shrink-0">{log.points} 分</span>
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deletingId === log.id}
                        className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                        title="刪除"
                      >
                        {deletingId === log.id ? '…' : '✕'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">新增工作記錄</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">員工</label>
                <select
                  value={addUserId}
                  onChange={e => setAddUserId(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">選擇員工…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">日期</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={e => setAddDate(e.target.value)}
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">工作類型</label>
                <div className="grid grid-cols-5 gap-2">
                  {WORK_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddType(t)}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                        addType === t
                          ? `${TYPE_COLORS[t]} border-transparent`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {addType === 'E' ? '自訂分數' : `${WORK_TYPE_POINTS[addType]}分 · ${WORK_TYPE_LABELS[addType]}`}
                </p>
              </div>
              {addType === 'E' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">說明</label>
                    <input
                      type="text"
                      value={addDescription}
                      onChange={e => setAddDescription(e.target.value)}
                      placeholder="工作內容說明"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">分數</label>
                    <input
                      type="number"
                      value={addCustomPoints}
                      onChange={e => setAddCustomPoints(e.target.value)}
                      placeholder="自訂分數"
                      required
                      min="0"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              {addError && <p className="text-xs text-red-500">{addError}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddError('') }}
                  className="flex-1 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {adding ? '新增中…' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
