import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { dailyStreakDayStatuses, recallSelfAssessments, sessionEndReasons, sessionTypes, wordStates } from '../domain/constants'
import type { DailyStreakDayData } from '../domain/learning-progress'
import type { LearningData } from '../domain/learning-data'
import type { SessionData } from '../domain/session'
import { DefaultVocabularySet, VocabularyItem, getWordType, resolveVocabularyItems } from '../domain/vocabulary'
import type { ResolvedVocabularyItemData, VocabularyItemData } from '../domain/vocabulary'
import { loadDefaultVocabularyItems } from '../default-vocabulary-set/load-default-vocabulary-items'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

const initiallyVisibleRows = 5

interface ProgressionViewProps {
  learningData: LearningData
}

export function ProgressionView({ learningData }: ProgressionViewProps) {
  const { interfaceLanguage, t } = useInterfaceLanguage()
  const [defaultVocabularyItems, setDefaultVocabularyItems] = useState<VocabularyItemData[]>([])
  const [vocabularyLoadError, setVocabularyLoadError] = useState(false)
  const vocabularyLearningRecords = learningData.vocabularyLearningRecords
  const trackedDefaultVocabularyItemIds = vocabularyLearningRecords
    .filter((record) => record.wordState === wordStates.learning || record.wordState === wordStates.known)
    .map((record) => record.vocabularyItemId)
    .filter((vocabularyItemId) => vocabularyItemId > 0)
  const trackedDefaultVocabularyItemIdsKey = trackedDefaultVocabularyItemIds.join(',')

  useEffect(() => {
    let isCurrent = true
    setVocabularyLoadError(false)

    void loadDefaultVocabularyItems(trackedDefaultVocabularyItemIds)
      .then((items) => {
        if (isCurrent) {
          setDefaultVocabularyItems(items)
        }
      })
      .catch(() => {
        if (isCurrent) {
          setVocabularyLoadError(true)
        }
      })

    return () => {
      isCurrent = false
    }
  }, [trackedDefaultVocabularyItemIdsKey])

  const resolvedVocabularyItems = useMemo(
    () =>
      resolveVocabularyItems(
        DefaultVocabularySet.fromItems(defaultVocabularyItems.map(VocabularyItem.fromData)),
        learningData.userAddedVocabularyItems,
        vocabularyLearningRecords,
      ),
    [defaultVocabularyItems, learningData, vocabularyLearningRecords],
  )
  const learningVocabularyItems = resolvedVocabularyItems.filter(
    (vocabularyItem) => vocabularyItem.wordState === wordStates.learning,
  )
  const knownVocabularyItems = resolvedVocabularyItems.filter(
    (vocabularyItem) => vocabularyItem.wordState === wordStates.known,
  )
  const recentSessions = [...learningData.sessions]
    .map((session) => session.toData())
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950">{t('progressionTitle')}</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">{t('progressionDescription')}</p>
        {learningData.dailyStreakLength > 2 ? (
          <DailyStreak dailyStreakDays={learningData.dailyStreakHistory.days} length={learningData.dailyStreakLength} />
        ) : null}
      </section>

      {vocabularyLoadError ? <p className="text-sm text-red-700">{t('couldNotLoadVocabulary')}</p> : null}
      <ProgressionList emptyMessage={t('noRecentSessions')} title={t('recentSessions')}>
        {recentSessions.map((session) => (
          <RecentSessionRow interfaceLanguage={interfaceLanguage} key={session.id} session={session} />
        ))}
      </ProgressionList>
      <ProgressionList emptyMessage={t('noLearningVocabulary')} title={t('learningVocabulary')}>
        {learningVocabularyItems.map((vocabularyItem) => (
          <VocabularyItemRow key={vocabularyItem.id} vocabularyItem={vocabularyItem.toData()} />
        ))}
      </ProgressionList>
      <ProgressionList emptyMessage={t('noKnownVocabulary')} title={t('knownVocabulary')}>
        {knownVocabularyItems.map((vocabularyItem) => (
          <VocabularyItemRow key={vocabularyItem.id} vocabularyItem={vocabularyItem.toData()} />
        ))}
      </ProgressionList>
    </div>
  )
}

interface ProgressionListProps {
  title: string
  emptyMessage: string
  children: ReactNode[]
}

