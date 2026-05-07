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
        { href: '/admin/users', label: '賬戶管理' },
        { href: '/employee/password', label: '修改密碼' },
      ]
    : [
        { href: '/employee/preferences', label: '提交意願' },
        { href: '/employee/schedule', label: '我的排班' },
        { href: '/attendance', label: '出勤記錄' },
        { href: '/employee/password', label: '修改密碼' },
      ]

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-bold text-blue-600 text-base sm:text-lg shrink-0">金鐘辦公室Bee報更系統</span>

        {/* 桌面版導航 */}
        <div className="hidden sm:flex items-center gap-4 flex-1 min-w-0 mx-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition whitespace-nowrap ${
                pathname === link.href
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-blue-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-sm text-gray-600">
            {userName}
            {role === 'ADMIN' && (
              <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">管理員</span>
            )}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="hidden sm:inline text-sm text-gray-500 hover:text-red-500 transition"
          >
            登出
          </button>

          {/* 手機版漢堡按鈕 */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="sm:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
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
        <div className="sm:hidden border-t bg-white px-4 py-2">
          <div className="text-xs text-gray-400 py-2">
            {userName}
            {role === 'ADMIN' && (
              <span className="ml-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">管理員</span>
            )}
          </div>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`block py-3 text-sm font-medium border-b border-gray-50 transition ${
                pathname === link.href ? 'text-blue-600' : 'text-gray-700 hover:text-blue-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="block w-full text-left py-3 text-sm text-red-500 hover:text-red-600 transition"
          >
            登出
          </button>
        </div>
      )}
    </nav>
  )
}
