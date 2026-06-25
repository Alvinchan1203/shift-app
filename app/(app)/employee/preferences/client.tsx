'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { SHIFTS, SHIFT_HOURS, ShiftKey } from '@/lib/constants'
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

type InitialData = {
  prefs: { id: string; date: string; shift: string }[]
  holidays: Holiday[]
  submission: { submittedAt: string } | null
  isSchedulePublished?: boolean
}

export default function EmployeePreferencesClient({ userName, extraSubmitEnabled, initialData }: { userName: string; extraSubmitEnabled: boolean; initialData: InitialData }) {
  const today = new Date()
  const todayDate = today.getDate()

  const targetDate = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth()

  const [year, setYear] = useState(targetYear)
  const [month, setMonth] = useState(targetMonth)
  const [prefs, setPrefs] = useState<Pref[]>(initialData.prefs as Pref[])
  const [confirmedPrefs, setConfirmedPrefs] = useState<Pref[]>(initialData.prefs as Pref[])
  const [holidays, setHolidays] = useState<Holiday[]>(initialData.holidays)
  const [openDate, setOpenDate] = useState<string | null>(null)
  const [submission, setSubmission] = useState<{ submittedAt: string } | null>(initialData.submission)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const days = getMonthDays(year, month)

  // 計算實際開放日（15日或下一個工作日）
  const actualOpenDate = useMemo(() => {
    const holidaySet = new Set(holidays.map(h => h.date))
    return nextWorkingDay(new Date(today.getFullYear(), today.getMonth(), 15), holidaySet)
  }, [holidays])

  const actualOpenDay = actualOpenDate.getDate()
  const isSchedulePublished = initialData.isSchedulePublished ?? false
  const isWindowOpen = todayDate >= actualOpenDay && todayDate <= 26
  const isViewingTargetMonth = year === targetYear && month === targetMonth
  const canSubmit = extraSubmitEnabled || (!isSchedulePublished && isWindowOpen && isViewingTargetMonth)

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

  const targetMonthPrefix = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`
  const viewingMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`

  const hasUnsavedChanges = (() => {
    const current = prefs.filter(p => p.date.startsWith(viewingMonthPrefix))
    const confirmed = confirmedPrefs.filter(p => p.date.startsWith(viewingMonthPrefix))
    if (current.length !== confirmed.length) return true
    const confirmedSet = new Set(confirmed.map(p => `${p.date}|${p.shift}`))
    return current.some(p => !confirmedSet.has(`${p.date}|${p.shift}`))
  })()

  async function submitPreferences() {
    setSubmitting(true)
    try {
      const targetPrefs = prefs.filter(p => p.date.startsWith(viewingMonthPrefix))
      const r = await fetch('/api/preferences/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: year,
          month: month + 1,
          preferences: targetPrefs.map(p => ({ date: p.date, shift: p.shift })),
        }),
      })
      const data = await r.json()
      if (r.ok) {
        setSubmission(data)
        const updatedPrefs = await fetch('/api/preferences').then(r => r.json())
        const mapped = updatedPrefs.map((p: Pref) => ({ ...p, date: p.date.slice(0, 10) }))
        setPrefs(mapped)
        setConfirmedPrefs(mapped)
        setToast('排班意願已成功提交')
        setTimeout(() => setToast(null), 3000)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function deletePref(dateStr: string, shift: ShiftKey) {
    setPrefs((prev) => prev.filter((p) => !(p.date === dateStr && p.shift === shift)))
  }

  function toggle(dateStr: string, shift: ShiftKey) {
    if (!canSubmit) return
    setPrefs((prev) => {
      if (prev.some(p => p.date === dateStr && p.shift === shift)) {
        return prev.filter(p => !(p.date === dateStr && p.shift === shift))
      }
      const withoutDate = prev.filter(p => p.date !== dateStr)
      return [...withoutDate, { id: `local-${dateStr}-${shift}`, date: dateStr, shift }]
    })
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

  // Status banner
  const banner = isSchedulePublished && !extraSubmitEnabled ? (
    <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-gray-400 shrink-0" />
      <span className="text-sm text-gray-600">
        <span className="font-medium">{targetMonthLabel}</span>排班已發布，意願提交已關閉
      </span>
    </div>
  ) : isSchedulePublished && extraSubmitEnabled ? (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
      <span className="text-sm text-green-700">
        <span className="font-medium">{targetMonthLabel}</span>排班已發布・您已開啟額外報更，仍可提交意願
      </span>
    </div>
  ) : isWindowOpen ? (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
      <span className="text-sm text-green-700">
        <span className="font-medium">{targetMonthLabel}</span> 排班申請開放中，截止日期：本月 26 日
      </span>
    </div>
  ) : extraSubmitEnabled ? (
    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
      <span className="text-sm text-green-700">
        額外報更已開啟，可提交任何月份的排班意願
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
    <>
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
              <div key={`empty-${i}`} className="border-b border-r p-2 min-h-[110px]" />
            ))}
            {days.map((day, dayIndex) => {
              const dateStr = toDateStr(day)
              const dayPrefs = getDatePrefs(dateStr)
              const isOpen = openDate === dateStr
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              const holiday = holidays.find((h) => h.date === dateStr)
              const totalRows = Math.ceil((firstDow + days.length) / 7)
              const rowIndex = Math.floor((firstDow + dayIndex) / 7)
              const openUpward = rowIndex >= totalRows - 2

              if (isWeekend || holiday) {
                return (
                  <div key={dateStr} className="relative border-b border-r p-2 min-h-[110px] bg-pink-50">
                    <div className="text-xs text-pink-400 mb-1">{day.getDate()}</div>
                    <div className="text-xs text-pink-500 font-medium text-center mt-2">
                      {holiday ? holiday.name : '休息'}
                    </div>
                  </div>
                )
              }

              return (
                <div key={dateStr} className={`relative border-b border-r p-2 min-h-[110px] ${!canSubmit ? 'bg-gray-50' : ''}`}>
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
                      className={`absolute left-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-36 py-1 ${openUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}
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
        {(() => {
          const targetMonthPrefs = prefs.filter(p => p.date.startsWith(viewingMonthPrefix))
          const totalPrefHours = targetMonthPrefs.reduce((sum, p) => sum + (SHIFT_HOURS[p.shift] ?? 0), 0)
          return (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-700">已選意願摘要</h3>
                {totalPrefHours > 0 && (
                  <span className="text-sm text-blue-600 font-medium">意願總時數：{totalPrefHours} 小時</span>
                )}
              </div>
              {targetMonthPrefs.length === 0 ? (
                <p className="text-sm text-gray-400">尚未選擇任何班次</p>
              ) : (
                <div className="space-y-2">
                  {[...targetMonthPrefs]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((p) => (
                      <div key={p.id} className="flex items-center gap-3 text-sm">
                        <span className="text-gray-600 w-28">
                          {new Date(p.date + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })}
                        </span>
                        <ShiftBadge shift={p.shift} />
                        <span className="text-xs text-gray-400">{SHIFT_HOURS[p.shift]}h</span>
                        {canSubmit && (
                          <button
                            onClick={() => deletePref(p.date, p.shift)}
                            className="ml-auto text-gray-300 hover:text-red-400 text-base leading-none transition"
                          >×</button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </>
          )
        })()}

        {canSubmit && (
          <div className="mt-5 border-t pt-4">
            {isViewingTargetMonth && submission && (
              <p className="text-xs text-gray-400 mb-2">
                上次提交：{new Date(submission.submittedAt).toLocaleString('zh-HK', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
            {hasUnsavedChanges && (
              <p className="text-xs text-amber-600 mb-2">意願已更改，請確認後才會儲存</p>
            )}
            <button
              onClick={submitPreferences}
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? '處理中...' : (isViewingTargetMonth && submission) ? '確認更新' : '確認提交'}
            </button>
          </div>
        )}
      </div>
    </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap">
          ✓ {toast}
        </div>
      )}
    </>
  )
}
