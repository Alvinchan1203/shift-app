'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface NavbarProps {
  userName: string
  role: string
}

export default function Navbar({ userName, role }: NavbarProps) {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const links = role === 'ADMIN'
    ? [
        { href: '/admin/preferences', label: '報更紀錄' },
        { href: '/admin/assign', label: '分配排班' },
        { href: '/admin/holidays', label: '假期管理' },
        { href: '/attendance', label: '實際出勤' },
        { href: '/admin/worklogs', label: '員工工作記錄' },
        { href: '/admin/scores', label: '員工評分' },
        { href: '/admin/users', label: '賬戶管理' },
        { href: '/employee/password', label: '修改密碼' },
      ]
    : [
        { href: '/employee/preferences', label: '提交意願' },
        { href: '/employee/schedule', label: '我的排班' },
        { href: '/attendance', label: '出勤記錄' },
        { href: '/employee/worklog', label: '工作記錄' },
        { href: '/employee/password', label: '修改密碼' },
      ]

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-bold text-base sm:text-lg shrink-0 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent tracking-tight">
          金鐘辦公室Bee報更系統
        </span>

        {/* 桌面版導航 */}
        <div className="hidden sm:flex items-center gap-0.5 flex-1 min-w-0 mx-3 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                pathname === link.href
                  ? 'text-cyan-400 bg-cyan-400/10 border border-cyan-400/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:flex items-center gap-2 text-sm text-slate-300">
            {userName}
            {role === 'ADMIN' && (
              <span className="bg-cyan-500/15 text-cyan-400 text-xs px-2 py-0.5 rounded-full border border-cyan-500/30 font-medium">
                管理員
              </span>
            )}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="hidden sm:inline text-sm text-slate-500 hover:text-red-400 transition"
          >
            登出
          </button>

          {/* 手機版漢堡按鈕 */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
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
      </div>

      {/* 手機版下拉選單 */}
      {menuOpen && (
        <div className="sm:hidden border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-sm px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
            {userName}
            {role === 'ADMIN' && (
              <span className="bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/30">管理員</span>
            )}
          </div>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-2.5 text-sm font-medium border-b border-slate-800 transition ${
                pathname === link.href ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="block w-full text-left py-2.5 text-sm text-slate-500 hover:text-red-400 transition"
          >
            登出
          </button>
        </div>
      )}
    </nav>
  )
}
