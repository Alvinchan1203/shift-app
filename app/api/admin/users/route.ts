import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, extraSubmitEnabled: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, extraSubmitEnabled } = await req.json()
  if (!userId || typeof extraSubmitEnabled !== 'boolean') {
    return NextResponse.json({ error: '缺少資料' }, { status: 400 })
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { extraSubmitEnabled },
    select: { id: true, extraSubmitEnabled: true },
  })
  return NextResponse.json(user)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { name, password, adminPassword, role } = await req.json()
    if (!name || !password || !adminPassword) {
      return NextResponse.json({ error: '缺少資料' }, { status: 400 })
    }

    const admin = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!admin) return NextResponse.json({ error: '管理員不存在' }, { status: 400 })

    const valid = await bcrypt.compare(adminPassword, admin.password)
    if (!valid) return NextResponse.json({ error: '管理員密碼錯誤' }, { status: 401 })

    const email = `${name.replace(/\s+/g, '').toLowerCase()}_${Date.now()}@internal.local`
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role: role === 'ADMIN' ? 'ADMIN' : 'EMPLOYEE' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json(user)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { userId, adminPassword } = await req.json()
    if (!userId || !adminPassword) {
      return NextResponse.json({ error: '缺少資料' }, { status: 400 })
    }

    const admin = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!admin) return NextResponse.json({ error: '管理員不存在' }, { status: 400 })

    const valid = await bcrypt.compare(adminPassword, admin.password)
    if (!valid) return NextResponse.json({ error: '管理員密碼錯誤' }, { status: 401 })

    const hashed = await bcrypt.hash('futuhk123', 10)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { userId, adminPassword } = await req.json()
    if (!userId || !adminPassword) {
      return NextResponse.json({ error: '缺少資料' }, { status: 400 })
    }

    const admin = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!admin) return NextResponse.json({ error: '管理員不存在' }, { status: 400 })

    const valid = await bcrypt.compare(adminPassword, admin.password)
    if (!valid) return NextResponse.json({ error: '管理員密碼錯誤' }, { status: 401 })

    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (target?.role === 'ADMIN' && admin.name !== 'nicochen') {
      return NextResponse.json({ error: '只有 nicochen 可以刪除管理員帳號' }, { status: 403 })
    }

    await prisma.user.delete({ where: { id: userId } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 })
  }
}
