'use client'

import { useEffect, useState } from 'react'
import WorkLogClient from '@/app/(app)/employee/worklog/client'

type WorkLog = {
  id: string; date: string; workType: string; description: string | null
  points: number; source: string; createdAt: string; deletedAt: string | null; deletedByName: string | null
}

function Skeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border px-4 py-3 flex gap-4">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-10 bg-gray-100 rounded animate-pulse" />
            <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EmployeeWorkLogView() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const [logs, setLogs] = useState<WorkLog[] | null>(null)
  const [deletedLogs, setDeletedLogs] = useState<WorkLog[] | null>(null)
  const [attendanceDates, setAttendanceDates] = useState<string[] | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/worklog?year=${year}&month=${month}`).then(r => r.json()),
      fetch(`/api/attendance?year=${year}&month=${month}`).then(r => r.json()),
    ]).then(([wlData, att]) => {
      const normalize = (l: WorkLog) => ({ ...l, date: l.date.slice(0, 10) })
      setLogs((wlData.active as WorkLog[]).map(normalize))
      setDeletedLogs((wlData.deleted as WorkLog[]).map(normalize))
      setAttendanceDates((att as { date: string; type: string }[])
        .filter(r => ['A', 'B', 'C'].includes(r.type))
        .map(r => r.date.slice(0, 10)))
    })
  }, [])

  if (!logs || !deletedLogs || !attendanceDates) return <Skeleton />

  return (
    <WorkLogClient
      initialYear={year}
      initialMonth={month}
      initialLogs={logs}
      initialDeletedLogs={deletedLogs}
      initialAttendanceDates={attendanceDates}
    />
  )
}
