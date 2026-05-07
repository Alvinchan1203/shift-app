import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const tokenParam = req.nextUrl.searchParams.get('token')
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}` && tokenParam !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 取得今天香港時間 (UTC+8)
  const hktNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const todayYear = hktNow.getUTCFullYear()
  const todayMonth = hktNow.getUTCMonth()
  const todayDate = hktNow.getUTCDate()

  // 只在 24、25、26 日執行
  const daysLeft = 26 - todayDate
  if (todayDate < 24 || todayDate > 26) {
    return NextResponse.json({ ok: true, message: `Not reminder day. Today: ${todayDate}` })
  }

  // 目標月份（下個月）
  const targetYear = todayMonth === 11 ? todayYear + 1 : todayYear
  const targetMonth = todayMonth === 11 ? 1 : todayMonth + 2 // 1-indexed
  const targetLabel = new Date(Date.UTC(targetYear, targetMonth - 1, 1))
    .toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })

  // 所有需要提交意願的員工
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE', preferenceEnabled: true },
    select: { id: true, name: true },
  })

  // 已提交的員工
  const submitted = await prisma.preferenceSubmission.findMany({
    where: { year: targetYear, month: targetMonth },
    select: { userId: true },
  })
  const submittedIds = new Set(submitted.map(s => s.userId))

  // 未提交的員工
  const pending = employees.filter(e => !submittedIds.has(e.id))

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, message: 'All employees have submitted' })
  }

  // 發送飛書通知
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'FEISHU_WEBHOOK_URL not configured' }, { status: 500 })
  }

  const deadlineText = daysLeft === 0
    ? '今天是最後一天'
    : `距截止日期還有 ${daysLeft} 天`

  const nameList = pending.map(e => `• ${e.name}`).join('\n')
  const text = `⚠️ 排班意願提交提醒\n\n${targetLabel}排班意願截止日為本月 26 日，${deadlineText}。\n\n以下同事尚未提交排班意願：\n${nameList}\n\n請盡快登入系統提交，謝謝！`

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text } }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to send Feishu message' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: `Reminder sent for ${targetLabel}`,
    pendingCount: pending.length,
    pending: pending.map(e => e.name),
  })
}
