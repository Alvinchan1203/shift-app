import { SHIFTS, ShiftKey } from '@/lib/constants'

export default function ShiftBadge({ shift }: { shift: ShiftKey }) {
  const { label, time, color } = SHIFTS[shift]
  return (
    <span className={`inline-flex flex-col items-start text-xs font-medium px-2 py-1 rounded-lg leading-tight ${color}`}>
      <span>{label}</span>
      <span className="opacity-70">{time}</span>
    </span>
  )
}
