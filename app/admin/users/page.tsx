import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import UsersClient from './client'

export default async function UsersPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/login')

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">賬戶管理</h2>
        <UsersClient currentUserName={session.user.name!} />
      </main>
    </div>
  )
}
