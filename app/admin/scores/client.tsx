'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  calcAccountOpeningScore,
  calcAdminScore,
  calcSalaryMultiplier,
} from '@/lib/scoring'

type Adjustment = {
  id: string
  description: string
  points: number
  adminName: string
  createdAt: string
}

type EmployeeScore = {
  employeeId: string
  employeeName: string
  monthlyScoreId: string | null
  witnessCount: number
  successCount: number
  adjustments: Adjustment[]
  totalAttendanceMinutes: number
  totalWorkPoints: number
  item1: number
  item2: number
  item3: number
  item4: number
  total: number
  multiplier: number
}

interface Props {
  year: number
  month: number
  prevYear: number
  prevMonth: number
  nextYear: number
  nextMonth: number
  employeeData: EmployeeScore[]
}

function MultiplierBadge({ multiplier }: { multiplier: number }) {
  const color =
    multiplier >= 1.5 ? 'bg-green-100 text-green-800' :
    multiplier >= 1.3 ? 'bg-blue-100 text-blue-800' :
    multiplier >= 1.1 ? 'bg-yellow-100 text-yellow-800' :
    'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      ×{multiplier.toFixed(1)}
    </span>
  )
}

function ScoreBadge({ score, max }: { score: number; max: number }) {
  return (
    <span className="font-semibold text-gray-800">{score}</span>
  )
}

