import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { recallSelfAssessments, sessionEndReasons, sessionTypes, wordStates } from '../domain/constants'
import type { WordState } from '../domain/constants'
import type { VocabularyItemId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import type { SessionData } from '../domain/session'
import { DefaultVocabularySet, resolveVocabularyItems } from '../domain/vocabulary'
import type { ResolvedVocabularyItemData } from '../domain/vocabulary'
import { useDefaultVocabularySet } from '../default-vocabulary-set/use-default-vocabulary-set'
import { useInterfaceLanguage } from '../i18n/interface-language-context'
import { VocabularyItemRow } from '../components/vocabulary-item-row'
import type { MessageKey } from '../i18n/messages'

const initiallyVisibleRows = 5
const emptyDefaultVocabularySet = DefaultVocabularySet.fromItems([])

interface ProgressionViewProps {
  learningData: LearningData
  onStartSession(): void
  onChangeWordState(vocabularyItemId: VocabularyItemId, wordState: WordState): void
  onChangeFavouriteStatus(vocabularyItemId: VocabularyItemId, isFavourite: boolean): void
  onEditVocabularyItem(vocabularyItemId: VocabularyItemId): void
  onOpenVocabulary(route: string): void
  onOpenSessionDetails(sessionId: string): void
}

export function ProgressionView({ learningData, onStartSession, onChangeWordState, onChangeFavouriteStatus, onEditVocabularyItem, onOpenSessionDetails, onOpenVocabulary }: ProgressionViewProps) {
  const { interfaceLanguage, t } = useInterfaceLanguage()
  const vocabularyLearningRecords = learningData.vocabularyLearningRecords
  const trackedDefaultVocabularyItemIds = vocabularyLearningRecords
    .filter((record) => record.wordState === wordStates.learning || record.wordState === wordStates.known)
    .map((record) => record.vocabularyItemId)
    .filter((vocabularyItemId) => vocabularyItemId > 0)
  const { defaultVocabularySet, hasLoadError } = useDefaultVocabularySet(trackedDefaultVocabularyItemIds)

  const resolvedVocabularyItems = useMemo(
    () =>
      resolveVocabularyItems(
        defaultVocabularySet ?? emptyDefaultVocabularySet,
        learningData.userAddedVocabularyItems,
        vocabularyLearningRecords,
      ),
    [defaultVocabularySet, learningData, vocabularyLearningRecords],
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
        <button className="mt-6 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200" type="button" onClick={onStartSession}>{t('startSession')}</button>
      </section>

      {hasLoadError ? <p className="text-sm text-red-700">{t('couldNotLoadVocabulary')}</p> : null}
      <div className="grid gap-6 lg:grid-cols-3">
        <ProgressionList emptyMessage={t('noRecentSessions')} title={t('recentSessions')}>
          {recentSessions.map((session) => (
            <RecentSessionRow interfaceLanguage={interfaceLanguage} key={session.id} onOpenDetails={onOpenSessionDetails} session={session} />
          ))}
        </ProgressionList>
        <ProgressionList emptyMessage={t('noLearningVocabulary')} onShowMore={() => onOpenVocabulary('/vocabulary?state=learning')} title={t('learningVocabulary')}>
          {learningVocabularyItems.map((vocabularyItem) => (
            <VocabularyItemRow item={vocabularyItem.toData()} key={vocabularyItem.id} onChangeFavouriteStatus={onChangeFavouriteStatus} onChangeWordState={onChangeWordState} onEditVocabularyItem={onEditVocabularyItem} showWordState={false} />
          ))}
        </ProgressionList>
        <ProgressionList emptyMessage={t('noKnownVocabulary')} onShowMore={() => onOpenVocabulary('/vocabulary?state=known')} title={t('knownVocabulary')}>
          {knownVocabularyItems.map((vocabularyItem) => (
            <VocabularyItemRow item={vocabularyItem.toData()} key={vocabularyItem.id} onChangeFavouriteStatus={onChangeFavouriteStatus} onChangeWordState={onChangeWordState} onEditVocabularyItem={onEditVocabularyItem} showWordState={false} />
          ))}
        </ProgressionList>
      </div>
    </div>
  )
}

interface ProgressionListProps {
  title: string
  emptyMessage: string
  children: ReactNode[]
  onShowMore?(): void
}

function ProgressionList({ title, emptyMessage, children, onShowMore }: ProgressionListProps) {
  const { t } = useInterfaceLanguage()
  const [isExpanded, setIsExpanded] = useState(false)
  const visibleChildren = onShowMore === undefined && isExpanded ? children : children.slice(0, initiallyVisibleRows)

  return (
    <section aria-labelledby={`${title}-heading`} className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex lg:flex-col">
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
          <ol className={`divide-y divide-slate-100 border-t border-slate-100 ${children.length > initiallyVisibleRows ? 'border-b' : ''}`}>{visibleChildren}</ol>
          {children.length > initiallyVisibleRows ? (
            <div className="px-6 py-4 sm:px-8 lg:mt-auto">
              <button
                className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100"
                type="button"
                onClick={onShowMore ?? (() => setIsExpanded((value) => !value))}
              >
                {onShowMore === undefined && isExpanded ? t('showFewerRows') : t('showAllRows')}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

function RecentSessionRow({ interfaceLanguage, onOpenDetails, session }: { interfaceLanguage: string; onOpenDetails(sessionId: string): void; session: SessionData }) {
  const { t } = useInterfaceLanguage()
  const completedEntries = session.entries.filter((entry) => entry.selfAssessment !== undefined || entry.manualWordState !== undefined)
  const knowledgeCheckCounts = getKnowledgeCheckCounts(completedEntries)
  const correctAssessments = completedEntries.filter((entry) => entry.selfAssessment === recallSelfAssessments.correct).length
  const incorrectAssessments = completedEntries.filter((entry) => entry.selfAssessment === recallSelfAssessments.incorrect).length
  const assessmentSummary = session.type === sessionTypes.knowledgeCheck
    ? [
        { label: t('markedAsLearning'), value: knowledgeCheckCounts.learning },
        { label: t('markedAsKnown'), value: knowledgeCheckCounts.known },
        { label: t('markedAsExcluded'), value: knowledgeCheckCounts.excluded },
      ]
    : [
        { label: t('correctAssessments'), value: correctAssessments },
        { label: t('incorrectAssessments'), value: incorrectAssessments },
      ]

  return (
    <li className="space-y-4 px-6 py-5 sm:px-8">
      <div>
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 font-semibold text-slate-950">{t(sessionTypeMessageKeys[session.type])}</p>
          <button className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" type="button" onClick={() => onOpenDetails(session.id)}>{t('details')}</button>
        </div>
        <p className="mt-1 text-sm text-slate-600">{formatSessionDateTime(session, interfaceLanguage)}</p>
        <p className="mt-1 text-sm text-slate-600">{t(sessionStatusMessageKeys[session.endReason ?? sessionEndReasons.userEnded])}</p>
      </div>
      <dl className={`grid gap-x-3 gap-y-1 text-sm text-slate-600 [&>div]:row-span-2 [&>div]:grid [&>div]:min-w-0 [&>div]:grid-rows-subgrid [&_dt]:wrap-anywhere ${assessmentSummary.length === 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div>
          <dt>{t('done')}</dt>
          <dd className="whitespace-nowrap font-semibold text-slate-950">{session.settings.itemLimit === undefined && session.endReason === sessionEndReasons.userEnded ? completedEntries.length : `${completedEntries.length} / ${session.entries.length}`}</dd>
        </div>
        {assessmentSummary.map((assessment) => <div key={assessment.label}><dt>{assessment.label}</dt><dd className="font-semibold text-slate-950">{assessment.value}</dd></div>)}
      </dl>
    </li>
  )
}

interface SessionDetailsViewProps {
  sessionId: string | undefined
  learningData: LearningData
  onBack(): void
}

export function SessionDetailsView({ sessionId, learningData, onBack }: SessionDetailsViewProps) {
  const { interfaceLanguage, t } = useInterfaceLanguage()
  const session = learningData.sessions.find((candidate) => candidate.id === sessionId)
  const sessionData = session?.toData()
  const vocabularyItemIds = sessionData?.entries.map((entry) => entry.vocabularyItemId) ?? []
  const defaultVocabularyItemIds = vocabularyItemIds.filter((vocabularyItemId) => vocabularyItemId > 0)
  const { defaultVocabularySet, hasLoadError } = useDefaultVocabularySet(defaultVocabularyItemIds)

  const vocabularyItemsById = useMemo(() => new Map(
    (defaultVocabularySet === undefined ? [] : resolveVocabularyItems(
      defaultVocabularySet,
      learningData.userAddedVocabularyItems,
      learningData.vocabularyLearningRecords,
    )).map((item) => [item.id, item.toData()]),
  ), [defaultVocabularySet, learningData])

  if (sessionData === undefined) {
    return <SessionNotice tone="error">{t('invalidSession')}</SessionNotice>
  }
  if (defaultVocabularySet === undefined) {
    return hasLoadError ? <SessionNotice tone="error">{t('couldNotLoadVocabulary')}</SessionNotice> : <SessionNotice>{t('loadingVocabulary')}</SessionNotice>
  }
  if (hasLoadError) {
    return <SessionNotice tone="error">{t('couldNotLoadVocabulary')}</SessionNotice>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">{t(sessionTypeMessageKeys[sessionData.type])}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{t('sessionDetails')}</h2>
            <p className="mt-3 text-slate-600">{formatDateTime(sessionData.startedAt, interfaceLanguage)}</p>
          </div>
          <button className="rounded-xl border border-slate-300 px-4 py-2.5 font-semibold text-slate-700 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" type="button" onClick={onBack}>{t('backToProgression')}</button>
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3">
          <SessionMetadata label={t('completedEntries')} value={String(sessionData.entries.filter((entry) => entry.selfAssessment !== undefined || entry.manualWordState !== undefined).length)} />
          <SessionMetadata label={t('sessionStatus')} value={t(sessionStatusMessageKeys[sessionData.endReason ?? sessionEndReasons.userEnded])} />
          <SessionMetadata label={t('sessionEndedAt')} value={sessionData.endedAt === undefined ? t('notAvailable') : formatDateTime(sessionData.endedAt, interfaceLanguage)} />
        </dl>
      </section>

      <section aria-labelledby="included-vocabulary-heading" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-5 sm:px-8">
          <h3 className="text-xl font-bold tracking-tight text-slate-950" id="included-vocabulary-heading">{t('includedVocabulary')}</h3>
        </div>
        <ol className="divide-y divide-slate-100 border-t border-slate-100">
          {sessionData.entries.map((entry) => <SessionEntryRow entry={entry} key={entry.vocabularyItemId} vocabularyItem={vocabularyItemsById.get(entry.vocabularyItemId)} />)}
        </ol>
      </section>
    </div>
  )
}

function SessionEntryRow({ entry, vocabularyItem }: { entry: SessionData['entries'][number]; vocabularyItem: ResolvedVocabularyItemData | undefined }) {
  const { t } = useInterfaceLanguage()
  const transition = entry.transition

  return (
    <li className="grid gap-4 px-6 py-5 sm:px-8 lg:grid-cols-[minmax(14rem,1fr)_minmax(18rem,1.5fr)] lg:items-start">
      <div>
        <p className="font-semibold text-slate-950">{vocabularyItem === undefined ? `${t('vocabularyItemId')}: ${entry.vocabularyItemId}` : getGermanHeadword(vocabularyItem)}</p>
        {vocabularyItem === undefined ? null : <p className="mt-1 text-sm text-slate-600">{vocabularyItem.translations.join(', ')}</p>}
      </div>
      <div className="grid gap-3 text-sm text-slate-600">
        <p><span className="font-medium text-slate-700">{t('recordedAction')}:</span> {getRecordedActionLabel(entry, t)}</p>
        <p><span className="font-medium text-slate-700">{t('recordedTransition')}:</span> {transition === undefined ? t('noRecordedTransition') : `${t(wordStateMessageKeys[transition.beforeWordState])} (${transition.beforeLearningScore}) -> ${t(wordStateMessageKeys[transition.afterWordState])} (${transition.afterLearningScore})`}</p>
      </div>
    </li>
  )
}

function SessionNotice({ children, tone = 'normal' }: { children: string; tone?: 'error' | 'normal' }) {
  return <p className={`rounded-2xl border p-6 shadow-sm ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-600'}`}>{children}</p>
}

function SessionMetadata({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-medium text-slate-600">{label}</dt><dd className="mt-1 font-semibold text-slate-950">{value}</dd></div>
}

const sessionTypeMessageKeys = {
  [sessionTypes.knowledgeCheck]: 'knowledgeCheckSession',
  [sessionTypes.learning]: 'learningSession',
  [sessionTypes.repetition]: 'repetitionSession',
} as const

const sessionStatusMessageKeys = {
  [sessionEndReasons.completed]: 'sessionCompleted',
  [sessionEndReasons.allWordsCompleted]: 'sessionCompletedAllWords',
  [sessionEndReasons.userEnded]: 'sessionEndedEarly',
} as const

const wordStateMessageKeys = {
  [wordStates.new]: 'wordStateNew',
  [wordStates.learning]: 'wordStateLearning',
  [wordStates.known]: 'wordStateKnown',
  [wordStates.excluded]: 'wordStateExcluded',
} as const

function getKnowledgeCheckCounts(entries: SessionData['entries']): Record<'learning' | 'known' | 'excluded', number> {
  return entries.reduce(
    (counts, entry) => {
      if (entry.manualWordState === wordStates.learning || entry.selfAssessment === wordStates.learning || entry.selfAssessment === wordStates.new) {
        counts.learning += 1
      } else if (entry.manualWordState === wordStates.known || entry.selfAssessment === wordStates.known) {
        counts.known += 1
      } else if (entry.manualWordState === wordStates.excluded || entry.selfAssessment === wordStates.excluded) {
        counts.excluded += 1
      }
      return counts
    },
    { learning: 0, known: 0, excluded: 0 },
  )
}

function getRecordedActionLabel(entry: SessionData['entries'][number], t: (messageKey: MessageKey) => string): string {
  if (entry.manualWordState !== undefined) {
    return `${t('changeWordState')}: ${t(wordStateMessageKeys[entry.manualWordState])}`
  }
  if (entry.selfAssessment === recallSelfAssessments.correct) return t('iKnewIt')
  if (entry.selfAssessment === recallSelfAssessments.incorrect) return t('iDidNotKnowIt')
  if (entry.selfAssessment === wordStates.known) return t('iKnowIt')
  if (entry.selfAssessment === wordStates.learning) return t('iRecogniseItAndWantToLearn')
  if (entry.selfAssessment === wordStates.new) return t('iDoNotKnowIt')
  if (entry.selfAssessment === wordStates.excluded) return t('exclude')
  return t('notAvailable')
}

function getGermanHeadword(vocabularyItem: ResolvedVocabularyItemData): string {
  if ('nominative' in vocabularyItem) {
    return vocabularyItem.nominative
  }
  return 'positive' in vocabularyItem ? vocabularyItem.positive : vocabularyItem.infinitive
}

function formatDateTime(timestamp: string, interfaceLanguage: string): string {
  return new Intl.DateTimeFormat(interfaceLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
}

function formatSessionDateTime(session: SessionData, interfaceLanguage: string): string {
  const startedAt = formatDateTime(session.startedAt, interfaceLanguage)
  if (session.endedAt === undefined) return startedAt

  const start = new Date(session.startedAt)
  const end = new Date(session.endedAt)
  const sameDate = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth() && start.getDate() === end.getDate()
  const endOptions: Intl.DateTimeFormatOptions = sameDate
    ? { timeStyle: 'short' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
  return `${startedAt} → ${new Intl.DateTimeFormat(interfaceLanguage, endOptions).format(end)}`
}
