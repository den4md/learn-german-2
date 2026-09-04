import { useEffect, useState } from 'react'
import { dailyStreakDayStatuses } from '../domain/constants'
import type { DailyStreakHistory } from '../domain/learning-progress'
import { toUtcDate } from '../domain/learning-progress'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

export function DailyStreak({ dailyStreakHistory }: { dailyStreakHistory: DailyStreakHistory }) {
  const { interfaceLanguage, t } = useInterfaceLanguage()
  const [currentTimestamp, setCurrentTimestamp] = useState(() => new Date().toISOString())
  const [isOpen, setIsOpen] = useState(false)
  const history = dailyStreakHistory.withAutomaticStreakPauses(currentTimestamp)
  const daysByUtcDate = new Map(history.days.map((day) => [day.utcDate, day.status]))
  const currentUtcDate = toUtcDate(currentTimestamp)
  const previousUtcDate = getUtcDateDaysAgo(1, currentTimestamp)
  const flameTone = history.currentLength < 3
    ? 'grey'
    : daysByUtcDate.get(currentUtcDate) === dailyStreakDayStatuses.valid
      ? 'yellow'
      : daysByUtcDate.get(previousUtcDate) === dailyStreakDayStatuses.pauseProtected
        ? 'blue'
        : 'grey'

  useEffect(() => {
    const currentDate = new Date()
    const nextUtcDate = new Date(currentDate)
    nextUtcDate.setUTCHours(24, 0, 1, 0)
    const timeout = window.setTimeout(() => setCurrentTimestamp(new Date().toISOString()), nextUtcDate.getTime() - currentDate.getTime())
    return () => window.clearTimeout(timeout)
  }, [currentTimestamp])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen])

  return (
    <>
      <button aria-label={`${t('currentStreak')}: ${history.currentLength} ${t('days')}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-lg font-bold tabular-nums text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" type="button" onClick={() => setIsOpen(true)}>
        <span aria-hidden="true" className={flameTone === 'yellow' ? undefined : flameTone === 'blue' ? 'inline-block hue-rotate-180 saturate-200' : 'inline-block grayscale opacity-70'}>🔥</span>
        <span>{history.currentLength}</span>
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-slate-950/30 p-4">
          <section aria-labelledby="streak-popup-title" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" role="dialog">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-700">{t('currentStreak')}</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950" id="streak-popup-title">{t('streakHistory')}</h2>
              </div>
              <button className="rounded-lg px-3 py-2 font-semibold text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" type="button" onClick={() => setIsOpen(false)}>
                {t('close')}
              </button>
            </div>
            <ol className="mt-6 divide-y divide-slate-100">
              {getPreviousSevenUtcDates(currentTimestamp).map((utcDate) => {
                const status = daysByUtcDate.get(utcDate)
                return (
                  <li className="flex items-center justify-between gap-4 py-3" key={utcDate}>
                    <span className="text-slate-700">{formatUtcDate(utcDate, interfaceLanguage)}</span>
                    <span className="font-medium text-slate-950">{t(streakStatusMessageKeys[status ?? 'none'])}</span>
                  </li>
                )
              })}
            </ol>
          </section>
        </div>
      ) : null}
    </>
  )
}

const streakStatusMessageKeys = {
  [dailyStreakDayStatuses.valid]: 'streakDayValid',
  [dailyStreakDayStatuses.pauseProtected]: 'streakDayPauseProtected',
  [dailyStreakDayStatuses.broken]: 'streakDayBroken',
  none: 'streakDayNone',
} as const

function formatUtcDate(utcDate: string, interfaceLanguage: string): string {
  return new Intl.DateTimeFormat(interfaceLanguage, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${utcDate}T00:00:00.000Z`),
  )
}

function getPreviousSevenUtcDates(currentTimestamp: string): string[] {
  return Array.from({ length: 7 }, (_, daysAgo) => getUtcDateDaysAgo(daysAgo, currentTimestamp))
}

function getUtcDateDaysAgo(daysAgo: number, currentTimestamp: string): string {
  const date = new Date(currentTimestamp)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - daysAgo)
  return date.toISOString().slice(0, 10)
}
