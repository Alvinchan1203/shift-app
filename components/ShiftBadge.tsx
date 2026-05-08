import { SHIFTS, ShiftKey } from '@/lib/constants'

export default function ShiftBadge({ shift }: { shift: ShiftKey }) {
  const { label, time, color } = SHIFTS[shift]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${color}`}>
      {label}
      <span className="opacity-70">({time})</span>
    </span>
  )
}
