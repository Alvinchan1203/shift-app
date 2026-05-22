'use client'

import PasswordClient from '@/app/(app)/employee/password/client'

export default function PasswordView() {
  return (
    <main className="max-w-md mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">修改密碼</h2>
      <PasswordClient />
    </main>
  )
}