export default function AdminScoresClient({
  year, month, prevYear, prevMonth, nextYear, nextMonth, employeeData,
}: Props) {
  const router = useRouter()
  const [data, setData] = useState<EmployeeScore[]>(employeeData)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [witnessInputs, setWitnessInputs] = useState<Record<string, { witness: string; success: string }>>(() => {
    const m: Record<string, { witness: string; success: string }> = {}
    for (const e of employeeData) {
      m[e.employeeId] = { witness: String(e.witnessCount), success: String(e.successCount) }
    }
    return m
  })

  // Modal state for adding adjustments
  const [adjModal, setAdjModal] = useState<{ employeeId: string; employeeName: string } | null>(null)
  const [adjDesc, setAdjDesc] = useState('')
  const [adjPoints, setAdjPoints] = useState('')
  const [adjSubmitting, setAdjSubmitting] = useState(false)
  const [adjError, setAdjError] = useState<string | null>(null)

  const monthLabel = new Date(year, month - 1).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })

  function updateEmployee(employeeId: string, updater: (e: EmployeeScore) => EmployeeScore) {
    setData(prev => prev.map(e => e.employeeId === employeeId ? updater(e) : e))
  }

  async function saveWitnessData(employeeId: string) {
    const inputs = witnessInputs[employeeId]
    const witnessCount = parseInt(inputs.witness) || 0
    const successCount = parseInt(inputs.success) || 0
    setSavingId(employeeId)
    const res = await fetch(`/api/admin/scores/${employeeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, witnessCount, successCount }),
    })
    setSavingId(null)
    if (res.ok) {
      const newItem2 = calcAccountOpeningScore(witnessCount, successCount)
      updateEmployee(employeeId, e => {
        const newTotal = e.item1 + newItem2 + e.item3 + e.item4
        return {
          ...e,
          witnessCount,
          successCount,
          item2: newItem2,
          total: newTotal,
          multiplier: calcSalaryMultiplier(newTotal),
        }
      })
      router.refresh()
    }
  }

  async function handleAddAdjustment() {
    if (!adjModal) return
    setAdjError(null)
    const pts = parseInt(adjPoints)
    if (!adjDesc.trim()) { setAdjError('請輸入說明'); return }
    if (isNaN(pts)) { setAdjError('請輸入有效分數'); return }
    setAdjSubmitting(true)
    const res = await fetch(`/api/admin/scores/${adjModal.employeeId}/adjustments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, description: adjDesc.trim(), points: pts }),
    })
    const newAdj = await res.json()
    setAdjSubmitting(false)
    if (!res.ok) { setAdjError(newAdj.error ?? '新增失敗'); return }
    updateEmployee(adjModal.employeeId, e => {
      const newAdjs = [...e.adjustments, newAdj]
      const newItem4 = calcAdminScore(newAdjs)
      const newTotal = e.item1 + e.item2 + e.item3 + newItem4
      return {
        ...e,
        adjustments: newAdjs,
        item4: newItem4,
        total: newTotal,
        multiplier: calcSalaryMultiplier(newTotal),
      }
    })
    setAdjDesc('')
    setAdjPoints('')
    setAdjModal(null)
  }

  async function handleDeleteAdjustment(employeeId: string, adjId: string) {
    const res = await fetch(`/api/admin/scores/${employeeId}/adjustments?id=${adjId}`, { method: 'DELETE' })
    if (res.ok) {
      updateEmployee(employeeId, e => {
        const newAdjs = e.adjustments.filter(a => a.id !== adjId)
        const newItem4 = calcAdminScore(newAdjs)
        const newTotal = e.item1 + e.item2 + e.item3 + newItem4
        return {
          ...e,
          adjustments: newAdjs,
          item4: newItem4,
          total: newTotal,
          multiplier: calcSalaryMultiplier(newTotal),
        }
      })
    }
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">員工評分</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/scores?year=${prevYear}&month=${prevMonth}`}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >‹</Link>
          <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">{monthLabel}</span>
          <Link
            href={`/admin/scores?year=${nextYear}&month=${nextMonth}`}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >›</Link>
        </div>
      </div>

      <div className="space-y-4">
        {data.map(emp => (
          <div key={emp.employeeId} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
              <span className="font-semibold text-gray-800">{emp.employeeName}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-700">{emp.total} 分</span>
                <MultiplierBadge multiplier={emp.multiplier} />
              </div>
            </div>

            <div className="divide-y">
              {/* Item 1: Work Hours */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">① 上班時數</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {Math.round(emp.totalAttendanceMinutes / 60 * 10) / 10} 小時
                    </p>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{emp.item1}<span className="text-xs text-gray-400 font-normal ml-0.5">/30</span></span>
                </div>
              </div>

              {/* Item 2: Account Opening */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">② 開戶見證轉化</p>
                  <span className="text-lg font-bold text-gray-800">{emp.item2}<span className="text-xs text-gray-400 font-normal ml-0.5">/10</span></span>
                </div>
                <div className="flex items-end gap-3 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">見證數</label>
                    <input
                      type="number"
                      min={0}
                      value={witnessInputs[emp.employeeId]?.witness ?? ''}
                      onChange={e => setWitnessInputs(prev => ({
                        ...prev,
                        [emp.employeeId]: { ...prev[emp.employeeId], witness: e.target.value }
                      }))}
                      className="w-20 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-400">成功開戶數</label>
                    <input
                      type="number"
                      min={0}
                      value={witnessInputs[emp.employeeId]?.success ?? ''}
                      onChange={e => setWitnessInputs(prev => ({
                        ...prev,
                        [emp.employeeId]: { ...prev[emp.employeeId], success: e.target.value }
                      }))}
                      className="w-20 border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={() => saveWitnessData(emp.employeeId)}
                    disabled={savingId === emp.employeeId}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-60"
                  >
                    {savingId === emp.employeeId ? '儲存中...' : '儲存'}
                  </button>
                  {emp.witnessCount > 0 && (
                    <span className="text-xs text-gray-400">
                      轉化率 {Math.round(emp.successCount / emp.witnessCount * 100)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Item 3: Actual Work */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">③ 實際工作</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      工作分 {emp.totalWorkPoints} ÷ 出勤分鐘 {emp.totalAttendanceMinutes}
                      {emp.totalAttendanceMinutes > 0 && (
                        <> = {(emp.totalWorkPoints / emp.totalAttendanceMinutes).toFixed(3)}</>
                      )}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{emp.item3}<span className="text-xs text-gray-400 font-normal ml-0.5">/30</span></span>
                </div>
              </div>

              {/* Item 4: Admin Score */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">④ 管理員評分</p>
                  <span className="text-lg font-bold text-gray-800">{emp.item4}<span className="text-xs text-gray-400 font-normal ml-0.5">/30</span></span>
                </div>
                <p className="text-xs text-gray-400 mb-3">起始 25 分，已調整：{emp.item4 - 25 >= 0 ? '+' : ''}{emp.item4 - 25} 分</p>

                {emp.adjustments.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {emp.adjustments.map(adj => (
                      <div key={adj.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <span className="text-xs text-gray-700 truncate block">{adj.description}</span>
                          <span className="text-xs text-gray-400">{adj.adminName}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className={`text-sm font-semibold ${adj.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {adj.points >= 0 ? '+' : ''}{adj.points}
                          </span>
                          <button
                            onClick={() => handleDeleteAdjustment(emp.employeeId, adj.id)}
                            className="text-gray-300 hover:text-red-400 text-lg leading-none"
                          >×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setAdjModal({ employeeId: emp.employeeId, employeeName: emp.employeeName })
                    setAdjDesc('')
                    setAdjPoints('')
                    setAdjError(null)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  + 新增表現記錄
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Adjustment Modal */}
      {adjModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-gray-800 mb-1">新增表現記錄</h3>
            <p className="text-sm text-gray-500 mb-4">{adjModal.employeeName}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">表現說明</label>
                <textarea
                  value={adjDesc}
                  onChange={e => setAdjDesc(e.target.value)}
                  rows={3}
                  placeholder="請輸入表現描述..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">加/減分（正數為加分，負數為減分）</label>
                <input
                  type="number"
                  value={adjPoints}
                  onChange={e => setAdjPoints(e.target.value)}
                  placeholder="例如：+3 或 -2"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {adjError && <p className="text-sm text-red-500">{adjError}</p>}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setAdjModal(null)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50"
              >取消</button>
              <button
                onClick={handleAddAdjustment}
                disabled={adjSubmitting}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {adjSubmitting ? '新增中...' : '確認新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
