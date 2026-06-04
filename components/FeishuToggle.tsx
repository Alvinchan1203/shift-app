'use client'

import { useState } from 'react'

export default function FeishuToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [toggling, setToggling] = useState(false)

  async function toggle() {
    setToggling(true)
    const newVal = !enabled
    await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'feishu_notifications_enabled', value: String(newVal) }),
    })
    setEnabled(newVal)
    setToggling(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={toggling}
      title={enabled ? '點擊關閉飛書通知機器人' : '點擊開啟飛書通知機器人'}
      className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
        enabled
          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-blue-500' : 'bg-gray-300'}`} />
      飛書通知
    </button>
  )
}
