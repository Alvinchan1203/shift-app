import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

type ShiftKey = 'A' | 'B' | 'C'
const SHIFT_MINUTES: Record<ShiftKey, number> = { A: 300, B: 300, C: 480 }
const TARGET_MINUTES = 4800

function isWorkingDay(dateStr: string, holidaySet: Set<string>): boolean {
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay()
  return dow !== 0 && dow !== 6 && !holidaySet.has(dateStr)
}

// Returns true if there are no working-day gaps between any two adjacent preference dates
function isConsecutive(dates: string[], holidaySet: Set<string>): boolean {
  if (dates.length <= 1) return true
  const sorted = [...dates].sort()
  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = new Date(sorted[i] + 'T00:00:00Z')
    const next = new Date(sorted[i + 1] + 'T00:00:00Z')
    cur.setUTCDate(cur.getUTCDate() + 1)
    while (cur < next) {
      const ds = cur.toISOString().slice(0, 10)
      if (isWorkingDay(ds, holidaySet)) return false
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }
  return true
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { year, month, dailyQuota } = await req.json()
  if (!year || !month || !dailyQuota || dailyQuota < 1) {
    return NextResponse.json({ error: '缺少資料' }, { status: 400 })
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 1))

  const [employees, submissions, prefs, holidays, existingAssignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: 'EMPLOYEE' },
      select: { id: true, name: true },
    }),
    prisma.preferenceSubmission.findMany({
      where: { year, month, confirmedAt: { not: null } },
      select: { userId: true, confirmedAt: true },
    }),
    prisma.shiftPreference.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
      select: { userId: true, date: true, shift: true },
    }),
    prisma.holiday.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
      select: { date: true },
    }),
    prisma.shiftAssignment.findMany({
      where: { date: { gte: monthStart, lt: monthEnd } },
      select: { userId: true, date: true, shift: true },
    }),
  ])

  const holidaySet = new Set(holidays.map(h => h.date.toISOString().slice(0, 10)))

  // Sort confirmed employees by confirmedAt ascending (earliest = highest priority)
  const confirmedMap = new Map<string, Date>()
  for (const sub of submissions) {
    if (sub.confirmedAt) confirmedMap.set(sub.userId, sub.confirmedAt)
  }
  const confirmedEmployees = employees
    .filter(e => confirmedMap.has(e.id))
    .sort((a, b) => confirmedMap.get(a.id)!.getTime() - confirmedMap.get(b.id)!.getTime())

  // Build per-employee preference list: C shift first, then chronological
  const empPrefs = new Map<string, { date: string; shift: ShiftKey }[]>()
  for (const emp of confirmedEmployees) empPrefs.set(emp.id, [])
  for (const p of prefs) {
    if (!empPrefs.has(p.userId)) continue
    empPrefs.get(p.userId)!.push({ date: p.date.toISOString().slice(0, 10), shift: p.shift as ShiftKey })
  }
  for (const userPrefs of empPrefs.values()) {
    userPrefs.sort((a, b) => {
      const order = (s: ShiftKey) => s === 'C' ? 0 : 1
      return order(a.shift) !== order(b.shift) ? order(a.shift) - order(b.shift) : a.date.localeCompare(b.date)
    })
  }

  // Initialize slots remaining for each working day
  const slotsRemaining = new Map<string, number>()
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    if (isWorkingDay(dateStr, holidaySet)) slotsRemaining.set(dateStr, dailyQuota)
  }

  // Track state
  const assignedMinutes = new Map<string, number>()
  const assignedDates = new Map<string, Set<string>>()
  for (const emp of confirmedEmployees) {
    assignedMinutes.set(emp.id, 0)
    assignedDates.set(emp.id, new Set())
  }

  // Existing assignments count toward quota and hours
  for (const a of existingAssignments) {
    const dateStr = a.date.toISOString().slice(0, 10)
    const rem = slotsRemaining.get(dateStr)
    if (rem !== undefined) slotsRemaining.set(dateStr, Math.max(0, rem - 1))
    if (assignedMinutes.has(a.userId)) {
      assignedMinutes.set(a.userId, (assignedMinutes.get(a.userId) ?? 0) + (SHIFT_MINUTES[a.shift as ShiftKey] ?? 0))
      assignedDates.get(a.userId)!.add(dateStr)
    }
  }

  const newAssignments: { userId: string; date: string; shift: ShiftKey }[] = []

  function tryAssign(userId: string, respectCap: boolean) {
    const userPrefs = empPrefs.get(userId) ?? []
    const totalPrefMinutes = userPrefs.reduce((sum, p) => sum + SHIFT_MINUTES[p.shift], 0)
    const cap = respectCap && totalPrefMinutes >= TARGET_MINUTES ? TARGET_MINUTES : Infinity
    for (const pref of userPrefs) {
      if ((assignedMinutes.get(userId) ?? 0) >= cap) break
      const rem = slotsRemaining.get(pref.date)
      if (!rem || rem <= 0) continue
      if (assignedDates.get(userId)!.has(pref.date)) continue
      newAssignments.push({ userId, date: pref.date, shift: pref.shift })
      assignedMinutes.set(userId, (assignedMinutes.get(userId) ?? 0) + SHIFT_MINUTES[pref.shift])
      slotsRemaining.set(pref.date, rem - 1)
      assignedDates.get(userId)!.add(pref.date)
    }
  }

  // Phase 1: employees whose preference dates are all consecutive (no working-day gaps)
  const consecutiveEmps = confirmedEmployees.filter(e => {
    const dates = [...new Set((empPrefs.get(e.id) ?? []).map(p => p.date))]
    return isConsecutive(dates, holidaySet)
  })
  for (const emp of consecutiveEmps) tryAssign(emp.id, true)

  // Phase 2: employees with non-consecutive preference dates
  const nonConsecutiveEmps = confirmedEmployees.filter(e => {
    const dates = [...new Set((empPrefs.get(e.id) ?? []).map(p => p.date))]
    return !isConsecutive(dates, holidaySet)
  })
  for (const emp of nonConsecutiveEmps) tryAssign(emp.id, true)

  // Phase 3a: employees whose total preference hours < 80h — try to fill any remaining unassigned prefs
  for (const emp of confirmedEmployees) {
    const totalPrefMinutes = (empPrefs.get(emp.id) ?? []).reduce((sum, p) => sum + SHIFT_MINUTES[p.shift], 0)
    if (totalPrefMinutes >= TARGET_MINUTES) continue
    tryAssign(emp.id, false)
  }

  // Phase 3b: random fill — for dates still below quota, pick from employees with preferences for that date
  const datePrefMap = new Map<string, { userId: string; shift: ShiftKey }[]>()
  for (const [userId, userPrefs] of empPrefs) {
    for (const pref of userPrefs) {
      if (!datePrefMap.has(pref.date)) datePrefMap.set(pref.date, [])
      datePrefMap.get(pref.date)!.push({ userId, shift: pref.shift })
    }
  }
  for (const [date, rem] of slotsRemaining) {
    if (rem <= 0) continue
    const candidates = (datePrefMap.get(date) ?? []).filter(c => !assignedDates.get(c.userId)?.has(date))
    // Shuffle then sort: C first within shuffled groups
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    candidates.sort((a, b) => (a.shift === 'C' ? 0 : 1) - (b.shift === 'C' ? 0 : 1))
    let slots = rem
    for (const c of candidates) {
      if (slots <= 0) break
      if (assignedDates.get(c.userId)?.has(date)) continue
      newAssignments.push({ userId: c.userId, date, shift: c.shift })
      assignedDates.get(c.userId)!.add(date)
      slots--
    }
  }

  if (newAssignments.length > 0) {
    await prisma.shiftAssignment.createMany({
      data: newAssignments.map(a => ({
        userId: a.userId,
        date: new Date(a.date + 'T00:00:00Z'),
        shift: a.shift,
        assignedBy: session.user.id,
      })),
      skipDuplicates: true,
    })
  }

  return NextResponse.json({ added: newAssignments.length })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { year, month } = await req.json()
  if (!year || !month) {
    return NextResponse.json({ error: '缺少資料' }, { status: 400 })
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 1))

  const result = await prisma.shiftAssignment.deleteMany({
    where: { date: { gte: monthStart, lt: monthEnd } },
  })

  return NextResponse.json({ deleted: result.count })
}
