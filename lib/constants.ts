export const SHIFTS = {
  A: { label: 'A班', time: '0900-1400', color: 'bg-blue-200 text-blue-900' },
  B: { label: 'B班', time: '1300-1800', color: 'bg-green-200 text-green-900' },
  C: { label: 'C班', time: '0900-1800', color: 'bg-purple-200 text-purple-900' },
} as const

export type ShiftKey = keyof typeof SHIFTS

export const ATTENDANCE_TYPES = {
  A:       { label: 'A',    desc: '0900–1400',  bg: 'bg-blue-200',   text: 'text-blue-900',   border: 'border-blue-400'   },
  B:       { label: 'B',    desc: '1300–1800',  bg: 'bg-green-200',  text: 'text-green-900',  border: 'border-green-400'  },
  C:       { label: 'C',    desc: '0900–1800',  bg: 'bg-purple-200', text: 'text-purple-900', border: 'border-purple-400' },
  SL:      { label: 'SL',   desc: 'Sick Leave', bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-400'    },
  OT:      { label: '"',    desc: 'OT Remark',  bg: 'bg-yellow-200', text: 'text-yellow-900', border: 'border-yellow-400' },
  ABS:     { label: '缺',   desc: '缺勤',        bg: 'bg-gray-800',   text: 'text-white',      border: 'border-gray-700'   },
  RE:      { label: 'RE',   desc: 'Reception',  bg: 'bg-gray-200',   text: 'text-gray-800',   border: 'border-gray-400'   },
  OB:      { label: 'OB',   desc: 'On-board',   bg: 'bg-sky-200',    text: 'text-sky-900',    border: 'border-sky-400'    },
  SPECIAL: { label: '特',   desc: '特別更時間',  bg: 'bg-orange-200', text: 'text-orange-900', border: 'border-orange-400' },
  QUIZ:    { label: 'Quiz', desc: 'Quiz',       bg: 'bg-cyan-200',   text: 'text-cyan-900',   border: 'border-cyan-400'   },
  SC:      { label: '調班', desc: '已申請調班', bg: 'bg-rose-200',   text: 'text-rose-800',   border: 'border-rose-400'   },
} as const

export type AttendanceTypeKey = keyof typeof ATTENDANCE_TYPES

export const SHIFT_DURATIONS: Partial<Record<AttendanceTypeKey, number>> = { A: 300, B: 300, C: 480 }

export const SHIFT_HOURS: Record<ShiftKey, number> = { A: 5, B: 5, C: 8 }

export function formatDuration(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0h'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
