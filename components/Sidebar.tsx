'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface SidebarProps {
  userName: string
  role: string
  onNavigate?: (view: string) => void
  activeView?: string
}

export default function Sidebar({ userName, role, onNavigate, activeView }: SidebarProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = role === 'ADMIN'
    ? [
        { href: '/attendance', view: 'attendance', label: '實際出勤' },
        { href: '/admin/assign', view: 'admin/assign', label: '分配排班' },
        { href: '/admin/holidays', view: 'admin/holidays', label: '假期管理' },
        { href: '/admin/preferences', view: 'admin/preferences', label: '報更紀錄' },
        { href: '/admin/worklogs', view: 'admin/worklogs', label: '員工工作記錄' },
        { href: '/admin/scores', view: 'admin/scores', label: '員工評分' },
        { href: '/admin/users', view: 'admin/users', label: '賬戶管理' },
        { href: '/employee/password', view: 'password', label: '修改密碼' },
      ]
    : [
        { href: '/employee/preferences', view: 'employee/preferences', label: '提交意願' },
        { href: '/employee/schedule', view: 'employee/schedule', label: '我的排班' },
        { href: '/attendance', view: 'attendance', label: '出勤記錄' },
        { href: '/employee/worklog', view: 'employee/worklog', label: '工作記錄' },
        { href: '/employee/password', view: 'password', label: '修改密碼' },
      ]

  const navContent = (
    <>
      <div className="px-5 py-5 border-b border-gray-100">
        <p className="font-bold text-sm text-indigo-700 leading-snug">金鐘辦公室</p>
        <p className="font-bold text-sm text-indigo-500 leading-snug">Bee報更系統</p>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map(link => {
          const isActive = onNavigate ? activeView === link.view : pathname === link.href
          const cls = `flex items-center px-3 py-2 rounded-lg text-sm transition-colors w-full text-left ${
            isActive
              ? 'bg-indigo-50 text-indigo-700 font-medium'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`
          return onNavigate ? (
            <button
              key={link.view}
              onClick={() => { onNavigate(link.view); setMenuOpen(false) }}
              className={cls}
            >
              {link.label}
            </button>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cls}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-gray-100 px-5 py-4">
        <p className="text-sm font-medium text-gray-800 truncate">{userName}</p>
        {role === 'ADMIN' && (
          <span className="inline-block mt-1 text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full">
            管理員
          </span>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-3 block text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          登出
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-white border-r border-gray-200 sticky top-0 h-screen">
        {navContent}
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <span className="font-bold text-sm text-indigo-700">金鐘辦公室Bee報更系統</span>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition"
          aria-label="選單"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile slide-in overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-56 bg-white flex flex-col h-full shadow-xl">
            {navContent}
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMenuOpen(false)} />
        </div>
      )}
    </>
  )
}
