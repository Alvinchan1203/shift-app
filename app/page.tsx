import { auth } from '@/auth'
import PublicRosterClient from '@/components/PublicRosterClient'

export default async function Home() {
  const session = await auth()
  return <PublicRosterClient isLoggedIn={!!session?.user} />
}
