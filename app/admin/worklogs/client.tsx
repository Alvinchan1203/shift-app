'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  prevYear: number
  prevMonth: number
  nextYear: number
  nextMonth: number
  employees: Employee[]
  initialLogs: WorkLog[]
}

const TYPE_COLORS: Record<string, string> = {
  A: 'bg-blue-100 text-blue-700',
  B: 'bg-green-100 text-green-700',
  C: 'bg-purple-100 text-purple-700',
  D: 'bg-orange-100 text-orange-700',
  E: 'bg-gray-100 text-gray-700',
}

export default function AdminWorkLogsClient({
  year, month, prevYear, prevMonth, nextYear, nextMonth, employees, initialLogs,
}: Props) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all')

  const monthLabel = new Date(year, month - 1).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })

  const filtered = selectedEmployee === 'all'
    ? initialLogs
    : initialLogs.filter(l => l.userId === selectedEmployee)

  // Group by date
  const grouped = new Map<string, WorkLog[]>()
  for (const log of filtered) {
    const key = log.date.slice(0, 10)
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(log)
  }
  const sortedDates = [...grouped.keys()].sort()

  // Summary per employee
  const empSummary = new Map<string, { name: string; total: number; count: number }>()
  for (const log of initialLogs) {
    const cur = empSummary.get(log.userId) ?? { name: log.userName, total: 0, count: 0 }
    empSummary.set(log.userId, { name: log.userName, total: cur.total + log.points, count: cur.count + 1 })
  }

  const totalPoints = filtered.reduce((sum, l) => sum + l.points, 0)

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">員工工作記錄</h2>
        <div className="flex items-center gap-2">
          <Link href={`/admin/worklogs?year=${prevYear}&month=${prevMonth}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">‹</Link>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">{monthLabel}</span>
          <Link href={`/admin/worklogs?year=${nextYear}&month=${nextMonth}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">›</Link>
        </div>
      </div>

      {/* Employee filter + summary */}
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
            <span className="text-xs text-gray-500">共 {initialLogs.length} 筆，{initialLogs.reduce((s, l) => s + l.points, 0)} 分</span>
          ) : (
            <span className="text-xs text-gray-500">共 {filtered.length} 筆，{totalPoints} 分</span>
          )}
        </div>

        {/* Per-employee summary chips */}
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

      {/* Logs */}
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
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </main>
  )
}
