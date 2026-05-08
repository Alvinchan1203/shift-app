import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env') })

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const admins = ['nicochen', 'nicholasleung', 'alvinchan', 'cathylau']
const password = await bcrypt.hash('futuhk', 10)

for (const name of admins) {
  const email = `${name}@internal.local`
  const existing = await prisma.user.findFirst({ where: { name } })
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { password, role: 'ADMIN', email },
    })
    console.log(`Updated: ${name}`)
  } else {
    await prisma.user.create({
      data: { name, email, password, role: 'ADMIN' },
    })
    console.log(`Created: ${name}`)
  }
}

await prisma.$disconnect()
console.log('Done.')
