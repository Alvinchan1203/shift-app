'use client'

import { useEffect, useState } from 'react'
import MonthPicker from '@/components/MonthPicker'
import ShiftBadge from '@/components/ShiftBadge'
import { ShiftKey } from '@/lib/constants'

type Employee = { id: string; name: string }
type Pref = { id: string; date: string; shift: string; userId?: string; user?: { id: string } }
type Submission = { userId: string; submittedAt: string; confirmedAt: string | null }

function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border overflow-hidden">
            <div className="bg-gray-50 px-5 py-3 border-b flex items-center justify-between">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-28 bg-gray-100 rounded-full animate-pulse" />
            </div>
            <div className="px-5 py-3 flex flex-wrap gap-2">
              {[...Array(8)].map((_, j) => (
                <div key={j} className="h-7 w-20 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminPreferencesView() {
  const today = new Date()
  const defaultDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const [year, setYear] = useState(defaultDate.getFullYear())
  const [month, setMonth] = useState(defaultDate.getMonth() + 1)

  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [prefs, setPrefs] = useState<Pref[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [hideTesting, setHideTesting] = useState(true)

  useEffect(() => {
    setEmployees(null)
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch(`/api/preferences?year=${year}&month=${month}`).then(r => r.json()),
      fetch(`/api/preferences/submit?year=${year}&month=${month}`).then(r => r.json()),
    ]).then(([empData, prefsData, subsData]) => {
      const monthPrefix = `${year}-${String(month).padStart(2, '0')}`
      setEmployees(empData.filter((e: Employee & { role: string }) => e.role === 'EMPLOYEE'))
      setPrefs(
        prefsData
          .map((p: Pref & { date: string; user?: { id: string } }) => ({
            ...p,
            date: p.date.slice(0, 10),
            userId: p.user?.id ?? p.userId,
          }))
          .filter((p: Pref) => p.date.startsWith(monthPrefix))
      )
      setSubmissions(Array.isArray(subsData) ? subsData : [])
    })
  }, [year, month, refreshKey])

  if (!employees) return <Skeleton />

  const submissionByUser: Record<string, Submission> = {}
  for (const s of submissions) {
    submissionByUser[s.userId] = s
  }

  const prefsByUser: Record<string, Pref[]> = {}
  for (const p of prefs) {
    const uid = p.userId ?? ''
    if (!uid) continue
    if (!prefsByUser[uid]) prefsByUser[uid] = []
    prefsByUser[uid].push(p)
  }

  const sortedEmployees = [...employees].sort((a, b) => {
    const aTime = submissionByUser[a.id]?.submittedAt
      ? new Date(submissionByUser[a.id].submittedAt).getTime()
      : Infinity
    const bTime = submissionByUser[b.id]?.submittedAt
      ? new Date(submissionByUser[b.id].submittedAt).getTime()
      : Infinity
    if (aTime !== bTime) return aTime - bTime
    return a.name.localeCompare(b.name)
  })

  const displayEmployees = hideTesting
    ? sortedEmployees.filter(e => !e.name.toLowerCase().startsWith('testing'))
    : sortedEmployees
  const submittedCount = displayEmployees.filter(e => submissionByUser[e.id]?.confirmedAt != null).length

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">Bee上班意願</h2>
          {displayEmployees.length > 0 && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              submittedCount === displayEmployees.length
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}>
              已提交 {submittedCount} / {displayEmployees.length} 人
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setHideTesting(h => !h)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${hideTesting ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'}`}
          >
            {hideTesting ? '顯示測試帳戶' : '隱藏測試帳戶'}
          </button>
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m) }} />
          <button onClick={() => setRefreshKey(k => k + 1)} className="px-2.5 py-1.5 rounded-lg border hover:bg-gray-100 text-gray-500 transition" title="重新整理">↺</button>
        </div>
      </div>

      {displayEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border p-8 text-center text-gray-400">暫無員工帳號</div>
      ) : (
        <div className="space-y-4">
          {displayEmployees.map(emp => {
            const subRecord = submissionByUser[emp.id]
            const empPrefs = prefsByUser[emp.id] ?? []
            return (
              <div key={emp.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="bg-gray-50 px-5 py-3 border-b flex items-center justify-between">
                  <span className="font-medium text-gray-800">{emp.name}</span>
                  {subRecord?.confirmedAt != null ? (
                    <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      確認提交於{' '}
                      {new Date(subRecord.confirmedAt).toLocaleString('zh-HK', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                      未提交
                    </span>
                  )}
                </div>
                {empPrefs.length > 0 ? (
                  <div className="px-5 py-3 flex flex-wrap gap-2">
                    {empPrefs.map(p => (
                      <div key={p.id} className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5 border">
                        <span>
                          {new Date(p.date + 'T00:00:00').toLocaleDateString('zh-HK', {
                            month: 'short', day: 'numeric', weekday: 'short',
                          })}
                        </span>
                        <ShiftBadge shift={p.shift as ShiftKey} />
                      </div>
                    ))}
                  </div>
                ) : subRecord ? (
                  <p className="text-sm text-gray-400 px-5 py-4">未選擇任何班次</p>
                ) : (
                  <p className="text-sm text-gray-400 px-5 py-4">—</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
