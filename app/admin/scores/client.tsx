'use client'

import { useState } from 'react'
import MonthPicker from '@/components/MonthPicker'
import {
  calcAccountOpeningScore,
  calcAdminScore,
  calcSalaryMultiplier,
  calcTotalDeductions,
  DEDUCTION_ITEMS,
} from '@/lib/scoring'

const DED_SHORT: Record<string, string> = {
  LATE: '遲到',
  ABSENCE: '缺勤',
  SCHEDULE_CHANGE: '改更',
  COMMON_AREA_EATING: '飲食',
  PUNCH_INACCURACY: '打卡',
  COMPLAINT: '投訴',
}

type Adjustment = {
  id: string
  description: string
  points: number
  adminName: string
  createdAt: string
}

type Deduction = {
  type: string
  count: number
}

type EmployeeScore = {
  employeeId: string
  employeeName: string
  monthlyScoreId: string | null
  witnessCount: number
  successCount: number
  adjustments: Adjustment[]
  totalAttendanceMinutes: number
  confirmedMinutes: number | null
  totalWorkPoints: number
  item1: number
  item2: number
  item3: number
  item4: number
  deductions: Deduction[]
  totalDeductions: number
  total: number
  multiplier: number
}

interface Props {
  year: number
  month: number
  employeeData: EmployeeScore[]
}

function MultiplierBadge({ multiplier }: { multiplier: number }) {
  const color =
    multiplier >= 1.5 ? 'bg-green-100 text-green-800' :
    multiplier >= 1.3 ? 'bg-blue-100 text-blue-800' :
    multiplier >= 1.1 ? 'bg-yellow-100 text-yellow-800' :
    'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      ×{multiplier.toFixed(1)}
    </span>
  )
}

