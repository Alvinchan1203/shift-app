import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ATTENDANCE_TYPES, AttendanceTypeKey } from '@/lib/constants'

type Change = {
  userId: string
  userName: string
  date: string
  added: AttendanceTypeKey[]
  removed: AttendanceTypeKey[]
}

function typeLabel(type: AttendanceTypeKey): string {
  const t = ATTENDANCE_TYPES[type]
  return `${t.label}${t.desc ? `（${t.desc}）` : ''}`
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const webhookUrl = process.env.FEISHU_ATTENDANCE_WEBHOOK
  if (!webhookUrl) {
    return NextResponse.json({ error: 'FEISHU_ATTENDANCE_WEBHOOK not configured' }, { status: 500 })
  }

  const { year, month, changes } = await req.json() as { year: number; month: number; changes: Change[] }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })

  const lines = changes.map(c => {
    const d = new Date(c.date + 'T00:00:00')
    const dateLabel = d.toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })

    let changeDesc = ''
    if (c.removed.length > 0 && c.added.length > 0) {
      changeDesc = `${c.removed.map(typeLabel).join('、')} → ${c.added.map(typeLabel).join('、')}`
    } else if (c.added.length > 0) {
      changeDesc = `新增 ${c.added.map(typeLabel).join('、')}`
    } else {
      changeDesc = `移除 ${c.removed.map(typeLabel).join('、')}`
    }

    return `• ${c.userName}：${dateLabel} ${changeDesc}`
  })

  const text = [
    `📋 ${monthLabel}實際出勤更新通知`,
    '',
    '以下同事的出勤記錄已更新：',
    '',
    lines.join('\n'),
    '',
    '請各同事到「我的排班」月歷確認最新出勤記錄。',
    '🔗 https://shift-app-omega-tan.vercel.app/app',
  ].join('\n')

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msg_type: 'text', content: { text } }),
  })

  if (!res.ok) return NextResponse.json({ error: 'Failed to send Feishu message' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
