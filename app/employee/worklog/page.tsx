import { requireAuth } from '@/lib/require-auth'
import { prisma } from '@/lib/prisma'
import Navbar from '@/components/Navbar'
import WorkLogClient from './client'

export default async function WorkLogPage() {
  const session = await requireAuth()

  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + 1

  const logs = await prisma.workLog.findMany({
    where: {
      userId: session.user.id,
      date: {
        gte: new Date(Date.UTC(year, month - 1, 1)),
        lt: new Date(Date.UTC(year, month, 1)),
      },
    },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  const serialized = logs.map(l => ({
    ...l,
    date: l.date.toISOString(),
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <div>
      <Navbar userName={session.user.name!} role={session.user.role} />
      <WorkLogClient
        initialYear={year}
        initialMonth={month}
        initialLogs={serialized}
      />
    </div>
  )
}