export default function AdminScoresClient({
  year, month, employeeData,
}: Props) {
  const [data, setData] = useState<EmployeeScore[]>(employeeData)

  // Witness modal
  const [witnessModal, setWitnessModal] = useState<{ employeeId: string; employeeName: string } | null>(null)
  const [witnessInput, setWitnessInput] = useState({ witness: '', success: '' })
  const [witnessSaving, setWitnessSaving] = useState(false)

  // Adjustments modal
  const [adjModal, setAdjModal] = useState<{ employeeId: string; employeeName: string } | null>(null)
  const [adjDesc, setAdjDesc] = useState('')
  const [adjPoints, setAdjPoints] = useState('')
  const [adjSubmitting, setAdjSubmitting] = useState(false)
  const [adjError, setAdjError] = useState<string | null>(null)

  // Deductions modal
  const [dedModal, setDedModal] = useState<{ employeeId: string; employeeName: string } | null>(null)
  const [dedCounts, setDedCounts] = useState<Record<string, string>>({})
  const [dedSaving, setDedSaving] = useState(false)

  function updateEmployee(employeeId: string, updater: (e: EmployeeScore) => EmployeeScore) {
    setData(prev => prev.map(e => e.employeeId === employeeId ? updater(e) : e))
  }

  function openWitnessModal(emp: EmployeeScore) {
    setWitnessModal({ employeeId: emp.employeeId, employeeName: emp.employeeName })
    setWitnessInput({ witness: String(emp.witnessCount), success: String(emp.successCount) })
  }

  async function saveWitnessData() {
    if (!witnessModal) return
    const witnessCount = parseInt(witnessInput.witness) || 0
    const successCount = parseInt(witnessInput.success) || 0
    setWitnessSaving(true)
    const res = await fetch(`/api/admin/scores/${witnessModal.employeeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, witnessCount, successCount }),
    })
    setWitnessSaving(false)
    if (res.ok) {
      const newItem2 = calcAccountOpeningScore(witnessCount, successCount)
      updateEmployee(witnessModal.employeeId, e => {
        const newTotal = Math.max(0, e.item1 + newItem2 + e.item3 + e.item4 - e.totalDeductions)
        return { ...e, witnessCount, successCount, item2: newItem2, total: newTotal, multiplier: calcSalaryMultiplier(newTotal) }
      })
      setWitnessModal(null)
    }
  }

  function openAdjModal(emp: EmployeeScore) {
    setAdjModal({ employeeId: emp.employeeId, employeeName: emp.employeeName })
    setAdjDesc('')
    setAdjPoints('')
    setAdjError(null)
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
      const newTotal = Math.max(0, e.item1 + e.item2 + e.item3 + newItem4 - e.totalDeductions)
      return { ...e, adjustments: newAdjs, item4: newItem4, total: newTotal, multiplier: calcSalaryMultiplier(newTotal) }
    })
    setAdjDesc('')
    setAdjPoints('')
  }

  async function handleDeleteAdjustment(employeeId: string, adjId: string) {
    const res = await fetch(`/api/admin/scores/${employeeId}/adjustments?id=${adjId}`, { method: 'DELETE' })
    if (res.ok) {
      updateEmployee(employeeId, e => {
        const newAdjs = e.adjustments.filter(a => a.id !== adjId)
        const newItem4 = calcAdminScore(newAdjs)
        const newTotal = Math.max(0, e.item1 + e.item2 + e.item3 + newItem4 - e.totalDeductions)
        return { ...e, adjustments: newAdjs, item4: newItem4, total: newTotal, multiplier: calcSalaryMultiplier(newTotal) }
      })
    }
  }

  function openDedModal(emp: EmployeeScore) {
    setDedModal({ employeeId: emp.employeeId, employeeName: emp.employeeName })
    const counts: Record<string, string> = {}
    for (const item of DEDUCTION_ITEMS) {
      const found = emp.deductions.find(d => d.type === item.type)
      counts[item.type] = String(found?.count ?? 0)
    }
    setDedCounts(counts)
  }

  async function saveDedData() {
    if (!dedModal) return
    setDedSaving(true)
    const deductions = DEDUCTION_ITEMS.map(item => ({
      type: item.type,
      count: parseInt(dedCounts[item.type]) || 0,
    }))
    const res = await fetch(`/api/admin/scores/${dedModal.employeeId}/deductions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, deductions }),
    })
    setDedSaving(false)
    if (res.ok) {
      const newTotalDeductions = calcTotalDeductions(deductions)
      updateEmployee(dedModal.employeeId, e => {
        const newTotal = Math.max(0, e.item1 + e.item2 + e.item3 + e.item4 - newTotalDeductions)
        return { ...e, deductions, totalDeductions: newTotalDeductions, total: newTotal, multiplier: calcSalaryMultiplier(newTotal) }
      })
      setDedModal(null)
    }
  }

  const adjModalEmployee = adjModal ? data.find(e => e.employeeId === adjModal.employeeId) : null

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">員工評分</h2>
        <MonthPicker year={year} month={month} basePath="/admin/scores" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-xs">
                <th className="text-left px-4 py-2 font-medium text-gray-600">姓名</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">① 上班時數<span className="text-gray-400 font-normal"> /30</span></th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">② 開戶見證<span className="text-gray-400 font-normal"> /10</span></th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">③ 實際工作<span className="text-gray-400 font-normal"> /30</span></th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">④ 管理員評分<span className="text-gray-400 font-normal"> /30</span></th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">⑤ 扣分</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">總分</th>
                <th className="text-center px-3 py-2 font-medium text-gray-600">薪資倍數</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map(emp => (
                <tr key={emp.employeeId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 font-medium text-gray-800 text-sm">{emp.employeeName}</td>

                  {/* Item 1 */}
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className="font-semibold text-gray-800">{emp.item1}</span>
                    {emp.confirmedMinutes != null ? (
                      <span className="text-xs text-green-600 font-medium ml-1.5">✓ {Math.round(emp.confirmedMinutes / 60 * 10) / 10}h</span>
                    ) : (
                      <span className="text-xs text-gray-400 ml-1.5">{Math.round(emp.totalAttendanceMinutes / 60 * 10) / 10}h</span>
                    )}
                  </td>

                  {/* Item 2 */}
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className="font-semibold text-gray-800">{emp.item2}</span>
                    <span className="text-xs text-gray-400 ml-1.5">
                      {emp.witnessCount > 0 ? `${emp.successCount}/${emp.witnessCount}` : '未設定'}
                    </span>
                    <button onClick={() => openWitnessModal(emp)} className="ml-2 text-xs text-blue-500 hover:text-blue-700">編輯</button>
                  </td>

                  {/* Item 3 */}
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className="font-semibold text-gray-800">{emp.item3}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{emp.totalWorkPoints}分</span>
                  </td>

                  {/* Item 4 */}
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <span className="font-semibold text-gray-800">{emp.item4}</span>
                    <span className="text-xs text-gray-400 ml-1.5">
                      {emp.adjustments.length > 0 ? `${emp.adjustments.length}項調整` : '起始25分'}
                    </span>
                    <button onClick={() => openAdjModal(emp)} className="ml-2 text-xs text-blue-500 hover:text-blue-700">編輯</button>
                  </td>

                  {/* Item 5: Deductions */}
                  <td className="px-3 py-2">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                      {DEDUCTION_ITEMS.map(item => {
                        const count = emp.deductions.find(d => d.type === item.type)?.count ?? 0
                        return (
                          <div key={item.type} className="flex items-center justify-between gap-1">
                            <span className="text-gray-500">{DED_SHORT[item.type]}</span>
                            <span className={count > 0 ? 'font-semibold text-red-500' : 'text-gray-300'}>
                              {count > 0 ? `×${count}` : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={`text-xs font-semibold ${emp.totalDeductions > 0 ? 'text-red-500' : 'text-gray-300'}`}>
                        {emp.totalDeductions > 0 ? `-${emp.totalDeductions}分` : '—'}
                      </span>
                      <button onClick={() => openDedModal(emp)} className="text-xs text-blue-500 hover:text-blue-700">編輯</button>
                    </div>
                  </td>

                  {/* Total */}
                  <td className="px-3 py-2 text-center">
                    <span className="font-bold text-gray-900">{emp.total}</span>
                  </td>

                  {/* Multiplier */}
                  <td className="px-3 py-2 text-center">
                    <MultiplierBadge multiplier={emp.multiplier} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Witness Modal */}
      {witnessModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6">
            <h3 className="font-semibold text-gray-800 mb-1">② 開戶見證轉化</h3>
            <p className="text-sm text-gray-500 mb-4">{witnessModal.employeeName}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">見證數</label>
                <input
                  type="number" min={0}
                  value={witnessInput.witness}
                  onChange={e => setWitnessInput(p => ({ ...p, witness: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">成功開戶數</label>
                <input
                  type="number" min={0}
                  value={witnessInput.success}
                  onChange={e => setWitnessInput(p => ({ ...p, success: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {witnessInput.witness !== '0' && parseInt(witnessInput.witness) > 0 && (
                <p className="text-xs text-gray-400">
                  轉化率：{Math.round(parseInt(witnessInput.success || '0') / parseInt(witnessInput.witness) * 100)}%
                  → {calcAccountOpeningScore(parseInt(witnessInput.witness), parseInt(witnessInput.success || '0'))} 分
                </p>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setWitnessModal(null)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">取消</button>
              <button onClick={saveWitnessData} disabled={witnessSaving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {witnessSaving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustments Modal */}
      {adjModal && adjModalEmployee && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">④ 管理員評分</h3>
                <p className="text-sm text-gray-500">{adjModal.employeeName} · 目前 {adjModalEmployee.item4} 分</p>
              </div>
              <button onClick={() => setAdjModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            {/* Existing adjustments */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-2 min-h-0">
              <p className="text-xs text-gray-400 mb-2">起始 25 分</p>
              {adjModalEmployee.adjustments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">暫無調整記錄</p>
              ) : (
                adjModalEmployee.adjustments.map(adj => (
                  <div key={adj.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-700">{adj.description}</p>
                      <p className="text-xs text-gray-400">{adj.adminName}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <span className={`text-sm font-semibold ${adj.points >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {adj.points >= 0 ? '+' : ''}{adj.points}
                      </span>
                      <button onClick={() => handleDeleteAdjustment(adjModal.employeeId, adj.id)} className="text-gray-300 hover:text-red-400 text-xl leading-none">×</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add new adjustment */}
            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-medium text-gray-600">新增表現記錄</p>
              <textarea
                value={adjDesc}
                onChange={e => setAdjDesc(e.target.value)}
                rows={2}
                placeholder="表現說明..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={adjPoints}
                  onChange={e => setAdjPoints(e.target.value)}
                  placeholder="加/減分（如 +3 或 -2）"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddAdjustment}
                  disabled={adjSubmitting}
                  className="px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {adjSubmitting ? '...' : '新增'}
                </button>
              </div>
              {adjError && <p className="text-sm text-red-500">{adjError}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Deductions Modal */}
      {dedModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-800">⑤ 扣分項目</h3>
                <p className="text-sm text-gray-500">{dedModal.employeeName}</p>
              </div>
              <button onClick={() => setDedModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              {DEDUCTION_ITEMS.map(item => (
                <div key={item.type} className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.points}分/次</p>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={dedCounts[item.type] ?? '0'}
                    onChange={e => setDedCounts(p => ({ ...p, [item.type]: e.target.value }))}
                    className="w-16 border rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                  <span className="text-xs text-red-400 w-10 text-right shrink-0">
                    -{(parseInt(dedCounts[item.type]) || 0) * item.points}分
                  </span>
                </div>
              ))}
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-sm text-gray-600">合計扣分</span>
                <span className="font-semibold text-red-500">
                  -{DEDUCTION_ITEMS.reduce((sum, item) => sum + (parseInt(dedCounts[item.type]) || 0) * item.points, 0)}分
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setDedModal(null)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">取消</button>
              <button onClick={saveDedData} disabled={dedSaving} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-60">
                {dedSaving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
