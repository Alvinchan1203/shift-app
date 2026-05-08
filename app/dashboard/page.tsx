import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/require-auth'

export default async function Dashboard() {
  const session = await requireAuth()
  if (session.user.role === 'ADMIN') redirect('/admin/preferences')
  redirect('/employee/preferences')
}
