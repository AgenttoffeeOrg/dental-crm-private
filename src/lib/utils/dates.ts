// Date utilities

export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear()
  )
}

export function isThisWeek(date: Date): boolean {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  
  return date >= weekStart && date <= weekEnd
}

export function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let added = 0
  
  while (added < days) {
    result.setDate(result.getDate() + 1)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      added++
    }
  }
  
  return result
}

export function getBusinessDaysBetween(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  
  while (current <= end) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

