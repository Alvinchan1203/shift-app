import { requireAuth } from '@/lib/require-auth'
import SPAShell from '@/components/SPAShell'

export default async function AppPage() {
  const session = await requireAuth()
  return (
    <SPAShell
      userName={session.user.name!}
      role={session.user.role}
      userId={session.user.id}
    />
  )
}
