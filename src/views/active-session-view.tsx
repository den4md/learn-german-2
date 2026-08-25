import { useEffect, useMemo, useState } from 'react'
import { cardSides, recallSelfAssessments, sessionTypes, wordStates, wordTypes } from '../domain/constants'
import type { SelfAssessment } from '../domain/constants'
import type { VocabularyItemId } from '../domain/identifiers'
import type { LearningData } from '../domain/learning-data'
import type { SessionSettingsData } from '../domain/session'
import type { ResolvedVocabularyItemData, VocabularyItemData } from '../domain/vocabulary'
import { DefaultVocabularySet, VocabularyItem, resolveVocabularyItems } from '../domain/vocabulary'
import { loadAllDefaultVocabularyItems } from '../default-vocabulary-set/load-default-vocabulary-items'
import { selectSessionVocabularyItemIds } from '../app/select-session-vocabulary-item-ids'
import { useInterfaceLanguage } from '../i18n/interface-language-context'

interface ActiveSessionViewProps {
  learningData: LearningData
  onShowEntry(entryIndex: number): void
  onShowCandidate(vocabularyItemId: VocabularyItemId): void
  onRevealEntry(entryIndex: number): void
  onAssessEntry(entryIndex: number, selfAssessment: SelfAssessment): void
  onEndSession(): void
  onManuallySetWordState(entryIndex: number, wordState: typeof wordStates[keyof typeof wordStates]): void
  onSelectNextCandidatePage(vocabularyItemIds: VocabularyItemId[]): void
}

