import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PasswordClient from './client'

export default async function PasswordPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-md mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">修改密碼</h2>
        <PasswordClient />
      </main>
    </div>
  )
}
