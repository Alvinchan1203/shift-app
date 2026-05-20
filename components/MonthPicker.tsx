'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  year: number
  month: number // 1-indexed
  onChange?: (year: number, month: number) => void
  basePath?: string // for URL-based navigation; builds ?year=Y&month=M
}

const MONTH_LABELS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

export default function MonthPicker({ year, month, onChange, basePath }: Props) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) setPickerYear(year)
  }, [open, year])

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const label = new Date(year, month - 1).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long' })

  function navigate(y: number, m: number) {
    setOpen(false)
    if (onChange) onChange(y, m)
    else if (basePath) router.push(`${basePath}?year=${y}&month=${m}`)
  }

  function prev() {
    const d = new Date(year, month - 2, 1)
    navigate(d.getFullYear(), d.getMonth() + 1)
  }

  function next() {
    const d = new Date(year, month, 1)
    navigate(d.getFullYear(), d.getMonth() + 1)
  }

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-1">
        <button onClick={prev} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">‹</button>
        <button
          onClick={() => setOpen(o => !o)}
          className="text-sm font-medium text-gray-700 min-w-[100px] text-center px-2 py-1 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition"
        >
          {label}
        </button>
        <button onClick={next} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">›</button>
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 p-3 w-56">
          <div className="flex items-center justify-between mb-3 px-1">
            <button onClick={() => setPickerYear(y => y - 1)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-600">‹</button>
            <span className="text-sm font-semibold text-gray-800">{pickerYear}年</span>
            <button onClick={() => setPickerYear(y => y + 1)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-600">›</button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {MONTH_LABELS.map((lbl, i) => {
              const m = i + 1
              const isActive = pickerYear === year && m === month
              return (
                <button
                  key={m}
                  onClick={() => navigate(pickerYear, m)}
                  className={`py-1.5 text-xs rounded-lg transition ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  {lbl}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
