'use client'

import { useEffect, useState } from 'react'
import EmployeePreferencesClient from '@/app/(app)/employee/preferences/client'

type Pref = { id: string; date: string; shift: string }
type Holiday = { id: string; date: string; name: string }

function Skeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="h-10 bg-gray-50 border-b animate-pulse" />
        <div className="grid grid-cols-7">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="border-b border-r min-h-[60px] bg-gray-50 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function EmployeePreferencesView({ userName }: { userName: string }) {
  const [loaded, setLoaded] = useState(false)
  const [prefs, setPrefs] = useState<Pref[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [submission, setSubmission] = useState<{ submittedAt: string } | null>(null)
  const [extraSubmitEnabled, setExtraSubmitEnabled] = useState(false)

  useEffect(() => {
    const today = new Date()
    const nextMonth = today.getMonth() + 2
    const nextYear = nextMonth > 12 ? today.getFullYear() + 1 : today.getFullYear()
    const m = nextMonth > 12 ? 1 : nextMonth

    Promise.all([
      fetch('/api/preferences').then(r => r.json()),
      fetch('/api/holidays').then(r => r.json()),
      fetch(`/api/preferences/submit?year=${nextYear}&month=${m}`).then(r => r.json()),
      fetch('/api/me').then(r => r.json()),
    ]).then(([prefsData, holidaysData, submissionData, me]) => {
      setPrefs(prefsData.map((p: Pref) => ({ ...p, date: p.date.slice(0, 10) })))
      setHolidays(holidaysData.map((h: Holiday) => ({ ...h, date: h.date.slice(0, 10) })))
      setSubmission(submissionData ? { submittedAt: submissionData.submittedAt } : null)
      setExtraSubmitEnabled(me.extraSubmitEnabled ?? false)
      setLoaded(true)
    })
  }, [])

  if (!loaded) return <Skeleton />

  return (
    <EmployeePreferencesClient
      userName={userName}
      extraSubmitEnabled={extraSubmitEnabled}
      initialData={{ prefs, holidays, submission }}
    />
  )
}
