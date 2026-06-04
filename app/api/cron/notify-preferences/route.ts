import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function dateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getOpenDay(year: number, month: number, holidaySet: Set<string>): number {
  let day = 15
  while (true) {
    const dow = new Date(Date.UTC(year, month, day)).getUTCDay()
    if (dow !== 0 && dow !== 6 && !holidaySet.has(dateStr(year, month, day))) return day
    day++
  }
}

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

  // 檢查飛書通知開關
  const notifySetting = await prisma.systemSetting.findUnique({ where: { key: 'feishu_notifications_enabled' } })
  if (notifySetting?.value !== 'true') {
    return NextResponse.json({ ok: true, message: 'Feishu notifications disabled' })
  }

  // 讀取本月假期
  const holidays = await prisma.holiday.findMany({
    where: {
      date: {
        gte: new Date(Date.UTC(todayYear, todayMonth, 1)),
        lt: new Date(Date.UTC(todayYear, todayMonth + 1, 1)),
      },
    },
  })
  const holidaySet = new Set(
    holidays.map(h => {
      const d = h.date
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    })
  )

  // 計算開放日
  const openDay = getOpenDay(todayYear, todayMonth, holidaySet)

  if (todayDate !== openDay) {
    return NextResponse.json({ ok: true, message: `Not open day. Open: ${openDay}, today: ${todayDate}` })
  }

  // 目標月份（下個月）
  const targetDate = new Date(Date.UTC(todayYear, todayMonth + 1, 1))
  const targetMonthLabel = targetDate.toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })

  // 發送飛書通知
  const webhookUrl = process.env.FEISHU_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'FEISHU_WEBHOOK_URL not configured' }, { status: 500 })
  }

  const text = `📅 排班意願提交開放通知\n\n各位同事，${targetMonthLabel}排班意願提交現已開放！\n請於本月 26 日前登入系統提交上班意願。\n\n⚠️ 提醒：選好班次後，必須按下「確認提交」或「確認更新」按鈕，意願才會正式生效。\n\n謝謝！`

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text } }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to send Feishu message' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `Notification sent for ${targetMonthLabel}` })
}
