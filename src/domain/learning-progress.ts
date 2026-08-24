export type DailyStreakDayStatus = 'valid' | 'pause-protected' | 'broken'

export interface DailyStreakDayData {
  utcDate: string
  status: DailyStreakDayStatus
}

export interface DailyStreakHistoryData {
  days: DailyStreakDayData[]
}

export class DailyStreakHistory {
  private readonly data: DailyStreakHistoryData

  private constructor(data: DailyStreakHistoryData) {
    this.data = data
  }

  static createEmpty(): DailyStreakHistory {
    return new DailyStreakHistory({ days: [] })
  }

  static fromData(data: DailyStreakHistoryData): DailyStreakHistory {
    const daysByUtcDate = new Map(
      (data.days ?? []).map((day) => [day.utcDate, { ...day }]),
    )
    return new DailyStreakHistory({
      days: [...daysByUtcDate.values()].sort((left, right) => left.utcDate.localeCompare(right.utcDate)),
    })
  }

  get days(): DailyStreakDayData[] {
    return this.data.days.map((day) => ({ ...day }))
  }

  get currentLength(): number {
    let length = 0
    let laterUtcDate: string | undefined

    for (const day of [...this.data.days].reverse()) {
      if (day.status === 'broken') {
        break
      }
      if (laterUtcDate !== undefined && addUtcDays(day.utcDate, 1) !== laterUtcDate) {
        break
      }
      length += 1
      laterUtcDate = day.utcDate
    }

    return length
  }

  withAutomaticStreakPauses(currentTimestamp: string): DailyStreakHistory {
    const currentUtcDate = toUtcDate(currentTimestamp)
    const lastDay = this.data.days.at(-1)

    if (lastDay === undefined || lastDay.status === 'broken' || lastDay.utcDate >= currentUtcDate) {
      return this
    }

    let history: DailyStreakHistory = DailyStreakHistory.fromData(this.data)
    let previousDay = lastDay
    let utcDate = addUtcDays(lastDay.utcDate, 1)

    while (utcDate < currentUtcDate) {
      const status: DailyStreakDayStatus = previousDay.status === 'valid' ? 'pause-protected' : 'broken'
      history = history.withDay({ utcDate, status })
      if (status === 'broken') {
        return history
      }
      previousDay = { utcDate, status }
      utcDate = addUtcDays(utcDate, 1)
    }

    return history
  }

  withValidDate(utcDate: string): DailyStreakHistory {
    const existingDay = this.data.days.find((day) => day.utcDate === utcDate)
    if (existingDay?.status === 'valid') {
      return this
    }
    return this.withDay({ utcDate, status: 'valid' })
  }

  toData(): DailyStreakHistoryData {
    return { days: this.days }
  }

  private withDay(day: DailyStreakDayData): DailyStreakHistory {
    const days = this.data.days.filter((candidate) => candidate.utcDate !== day.utcDate)
    return new DailyStreakHistory({
      days: [...days, { ...day }].sort((left, right) => left.utcDate.localeCompare(right.utcDate)),
    })
  }
}

export function toUtcDate(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function addUtcDays(utcDate: string, days: number): string {
  const date = new Date(`${utcDate}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
