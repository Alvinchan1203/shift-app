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

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(setData)
  }, [])

  if (!data) return <Skeleton />

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <UsersClient currentUserName={userName} initialData={data} />
    </main>
  )
}
