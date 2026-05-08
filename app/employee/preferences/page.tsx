import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import EmployeePreferencesClient from './client'

export default async function EmployeePreferencesPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { extraSubmitEnabled: true },
  })
  const extraSubmitEnabled = user?.extraSubmitEnabled ?? false

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
          <h2 className="text-xl font-bold text-gray-800 shrink-0">提交上班意願</h2>
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            {[
              { label: 'A班', time: '0900–1400', color: 'bg-blue-100 text-blue-800' },
              { label: 'B班', time: '1300–1800', color: 'bg-green-100 text-green-800' },
              { label: 'C班', time: '0900–1800', color: 'bg-purple-100 text-purple-800' },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm ${s.color}`}>
                <span className="font-medium">{s.label}</span>
                <span className="opacity-70">{s.time}</span>
              </div>
            ))}
          </div>
        </div>
        <EmployeePreferencesClient userName={session.user.name!} extraSubmitEnabled={extraSubmitEnabled} />
      </main>
    </div>
  )
}
