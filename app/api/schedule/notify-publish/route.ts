import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const webhookUrl = process.env.FEISHU_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'FEISHU_WEBHOOK_URL not configured' }, { status: 500 })
  }

  const { year, month, dailyRequired } = await req.json() as { year: number; month: number; dailyRequired: number }

  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 1))

  const [assignments, holidays] = await Promise.all([
    prisma.shiftAssignment.findMany({
      where: { date: { gte: startDate, lt: endDate } },
      select: { date: true },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: startDate, lt: endDate } },
      select: { date: true },
    }),
  ])

  const monthLabel = new Date(year, month - 1).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })

  let understaffedSection = ''
  if (dailyRequired > 0) {
    const holidaySet = new Set(holidays.map(h => h.date.toISOString().slice(0, 10)))
    const assignCountMap = new Map<string, number>()
    for (const a of assignments) {
      const dateStr = a.date.toISOString().slice(0, 10)
      assignCountMap.set(dateStr, (assignCountMap.get(dateStr) ?? 0) + 1)
    }

    const understaffedDays: string[] = []
    const cur = new Date(startDate)
    while (cur < endDate) {
      const dateStr = cur.toISOString().slice(0, 10)
      const dow = cur.getUTCDay()
      const isWeekend = dow === 0 || dow === 6
      if (!isWeekend && !holidaySet.has(dateStr)) {
        const count = assignCountMap.get(dateStr) ?? 0
        if (count < dailyRequired) {
          const label = new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })
          understaffedDays.push(`• ${label}（已有 ${count} 人）`)
        }
      }
      cur.setUTCDate(cur.getUTCDate() + 1)
    }

    if (understaffedDays.length > 0) {
      understaffedSection = [
        '',
        `以下日子人手不足（目標 ${dailyRequired} 人），歡迎有興趣的同事聯繫 nicochen 提交額外上班意願：`,
        '',
        understaffedDays.join('\n'),
      ].join('\n')
    }
  }

  const text = [
    `📢 ${monthLabel}排班已發布`,
    '',
    '請各同事到「我的排班」查看上班時間安排。',
    '🔗 https://shift-app-omega-tan.vercel.app/app',
    understaffedSection,
  ].join('\n').trimEnd()

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text } }),
  })

  if (!res.ok) return NextResponse.json({ error: 'Failed to send Feishu message' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
