'use client'

import { useEffect, useState } from 'react'
import AttendanceClient from '@/app/(app)/attendance/client'

type User = { id: string; name: string; cannotWitness?: boolean }

function Skeleton() {
  return (
    <div className="px-4 py-6">
      <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="h-10 bg-gray-50 border-b animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 border-b bg-gray-50 animate-pulse" />
        ))}
      </div>
    </div>
  )
}

interface Props {
  userId: string
  userName: string
}

export default function EmployeeFullAttendanceView({ userId, userName }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [initialData, setInitialData] = useState<object | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setLoaded(false)
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const m1 = month + 1

    Promise.all([
      fetch(`/api/attendance?year=${year}&month=${m1}&all=true`).then(r => r.json()),
      fetch(`/api/assignments?year=${year}&month=${m1}&all=true`).then(r => r.json()),
      fetch('/api/holidays').then(r => r.json()),
      fetch(`/api/attendance/confirm-hours?year=${year}&month=${m1}&all=true`).then(r => r.json()),
      fetch(`/api/schedule-publish?year=${year}&month=${m1}`).then(r => r.json()),
      fetch('/api/users').then(r => r.json()),
    ]).then(([records, assignments, holidays, confirmedMins, publishData, usersData]) => {
      setUsers(
        (usersData as (User & { name: string })[])
          .filter(u => !u.name.toLowerCase().startsWith('testing'))
      )
      setInitialData({
        initialYear: year,
        initialMonth: month,
        isPublished: !!publishData?.published,
        records: records.map((r: { date: string } & object) => ({ ...r, date: r.date.slice(0, 10) })),
        assignments: assignments.map((a: { date: string } & object) => ({ ...a, date: a.date.slice(0, 10) })),
        holidays: holidays.map((h: { date: string } & object) => ({ ...h, date: h.date.slice(0, 10) })),
        confirmedMinutesMap: confirmedMins ?? {},
        logs: [],
      })
      setLoaded(true)
    })
  }, [refreshKey])

  if (!loaded || !initialData) return <Skeleton />

  return (
    <main className="px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">全員出勤記錄</h2>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="px-2.5 py-1.5 rounded-lg border hover:bg-gray-100 text-gray-500 transition"
          title="重新整理"
        >
          ↺
        </button>
      </div>
      <AttendanceClient
        isAdmin={false}
        users={users}
        currentUserId={userId}
        initialData={initialData as Parameters<typeof AttendanceClient>[0]['initialData']}
      />
    </main>
  )
}
