'use client'

import { useEffect, useState } from 'react'

type Employee = { id: string; name: string; email: string; role: string; extraSubmitEnabled: boolean; createdAt: string }

const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

export default function UsersClient({ currentUserName }: { currentUserName: string }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', password: '', confirmPassword: '', adminPassword: '', role: 'EMPLOYEE' })
  const [addError, setAddError] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const [deleteModal, setDeleteModal] = useState<Employee | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)

  const [resetModal, setResetModal] = useState<Employee | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetSaving, setResetSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(data => {
      setEmployees(data)
      setLoading(false)
    })
  }, [])

  function openAdd() {
    setAddForm({ name: '', password: '', confirmPassword: '', adminPassword: '', role: 'EMPLOYEE' })
    setAddError('')
    setAddModal(true)
  }

  async function addEmployee() {
    setAddError('')
    if (!addForm.name || !addForm.password || !addForm.adminPassword) {
      setAddError('請填寫所有欄位')
      return
    }
    if (addForm.password !== addForm.confirmPassword) {
      setAddError('Bee密碼不相符')
      return
    }
    if (addForm.password.length < 6) {
      setAddError('Bee密碼最少需要6個字元')
      return
    }
    setAddSaving(true)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addForm.name, password: addForm.password, adminPassword: addForm.adminPassword, role: addForm.role }),
      })
      const data = await r.json()
      if (!r.ok) { setAddError(data.error ?? '新增失敗'); return }
      setEmployees(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
      setAddModal(false)
    } finally {
      setAddSaving(false)
    }
  }

  async function deleteEmployee() {
    setDeleteError('')
    if (!deletePassword) { setDeleteError('請輸入管理員密碼'); return }
    setDeleteSaving(true)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deleteModal!.id, adminPassword: deletePassword }),
      })
      const data = await r.json()
      if (!r.ok) { setDeleteError(data.error ?? '刪除失敗'); return }
      setEmployees(prev => prev.filter(e => e.id !== deleteModal!.id))
      setDeleteModal(null)
      setDeletePassword('')
    } finally {
      setDeleteSaving(false)
    }
  }

  async function toggleExtraSubmit(emp: Employee) {
    const updated = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: emp.id, extraSubmitEnabled: !emp.extraSubmitEnabled }),
    }).then(r => r.json())
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, extraSubmitEnabled: updated.extraSubmitEnabled } : e))
  }

  async function resetEmployeePassword() {
    setResetError('')
    setResetSuccess(false)
    if (!resetPassword) { setResetError('請輸入管理員密碼'); return }
    setResetSaving(true)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetModal!.id, adminPassword: resetPassword }),
      })
      const data = await r.json()
      if (!r.ok) { setResetError(data.error ?? '重置失敗'); return }
      setResetSuccess(true)
      setResetPassword('')
    } finally {
      setResetSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500">載入中...</p>

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          + 新增Bee
        </button>
      </div>

      {(['ADMIN', 'EMPLOYEE'] as const).map(role => {
        const group = employees.filter(e => e.role === role)
        return (
          <div key={role} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 mb-2">{role === 'ADMIN' ? '管理員' : 'Bee'}</h3>
            <div className="bg-white rounded-2xl border shadow-sm divide-y">
              {group.length === 0 ? (
                <p className="text-gray-400 text-sm px-4 py-6 text-center">暫無{role === 'ADMIN' ? '管理員' : 'Bee'}帳號</p>
              ) : group.map(emp => (
                <div key={emp.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800 truncate">{emp.name}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {emp.role === 'EMPLOYEE' && (
                      <button
                        onClick={() => toggleExtraSubmit(emp)}
                        title={emp.extraSubmitEnabled ? '點擊關閉額外報更權限' : '點擊開啟額外報更權限（可在15日前或26日後提交）'}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition ${
                          emp.extraSubmitEnabled
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${emp.extraSubmitEnabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                        額外報更
                      </button>
                    )}
                    <button
                      onClick={() => { setResetModal(emp); setResetPassword(''); setResetError(''); setResetSuccess(false) }}
                      className="text-xs text-amber-600 hover:text-amber-800 border border-amber-200 rounded-lg px-2.5 py-1 hover:bg-amber-50 transition"
                    >
                      重置密碼
                    </button>
                    {(emp.role === 'EMPLOYEE' || currentUserName === 'nicochen') && (
                      <button
                        onClick={() => { setDeleteModal(emp); setDeletePassword(''); setDeleteError('') }}
                        className="text-xs text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-50 transition"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Add Employee Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddModal(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">新增Bee帳號</h3>
              <button onClick={() => setAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <div className="space-y-3 mb-4">
              <input type="text" placeholder="Bee姓名" value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              <input type="password" placeholder="Bee初始密碼" value={addForm.password}
                onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
              <input type="password" placeholder="確認Bee密碼" value={addForm.confirmPassword}
                onChange={e => setAddForm(f => ({ ...f, confirmPassword: e.target.value }))} className={inputCls} />
              <div>
                <p className="text-xs text-gray-500 mb-2">帳號角色</p>
                <div className="flex gap-2">
                  {(['EMPLOYEE', 'ADMIN'] as const).map(r => (
                    <button key={r} type="button"
                      onClick={() => setAddForm(f => ({ ...f, role: r }))}
                      className={`flex-1 py-2 rounded-xl border text-sm font-medium transition
                        ${addForm.role === r ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                    >
                      {r === 'EMPLOYEE' ? 'Bee' : '管理員'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-2">請輸入您的管理員密碼以確認操作</p>
                <input type="password" placeholder="管理員密碼" value={addForm.adminPassword}
                  onChange={e => setAddForm(f => ({ ...f, adminPassword: e.target.value }))} className={inputCls} />
              </div>
            </div>

            {addError && <p className="text-xs text-red-500 mb-3">{addError}</p>}

            <button onClick={addEmployee} disabled={addSaving}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
              {addSaving ? '處理中...' : '新增Bee'}
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setResetModal(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">重置Bee密碼</h3>
              <button onClick={() => setResetModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              將 <span className="font-semibold text-gray-800">{resetModal.name}</span> 的密碼重置為：
            </p>
            <p className="text-sm font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              futuhk123
            </p>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">請輸入您的管理員密碼以確認操作</p>
              <input type="password" placeholder="管理員密碼" value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>

            {resetError && <p className="text-xs text-red-500 mb-3">{resetError}</p>}
            {resetSuccess && <p className="text-xs text-green-600 mb-3">密碼已成功重置為 futuhk123</p>}

            <button onClick={resetEmployeePassword} disabled={resetSaving || resetSuccess}
              className="w-full py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition disabled:opacity-50">
              {resetSaving ? '處理中...' : '確認重置'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteModal(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">刪除Bee帳號</h3>
              <button onClick={() => setDeleteModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              確定刪除 <span className="font-semibold text-gray-800">{deleteModal.name}</span>（{deleteModal.email}）的帳號？此操作不可撤銷，所有相關資料將一併刪除。
            </p>

            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">請輸入您的管理員密碼以確認操作</p>
              <input type="password" placeholder="管理員密碼" value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>

            {deleteError && <p className="text-xs text-red-500 mb-3">{deleteError}</p>}

            <button onClick={deleteEmployee} disabled={deleteSaving}
              className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50">
              {deleteSaving ? '處理中...' : '確認刪除'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