export function ActiveSessionView({ learningData, onShowEntry, onShowCandidate, onRevealEntry, onAssessEntry, onEndSession, onManuallySetWordState, onSelectNextCandidatePage }: ActiveSessionViewProps) {
  const { t } = useInterfaceLanguage()
  const [defaultVocabularyItems, setDefaultVocabularyItems] = useState<VocabularyItemData[]>()
  const [vocabularyLoadError, setVocabularyLoadError] = useState(false)
  const activeSession = learningData.activeSession
  const resolvedVocabularyItems = useMemo(() => defaultVocabularyItems === undefined ? [] : resolveVocabularyItems(DefaultVocabularySet.fromItems(defaultVocabularyItems.map(VocabularyItem.fromData)), learningData.userAddedVocabularyItems, learningData.vocabularyLearningRecords), [defaultVocabularyItems, learningData])
  const vocabularyItemsById = useMemo(() => new Map(resolvedVocabularyItems.map((item) => [item.id, item.toData()])), [resolvedVocabularyItems])
  const activeEntryIndex = activeSession?.entries.findIndex((entry) => entry.selfAssessment === undefined && entry.manualWordState === undefined) ?? -1
  const activeEntry = activeEntryIndex === -1 || activeSession === undefined ? undefined : activeSession.entryAt(activeEntryIndex)
  const [isEndSessionConfirmationOpen, setIsEndSessionConfirmationOpen] = useState(false)

  useEffect(() => {
    let isCurrent = true
    void loadAllDefaultVocabularyItems().then((items) => {
      if (isCurrent) {
        setDefaultVocabularyItems(items)
      }
    }).catch(() => {
      if (isCurrent) {
        setVocabularyLoadError(true)
      }
    })
    return () => { isCurrent = false }
  }, [])

  useEffect(() => {
    if (activeSession === undefined || defaultVocabularyItems === undefined) {
      return
    }
    if (activeEntry !== undefined) {
      if (activeEntry.shownAt === undefined) {
        onShowEntry(activeEntryIndex)
      }
      return
    }
    if (!activeSession.isUnlimited) {
      return
    }
    if (activeSession.candidateVocabularyItemIds.length > 0) {
      onShowCandidate(activeSession.candidateVocabularyItemIds[0]!)
      return
    }
    if (activeSession.isCandidatePageComplete) {
      const presentedVocabularyItemIds = new Set(activeSession.entries.map((entry) => entry.vocabularyItemId))
      const candidateVocabularyItemIds = selectSessionVocabularyItemIds(learningData, defaultVocabularyItems, activeSession.type, activeSession.toData().settings).filter((id) => !presentedVocabularyItemIds.has(id))
      onSelectNextCandidatePage(candidateVocabularyItemIds)
    }
  }, [activeEntry, activeEntryIndex, activeSession, defaultVocabularyItems, learningData, onSelectNextCandidatePage, onShowCandidate, onShowEntry])

  if (activeSession === undefined) {
    return null
  }

  const vocabularyItem = activeEntry === undefined ? undefined : vocabularyItemsById.get(activeEntry.vocabularyItemId)
  const completedEntryCount = activeSession.entries.filter((entry) => entry.selfAssessment !== undefined || entry.manualWordState !== undefined).length
  const totalEntryCount = activeSession.isUnlimited ? completedEntryCount + activeSession.candidateVocabularyItemIds.length + (activeEntry === undefined ? 0 : 1) : activeSession.entries.length

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wide text-blue-700">{t('activeSession')}</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{t(activeSession.type === sessionTypes.knowledgeCheck ? 'knowledgeCheckSession' : activeSession.type === sessionTypes.learning ? 'learningSession' : 'repetitionSession')}</h2>
        </div>
        <div className="flex items-center gap-4"><p className="text-sm font-semibold text-slate-600">{t('sessionProgress')}: {completedEntryCount} / {totalEntryCount}{activeSession.isUnlimited ? ` ${t('remainingCards')}` : ''}</p><button className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" type="button" onClick={() => setIsEndSessionConfirmationOpen(true)}>{t('endSession')}</button></div>
      </div>

      {isEndSessionConfirmationOpen ? <section aria-labelledby="end-session-title" aria-modal="true" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-slate-800" role="alertdialog"><h3 className="text-lg font-bold text-slate-950" id="end-session-title">{t('endSessionTitle')}</h3><p className="mt-2 text-sm leading-6">{t('endSessionDescription')}</p><div className="mt-5 flex flex-wrap gap-3"><button autoFocus className="rounded-xl bg-slate-950 px-4 py-2.5 font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-slate-300" type="button" onClick={() => setIsEndSessionConfirmationOpen(false)}>{t('keepStudying')}</button><button className="rounded-xl border border-red-300 bg-white px-4 py-2.5 font-semibold text-red-800 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-red-100" type="button" onClick={onEndSession}>{t('endSessionNow')}</button></div></section> : null}

      {vocabularyLoadError ? <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">{t('cardCouldNotLoad')}</p> : null}
      {vocabularyItem === undefined ? <p className="mt-8 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center text-slate-600">{t('loadingCard')}</p> : activeEntry === undefined ? null : <Flashcard activeEntryIndex={activeEntryIndex} isRevealed={activeEntry.revealedAt !== undefined} sessionType={activeSession.type} settings={activeSession.toData().settings} vocabularyItem={vocabularyItem} onAssessEntry={onAssessEntry} onManuallySetWordState={onManuallySetWordState} onRevealEntry={onRevealEntry} />}
    </section>
  )
}

function Flashcard({ activeEntryIndex, isRevealed, sessionType, settings, vocabularyItem, onAssessEntry, onManuallySetWordState, onRevealEntry }: { activeEntryIndex: number; isRevealed: boolean; sessionType: string; settings: SessionSettingsData; vocabularyItem: ResolvedVocabularyItemData; onRevealEntry(entryIndex: number): void; onAssessEntry(entryIndex: number, selfAssessment: SelfAssessment): void; onManuallySetWordState(entryIndex: number, wordState: typeof wordStates[keyof typeof wordStates]): void }) {
  const { t } = useInterfaceLanguage()
  const firstSide = settings.firstCardSide === cardSides.german ? <GermanCardSide settings={settings} vocabularyItem={vocabularyItem} /> : <RussianCardSide vocabularyItem={vocabularyItem} />
  const otherSide = settings.firstCardSide === cardSides.german ? <RussianCardSide vocabularyItem={vocabularyItem} /> : <GermanCardSide settings={settings} vocabularyItem={vocabularyItem} />

  return <div className="mt-8 space-y-6">
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4 text-sm font-semibold text-slate-600">{settings.firstCardSide === cardSides.german ? t('cardSideGerman') : t('cardSideRussian')}</div>
      <div className="px-6 py-8 sm:px-10 sm:py-12">{firstSide}</div>
      {isRevealed ? <><div className="border-y border-slate-100 bg-slate-50 px-6 py-4 text-sm font-semibold text-slate-600">{settings.firstCardSide === cardSides.german ? t('cardSideRussian') : t('cardSideGerman')}</div><div className="px-6 py-8 sm:px-10 sm:py-12">{otherSide}</div></> : null}
    </article>
    <MoreActions onChangeWordState={(wordState) => onManuallySetWordState(activeEntryIndex, wordState)} />
    {isRevealed ? <AssessmentControls sessionType={sessionType} onAssess={(selfAssessment) => onAssessEntry(activeEntryIndex, selfAssessment)} /> : <button className="w-full rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-200" type="button" onClick={() => onRevealEntry(activeEntryIndex)}>{t('revealAnswer')}</button>}
  </div>
}

function GermanCardSide({ settings, vocabularyItem }: { settings: SessionSettingsData; vocabularyItem: ResolvedVocabularyItemData }) {
  const { t } = useInterfaceLanguage()
  const wordType = 'nominative' in vocabularyItem ? wordTypes.noun : 'positive' in vocabularyItem ? wordTypes.adjective : wordTypes.verb
  const headword = 'nominative' in vocabularyItem ? vocabularyItem.nominative : 'positive' in vocabularyItem ? vocabularyItem.positive : vocabularyItem.infinitive
  return <div><div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-600"><span>{vocabularyItem.level}</span><span aria-hidden="true">/</span><span>{t(wordType)}</span></div><p className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">{headword}</p>{'nominative' in vocabularyItem ? <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">{settings.nounGermanSideHeaderFields.includes('gender') ? <Info label={t('nounGender')} value={vocabularyItem.gender} /> : null}{settings.nounGermanSideHeaderFields.includes('plural') ? <Info label={t('nounPlural')} value={vocabularyItem.plural} /> : null}</dl> : 'positive' in vocabularyItem ? null : <dl className="mt-8 grid gap-4 text-sm sm:grid-cols-2">{settings.verbGermanSideHeaderFields.includes('helper-verb') ? <Info label={t('verbHelperVerb')} value={vocabularyItem.helper_verb} /> : null}{settings.verbGermanSideHeaderFields.includes('conjugation-type') ? <Info label={t('verbConjugationType')} value={vocabularyItem.conjugation_type} /> : null}{settings.verbGermanSideHeaderFields.includes('present') ? <Info label={t('verbPresent')} value={vocabularyItem.present} /> : null}{settings.verbGermanSideHeaderFields.includes('preterite') ? <Info label={t('verbPreterite')} value={vocabularyItem.preterite} /> : null}{settings.verbGermanSideHeaderFields.includes('perfect') ? <Info label={t('verbPerfect')} value={vocabularyItem.perfect} /> : null}</dl>}</div>
}

function RussianCardSide({ vocabularyItem }: { vocabularyItem: ResolvedVocabularyItemData }) {
  const { t } = useInterfaceLanguage()
  const headerTranslations = vocabularyItem.translations.slice(0, 3)
  const remainingTranslations = vocabularyItem.translations.slice(3)
  return <div><div className="flex flex-wrap gap-2 text-sm font-semibold text-slate-600"><span>{vocabularyItem.level}</span><span aria-hidden="true">/</span><span>{t('vocabulary')}</span></div><ol className="mt-5 space-y-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{headerTranslations.map((translation) => <li key={translation}>{translation}</li>)}</ol>{remainingTranslations.length > 0 ? <ol className="mt-8 space-y-2 border-t border-slate-100 pt-6 text-lg font-semibold text-slate-700">{remainingTranslations.map((translation) => <li key={translation}>{translation}</li>)}</ol> : null}</div>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 px-4 py-3"><dt className="font-semibold text-slate-600">{label}</dt><dd className="mt-1 font-semibold text-slate-950">{value}</dd></div>
}

function AssessmentControls({ sessionType, onAssess }: { sessionType: string; onAssess(selfAssessment: SelfAssessment): void }) {
  const { t } = useInterfaceLanguage()
  const actions = sessionType === sessionTypes.knowledgeCheck ? [{ label: t('iKnowIt'), value: wordStates.known }, { label: t('iRecogniseItAndWantToLearn'), value: wordStates.learning }, { label: t('iDoNotKnowIt'), value: wordStates.new }, { label: t('exclude'), value: wordStates.excluded }] : [{ label: t('iKnewIt'), value: recallSelfAssessments.correct }, { label: t('iDidNotKnowIt'), value: recallSelfAssessments.incorrect }]
  return <section aria-labelledby="self-assessment-heading"><h3 className="text-lg font-bold text-slate-950" id="self-assessment-heading">{t('selfAssessment')}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{actions.map((action) => <button className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-left font-semibold text-slate-800 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" key={action.value} type="button" onClick={() => onAssess(action.value)}>{action.label}</button>)}</div></section>
}

function MoreActions({ onChangeWordState }: { onChangeWordState(wordState: typeof wordStates[keyof typeof wordStates]): void }) {
  const { t } = useInterfaceLanguage()
  const actions = [{ label: t('wordStateNew'), value: wordStates.new }, { label: t('wordStateLearning'), value: wordStates.learning }, { label: t('wordStateKnown'), value: wordStates.known }, { label: t('wordStateExcluded'), value: wordStates.excluded }]

  return <details className="group relative"><summary aria-label={t('moreActions')} className="ml-auto flex w-fit cursor-pointer list-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-lg font-bold leading-none text-slate-700 marker:content-none active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100"><span aria-hidden="true">•••</span></summary><section className="absolute right-0 z-10 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-300/40" aria-label={t('moreActions')}><p className="px-1 pb-2 text-sm font-bold text-slate-950">{t('changeWordState')}</p><div className="grid gap-1">{actions.map((action) => <button className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 active:translate-y-px focus:outline-none focus:ring-4 focus:ring-blue-100" key={action.value} type="button" onClick={() => onChangeWordState(action.value)}>{action.label}</button>)}</div></section></details>
}
