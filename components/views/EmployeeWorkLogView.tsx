'use client'

import { useEffect, useState } from 'react'
import WorkLogClient from '@/app/(app)/employee/worklog/client'

type WorkLog = { id: string; date: string; workType: string; description: string | null; points: number; createdAt: string }

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
  const [data, setData] = useState<WorkLog[] | null>(null)
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  useEffect(() => {
    fetch(`/api/worklog?year=${year}&month=${month}`)
      .then(r => r.json())
      .then((logs: WorkLog[]) =>
        setData(logs.map(l => ({ ...l, date: l.date.slice(0, 10) })))
      )
  }, [])

  if (!data) return <Skeleton />

  return (
    <WorkLogClient initialYear={year} initialMonth={month} initialLogs={data} />
  )
}
