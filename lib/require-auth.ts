import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const session = await auth()
  if (!session) redirect('/')

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } })
  if (!user) redirect('/')

  return session
}
