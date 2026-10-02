import { recallSelfAssessments, sessionEndReasons, sessionTypes, wordStates } from '../domain/constants'
import type { SessionData } from '../domain/session'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

export function SessionRow({ onOpenDetails, onContinue, session }: { onOpenDetails(sessionId: string): void; onContinue(): void; session: SessionData }) {
  const { interfaceLanguage, t } = useInterfaceLanguage()
  const isActive = session.endedAt === undefined
  const isUnlimited = session.settings.itemLimit === undefined
  const completedEntries = session.entries.filter((entry) => entry.selfAssessment !== undefined || entry.manualWordState !== undefined)
  const knowledgeCheckCounts = getKnowledgeCheckCounts(completedEntries)
  const assessmentSummary = session.type === sessionTypes.knowledgeCheck
    ? [
        { label: t('markedAsLearning'), value: knowledgeCheckCounts.learning },
        { label: t('markedAsKnown'), value: knowledgeCheckCounts.known },
        { label: t('markedAsExcluded'), value: knowledgeCheckCounts.excluded },
      ]
    : [
        { label: t('correctAssessments'), value: completedEntries.filter((entry) => entry.selfAssessment === recallSelfAssessments.correct).length },
        { label: t('incorrectAssessments'), value: completedEntries.filter((entry) => entry.selfAssessment === recallSelfAssessments.incorrect).length },
      ]

  return (
    <li className="space-y-4 px-4 py-5 min-[400px]:px-6 sm:px-8">
      <div>
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 font-semibold text-slate-950">{t(sessionTypeMessageKeys[session.type])}</p>
          <button className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold active:translate-y-px focus:outline-none focus:ring-4 ${isActive ? 'bg-blue-700 text-white focus:ring-blue-200' : 'border border-slate-300 text-slate-700 focus:ring-blue-100'}`} type="button" onClick={() => isActive ? onContinue() : onOpenDetails(session.id)}>{t(isActive ? 'continue' : 'details')}</button>
        </div>
        <p className="mt-1 text-sm text-slate-600">{formatSessionDateTime(session, interfaceLanguage)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
          <span className={isActive ? 'font-semibold text-blue-700' : undefined}>{t(isActive ? 'sessionActiveStatus' : sessionStatusMessageKeys[session.endReason ?? sessionEndReasons.userEnded])}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{t(isUnlimited ? 'unlimited' : 'limited')}</span>
        </div>
      </div>
      <dl className={`grid gap-x-1 gap-y-1 text-sm text-slate-600 min-[400px]:gap-x-2 sm:gap-x-3 [&>div]:row-span-2 [&>div]:grid [&>div]:min-w-0 [&>div]:grid-rows-subgrid [&_dt]:wrap-anywhere ${assessmentSummary.length === 3 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <div>
          <dt>{t('done')}</dt>
          <dd className="whitespace-nowrap font-semibold text-slate-950">{isUnlimited ? completedEntries.length : `${completedEntries.length} / ${session.entries.length}`}</dd>
        </div>
        {assessmentSummary.map((assessment) => <div key={assessment.label}><dt>{assessment.label}</dt><dd className="font-semibold text-slate-950">{assessment.value}</dd></div>)}
      </dl>
    </li>
  )
}

export const sessionTypeMessageKeys = {
  [sessionTypes.knowledgeCheck]: 'knowledgeCheckSession',
  [sessionTypes.learning]: 'learningSession',
  [sessionTypes.repetition]: 'repetitionSession',
} as const

export const sessionStatusMessageKeys = {
  [sessionEndReasons.completed]: 'sessionCompleted',
  [sessionEndReasons.allWordsCompleted]: 'sessionCompletedAllWords',
  [sessionEndReasons.userEnded]: 'sessionEndedEarly',
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

export function formatDateTime(timestamp: string, interfaceLanguage: string): string {
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
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', ...(start.getFullYear() !== end.getFullYear() ? { year: 'numeric' } : {}) }
  return `${startedAt} → ${new Intl.DateTimeFormat(interfaceLanguage, endOptions).format(end)}`
}
