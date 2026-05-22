import { requireAuth } from '@/lib/require-auth'
import Sidebar from '@/components/Sidebar'
import PasswordClient from './client'

export default async function PasswordPage() {
  const session = await requireAuth()

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar userName={session.user.name!} role={session.user.role} />
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">修改密碼</h2>
        <PasswordClient />
      </main>
    </div>
  )
}
