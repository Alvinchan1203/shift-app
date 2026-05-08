import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import UsersClient from './client'

export default async function UsersPage() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') redirect('/login')

  const usersRaw = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, extraSubmitEnabled: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  const initialData = usersRaw.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">賬戶管理</h2>
        <UsersClient currentUserName={session.user.name!} initialData={initialData} />
      </main>
    </div>
  )
}
