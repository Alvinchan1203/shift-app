'use client'

import { useState } from 'react'

type Employee = { id: string; name: string; email: string; role: string; extraSubmitEnabled: boolean; canDeleteAdmin: boolean; canRenameUser: boolean; cannotWitness: boolean; createdAt: string }

const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

export default function UsersClient({ currentUserName, currentUserCanDeleteAdmin, currentUserCanRenameUser, initialData }: { currentUserName: string; currentUserCanDeleteAdmin: boolean; currentUserCanRenameUser: boolean; initialData: Employee[] }) {
  const [employees, setEmployees] = useState<Employee[]>(initialData)

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
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetSaving, setResetSaving] = useState(false)

  const [renameModal, setRenameModal] = useState<Employee | null>(null)
  const [renameNewName, setRenameNewName] = useState('')
  const [renamePassword, setRenamePassword] = useState('')
  const [renameError, setRenameError] = useState('')
  const [renameSuccess, setRenameSuccess] = useState(false)
  const [renameSaving, setRenameSaving] = useState(false)

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
    const roleLabel = addForm.role === 'EMPLOYEE' ? 'Bee' : '管理員'
    if (addForm.password !== addForm.confirmPassword) {
      setAddError(`${roleLabel}密碼不相符`)
      return
    }
    if (addForm.password.length < 6) {
      setAddError(`${roleLabel}密碼最少需要6個字元`)
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

  async function toggleAllExtraSubmit(enable: boolean) {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '_bulk', bulkAllEmployees: true, extraSubmitEnabled: enable }),
    })
    setEmployees(prev => prev.map(e => e.role === 'EMPLOYEE' ? { ...e, extraSubmitEnabled: enable } : e))
  }

  async function toggleExtraSubmit(emp: Employee) {
    const updated = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: emp.id, extraSubmitEnabled: !emp.extraSubmitEnabled }),
    }).then(r => r.json())
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, extraSubmitEnabled: updated.extraSubmitEnabled } : e))
  }

  async function toggleCannotWitness(emp: Employee) {
    const updated = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: emp.id, cannotWitness: !emp.cannotWitness }),
    }).then(r => r.json())
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, cannotWitness: updated.cannotWitness } : e))
  }

  async function toggleCanDeleteAdmin(emp: Employee) {
    const updated = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: emp.id, canDeleteAdmin: !emp.canDeleteAdmin }),
    }).then(r => r.json())
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, canDeleteAdmin: updated.canDeleteAdmin } : e))
  }

  async function toggleCanRenameUser(emp: Employee) {
    const updated = await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: emp.id, canRenameUser: !emp.canRenameUser }),
    }).then(r => r.json())
    setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, canRenameUser: updated.canRenameUser } : e))
  }

  async function renameUser() {
    setRenameError('')
    setRenameSuccess(false)
    if (!renameNewName.trim()) { setRenameError('請輸入新名字'); return }
    if (!renamePassword) { setRenameError('請輸入管理員密碼'); return }
    setRenameSaving(true)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: renameModal!.id, adminPassword: renamePassword, newName: renameNewName.trim() }),
      })
      const data = await r.json()
      if (!r.ok) { setRenameError(data.error ?? '改名失敗'); return }
      setEmployees(prev => prev.map(e => e.id === renameModal!.id ? { ...e, name: data.name } : e))
      setRenameSuccess(true)
    } finally {
      setRenameSaving(false)
    }
  }

  async function resetEmployeePassword() {
    setResetError('')
    setResetSuccess(false)
    if (!resetNewPassword) { setResetError('請輸入新密碼'); return }
    if (resetNewPassword.length < 6) { setResetError('新密碼最少需要6個字元'); return }
    if (!resetPassword) { setResetError('請輸入管理員密碼'); return }
    setResetSaving(true)
    try {
      const r = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetModal!.id, adminPassword: resetPassword, newPassword: resetNewPassword }),
      })
      const data = await r.json()
      if (!r.ok) { setResetError(data.error ?? '重置失敗'); return }
      setResetSuccess(true)
      setResetPassword('')
    } finally {
      setResetSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
        >
          + 新增管理員/BEE
        </button>
      </div>

      {(['ADMIN', 'EMPLOYEE'] as const).map(role => {
        const group = employees.filter(e => e.role === role)
        return (
          <div key={role} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-500">{role === 'ADMIN' ? '管理員' : 'Bee'}</h3>
              {role === 'EMPLOYEE' && group.length > 0 && (() => {
                const allOn = group.every(e => e.extraSubmitEnabled)
                return (
                  <button
                    onClick={() => toggleAllExtraSubmit(!allOn)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                      allOn
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    }`}
                  >
                    {allOn ? '全關額外報更' : '全開額外報更'}
                  </button>
                )
              })()}
            </div>
            <div className="bg-white rounded-2xl border shadow-sm divide-y">
              {group.length === 0 ? (
                <p className="text-gray-400 text-sm px-4 py-6 text-center">暫無{role === 'ADMIN' ? '管理員' : 'Bee'}帳號</p>
              ) : group.map(emp => (
                <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-2">
                  <div>
                    <p className="font-medium text-gray-800">{emp.name}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {emp.role === 'EMPLOYEE' && (
                      <>
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
                        <button
                          onClick={() => toggleCannotWitness(emp)}
                          title={emp.cannotWitness ? '點擊取消「未能見證」標記' : '點擊標記為未能見證（出勤頁面名字變粉紅）'}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition ${
                            emp.cannotWitness
                              ? 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
                              : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${emp.cannotWitness ? 'bg-pink-500' : 'bg-gray-300'}`} />
                          未能見證
                        </button>
                      </>
                    )}
                    {emp.role === 'ADMIN' && currentUserName.toLowerCase() === 'alvinchan' && (
                      <>
                        <button
                          onClick={() => toggleCanDeleteAdmin(emp)}
                          title={emp.canDeleteAdmin ? '點擊撤銷刪除管理員權限' : '點擊授予刪除管理員權限'}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition ${
                            emp.canDeleteAdmin
                              ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                              : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${emp.canDeleteAdmin ? 'bg-purple-500' : 'bg-gray-300'}`} />
                          刪管理員
                        </button>
                        <button
                          onClick={() => toggleCanRenameUser(emp)}
                          title={emp.canRenameUser ? '點擊撤銷改名權限' : '點擊授予改名權限'}
                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition ${
                            emp.canRenameUser
                              ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                              : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${emp.canRenameUser ? 'bg-orange-500' : 'bg-gray-300'}`} />
                          改名
                        </button>
                      </>
                    )}
                    {(currentUserCanRenameUser || currentUserName.toLowerCase() === 'alvinchan') && (
                      <button
                        onClick={() => { setRenameModal(emp); setRenameNewName(emp.name); setRenamePassword(''); setRenameError(''); setRenameSuccess(false) }}
                        className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-50 transition"
                      >
                        改名
                      </button>
                    )}
                    <button
                      onClick={() => { setResetModal(emp); setResetPassword(''); setResetNewPassword(''); setResetError(''); setResetSuccess(false) }}
                      className="text-xs text-amber-600 hover:text-amber-800 border border-amber-200 rounded-lg px-2.5 py-1 hover:bg-amber-50 transition"
                    >
                      重置密碼
                    </button>
                    {(emp.role === 'EMPLOYEE' || currentUserCanDeleteAdmin) && (
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
      {addModal && (() => {
        const isBee = addForm.role === 'EMPLOYEE'
        const roleLabel = isBee ? 'Bee' : '管理員'
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setAddModal(false)} />
            <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">新增{roleLabel}帳號</h3>
                <button onClick={() => setAddModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <div className="space-y-3 mb-4">
                <input type="text" placeholder={`${roleLabel}姓名`} value={addForm.name}
                  onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                <input type="password" placeholder={`${roleLabel}初始密碼`} value={addForm.password}
                  onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
                <input type="password" placeholder={`確認${roleLabel}密碼`} value={addForm.confirmPassword}
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
                {addSaving ? '處理中...' : `新增${roleLabel}`}
              </button>
            </div>
          </div>
        )
      })()}

      {/* Reset Password Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setResetModal(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">重置Bee密碼</h3>
              <button onClick={() => setResetModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              重置 <span className="font-semibold text-gray-800">{resetModal.name}</span> 的登入密碼
            </p>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">新密碼（最少6個字元）</p>
                <input type="password" placeholder="輸入新密碼" value={resetNewPassword}
                  onChange={e => setResetNewPassword(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">請輸入您的管理員密碼以確認操作</p>
                <input type="password" placeholder="管理員密碼" value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
            </div>

            {resetError && <p className="text-xs text-red-500 mb-3">{resetError}</p>}
            {resetSuccess && <p className="text-xs text-green-600 mb-3">密碼已成功重置</p>}

            <button onClick={resetEmployeePassword} disabled={resetSaving || resetSuccess}
              className="w-full py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition disabled:opacity-50">
              {resetSaving ? '處理中...' : '確認重置'}
            </button>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setRenameModal(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">更改名字</h3>
              <button onClick={() => setRenameModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              更改 <span className="font-semibold text-gray-800">{renameModal.name}</span> 的顯示名字
            </p>
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">新名字</p>
                <input type="text" placeholder="輸入新名字" value={renameNewName}
                  onChange={e => setRenameNewName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">請輸入您的管理員密碼以確認操作</p>
                <input type="password" placeholder="管理員密碼" value={renamePassword}
                  onChange={e => setRenamePassword(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            {renameError && <p className="text-xs text-red-500 mb-3">{renameError}</p>}
            {renameSuccess && <p className="text-xs text-green-600 mb-3">名字已成功更改為「{renameNewName}」</p>}
            <button onClick={renameUser} disabled={renameSaving || renameSuccess}
              className="w-full py-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition disabled:opacity-50">
              {renameSaving ? '處理中...' : '確認改名'}
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
