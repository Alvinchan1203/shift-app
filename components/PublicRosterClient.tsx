'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { SHIFTS, ShiftKey } from '@/lib/constants'

type User = { id: string; name: string }
type Assignment = { userId: string; date: string; shift: string }
type Holiday = { id: string; date: string; name: string }

interface Props {
  isLoggedIn: boolean
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month - 1, 1)
  while (d.getMonth() === month - 1) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekStart(d: Date): Date {
  const result = new Date(d)
  const dow = d.getDay()
  result.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  result.setHours(0, 0, 0, 0)
  return result
}

const ClockIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

export default function PublicRosterClient({ isLoggedIn }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [users, setUsers] = useState<User[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(true)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))

  useEffect(() => {
    setLoading(true)
    fetch(`/api/public/attendance?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(data => {
        setUsers(data.users ?? [])
        setAssignments(data.assignments ?? [])
        setHolidays(data.holidays ?? [])
        setIsPublished(data.isPublished ?? false)
        setLoading(false)
      })
  }, [year, month])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    const result = await signIn('credentials', { username, password, redirect: false })
    if (result?.error) {
      setLoginError('用戶名或密碼錯誤')
      setLoggingIn(false)
    } else {
      sessionStorage.setItem('tab_auth', '1')
      window.location.href = '/app'
    }
  }

  const days = getMonthDays(year, month)
  const today = toDateStr(new Date())

  function isRestDay(day: Date) {
    const dow = day.getDay()
    const ds = toDateStr(day)
    const holiday = holidays.find(h => h.date === ds)
    return dow === 0 || dow === 6 || !!holiday
  }

  function getShiftAssignments(userId: string, dateStr: string) {
    return assignments.filter(a => a.userId === userId && a.date === dateStr)
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })
  const todayDisplay = new Date().toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d })
  const weekEnd = weekDays[6]
  const weekRangeLabel = (() => {
    const sm = weekStart.getMonth() + 1, sd = weekStart.getDate()
    const em = weekEnd.getMonth() + 1, ed = weekEnd.getDate()
    return sm === em ? `${sm}月${sd}日 – ${ed}日` : `${sm}月${sd}日 – ${em}月${ed}日`
  })()

  function prevMonth() {
    const newYear = month === 1 ? year - 1 : year
    const newMonth = month === 1 ? 12 : month - 1
    if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
    setWeekStart(getWeekStart(new Date(newYear, newMonth - 1, 1)))
  }
  function nextMonth() {
    const newYear = month === 12 ? year + 1 : year
    const newMonth = month === 12 ? 1 : month + 1
    if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
    setWeekStart(getWeekStart(new Date(newYear, newMonth - 1, 1)))
  }
  function prevWeek() {
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  }
  function nextWeek() {
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  }

  const inputClass = (w: string) =>
    `border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition ${w}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── 桌面：右上角固定登入浮窗 ── */}
      <div className="hidden md:block fixed top-4 right-4 z-50">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-4 w-64">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <ClockIcon />
            </div>
            <span className="text-sm font-semibold text-gray-800 leading-tight">金鐘辦公室Bee報更系統</span>
          </div>
          {isLoggedIn ? (
            <button onClick={() => { sessionStorage.setItem('tab_auth', '1'); window.location.href = '/app' }} className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-sm font-semibold transition-colors">
              進入系統 →
            </button>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="用戶名"
                required
                className={inputClass('w-full')}
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密碼"
                required
                className={inputClass('w-full')}
              />
              {loginError && <p className="text-xs text-red-500">{loginError}</p>}
              <button type="submit" disabled={loggingIn} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
                {loggingIn ? '登入中...' : '登入'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── 手機：頂部橫向登入列 ── */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center shrink-0">
              <ClockIcon />
            </div>
            <span className="text-xs font-semibold text-gray-800 truncate">金鐘辦公室Bee報更系統</span>
          </div>
          <span className="text-xs text-gray-500 shrink-0">今天：{todayDisplay}</span>
        </div>
        {isLoggedIn ? (
          <button onClick={() => { sessionStorage.setItem('tab_auth', '1'); window.location.href = '/app' }} className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-sm font-semibold transition-colors">
            進入系統 →
          </button>
        ) : (
          <>
            <form onSubmit={handleLogin} className="flex items-center gap-2">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="用戶名"
                required
                className={inputClass('w-28')}
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密碼"
                required
                className={inputClass('w-24')}
              />
              <button type="submit" disabled={loggingIn} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors whitespace-nowrap">
                {loggingIn ? '登入中...' : '登入'}
              </button>
            </form>
            {loginError && <p className="text-xs text-red-500 mt-1">{loginError}</p>}
          </>
        )}
      </div>

      {/* ── 主體內容 ── */}
      <div className="max-w-full px-4 py-6 md:pr-72">
        {/* 標題列 */}
        <div className="mb-5">
          <h1 className="text-lg font-bold text-gray-900">本月排班表</h1>
          <p className="text-base font-bold text-gray-900">今天：{todayDisplay}</p>
        </div>

        {/* 月份選擇 */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500">‹</button>
          <span className="text-sm font-semibold text-gray-700 min-w-[90px] text-center">{monthLabel}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500">›</button>
        </div>

        {/* 圖例 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(SHIFTS).map(([key, s]) => (
            <div key={key} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${s.color}`}>
              <span className="font-medium">{key}</span>
              <span className="opacity-70">{s.time}</span>
            </div>
          ))}
        </div>

        {/* 未發布提示 */}
        {!isPublished && !loading && (
          <div className="bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-gray-500">本月排班尚未發布，敬請稍候。</p>
          </div>
        )}

        {/* 手機：每週表格 */}
        <div className="md:hidden mb-4">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={prevWeek} className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500">‹</button>
            <span className="text-sm font-semibold text-gray-700 flex-1 text-center">{weekRangeLabel}</span>
            <button onClick={nextWeek} className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 hover:bg-gray-100 transition text-gray-500">›</button>
          </div>
          <div className={`overflow-x-auto rounded-2xl border shadow-sm bg-white transition-opacity ${loading ? 'opacity-50' : ''}`}>
            <table className="border-collapse w-full text-sm table-fixed">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="sticky left-0 z-10 bg-gray-50 text-left px-3 py-2.5 font-medium text-gray-600 w-[88px] border-r text-xs">員工</th>
                  {weekDays.map(day => {
                    const ds = toDateStr(day)
                    const isToday = ds === today
                    const rest = isRestDay(day)
                    return (
                      <th key={ds} className={`text-center px-0 py-2 text-xs ${isToday ? 'bg-indigo-50' : rest ? 'text-pink-300' : 'text-gray-500'}`}>
                        <div className={isToday ? 'font-bold text-gray-900' : 'font-medium'}>{day.getDate()}</div>
                        <div className={`font-normal ${isToday ? 'text-gray-500' : 'text-gray-300'}`}>{'日一二三四五六'[day.getDay()]}</div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white hover:bg-gray-50 px-3 py-2 border-r w-[88px]">
                      <span className="font-medium text-gray-800 text-xs break-words leading-tight">{user.name}</span>
                    </td>
                    {weekDays.map(day => {
                      const ds = toDateStr(day)
                      const isToday = ds === today
                      const rest = isRestDay(day)
                      const userAssignments = getShiftAssignments(user.id, ds)
                      if (rest) {
                        return <td key={ds} className={`border border-gray-200 ${isToday ? 'bg-indigo-100' : 'bg-pink-50'}`} />
                      }
                      return (
                        <td key={ds} className={`border border-gray-200 p-0 ${isToday ? 'bg-indigo-50' : ''}`}>
                          {userAssignments.length > 0 ? (
                            <div className="flex flex-col">
                              {userAssignments.map((a, i) => {
                                const shift = SHIFTS[a.shift as ShiftKey]
                                return shift ? (
                                  <div key={i} className={`flex items-center justify-center text-xs font-medium py-1 ${shift.color}`}>
                                    {a.shift}
                                  </div>
                                ) : null
                              })}
                            </div>
                          ) : (
                            <div className="py-1.5" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={weekDays.length + 1} className="text-center py-8 text-gray-400 text-sm">暫無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 排班表格（桌面） */}
        <div className={`hidden md:block overflow-x-auto rounded-2xl border shadow-sm bg-white transition-opacity ${loading ? 'opacity-50' : ''}`}>
          <table className="border-collapse w-full text-sm table-fixed" style={{ minWidth: '700px' }}>
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-2.5 font-medium text-gray-600 w-[100px] border-r">員工</th>
                {days.map(day => {
                  const ds = toDateStr(day)
                  const isToday = ds === today
                  const rest = isRestDay(day)
                  return (
                    <th
                      key={ds}
                      className={`text-center px-0 py-2 text-xs ${isToday ? 'bg-indigo-50' : rest ? 'text-pink-300' : 'text-gray-500'}`}
                    >
                      <div className={isToday ? 'font-bold text-gray-900' : 'font-medium'}>{day.getDate()}</div>
                      <div className={`font-normal ${isToday ? 'text-gray-500' : 'text-gray-300'}`}>
                        {'日一二三四五六'[day.getDay()]}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white hover:bg-gray-50 px-3 py-2 border-r w-[100px]">
                    <span className="font-medium text-gray-800 text-sm">{user.name}</span>
                  </td>
                  {days.map(day => {
                    const ds = toDateStr(day)
                    const isToday = ds === today
                    const rest = isRestDay(day)
                    const userAssignments = getShiftAssignments(user.id, ds)

                    if (rest) {
                      return <td key={ds} className={`border border-gray-200 w-9 ${isToday ? 'bg-indigo-100' : 'bg-pink-50'}`} />
                    }

                    return (
                      <td key={ds} className={`border border-gray-200 w-9 p-0 ${isToday ? 'bg-indigo-50' : ''}`}>
                        {userAssignments.length > 0 ? (
                          <div className="flex flex-col">
                            {userAssignments.map((a, i) => {
                              const shift = SHIFTS[a.shift as ShiftKey]
                              return shift ? (
                                <div key={i} className={`flex items-center justify-center text-xs font-medium py-1 ${shift.color}`}>
                                  {a.shift}
                                </div>
                              ) : null
                            })}
                          </div>
                        ) : (
                          <div className="py-1.5" />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {users.length === 0 && !loading && (
                <tr>
                  <td colSpan={days.length + 1} className="text-center py-8 text-gray-400 text-sm">暫無資料</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
