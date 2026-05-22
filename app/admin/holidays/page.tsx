import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import Sidebar from '@/components/Sidebar'
import AdminHolidaysClient from './client'

export default async function AdminHolidaysPage() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') redirect('/employee/preferences')

  const holidays = await prisma.holiday.findMany()
  const initialData = holidays.map(h => ({ id: h.id, date: h.date.toISOString().slice(0, 10), name: h.name }))

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar userName={session.user.name!} role={session.user.role} />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">假期管理</h2>
        <AdminHolidaysClient initialData={initialData} />
      </main>
    </div>
  )
}
