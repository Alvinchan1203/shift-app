'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SHIFTS, ShiftKey } from '@/lib/constants'
import ShiftBadge from '@/components/ShiftBadge'

type Pref = { id: string; date: string; shift: ShiftKey }
type Holiday = { id: string; date: string; name: string }

function getMonthDays(year: number, month: number) {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 從指定日期起找下一個工作日（跳過週末及假期）
function nextWorkingDay(startDate: Date, holidaySet: Set<string>): Date {
  let d = new Date(startDate)
  while (true) {
    const dow = d.getDay()
    const str = toDateStr(d)
    if (dow !== 0 && dow !== 6 && !holidaySet.has(str)) return d
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
  }
}

export default function EmployeePreferencesClient({ userName, extraSubmitEnabled }: { userName: string; extraSubmitEnabled: boolean }) {
  const today = new Date()
  const todayDate = today.getDate()

  const targetDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth()

  const [year, setYear] = useState(targetYear)
  const [month, setMonth] = useState(targetMonth)
  const [prefs, setPrefs] = useState<Pref[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [submission, setSubmission] = useState<{ submittedAt: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const days = getMonthDays(year, month)

  // 計算實際開放日（15日或下一個工作日）
  const actualOpenDate = useMemo(() => {
    const holidaySet = new Set(holidays.map(h => h.date))
    return nextWorkingDay(new Date(today.getFullYear(), today.getMonth(), 15), holidaySet)
  }, [holidays])

  const actualOpenDay = actualOpenDate.getDate()
  const isWindowOpen = todayDate >= actualOpenDay && todayDate <= 26
  const isViewingTargetMonth = year === targetYear && month === targetMonth
  const canSubmit = (userName === 'testing-alvinchan' || extraSubmitEnabled) ? isViewingTargetMonth : (isWindowOpen && isViewingTargetMonth)

  useEffect(() => {
    Promise.all([
      fetch('/api/preferences').then((r) => r.json()),
      fetch('/api/holidays').then((r) => r.json()),
      fetch(`/api/preferences/submit?year=${targetYear}&month=${targetMonth + 1}`).then(r => r.json()),
    ]).then(([prefData, holidayData, submissionData]) => {
      setPrefs(prefData.map((p: Pref) => ({ ...p, date: p.date.slice(0, 10) })))
      setHolidays(holidayData.map((h: Holiday) => ({ ...h, date: h.date.slice(0, 10) })))
      setSubmission(submissionData)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDate(null)
      }
    }
    if (openDate) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDate])

  function hasPref(dateStr: string, shift: ShiftKey) {
    return prefs.some((p) => p.date === dateStr && p.shift === shift)
  }

  function getDatePrefs(dateStr: string) {
    return prefs.filter((p) => p.date === dateStr)
  }

  async function submitPreferences() {
    setSubmitting(true)
    try {
      const r = await fetch('/api/preferences/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: targetYear, month: targetMonth + 1 }),
      })
      const data = await r.json()
      if (r.ok) setSubmission(data)
    } finally {
      setSubmitting(false)
    }
  }

  async function deletePref(dateStr: string, shift: ShiftKey) {
    await fetch('/api/preferences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr, shift }),
    })
    setPrefs((prev) => prev.filter((p) => !(p.date === dateStr && p.shift === shift)))
  }

  async function toggle(dateStr: string, shift: ShiftKey) {
    if (!canSubmit) return
    if (hasPref(dateStr, shift)) {
      await fetch('/api/preferences', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, shift }),
      })
      setPrefs((prev) => prev.filter((p) => !(p.date === dateStr && p.shift === shift)))
    } else {
      const existing = prefs.find((p) => p.date === dateStr)
      if (existing) {
        await fetch('/api/preferences', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr, shift: existing.shift }),
        })
        setPrefs((prev) => prev.filter((p) => p.date !== dateStr))
      }
      const res = await fetch('/api/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr, shift }),
      })
      const newPref = await res.json()
      setPrefs((prev) => [...prev, { ...newPref, date: newPref.date.slice(0, 10) }])
    }
    setOpenDate(null)
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthLabel = new Date(year, month).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })
  const targetMonthLabel = new Date(targetYear, targetMonth).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const firstDow = days[0].getDay()

  if (loading) return <p className="text-gray-500">載入中...</p>

  // Status banner
  const banner = isWindowOpen ? (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
      <span className="text-sm text-green-700">
        <span className="font-medium">{targetMonthLabel}</span> 排班申請開放中，截止日期：本月 26 日
      </span>
    </div>
  ) : extraSubmitEnabled && isViewingTargetMonth ? (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
      <span className="text-sm text-green-700">
        額外報更已開啟，可立即提交 <span className="font-medium">{targetMonthLabel}</span> 排班意願
      </span>
    </div>
  ) : extraSubmitEnabled ? (
    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
      <span className="text-sm text-blue-700">
        額外報更已開啟，請切換至 <span className="font-medium">{targetMonthLabel}</span> 以提交排班意願
      </span>
    </div>
  ) : todayDate < actualOpenDay ? (
    <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
      <span className="text-sm text-yellow-700">
        <span className="font-medium">{targetMonthLabel}</span> 排班申請將於本月 {actualOpenDay} 日開放
        {actualOpenDay !== 15 && <span className="ml-1 opacity-70">（15日為休息日，順延至{actualOpenDay}日）</span>}
      </span>
    </div>
  ) : (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
      <span className="text-sm text-gray-500">
        本月排班申請已截止，下一開放日為下月 15 日
      </span>
    </div>
  )

  return (
    <div>
      {banner}

      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-1 rounded-lg border hover:bg-gray-100">‹</button>
        <div className="text-center">
          <span className="font-semibold text-gray-800">{monthLabel}</span>
          {isViewingTargetMonth && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">申請月份</span>
          )}
        </div>
        <button onClick={nextMonth} className="px-3 py-1 rounded-lg border hover:bg-gray-100">›</button>
      </div>

      {/* 手機列表模式 */}
      <div className="sm:hidden space-y-1.5 mb-6">
        {days.map((day) => {
          const dateStr = toDateStr(day)
          const isWeekend = day.getDay() === 0 || day.getDay() === 6
          const holiday = holidays.find((h) => h.date === dateStr)

          if (isWeekend || holiday) {
            return (
              <div key={dateStr} className="flex items-center justify-between px-4 py-3 bg-pink-50 rounded-xl border border-pink-100">
                <span className="text-sm text-pink-500 font-medium">
                  {new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })}
                </span>
                <span className="text-sm text-pink-400">{holiday ? holiday.name : '休息'}</span>
              </div>
            )
          }

          return (
            <div key={dateStr} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${!canSubmit ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
              <span className={`text-sm font-medium ${!canSubmit ? 'text-gray-400' : 'text-gray-700'}`}>
                {new Date(dateStr + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })}
              </span>
              <div className="flex gap-1.5">
                {(Object.keys(SHIFTS) as ShiftKey[]).map((shift) => {
                  const selected = hasPref(dateStr, shift)
                  return (
                    <button
                      key={shift}
                      disabled={!canSubmit}
                      onClick={() => toggle(dateStr, shift)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed ${
                        selected ? SHIFTS[shift].color : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {SHIFTS[shift].label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* 桌面月曆模式 */}
      <div className="hidden sm:block">
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="grid grid-cols-7 border-b">
            {weekdays.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`empty-${i}`} className="border-b border-r p-2 min-h-[80px]" />
            ))}
            {days.map((day) => {
              const dateStr = toDateStr(day)
              const dayPrefs = getDatePrefs(dateStr)
              const isOpen = openDate === dateStr
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const holiday = holidays.find((h) => h.date === dateStr)

              if (isWeekend || holiday) {
                return (
                  <div key={dateStr} className="relative border-b border-r p-2 min-h-[80px] bg-pink-50">
                    <div className="text-xs text-pink-400 mb-1">{day.getDate()}</div>
                    <div className="text-xs text-pink-500 font-medium text-center mt-2">
                      {holiday ? holiday.name : '休息'}
                    </div>
                  </div>
                )
              }

              return (
                <div key={dateStr} className={`relative border-b border-r p-2 min-h-[80px] ${!canSubmit ? 'bg-gray-50' : ''}`}>
                  <div className="text-xs text-gray-500 mb-1">{day.getDate()}</div>
                  <button
                    disabled={!canSubmit}
                    onClick={() => setOpenDate(isOpen ? null : dateStr)}
                    className={`w-full text-left text-xs rounded border px-1.5 py-1 transition flex items-center justify-between gap-1
                      ${!canSubmit ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-gray-100' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-500'}
                      ${isOpen ? 'border-blue-400 ring-1 ring-blue-300' : ''}`}
                  >
                    <span className="truncate">
                      {dayPrefs.length === 0
                        ? <span className="text-gray-300">選擇班次</span>
                        : dayPrefs.map(p => SHIFTS[p.shift].label).join('、')}
                    </span>
                    {canSubmit && (
                      <svg className={`w-3 h-3 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>

                  {isOpen && canSubmit && (
                    <div
                      ref={dropdownRef}
                      className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-36 py-1"
                    >
                      {(Object.keys(SHIFTS) as ShiftKey[]).map((shift) => {
                        const selected = hasPref(dateStr, shift)
                        return (
                          <div key={shift} className="relative group">
                            <button
                              onClick={() => toggle(dateStr, shift)}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition
                                ${selected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                              <span className={`w-3 h-3 rounded-full shrink-0 ${selected ? 'bg-blue-500' : 'bg-gray-200'}`} />
                              <span className={selected ? SHIFTS[shift].color + ' px-1 rounded font-medium' : 'text-gray-600'}>
                                {SHIFTS[shift].label}
                              </span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="font-medium text-gray-700 mb-3">已選意願摘要</h3>
        {prefs.filter(p => p.date.startsWith(`${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`)).length === 0 ? (
          <p className="text-sm text-gray-400">尚未選擇任何班次</p>
        ) : (
          <div className="space-y-2">
            {[...prefs]
              .filter(p => p.date.startsWith(`${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`))
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-600 w-28">
                    {new Date(p.date + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </span>
                  <ShiftBadge shift={p.shift} />
                  <button
                    onClick={() => deletePref(p.date, p.shift)}
                    className="ml-auto text-gray-300 hover:text-red-400 text-base leading-none transition"
                  >×</button>
                </div>
              ))}
          </div>
        )}

        {canSubmit && (
          <div className="mt-5 border-t pt-4">
            {submission && (
              <p className="text-xs text-gray-400 mb-2">
                上次提交：{new Date(submission.submittedAt).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            <button
              onClick={submitPreferences}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? '處理中...' : submission ? '確認更新' : '確認提交'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
