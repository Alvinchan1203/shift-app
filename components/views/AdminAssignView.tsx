'use client'

import { useEffect, useState } from 'react'
import AdminAssignClient from '@/app/(app)/admin/assign/client'
import FeishuToggle from '@/components/FeishuToggle'
import { ShiftKey } from '@/lib/constants'

type Pref = { id: string; date: string; shift: ShiftKey; user: { id: string; name: string } }
type Assignment = { id: string; date: string; shift: ShiftKey; userId: string; user: { id: string; name: string } }
type Holiday = { id: string; date: string; name: string }

function Skeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="h-10 bg-gray-50 border-b animate-pulse" />
        <div className="grid grid-cols-7">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="border-b border-r min-h-[80px] bg-gray-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminAssignView() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const month1 = month + 1
  const [initialData, setInitialData] = useState<null | object>(null)
  const [notifyEnabled, setNotifyEnabled] = useState(false)

  useEffect(() => {
    setInitialData(null)
    Promise.all([
      fetch('/api/preferences').then(r => r.json()),
      fetch('/api/assignments').then(r => r.json()),
      fetch('/api/holidays').then(r => r.json()),
      fetch(`/api/preferences/submit?year=${year}&month=${month1}`).then(r => r.json()),
      fetch(`/api/schedule-publish?year=${year}&month=${month1}`).then(r => r.json()),
      fetch('/api/admin/settings').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
    ]).then(([prefs, assignments, holidays, subs, publishData, settings, usersData]) => {
      const allEmployees = (Array.isArray(usersData) ? usersData : [])
        .filter((u: { role: string; name: string }) => u.role === 'EMPLOYEE' && !u.name.toLowerCase().startsWith('testing'))
        .map((u: { id: string; name: string }) => ({ id: u.id, name: u.name }))
      setInitialData({
        prefs: prefs.map((p: Pref) => ({ ...p, date: p.date.slice(0, 10) })),
        assignments: assignments.map((a: Assignment) => ({ ...a, date: a.date.slice(0, 10) })),
        holidays: holidays.map((h: Holiday) => ({ ...h, date: h.date.slice(0, 10) })),
        submittedUserIds: (Array.isArray(subs) ? subs : []).map((s: { userId: string }) => s.userId),
        submissions: (Array.isArray(subs) ? subs : []).map((s: { userId: string; confirmedAt: string }) => ({ userId: s.userId, confirmedAt: s.confirmedAt ?? '' })),
        published: publishData.published ?? false,
        publishedAt: publishData.publishedAt ?? null,
        initialYear: year,
        initialMonth: month,
        allEmployees,
      })
      setNotifyEnabled(settings?.feishu_notifications_enabled === 'true')
    })
  }, [])

  if (!initialData) return <Skeleton />

  return (
    <main className="px-6 py-8">
      <div className="flex justify-end mb-3">
        <FeishuToggle initialEnabled={notifyEnabled} />
      </div>
      <AdminAssignClient initialData={initialData as Parameters<typeof AdminAssignClient>[0]['initialData']} />
    </main>
  )
}
