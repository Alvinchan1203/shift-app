'use client'

import { useEffect, useState } from 'react'
import AdminWorkLogsClient from '@/app/(app)/admin/worklogs/client'

type Employee = { id: string; name: string }
type WorkLog = {
  id: string; userId: string; userName: string; date: string
  workType: string; description: string | null; points: number; createdAt: string
}

function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border px-4 py-3 flex gap-4">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-12 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminWorkLogsView() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [employees, setEmployees] = useState<Employee[] | null>(null)
  const [logs, setLogs] = useState<WorkLog[] | null>(null)

  useEffect(() => {
    setLogs(null)
    Promise.all([
      fetch('/api/admin/users').then(r => r.json()),
      fetch(`/api/worklog?year=${year}&month=${month}`).then(r => r.json()),
    ]).then(([empData, logsData]) => {
      setEmployees(empData.map((e: Employee) => ({ id: e.id, name: e.name })))
      setLogs(logsData.map((l: WorkLog) => ({ ...l, date: l.date.slice(0, 10) })))
    })
  }, [year, month])

  if (!employees || !logs) return <Skeleton />

  return (
    <AdminWorkLogsClient
      key={`${year}-${month}`}
      year={year}
      month={month}
      employees={employees}
      initialLogs={logs}
      onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
    />
  )
}
