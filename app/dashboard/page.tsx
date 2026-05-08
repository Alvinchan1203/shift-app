import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function Dashboard() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.role === 'ADMIN') redirect('/admin/preferences')
  redirect('/employee/preferences')
}
