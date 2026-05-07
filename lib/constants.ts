export const SHIFTS = {
  A: { label: 'A班', time: '0900-1400', color: 'bg-blue-100 text-blue-800' },
  B: { label: 'B班', time: '1300-1800', color: 'bg-green-100 text-green-800' },
  C: { label: 'C班', time: '0900-1800', color: 'bg-purple-100 text-purple-800' },
} as const

export type ShiftKey = keyof typeof SHIFTS

export const ATTENDANCE_TYPES = {
  A:       { label: 'A',    desc: '0900–1400',  bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200'   },
  B:       { label: 'B',    desc: '1300–1800',  bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200'  },
  C:       { label: 'C',    desc: '0900–1800',  bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  SL:      { label: 'SL',   desc: 'Sick Leave', bg: 'bg-white',      text: 'text-red-600',    border: 'border-red-300'    },
  OT:      { label: '"',    desc: 'OT Remark',  bg: 'bg-yellow-200', text: 'text-yellow-900', border: 'border-yellow-300' },
  ABS:     { label: '缺',   desc: '缺勤',        bg: 'bg-gray-800',   text: 'text-white',      border: 'border-gray-700'   },
  RE:      { label: 'RE',   desc: 'Reception',  bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300'   },
  OB:      { label: 'OB',   desc: 'On-board',   bg: 'bg-sky-100',    text: 'text-sky-800',    border: 'border-sky-200'    },
  SPECIAL: { label: '特',   desc: '特別更時間',  bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  QUIZ:    { label: 'Quiz', desc: 'Quiz',       bg: 'bg-cyan-100',   text: 'text-cyan-800',   border: 'border-cyan-200'   },
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
