import { prisma } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const employees = ['testing-alvinchan', 'testing-cathylau', 'testing-nicochen', 'testing-nicholasleung']
  const password = await bcrypt.hash('futuhk', 10)

  for (const name of employees) {
    const email = `${name}@internal.local`
    const existing = await prisma.user.findFirst({ where: { name } })
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { password, role: 'EMPLOYEE', email },
      })
      console.log(`Updated: ${name}`)
    } else {
      await prisma.user.create({
        data: { name, email, password, role: 'EMPLOYEE' },
      })
      console.log(`Created: ${name}`)
    }
  }
  await prisma.$disconnect()
  console.log('Done.')
}

main().catch(console.error)
