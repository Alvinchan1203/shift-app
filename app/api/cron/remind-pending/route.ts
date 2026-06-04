import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const tokenParam = req.nextUrl.searchParams.get('token')
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}` && tokenParam !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 檢查飛書通知開關
  const notifySetting = await prisma.systemSetting.findUnique({ where: { key: 'feishu_notifications_enabled' } })
  if (notifySetting?.value !== 'true') {
    return NextResponse.json({ ok: true, message: 'Feishu notifications disabled' })
  }

  // 取得今天香港時間 (UTC+8)
  const hktNow = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const todayYear = hktNow.getUTCFullYear()
  const todayMonth = hktNow.getUTCMonth()
  const todayDate = hktNow.getUTCDate()

  // 目標月份（下個月）
  const targetYear = todayMonth === 11 ? todayYear + 1 : todayYear
  const targetMonth = todayMonth === 11 ? 1 : todayMonth + 2 // 1-indexed
  const targetLabel = new Date(Date.UTC(targetYear, targetMonth - 1, 1))
    .toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })

  // 讀取本月假期，用於判斷工作日
  const monthHolidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: new Date(Date.UTC(todayYear, todayMonth, 1)),
        lt: new Date(Date.UTC(todayYear, todayMonth + 1, 1)),
      },
    },
    select: { date: true },
  })
  const holidaySet = new Set(
    monthHolidays.map(h => {
      const d = h.date
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    })
  )

  function isWorkingDay(day: number): boolean {
    const dow = new Date(Date.UTC(todayYear, todayMonth, day)).getUTCDay()
    if (dow === 0 || dow === 6) return false
    const key = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return !holidaySet.has(key)
  }

  // 為每個提醒日（26、25、24）各自分配一個獨立工作日
  // 從 26 倒推：26 取最近工作日，25 取其前一個工作日，24 再往前一個
  const effectiveMap = new Map<number, number>() // 原始提醒日 -> 實際發送日
  let ceiling = 26
  for (const reminderDay of [26, 25, 24]) {
    let d = Math.min(reminderDay, ceiling)
    while (d >= 1 && !isWorkingDay(d)) d--
    effectiveMap.set(reminderDay, d)
    ceiling = d - 1
  }

  // 找出今天對應哪個原始提醒日
  const matched = [...effectiveMap.entries()].find(([, effective]) => effective === todayDate)

  if (!matched) {
    return NextResponse.json({ ok: true, message: `Not reminder day. Today: ${todayDate}` })
  }

  const [originalReminderDay] = matched
  const daysLeft = 26 - originalReminderDay

  // 所有需要提交意願的員工
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE', NOT: { name: { startsWith: 'testing-' } } },
    select: { id: true, name: true },
  })

  // 曾確認提交的員工（不論之後是否有修改，有效提交記錄仍然存在）
  const submitted = await prisma.preferenceSubmission.findMany({
    where: { year: targetYear, month: targetMonth },
    select: { userId: true, confirmedAt: true },
  })
  const confirmedIds = new Set(
    submitted
      .filter(s => s.confirmedAt != null)
      .map(s => s.userId)
  )

  // 從未確認提交的員工
  const pending = employees.filter(e => !confirmedIds.has(e.id))

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