function ProgressionList({ title, emptyMessage, children }: ProgressionListProps) {
  const { t } = useInterfaceLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const visibleChildren = isExpanded ? children : children.slice(0, initiallyVisibleRows)

  return (
    <section aria-labelledby={`${title}-heading`} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 px-6 py-5 sm:px-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-950" id={`${title}-heading`}>
          {title}
        </h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">{children.length}</span>
      </div>
      {children.length === 0 ? (
        <p className="border-t border-slate-100 px-6 py-8 text-slate-600 sm:px-8">{emptyMessage}</p>
      ) : (
        <>
          <ol className="divide-y divide-slate-100 border-t border-slate-100">{visibleChildren}</ol>
          {children.length > initiallyVisibleRows ? (
            <div className="border-t border-slate-100 px-6 py-4 sm:px-8">
              <button
                className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100"
                type="button"
                onClick={() => setIsExpanded((value) => !value)}
              >
                {isExpanded ? t('showFewerRows') : t('showAllRows')}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

function RecentSessionRow({ interfaceLanguage, session }: { interfaceLanguage: string; session: SessionData }) {
  const { t } = useInterfaceLanguage()
  const completedEntries = session.entries.filter((entry) => entry.selfAssessment !== undefined)
  const correctAssessments = completedEntries.filter(
    (entry) => entry.selfAssessment === recallSelfAssessments.correct,
  ).length
  const incorrectAssessments = completedEntries.filter(
    (entry) => entry.selfAssessment === recallSelfAssessments.incorrect,
  ).length

  return (
    <li className="grid gap-4 px-6 py-5 sm:px-8 lg:grid-cols-[minmax(12rem,1fr)_minmax(10rem,auto)_minmax(14rem,auto)] lg:items-center">
      <div>
        <p className="font-semibold text-slate-950">{t(sessionTypeMessageKeys[session.type])}</p>
        <p className="mt-1 text-sm text-slate-600">{formatDateTime(session.startedAt, interfaceLanguage)}</p>
      </div>
      <dl className="grid grid-cols-3 gap-3 text-sm text-slate-600">
        <div>
          <dt>{t('completedEntries')}</dt>
          <dd className="mt-1 font-semibold text-slate-950">{completedEntries.length} / {session.entries.length}</dd>
        </div>
        <div>
          <dt>{t('correctAssessments')}</dt>
          <dd className="mt-1 font-semibold text-slate-950">{correctAssessments}</dd>
        </div>
        <div>
          <dt>{t('incorrectAssessments')}</dt>
          <dd className="mt-1 font-semibold text-slate-950">{incorrectAssessments}</dd>
        </div>
      </dl>
      <p className="text-sm font-medium text-slate-700">{t(sessionStatusMessageKeys[session.endReason ?? sessionEndReasons.userEnded])}</p>
    </li>
  )
}

function VocabularyItemRow({ vocabularyItem }: { vocabularyItem: ResolvedVocabularyItemData }) {
  const { t } = useInterfaceLanguage()
  const { learningStatistics } = vocabularyItem
  const wordType = getWordType(vocabularyItem)

  return (
    <li className="grid gap-4 px-6 py-5 sm:px-8 lg:grid-cols-[minmax(15rem,1fr)_minmax(24rem,auto)] lg:items-center">
      <div>
        <p className="font-semibold text-slate-950">{getGermanHeadword(vocabularyItem)}</p>
        <p className="mt-1 text-sm text-slate-600">{vocabularyItem.translations[0] ?? ''}</p>
        <p className="mt-2 text-sm font-medium text-blue-700">{vocabularyItem.level} · {t(wordTypeMessageKeys[wordType])}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-600 sm:grid-cols-4">
        <div>
          <dt>{t('learningScore')}</dt>
          <dd className="mt-1 font-semibold text-slate-950">{vocabularyItem.learningScore} / 10</dd>
        </div>
        <div>
          <dt>{t('cardShows')}</dt>
          <dd className="mt-1 font-semibold text-slate-950">{learningStatistics.cardShows}</dd>
        </div>
        <div>
          <dt>{t('correctAssessments')}</dt>
          <dd className="mt-1 font-semibold text-slate-950">{learningStatistics.correctAssessments}</dd>
        </div>
        <div>
          <dt>{t('incorrectAssessments')}</dt>
          <dd className="mt-1 font-semibold text-slate-950">{learningStatistics.incorrectAssessments}</dd>
        </div>
      </dl>
    </li>
  )
}

function DailyStreak({ dailyStreakDays, length }: { dailyStreakDays: DailyStreakDayData[]; length: number }) {
  const { interfaceLanguage, t } = useInterfaceLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const daysByUtcDate = new Map(dailyStreakDays.map((day) => [day.utcDate, day.status]))

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
      <button
        className="mt-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left text-blue-950 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <span className="block text-sm font-medium">{t('currentStreak')}</span>
        <span className="mt-1 block text-2xl font-bold">{length} {t('days')}</span>
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
              {getPreviousSevenUtcDates().map((utcDate) => {
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

const sessionTypeMessageKeys = {
  [sessionTypes.knowledgeCheck]: 'knowledgeCheckSession',
  [sessionTypes.learning]: 'learningSession',
  [sessionTypes.repetition]: 'repetitionSession',
} as const

const sessionStatusMessageKeys = {
  [sessionEndReasons.completed]: 'sessionCompleted',
  [sessionEndReasons.userEnded]: 'sessionEndedEarly',
} as const

const wordTypeMessageKeys = {
  adjective: 'adjective',
  noun: 'noun',
  verb: 'verb',
} as const

const streakStatusMessageKeys = {
  [dailyStreakDayStatuses.valid]: 'streakDayValid',
  [dailyStreakDayStatuses.pauseProtected]: 'streakDayPauseProtected',
  [dailyStreakDayStatuses.broken]: 'streakDayBroken',
  none: 'streakDayNone',
} as const

function getGermanHeadword(vocabularyItem: ResolvedVocabularyItemData): string {
  if ('nominative' in vocabularyItem) {
    return vocabularyItem.nominative
  }
  return 'positive' in vocabularyItem ? vocabularyItem.positive : vocabularyItem.infinitive
}

function formatDateTime(timestamp: string, interfaceLanguage: string): string {
  return new Intl.DateTimeFormat(interfaceLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
}

function formatUtcDate(utcDate: string, interfaceLanguage: string): string {
  return new Intl.DateTimeFormat(interfaceLanguage, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${utcDate}T00:00:00.000Z`),
  )
}

function getPreviousSevenUtcDates(): string[] {
  const dates: string[] = []
  const date = new Date()
  date.setUTCHours(0, 0, 0, 0)

  for (let daysAgo = 0; daysAgo < 7; daysAgo += 1) {
    const previousDate = new Date(date)
    previousDate.setUTCDate(date.getUTCDate() - daysAgo)
    dates.push(previousDate.toISOString().slice(0, 10))
  }

  return dates
}
