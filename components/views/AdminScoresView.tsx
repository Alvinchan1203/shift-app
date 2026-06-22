'use client'

import { useEffect, useState } from 'react'
import AdminScoresClient from '@/app/(app)/admin/scores/client'

function Skeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse" />
      </div>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="h-10 bg-gray-50 border-b animate-pulse" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3 border-b last:border-0">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminScoresView() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [employeeData, setEmployeeData] = useState<object[] | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [hideTesting, setHideTesting] = useState(true)

  useEffect(() => {
    setEmployeeData(null)
    fetch(`/api/admin/scores?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(setEmployeeData)
  }, [year, month, refreshKey])

  if (!employeeData) return <Skeleton />

  const filteredData = hideTesting
    ? employeeData.filter(e => !(e as { employeeName: string }).employeeName?.toLowerCase().startsWith('testing'))
    : employeeData

  return (
    <div>
      <div className="flex justify-end px-6 pt-6 pb-0">
        <button
          onClick={() => setHideTesting(h => !h)}
          className={`text-xs px-3 py-1.5 rounded-lg border transition ${hideTesting ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'}`}
        >
          {hideTesting ? '顯示測試帳戶' : '隱藏測試帳戶'}
        </button>
      </div>
      <AdminScoresClient
        key={`${year}-${month}-${refreshKey}`}
        year={year}
        month={month}
        employeeData={filteredData as Parameters<typeof AdminScoresClient>[0]['employeeData']}
        onMonthChange={(y, m) => { setYear(y); setMonth(m) }}
        onRefresh={() => setRefreshKey(k => k + 1)}
      />
    </div>
  )
}
