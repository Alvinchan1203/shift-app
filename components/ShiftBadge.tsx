import { SHIFTS, ShiftKey } from '@/lib/constants'

export default function ShiftBadge({ shift }: { shift: ShiftKey }) {
  const { label, time, color } = SHIFTS[shift]
  const shortTime = time.split('-').map(t => t.slice(0, 2)).join('-')
  return (
    <span className={`inline-flex flex-col items-start text-xs font-medium px-1.5 py-0.5 rounded-md leading-tight ${color}`}>
      <span>{label}</span>
      <span className="opacity-70">{shortTime}</span>
    </span>
  )
}
