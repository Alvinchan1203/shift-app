import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { SHIFTS, ShiftKey } from '@/lib/constants'

type Change = { date: string; userName: string; action: 'add' | 'remove'; shift: ShiftKey }

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const webhookUrl = process.env.FEISHU_WEBHOOK_URL
  if (!webhookUrl) {
    return NextResponse.json({ error: 'FEISHU_WEBHOOK_URL not configured' }, { status: 500 })
  }

  const { year, month, changes } = await req.json() as { year: number; month: number; changes: Change[] }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })

  const lines = changes.map(c => {
    const dateLabel = new Date(c.date + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })
    const shiftLabel = SHIFTS[c.shift].label
    const action = c.action === 'add' ? '新增' : '移除'
    return `• ${dateLabel}：${c.userName} ${action} ${shiftLabel}`
  })

  const text = [
    `📅 ${monthLabel}排班已調整`,
    '',
    '以下排班已更新：',
    '',
    lines.join('\n'),
    '',
    '請各同事到「我的排班」查看最新安排。',
    '🔗 https://shift-app-omega-tan.vercel.app',
  ].join('\n')

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text } }),
  })

  if (!res.ok) return NextResponse.json({ error: 'Failed to send Feishu message' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
