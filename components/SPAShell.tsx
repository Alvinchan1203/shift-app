'use client'

import { useState } from 'react'
import Sidebar from '@/components/Sidebar'
import AdminPreferencesView from '@/components/views/AdminPreferencesView'
import AdminAssignView from '@/components/views/AdminAssignView'
import AdminHolidaysView from '@/components/views/AdminHolidaysView'
import AttendanceView from '@/components/views/AttendanceView'
import AdminWorkLogsView from '@/components/views/AdminWorkLogsView'
import AdminScoresView from '@/components/views/AdminScoresView'
import AdminUsersView from '@/components/views/AdminUsersView'
import EmployeePreferencesView from '@/components/views/EmployeePreferencesView'
import EmployeeScheduleView from '@/components/views/EmployeeScheduleView'
import EmployeeWorkLogView from '@/components/views/EmployeeWorkLogView'
import PasswordView from '@/components/views/PasswordView'

interface Props {
  userName: string
  role: string
  userId: string
}

export default function SPAShell({ userName, role, userId }: Props) {
  const defaultView = role === 'ADMIN' ? 'admin/preferences' : 'employee/preferences'
  const [view, setView] = useState(defaultView)
  const [mounted, setMounted] = useState<Set<string>>(new Set([defaultView]))

  function navigate(v: string) {
    setView(v)
    setMounted(prev => {
      if (prev.has(v)) return prev
      const next = new Set(prev)
      next.add(v)
      return next
    })
  }

  const show = (key: string) => view === key ? '' : 'hidden'

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <Sidebar
        userName={userName}
        role={role}
        onNavigate={navigate}
        activeView={view}
      />
      <div className="flex-1 min-w-0">
        {mounted.has('admin/preferences') && <div className={show('admin/preferences')}><AdminPreferencesView /></div>}
        {mounted.has('admin/assign') && <div className={show('admin/assign')}><AdminAssignView /></div>}
        {mounted.has('admin/holidays') && <div className={show('admin/holidays')}><AdminHolidaysView /></div>}
        {mounted.has('attendance') && <div className={show('attendance')}><AttendanceView isAdmin={role === 'ADMIN'} userId={userId} userName={userName} /></div>}
        {mounted.has('admin/worklogs') && <div className={show('admin/worklogs')}><AdminWorkLogsView /></div>}
        {mounted.has('admin/scores') && <div className={show('admin/scores')}><AdminScoresView /></div>}
        {mounted.has('admin/users') && <div className={show('admin/users')}><AdminUsersView userName={userName} /></div>}
        {mounted.has('employee/preferences') && <div className={show('employee/preferences')}><EmployeePreferencesView userName={userName} /></div>}
        {mounted.has('employee/schedule') && <div className={show('employee/schedule')}><EmployeeScheduleView /></div>}
        {mounted.has('employee/worklog') && <div className={show('employee/worklog')}><EmployeeWorkLogView /></div>}
        {mounted.has('password') && <div className={show('password')}><PasswordView /></div>}
      </div>
    </div>
  )
}
