import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import AttendanceClient from './client'

export default async function AttendancePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  const users = isAdmin
    ? await prisma.user.findMany({
        where: { role: 'EMPLOYEE' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : [{ id: session.user.id, name: session.user.name! }]

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-full mx-auto px-4 py-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">
          {isAdmin ? '實際出勤管理' : '我的出勤記錄'}
        </h2>
        <AttendanceClient isAdmin={isAdmin} users={users} currentUserId={session.user.id} />
      </main>
    </div>
  )
}
