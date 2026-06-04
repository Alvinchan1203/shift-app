'use client'

import { useRouter } from 'next/navigation'

export default function RefreshButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.refresh()}
      className="px-2.5 py-1.5 rounded-lg border hover:bg-gray-100 text-gray-500 transition"
      title="重新整理"
    >↺</button>
  )
}
