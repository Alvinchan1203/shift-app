import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const adminEmail = 'admin@example.com'
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existing) {
    console.log('Admin already exists')
    return
  }

  const hashed = await bcrypt.hash('admin123', 10)
  await prisma.user.create({
    data: { name: '系統管理員', email: adminEmail, password: hashed, role: 'ADMIN' },
  })
  console.log('Admin created: admin@example.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
