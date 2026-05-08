import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AdminHolidaysClient from './client'

export default async function AdminHolidaysPage() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') redirect('/employee/preferences')

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">假期管理</h2>
        <AdminHolidaysClient />
      </main>
    </div>
  )
}
