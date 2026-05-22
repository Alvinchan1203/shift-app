import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import AdminHolidaysClient from './client'

export default async function AdminHolidaysPage() {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') redirect('/employee/preferences')

  const holidays = await prisma.holiday.findMany()
  const initialData = holidays.map(h => ({ id: h.id, date: h.date.toISOString().slice(0, 10), name: h.name }))

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-gray-800 mb-6">假期管理</h2>
        <AdminHolidaysClient initialData={initialData} />
    </main>
  )
}
