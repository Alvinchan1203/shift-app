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

  const show = (key: string) => view === key ? '' : 'hidden'

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <Sidebar
        userName={userName}
        role={role}
        onNavigate={setView}
        activeView={view}
      />
      <div className="flex-1 min-w-0">
        {role === 'ADMIN' && (
          <>
            <div className={show('admin/preferences')}><AdminPreferencesView /></div>
            <div className={show('admin/assign')}><AdminAssignView /></div>
            <div className={show('admin/holidays')}><AdminHolidaysView /></div>
            <div className={show('attendance')}><AttendanceView isAdmin userId={userId} userName={userName} /></div>
            <div className={show('admin/worklogs')}><AdminWorkLogsView /></div>
            <div className={show('admin/scores')}><AdminScoresView /></div>
            <div className={show('admin/users')}><AdminUsersView userName={userName} /></div>
            <div className={show('password')}><PasswordView /></div>
          </>
        )}
        {role === 'EMPLOYEE' && (
          <>
            <div className={show('employee/preferences')}><EmployeePreferencesView userName={userName} /></div>
            <div className={show('employee/schedule')}><EmployeeScheduleView /></div>
            <div className={show('attendance')}><AttendanceView isAdmin={false} userId={userId} userName={userName} /></div>
            <div className={show('employee/worklog')}><EmployeeWorkLogView /></div>
            <div className={show('password')}><PasswordView /></div>
          </>
        )}
      </div>
    </div>
  )
}
