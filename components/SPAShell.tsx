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

  function renderView() {
    switch (view) {
      case 'admin/preferences': return <AdminPreferencesView />
      case 'admin/assign': return <AdminAssignView />
      case 'admin/holidays': return <AdminHolidaysView />
      case 'attendance': return <AttendanceView isAdmin={role === 'ADMIN'} userId={userId} userName={userName} />
      case 'admin/worklogs': return <AdminWorkLogsView />
      case 'admin/scores': return <AdminScoresView />
      case 'admin/users': return <AdminUsersView userName={userName} />
      case 'employee/preferences': return <EmployeePreferencesView userName={userName} />
      case 'employee/schedule': return <EmployeeScheduleView />
      case 'employee/worklog': return <EmployeeWorkLogView />
      case 'password': return <PasswordView />
      default: return null
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <Sidebar
        userName={userName}
        role={role}
        onNavigate={setView}
        activeView={view}
      />
      <div className="flex-1 min-w-0">
        {renderView()}
      </div>
    </div>
  )
}
