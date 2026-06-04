'use client'

import { useEffect, useState } from 'react'
import UsersClient from '@/app/(app)/admin/users/client'

type Employee = { id: string; name: string; email: string; role: string; extraSubmitEnabled: boolean; createdAt: string }

function Skeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="h-7 w-24 bg-gray-200 rounded animate-pulse mb-6" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border px-4 py-3 flex gap-4">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 flex-1 bg-gray-100 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AdminUsersView({ userName }: { userName: string }) {
  const [data, setData] = useState<Employee[] | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    setData(null)
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(setData)
  }, [refreshKey])

  if (!data) return <Skeleton />

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex justify-end mb-2">
        <button onClick={() => setRefreshKey(k => k + 1)} className="px-2.5 py-1.5 rounded-lg border hover:bg-gray-100 text-gray-500 transition" title="重新整理">↺</button>
      </div>
      <UsersClient currentUserName={userName} initialData={data} />
    </main>
  )
}
