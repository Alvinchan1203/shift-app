'use client'

import { useState } from 'react'

const inputCls = 'w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'

export default function PasswordClient() {
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  async function changePassword() {
    setError('')
    setSuccess(false)
    if (!form.current || !form.newPw || !form.confirm) { setError('請填寫所有欄位'); return }
    if (form.newPw !== form.confirm) { setError('新密碼不相符'); return }
    if (form.newPw.length < 6) { setError('新密碼最少需要6個字元'); return }

    setSaving(true)
    try {
      const r = await fetch('/api/employee/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPw }),
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? '修改失敗'); return }
      setSuccess(true)
      setForm({ current: '', newPw: '', confirm: '' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm p-5">
      <div className="space-y-4 mb-5">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">現有密碼</label>
          <input type="password" value={form.current}
            onChange={e => setForm(f => ({ ...f, current: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">新密碼</label>
          <input type="password" value={form.newPw}
            onChange={e => setForm(f => ({ ...f, newPw: e.target.value }))} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">確認新密碼</label>
          <input type="password" value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} className={inputCls} />
        </div>
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
      {success && <p className="text-xs text-green-600 mb-3">密碼已成功更改</p>}

      <button onClick={changePassword} disabled={saving}
        className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50">
        {saving ? '處理中...' : '確認修改'}
      </button>
    </div>
  )
}
