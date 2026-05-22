'use client'

import { useEffect, useState } from 'react'
import AdminHolidaysClient from '@/app/(app)/admin/holidays/client'

type Holiday = { id: string; date: string; name: string }

function Skeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="h-10 bg-gray-50 border-b animate-pulse" />
        <div className="grid grid-cols-7">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="border-b border-r min-h-[100px] bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function AdminHolidaysView() {
  const [data, setData] = useState<Holiday[] | null>(null)

  useEffect(() => {
    fetch('/api/holidays')
      .then(r => r.json())
      .then((holidays: Holiday[]) =>
        setData(holidays.map(h => ({ ...h, date: h.date.slice(0, 10) })))
      )
  }, [])

  if (!data) return <Skeleton />

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="text-xl font-bold text-gray-800 mb-6">假期管理</h2>
      <AdminHolidaysClient initialData={data} />
    </main>
  )
}
