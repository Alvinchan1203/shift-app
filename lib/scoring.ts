export function calcWorkHoursScore(totalMinutes: number): number {
  const hours = totalMinutes / 60
  if (hours > 79) return 30
  if (hours > 70) return 25
  if (hours > 60) return 10
  return 0
}

export function calcAccountOpeningScore(witnessCount: number, successCount: number): number {
  if (witnessCount === 0) return 0
  const ratio = successCount / witnessCount
  if (ratio > 0.8) return 10
  if (ratio >= 0.61) return 8
  return 0
}

export function calcActualWorkScore(totalWorkPoints: number, monthlyWorkMinutes: number): number {
  if (monthlyWorkMinutes === 0) return 0
  const ratio = totalWorkPoints / monthlyWorkMinutes
  if (ratio >= 0.9) return 30
  if (ratio >= 0.7) return 28
  if (ratio >= 0.5) return 25
  if (ratio >= 0.3) return 20
  if (ratio >= 0.1) return 10
  return 0
}

export function calcAdminScore(adjustments: { points: number }[]): number {
  const total = adjustments.reduce((sum, adj) => sum + adj.points, 25)
  return Math.max(0, Math.min(30, total))
}

export function calcSalaryMultiplier(totalScore: number): number {
  if (totalScore > 89) return 1.5
  if (totalScore > 79) return 1.3
  if (totalScore > 59) return 1.1
  return 1.0
}

export const WORK_TYPE_POINTS: Record<string, number> = {
  A: 15,
  B: 30,
  C: 45,
  D: 60,
}

export const DEDUCTION_ITEMS = [
  { type: 'LATE',               label: '遲到',               points: 1  },
  { type: 'ABSENCE',            label: '缺勤',               points: 10 },
  { type: 'SCHEDULE_CHANGE',    label: '改更',               points: 2  },
  { type: 'COMMON_AREA_EATING', label: '在Common area 飲食', points: 8  },
  { type: 'PUNCH_INACCURACY',   label: '打卡確準性',          points: 1  },
  { type: 'COMPLAINT',          label: '成立投訴',            points: 10 },
] as const

export function calcTotalDeductions(deductions: { type: string; count: number }[]): number {
  return deductions.reduce((sum, d) => {
    const item = DEDUCTION_ITEMS.find(i => i.type === d.type)
    return sum + (item ? item.points * d.count : 0)
  }, 0)
}

export const WORK_TYPE_LABELS: Record<string, string> = {
  A: '提/存實股、簽收支票、補簽名/更改戶口資料、補交文件/CL/住址、銷戶',
  B: 'App應用、查詢戶口資料、出入金、存實股、更改戶口忘記密碼資料、引導客戶開戶',
  C: '銷戶重開、見證開戶、遺產',
  D: '須要特別照顧客戶、Reception、投訴個案、外出工作',
  E: '其他（請列明）',
}
