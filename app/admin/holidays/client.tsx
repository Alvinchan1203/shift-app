'use client'

import { useEffect, useRef, useState } from 'react'

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

export default function AdminHolidaysClient() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const days = getMonthDays(year, month)

  useEffect(() => {
    fetch('/api/holidays')
      .then((r) => r.json())
      .then((data) => {
        setHolidays(data.map((h: Holiday) => ({ ...h, date: h.date.slice(0, 10) })))
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (selectedDate) {
      const existing = holidays.find((h) => h.date === selectedDate)
      setNameInput(existing ? existing.name : '')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [selectedDate])

  function getHoliday(dateStr: string) {
    return holidays.find((h) => h.date === dateStr)
  }

  async function save() {
    if (!selectedDate || !nameInput.trim()) return
    setSaving(true)
    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate, name: nameInput.trim() }),
    })
    const holiday = await res.json()
    setHolidays((prev) => {
      const filtered = prev.filter((h) => h.date !== selectedDate)
      return [...filtered, { ...holiday, date: holiday.date.slice(0, 10) }]
    })
    setSaving(false)
    setSelectedDate(null)
  }

  async function remove(dateStr: string) {
    await fetch('/api/holidays', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: dateStr }),
    })
    setHolidays((prev) => prev.filter((h) => h.date !== dateStr))
    if (selectedDate === dateStr) setSelectedDate(null)
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
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const firstDow = days[0].getDay()

  if (loading) return <p className="text-gray-500">載入中...</p>

  const monthHolidays = holidays
    .filter((h) => h.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="px-3 py-1 rounded-lg border hover:bg-gray-100">‹</button>
        <span className="font-semibold text-gray-800">{monthLabel}</span>
        <button onClick={nextMonth} className="px-3 py-1 rounded-lg border hover:bg-gray-100">›</button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-6">
        <div className="grid grid-cols-7 border-b">
          {weekdays.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`e-${i}`} className="border-b border-r p-2 min-h-[72px]" />
          ))}
          {days.map((day) => {
            const dateStr = toDateStr(day)
            const isWeekend = day.getDay() === 0 || day.getDay() === 6
            const holiday = getHoliday(dateStr)
            const isSelected = selectedDate === dateStr

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`border-b border-r p-2 min-h-[72px] text-left w-full transition
                  ${holiday ? 'bg-pink-50 hover:bg-pink-100' : isWeekend ? 'bg-gray-50 hover:bg-gray-100' : 'hover:bg-blue-50'}
                  ${isSelected ? 'ring-2 ring-inset ring-blue-400' : ''}`}
              >
                <div className={`text-xs mb-1 ${isWeekend && !holiday ? 'text-gray-400' : 'text-gray-600'}`}>
                  {day.getDate()}
                </div>
                {holiday ? (
                  <div className="text-xs text-pink-600 font-medium leading-tight">{holiday.name}</div>
                ) : isWeekend ? (
                  <div className="text-xs text-gray-300">休息</div>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* 編輯面板 */}
      {selectedDate && (
        <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-800">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="輸入節日名稱（如：勞動節）"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={save}
              disabled={!nameInput.trim() || saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-40 transition"
            >
              {saving ? '儲存中...' : '儲存'}
            </button>
            {getHoliday(selectedDate) && (
              <button
                onClick={() => remove(selectedDate)}
                className="px-4 py-2 bg-red-100 text-red-600 text-sm rounded-lg hover:bg-red-200 transition"
              >
                移除
              </button>
            )}
          </div>
        </div>
      )}

      {/* 本月假期列表 */}
      <div>
        <h3 className="font-medium text-gray-700 mb-3">本月假期</h3>
        {monthHolidays.length === 0 ? (
          <p className="text-sm text-gray-400">本月暫無假期</p>
        ) : (
          <div className="space-y-2">
            {monthHolidays.map((h) => (
              <div key={h.id} className="flex items-center justify-between bg-pink-50 rounded-lg px-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">
                    {new Date(h.date + 'T00:00:00').toLocaleDateString('zh-HK', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </span>
                  <span className="text-sm font-medium text-pink-700">{h.name}</span>
                </div>
                <button
                  onClick={() => remove(h.date)}
                  className="text-xs text-red-400 hover:text-red-600 transition"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
